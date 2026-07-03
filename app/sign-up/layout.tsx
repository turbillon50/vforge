"use client";
import { useEffect } from "react";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const body = document.body;
    body.style.background = "#0A0A0A";
    body.style.color = "#e5e2e1";
    body.classList.remove("scanlines");
    const splash = body.querySelector("[style*='z-index: 9999']") as HTMLElement | null;
    if (splash) splash.style.display = "none";
    return () => { body.style.background = ""; body.style.color = ""; };
  }, []);
  return <>{children}</>;
}
