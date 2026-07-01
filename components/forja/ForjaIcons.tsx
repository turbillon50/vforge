import type { SVGProps } from "react";

type IP = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number, p: IP) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const IconPulse = ({ size = 18, ...p }: IP) => (
  <svg {...base(size, p)}>
    <path d="M3 12h4l2.5-7 5 14 2.5-7H21" />
  </svg>
);

export const IconGrid = ({ size = 18, ...p }: IP) => (
  <svg {...base(size, p)}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

export const IconBeaker = ({ size = 18, ...p }: IP) => (
  <svg {...base(size, p)}>
    <path d="M9 3h6" />
    <path d="M10 3v6.5L5.5 18a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 9.5V3" />
    <path d="M7.5 15h9" />
  </svg>
);

export const IconDevice = ({ size = 18, ...p }: IP) => (
  <svg {...base(size, p)}>
    <rect x="4" y="2.5" width="9" height="19" rx="2.2" />
    <path d="M9 18.5h0" />
    <rect x="15" y="7" width="6.5" height="11" rx="1.4" />
  </svg>
);

export const IconRefresh = ({ size = 18, ...p }: IP) => (
  <svg {...base(size, p)}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 4v5h-5" />
  </svg>
);

export const IconExternal = ({ size = 18, ...p }: IP) => (
  <svg {...base(size, p)}>
    <path d="M14 4h6v6" />
    <path d="M20 4l-9 9" />
    <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </svg>
);

export const IconChevron = ({ size = 18, ...p }: IP) => (
  <svg {...base(size, p)}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export const IconCpu = ({ size = 18, ...p }: IP) => (
  <svg {...base(size, p)}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <path d="M9.5 9.5h5v5h-5z" />
    <path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2" />
  </svg>
);

export const IconServer = ({ size = 18, ...p }: IP) => (
  <svg {...base(size, p)}>
    <rect x="3" y="4" width="18" height="7" rx="1.6" />
    <rect x="3" y="13" width="18" height="7" rx="1.6" />
    <path d="M7 7.5h0M7 16.5h0" />
  </svg>
);

export const IconGlobe = ({ size = 18, ...p }: IP) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.6 2.5 4 5.7 4 9s-1.4 6.5-4 9c-2.6-2.5-4-5.7-4-9s1.4-6.5 4-9z" />
  </svg>
);

export const IconBolt = ({ size = 18, ...p }: IP) => (
  <svg {...base(size, p)}>
    <path d="M13 2L4.5 13.5H11l-1 8.5L18.5 10.5H12l1-8.5z" />
  </svg>
);

export const IconPlay = ({ size = 18, ...p }: IP) => (
  <svg {...base(size, p)}>
    <path d="M7 5l11 7-11 7V5z" />
  </svg>
);
