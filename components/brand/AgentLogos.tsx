// components/brand/AgentLogos.tsx
// Logos OFICIALES de los agentes del Taller como SVG inline (sin Lucide, sin libs).
// Trazados limpios y MONOCROMOS: heredan el color del estado vía `currentColor`
// (reposo gris, activo color del agente). El padre fija el color con style.color.
import type { ReactElement, SVGProps } from "react";
import type { EsferaId } from "@/components/cockpit/esferas-types";

type IP = SVGProps<SVGSVGElement> & { size?: number };

/** Base para logos de relleno (fill=currentColor). */
const fillSvg = (size: number, p: IP) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "currentColor",
  "aria-hidden": true as const,
  ...p,
});

/** Anthropic — marca oficial (la "A" de Anthropic), usada para Claude. */
export const LogoClaude = ({ size = 20, ...p }: IP) => (
  <svg {...fillSvg(size, p)}>
    <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.541Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" />
  </svg>
);

/** OpenAI — logo oficial (blossom), usado para Codex. */
export const LogoCodex = ({ size = 20, ...p }: IP) => (
  <svg {...fillSvg(size, p)}>
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
  </svg>
);

/** xAI — logo oficial (X slasheada), usado para Grok. */
export const LogoGrok = ({ size = 20, ...p }: IP) => (
  <svg {...fillSvg(size, p)}>
    <path d="m3.005 8.858 8.783 12.544h3.904L6.908 8.858zm6.34 0 8.781 12.544h3.906L13.252 8.858zM3 21.402l4.91-7.016-1.953-2.79L1.046 18.61zm15.79-18.804L13.88 9.614l1.953 2.79 4.91-7.012z" />
  </svg>
);

/** Google Chrome — logo oficial monocromo, usado para Browser. */
export const LogoChrome = ({ size = 20, ...p }: IP) => (
  <svg {...fillSvg(size, p)}>
    <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728Z" />
  </svg>
);

/** VFIcon propio: terminal/Shell. Trazo limpio, hereda color por currentColor. */
export const LogoShell = ({ size = 20, ...p }: IP) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    {...p}
  >
    <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
    <path d="m6.5 10 3 2.4-3 2.4" />
    <path d="M12.4 15.2h5" />
  </svg>
);

/** Mapa por esfera — logos oficiales de cada agente del Taller. */
export type AgentLogo = (p: IP) => ReactElement;

export const AGENT_LOGOS: Record<EsferaId, AgentLogo> = {
  claude: LogoClaude,
  codex: LogoCodex,
  grok: LogoGrok,
  shell: LogoShell,
  browser: LogoChrome,
};
