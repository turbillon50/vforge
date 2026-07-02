/**
 * El puente "ver → pegar → arreglar": une el navegador Vulcano (ojos —
 * carga la URL real y lee lo que renderiza) con el Ojo (manos — agente
 * que escribe el fix). Una iteración = navega, lee, decide si hay falla,
 * y si la hay, encola una tarea de arreglo con el texto observado como
 * contexto. El caller (frontend, o un loop automático) vuelve a llamar
 * después de que el fix se publique, para reverificar.
 *
 * Límite conocido: `browserReadBody` lee el DOM ya renderizado, no la
 * consola. Errores no visuales (excepciones atrapadas, fallos de red que
 * no rompen el render) no se detectan todavía — eso requiere que
 * cdp_control.py en Hetzner exponga Log/Runtime de CDP, fuera de este repo.
 */
import { browserNavigate, browserReadBody } from "@/lib/forja/browser";
import { ojoPost } from "@/lib/forja/ojo";

export interface VerifyResult {
  ok: boolean;
  healthy: boolean;
  observedText: string;
  issue: string | null;
  dispatchedJobId?: number;
  error?: string;
}

const FAILURE_SIGNATURES: Array<{ match: RegExp; label: string }> = [
  { match: /application error.*client-side exception/i, label: "excepción de cliente (Next.js error boundary)" },
  { match: /this page could not be found/i, label: "404 — página no encontrada" },
  { match: /internal server error/i, label: "500 — error interno" },
  { match: /unhandled runtime error/i, label: "runtime error sin capturar" },
  { match: /cannot read propert(y|ies) of undefined/i, label: "excepción JS: propiedad de undefined" },
  { match: /hydration failed/i, label: "fallo de hidratación React" },
];

function detectIssue(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length < 8) return "página vacía o en blanco";
  for (const { match, label } of FAILURE_SIGNATURES) {
    if (match.test(trimmed)) return label;
  }
  return null;
}

/** Corre UNA iteración del bucle contra `url`. No espera al fix — solo lo encola. */
export async function runVerifyIteration(
  url: string,
  projectId: string,
): Promise<VerifyResult> {
  try {
    await browserNavigate(url);
    // Deja que la página termine de montar antes de leer.
    await new Promise((r) => setTimeout(r, 1500));
    const observedText = await browserReadBody();
    const issue = detectIssue(observedText);

    if (!issue) {
      return { ok: true, healthy: true, observedText, issue: null };
    }

    const prompt = [
      `Verificación automática de ${url} encontró un problema: ${issue}.`,
      `Esto es lo que el navegador ve renderizado en la página (recórtalo si es ruido):`,
      "---",
      observedText.slice(0, 1500),
      "---",
      `Corrige el problema en el proyecto ${projectId} y deja el código listo para republicar.`,
    ].join("\n");

    const dispatchRes = await ojoPost("nueva", {
      agent: "claude",
      project_id: projectId,
      prompt,
      priority: 3,
    });
    const dispatchJson = await dispatchRes.json().catch(() => ({}));
    if (!dispatchRes.ok || !dispatchJson?.id) {
      return {
        ok: false,
        healthy: false,
        observedText,
        issue,
        error: dispatchJson?.error ?? "no se pudo encolar el fix en el Ojo",
      };
    }

    return {
      ok: true,
      healthy: false,
      observedText,
      issue,
      dispatchedJobId: dispatchJson.id,
    };
  } catch (e) {
    return {
      ok: false,
      healthy: false,
      observedText: "",
      issue: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
