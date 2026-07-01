import Link from "next/link";

const LINKS = {
  "Producto": [
    { label: "Docs", href: "/developers" },
    { label: "Blog", href: "/blog" },
    { label: "Changelog", href: "/app/changelog" },
    { label: "Status", href: "#" },
  ],
  "Plataforma": [
    { label: "MCP Bridge", href: "/developers" },
    { label: "Brain Memory", href: "/developers" },
    { label: "Integraciones", href: "/app/integrations" },
    { label: "API", href: "/developers" },
  ],
  "Empresa": [
    { label: "Acerca de", href: "#" },
    { label: "Privacidad", href: "#" },
    { label: "Términos", href: "#" },
    { label: "Contacto", href: "#" },
  ],
};

export function MarketingFooter() {
  return (
    <footer style={{
      background: "#000",
      borderTop: "1px solid #303236",
      padding: "64px 24px 40px",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Top row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          gap: 48,
          marginBottom: 64,
        }}>
          {/* Brand */}
          <div>
            <Link href="/" style={{
              display: "flex", alignItems: "center", gap: 10,
              textDecoration: "none", marginBottom: 16,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L22 20H2L12 2Z" fill="#37C38F"/>
              </svg>
              <span style={{
                fontSize: 15, fontWeight: 600,
                letterSpacing: "-0.03em", color: "#FFFFFF",
              }}>
                VForge
              </span>
            </Link>
            <p style={{
              fontSize: 13, color: "#6B6B6B",
              lineHeight: 1.65, maxWidth: 280,
            }}>
              La plataforma MCP que conecta Git, Vercel y tus agentes de IA en un solo flujo.
            </p>
          </div>

          {/* Links */}
          {Object.entries(LINKS).map(([title, items]) => (
            <div key={title}>
              <h4 style={{
                fontSize: 12, fontWeight: 500,
                letterSpacing: "0.06em", textTransform: "uppercase",
                color: "#FFFFFF", marginBottom: 16,
              }}>
                {title}
              </h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                {items.map(item => (
                  <li key={item.label}>
                    <Link href={item.href} style={{
                      fontSize: 13, color: "#6B6B6B",
                      textDecoration: "none", transition: "color 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#FFFFFF")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#6B6B6B")}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row */}
        <div style={{
          borderTop: "1px solid #303236",
          paddingTop: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}>
          <p style={{ fontSize: 12, color: "#4A4A4A" }}>
            © 2026 VForge. Todos los derechos reservados.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{
              display: "inline-block", width: 6, height: 6,
              background: "#37C38F", borderRadius: "50", marginRight: 6,
            }}/>
            <span style={{ fontSize: 12, color: "#4A4A4A" }}>
              Todos los sistemas operativos
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}

