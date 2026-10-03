"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ForgeMark, GitHubMark, VercelMark } from "./MonochromeHome";
import "./monochrome-home.css";

const CHAT_SPLASH_KEY = "vf-monochrome-splash-v1";
const CHAT_URL = "/chat";

export function MobileChatLaunch() {
  const router = useRouter();
  const leaving = useRef(false);

  const openChat = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;

    try {
      sessionStorage.setItem(CHAT_SPLASH_KEY, "1");
    } catch {
      // El salto al chat no depende del almacenamiento.
    }

    document.getElementById("mobile-chat-splash")?.classList.add("gone");
    window.setTimeout(() => router.replace(CHAT_URL), 160);
  }, [router]);

  useEffect(() => {
    document.documentElement.removeAttribute("data-vf-splash");
    const timer = window.setTimeout(openChat, 2350);
    return () => window.clearTimeout(timer);
  }, [openChat]);

  return (
    <main className="fx-root min-h-dvh bg-[#0A0A0A] text-white" aria-label="Cargando VForge">
      <div
        id="mobile-chat-splash"
        className="fx-splash"
        role="button"
        tabIndex={0}
        onClick={openChat}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") openChat();
        }}
      >
        <div className="fx-seq">
          <div className="fx-cimientos">
            <span className="fx-b fx-b-gh">
              <GitHubMark size={40} />
            </span>
            <span className="fx-b fx-b-vc">
              <VercelMark size={40} />
            </span>
          </div>
          <div className="fx-nace">
            <ForgeMark size={38} className="fx-tri" />
            <span className="fx-word">VForge</span>
          </div>
        </div>
        <div className="fx-skip">Entrar al chat</div>
      </div>
    </main>
  );
}
