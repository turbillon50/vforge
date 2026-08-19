"use client";

import Link from "next/link";
import { ClerkLoaded, ClerkLoading, SignIn, SignUp } from "@clerk/nextjs";
import { Check, LockKeyhole } from "lucide-react";
import { VWordmark } from "@/components/brand/VMark";
import { ClerkPlaceholder } from "@/components/auth/ClerkPlaceholder";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";

const studioAppearance = {
  variables: {
    colorPrimary: "#ff5c35",
    colorText: "#1b1a17",
    colorTextSecondary: "#6f695f",
    colorBackground: "#ffffff",
    colorInputBackground: "#f7f5ef",
    colorInputText: "#1b1a17",
    colorDanger: "#b42318",
    borderRadius: "14px",
    fontFamily: "var(--font-geist-sans), Geist, system-ui, sans-serif",
  },
  elements: {
    rootBox: { width: "100%" },
    cardBox: { width: "100%", boxShadow: "none" },
    card: { width: "100%", background: "transparent", border: "0", boxShadow: "none", padding: "0" },
    header: { display: "none" },
    socialButtonsBlockButton: {
      minHeight: "46px",
      border: "1px solid #d9d4c9",
      background: "#ffffff",
      color: "#1b1a17",
      boxShadow: "none",
      "&:hover": { background: "#f7f5ef", borderColor: "#bdb6aa" },
    },
    socialButtonsBlockButtonText: { color: "#1b1a17", fontWeight: 550 },
    dividerLine: { background: "#ded9cf" },
    dividerText: { color: "#8a847a", fontSize: "12px" },
    formFieldLabel: { color: "#4f4a43", fontWeight: 550, fontSize: "13px" },
    formFieldInput: {
      minHeight: "46px",
      border: "1px solid #d9d4c9",
      background: "#f7f5ef",
      color: "#1b1a17",
      boxShadow: "none",
      "&:focus": { border: "1px solid #ff5c35", boxShadow: "0 0 0 3px rgba(255,92,53,.12)" },
    },
    formButtonPrimary: {
      minHeight: "46px",
      background: "#1b1a17",
      color: "#ffffff",
      boxShadow: "none",
      fontWeight: 650,
      "&:hover": { background: "#ff5c35" },
    },
    footerActionText: { color: "#777168" },
    footerActionLink: { color: "#d94725", fontWeight: 650 },
    identityPreview: { border: "1px solid #d9d4c9", background: "#f7f5ef" },
    logoBox: { display: "none" },
  },
} as const;

function AuthLoading() {
  return (
    <div className="space-y-4" aria-label="Cargando acceso">
      <div className="h-12 rounded-[14px] bg-[#f0ede6]" />
      <div className="flex items-center gap-3"><span className="h-px flex-1 bg-[#ded9cf]" /><span className="text-xs text-[#8a847a]">o</span><span className="h-px flex-1 bg-[#ded9cf]" /></div>
      <div className="h-12 rounded-[14px] bg-[#f0ede6]" />
      <div className="h-12 rounded-[14px] bg-[#f0ede6]" />
      <div className="h-12 rounded-[14px] bg-[#1b1a17]" />
    </div>
  );
}

export function AuthSurface({ mode }: { mode: "sign-in" | "sign-up" }) {
  const signIn = mode === "sign-in";
  const clerkEnabled = hasClerkPublishableKey();

  return (
    <main className="vf-studio min-h-dvh bg-[#f4f1ea] text-[#1b1a17]">
      <div className="grid min-h-dvh lg:grid-cols-[minmax(360px,.82fr)_minmax(520px,1.18fr)]">
        <section className="flex min-h-[360px] flex-col justify-between border-b border-[#d9d4c9] p-6 sm:p-10 lg:min-h-dvh lg:border-b-0 lg:border-r lg:p-12">
          <Link href="/" aria-label="Volver a VForge" className="w-fit text-[#1b1a17]"><VWordmark /></Link>
          <div className="my-16 max-w-lg lg:my-10">
            <p className="text-sm font-medium text-[#ff5c35]">Tu sala privada</p>
            <h1 className="mt-5 text-5xl font-semibold leading-[.96] tracking-[-0.06em] text-[#1b1a17] sm:text-6xl">
              El proyecto primero. Todo lo demás, fuera de cuadro.
            </h1>
            <div className="mt-8 space-y-3 text-sm text-[#625e56]">
              {["Tres vistas al mismo tiempo", "Invitados con acceso limitado", "Comentarios y actividad en contexto"].map((item) => (
                <p key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-[#2f8c5c]" />{item}</p>
              ))}
            </div>
          </div>
          <p className="flex items-center gap-2 text-xs text-[#777168]"><LockKeyhole className="h-3.5 w-3.5" />Tu infraestructura nunca se comparte con invitados.</p>
        </section>

        <section className="flex items-center justify-center bg-[#fbfaf7] px-5 py-12 sm:px-10">
          <div className="w-full max-w-[430px]">
            <p className="text-sm font-medium text-[#ff5c35]">{signIn ? "Bienvenido de vuelta" : "Tu espacio de trabajo"}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#1b1a17] sm:text-4xl">{signIn ? "Entra a tus proyectos" : "Crea tu acceso"}</h2>
            <p className="mt-3 text-sm leading-6 text-[#777168]">{signIn ? "Continúa exactamente donde se quedó el proyecto." : "Empieza con un espacio privado para tu equipo y tus clientes."}</p>

            <div className="mt-8 rounded-[22px] border border-[#d9d4c9] bg-white p-5 shadow-[0_18px_50px_rgba(35,31,25,.07)] sm:p-7">
              {clerkEnabled ? (
                <>
                  <ClerkLoading><AuthLoading /></ClerkLoading>
                  <ClerkLoaded>{signIn ? <SignIn appearance={studioAppearance} /> : <SignUp appearance={studioAppearance} />}</ClerkLoaded>
                </>
              ) : <ClerkPlaceholder mode={mode} />}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
