import { redactText } from "./redact";
export interface ChartArtifact {
  type: "chart";
  title: string;
  kind: "bar" | "line";
  data: Array<{ label: string; value: number }>;
  source: string;
}
export function parseChart(value: unknown): ChartArtifact {
  if (!value || typeof value !== "object") throw Error("Gráfica inválida.");
  const x = value as Record<string, unknown>;
  if (
    x.type !== "chart" ||
    !["bar", "line"].includes(String(x.kind)) ||
    typeof x.title !== "string" ||
    !x.title.trim() ||
    x.title.length > 160 ||
    typeof x.source !== "string" ||
    x.source.length > 300 ||
    !Array.isArray(x.data) ||
    !x.data.length ||
    x.data.length > 30
  )
    throw Error("Revisa los datos de la gráfica.");
  const data = x.data.map((d: unknown) => {
    if (!d || typeof d !== "object") throw Error("Dato inválido.");
    const p = d as Record<string, unknown>;
    if (
      typeof p.label !== "string" ||
      !p.label.trim() ||
      p.label.length > 100 ||
      typeof p.value !== "number" ||
      !Number.isFinite(p.value) ||
      Math.abs(p.value) > 1e12
    )
      throw Error("Valores de gráfica inválidos.");
    return { label: redactText(p.label), value: p.value };
  });
  return {
    type: "chart",
    title: redactText(x.title),
    kind: x.kind as "bar" | "line",
    source: redactText(x.source),
    data,
  };
}
export function chartFromRows(
  rows: Record<string, unknown>[],
  label: string,
  value: string,
  title: string,
  kind: "bar" | "line",
  source: string,
) {
  const data = rows.slice(0, 30).map((r) => {
    if (
      r[label] === undefined ||
      r[label] === null ||
      r[value] === undefined ||
      r[value] === null ||
      r[value] === ""
    )
      throw Error(
        "Las columnas elegidas no contienen datos numéricos de origen.",
      );
    return {
      label: String(r[label]),
      value: typeof r[value] === "number" ? r[value] : Number(r[value]),
    };
  });
  return parseChart({ type: "chart", title, kind, source, data });
}

export function safeChartReply(text: string, hasChart: boolean): string {
  if (!hasChart) return text;
  const cleaned = text
    .replace(/!\[[^\]]*\]\((?:\/tmp\/|sandbox:|attachment:)[^)]*\)/g, "")
    .trim();
  return (
    cleaned || "La gráfica se muestra a continuación con sus datos de origen."
  );
}
