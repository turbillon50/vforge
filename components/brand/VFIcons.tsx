// components/brand/VFIcons.tsx — Sistema completo sin Lucide
import type { SVGProps } from "react";
type IP = SVGProps<SVGSVGElement> & { size?: number };
const b = (sz:number, p:IP) => ({
  width:sz,height:sz,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",
  strokeWidth:1.5,strokeLinecap:"round" as const,strokeLinejoin:"round" as const,
  "aria-hidden":true,...p
});
// Nav & UI
export const IconChat      = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
export const IconChats     = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h8M8 13h5" opacity=".5"/></svg>;
export const IconBranch    = ({size=20,...p}:IP)=><svg {...b(size,p)}><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 9v3a6 6 0 0 0 6 6h3"/><circle cx="18" cy="6" r="3"/><path d="M15 6H9"/></svg>;
export const IconRocket    = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M12 2s4.5 3 4.5 9.5L12 14l-4.5-2.5C7.5 5 12 2 12 2z"/><path d="M12 14v8"/><circle cx="12" cy="10" r="2"/></svg>;
export const IconLayers    = ({size=20,...p}:IP)=><svg {...b(size,p)}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
export const IconSettings  = ({size=20,...p}:IP)=><svg {...b(size,p)}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
export const IconHome      = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
export const IconUsers     = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
export const IconActivity  = ({size=20,...p}:IP)=><svg {...b(size,p)}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
export const IconBell      = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
export const IconSearch    = ({size=20,...p}:IP)=><svg {...b(size,p)}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
export const IconExtLink   = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
export const IconGlobe     = ({size=20,...p}:IP)=><svg {...b(size,p)}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
export const IconLayout    = ({size=20,...p}:IP)=><svg {...b(size,p)}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>;
export const IconZap       = ({size=20,...p}:IP)=><svg {...b(size,p)}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
export const IconShield    = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
export const IconCheck     = ({size=20,...p}:IP)=><svg {...b(size,p)}><polyline points="20 6 9 17 4 12"/></svg>;
export const IconX         = ({size=20,...p}:IP)=><svg {...b(size,p)}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
export const IconPlus      = ({size=20,...p}:IP)=><svg {...b(size,p)}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
export const IconChevR     = ({size=20,...p}:IP)=><svg {...b(size,p)}><polyline points="9 18 15 12 9 6"/></svg>;
export const IconChevL     = ({size=20,...p}:IP)=><svg {...b(size,p)}><polyline points="15 18 9 12 15 6"/></svg>;
export const IconChevD     = ({size=20,...p}:IP)=><svg {...b(size,p)}><polyline points="6 9 12 15 18 9"/></svg>;
export const IconArrowR    = ({size=20,...p}:IP)=><svg {...b(size,p)}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
export const IconArrowL    = ({size=20,...p}:IP)=><svg {...b(size,p)}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
// Files & data
export const IconFile      = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
export const IconCode      = ({size=20,...p}:IP)=><svg {...b(size,p)}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
export const IconDownload  = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
export const IconUpload    = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
export const IconCopy      = ({size=20,...p}:IP)=><svg {...b(size,p)}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
export const IconTrash     = ({size=20,...p}:IP)=><svg {...b(size,p)}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
export const IconPen       = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
export const IconBook      = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
// Status
export const IconLoader    = ({size=20,...p}:IP)=><svg {...b(size,p)}><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>;
export const IconClock     = ({size=20,...p}:IP)=><svg {...b(size,p)}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
export const IconWarn      = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
export const IconInfo      = ({size=20,...p}:IP)=><svg {...b(size,p)}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
// Actions
export const IconSend      = ({size=20,...p}:IP)=><svg {...b(size,p)}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
export const IconMic       = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
export const IconCamera    = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
export const IconClip      = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
export const IconPlay      = ({size=20,...p}:IP)=><svg {...b(size,p)}><polygon points="5 3 19 12 5 21 5 3"/></svg>;
export const IconPause     = ({size=20,...p}:IP)=><svg {...b(size,p)}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
export const IconStop      = ({size=20,...p}:IP)=><svg {...b(size,p)}><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
export const IconRefresh   = ({size=20,...p}:IP)=><svg {...b(size,p)}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-5.51"/></svg>;
export const IconShare     = ({size=20,...p}:IP)=><svg {...b(size,p)}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
export const IconLink      = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
export const IconKey       = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.77-7.77zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
export const IconFingerprint=({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10"/><path d="M5 12a7 7 0 0 1 14 0"/><path d="M8 12a4 4 0 0 1 8 0"/><path d="M12 12v.01"/></svg>;
// Commerce
export const IconBag       = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
export const IconTag       = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
export const IconCreditCard= ({size=20,...p}:IP)=><svg {...b(size,p)}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
// Sparkles / magic
export const IconSparkles  = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3z"/><path d="M19 3l.7 2.3L22 6l-2.3.7L19 9l-.7-2.3L16 6l2.3-.7L19 3z" opacity=".6"/><path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z" opacity=".6"/></svg>;
export const IconBot       = ({size=20,...p}:IP)=><svg {...b(size,p)}><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="8" y1="15" x2="8" y2="17"/><line x1="16" y1="15" x2="16" y2="17"/></svg>;
export const IconCpu       = ({size=20,...p}:IP)=><svg {...b(size,p)}><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>;
export const IconLifeBuoy  = ({size=20,...p}:IP)=><svg {...b(size,p)}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/></svg>;
export const IconHeart     = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
export const IconStar      = ({size=20,...p}:IP)=><svg {...b(size,p)}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
export const IconMap       = ({size=20,...p}:IP)=><svg {...b(size,p)}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
export const IconDatabase  = ({size=20,...p}:IP)=><svg {...b(size,p)}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></svg>;
export const IconThumb     = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>;
export const IconMaximize  = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>;
export const IconConstruction=({size=20,...p}:IP)=><svg {...b(size,p)}><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></svg>;
export const IconBrain     = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18a4 4 0 1 0 7.966-1.517 4 4 0 0 0 .556-6.588A4 4 0 0 0 17.997 5.125 3 3 0 1 0 12 5"/></svg>;
export const IconWifi      = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>;
export const IconHelp      = ({size=20,...p}:IP)=><svg {...b(size,p)}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
export const IconSun       = ({size=20,...p}:IP)=><svg {...b(size,p)}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
export const IconMoon      = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
export const IconEye       = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
export const IconGlobe2    = ({size=20,...p}:IP)=><svg {...b(size,p)}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
export const IconCrown     = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
export const IconWorkflow  = ({size=20,...p}:IP)=><svg {...b(size,p)}><rect x="3" y="3" width="4" height="4" rx="1"/><rect x="17" y="3" width="4" height="4" rx="1"/><rect x="17" y="17" width="4" height="4" rx="1"/><rect x="3" y="17" width="4" height="4" rx="1"/><path d="M7 5h10M5 7v10M12 7v10M19 7v10M7 19h10"/></svg>;
export const IconBoxes     = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42z"/><path d="m7 16.5-4.74-2.85"/><path d="m7 16.5 5-3"/><path d="M7 16.5v5.17"/><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3z"/><path d="m17 16.5-5-3"/><path d="m17 16.5 4.74-2.85"/><path d="M17 16.5v5.17"/><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8z"/><path d="M12 8 7.26 5.15"/><path d="m12 8 4.74-2.85"/><path d="M12 13.5V8"/></svg>;
export const IconPaperclip = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
export const IconClipboard = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>;
export const IconRotateCcw = ({size=20,...p}:IP)=><svg {...b(size,p)}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-5.51"/></svg>;
export const IconImage     = ({size=20,...p}:IP)=><svg {...b(size,p)}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;
export const IconGithub    = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>;
export const IconTriangle  = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M12 2L2 20h20L12 2z"/></svg>;
export const IconMenu      = ({size=20,...p}:IP)=><svg {...b(size,p)}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
export const IconCircle    = ({size=20,...p}:IP)=><svg {...b(size,p)}><circle cx="12" cy="12" r="10"/></svg>;
export const IconX2        = ({size=20,...p}:IP)=><svg {...b(size,p)}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

export const IconThumbDown = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>;
export const IconWand      = ({size=20,...p}:IP)=><svg {...b(size,p)}><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2L19 5"/><path d="M3 21l9-9"/><path d="M12.2 6.2L11 5"/></svg>;
export const IconArrowUp   = ({size=20,...p}:IP)=><svg {...b(size,p)}><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
export const IconHistory   = ({size=20,...p}:IP)=><svg {...b(size,p)}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-5.51"/><path d="M12 7v5l3 3"/></svg>;

