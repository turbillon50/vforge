export const metadata = {
  title: "Navegador Vulcano — IA & Human",
  description: "Tu navegador remoto operado por IA, con relevo humano para logins, registros y pagos.",
};

export default function VulcanoPage() {
  const C = "https://vulcano.vmomentum.site/vulcano";
  return (
    <main style={{ minHeight: "100vh", background: "#0B0D10", color: "#E7ECF2",
      fontFamily: "Inter, system-ui, sans-serif", display: "flex",
      alignItems: "center", justifyContent: "center", padding: "32px" }}>
      <div style={{ maxWidth: 560, width: "100%", background: "#15191F",
        border: "1px solid #232a33", borderRadius: 18, padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span style={{ width: 26, height: 26, borderRadius: 8,
            background: "radial-gradient(circle at 30% 30%, #1D9E75, #0F6E56)",
            boxShadow: "0 0 16px rgba(29,158,117,.5)" }} />
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Navegador Vulcano</h1>
        </div>
        <p style={{ color: "#8A95A3", fontSize: 13, textTransform: "uppercase",
          letterSpacing: ".4px", margin: "0 0 18px" }}>IA &amp; Human</p>
        <p style={{ color: "#C4CCD6", lineHeight: 1.5, fontSize: 15 }}>
          Un navegador remoto en la nube de VForge. La IA (Vulcano) lo opera por ti;
          cuando hace falta un login, registro o captcha, te pasa el control.
          La IA nunca hace logins, registros, captchas ni pagos — eso siempre lo haces tú.
        </p>
        <a href={C} target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "100%", marginTop: 18, padding: "14px 20px", borderRadius: 12,
            fontWeight: 700, fontSize: 15, textDecoration: "none", color: "#062018",
            background: "linear-gradient(180deg,#27B98A,#0F6E56)" }}>
          Abrir mi Navegador Vulcano →
        </a>
        <p style={{ color: "#6c7682", fontSize: 12, marginTop: 16, lineHeight: 1.5 }}>
          Cada usuario tendrá su propia instancia aislada bajo su responsabilidad.
          Esta es la instancia owner (Luis). Acceso protegido con contraseña.
        </p>
      </div>
    </main>
  );
}
