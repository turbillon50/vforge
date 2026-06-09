export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/docusign/callback
 *
 * OAuth callback endpoint for DocuSign authorization flow.
 * Receives the authorization code and state from DocuSign,
 * logs the code (NOT stored in DB), and returns a friendly HTML page.
 */
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  // Log the code for server-side inspection — intentionally NOT stored in DB
  console.log("[docusign/callback] Authorization code received:", code);
  console.log("[docusign/callback] State param:", state);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DocuSign — Autorización recibida</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0a0a0f;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      text-align: center;
      max-width: 440px;
      padding: 2.5rem 2rem;
      background: #111118;
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 16px;
      box-shadow: 0 0 40px rgba(139, 92, 246, 0.08);
    }
    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 50%;
      margin-bottom: 1.25rem;
    }
    .icon svg { width: 28px; height: 28px; color: #10b981; }
    h1 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #f1f5f9;
      letter-spacing: -0.02em;
      margin-bottom: 0.75rem;
    }
    p {
      font-size: 0.9rem;
      line-height: 1.6;
      color: #94a3b8;
      margin-bottom: 0.5rem;
    }
    .badge {
      display: inline-block;
      margin-top: 1.25rem;
      padding: 0.3rem 0.75rem;
      background: rgba(139, 92, 246, 0.12);
      border: 1px solid rgba(139, 92, 246, 0.25);
      border-radius: 9999px;
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #a78bfa;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
    </div>
    <h1>Autorización DocuSign recibida</h1>
    <p>La autorización fue procesada correctamente.</p>
    <p>Ya puede cerrar esta ventana.</p>
    <span class="badge">VForge · DocuSign OAuth</span>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
