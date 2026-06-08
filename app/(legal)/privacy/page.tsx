export const metadata = { title: "Política de Privacidad — VForge" };

export default function PrivacyPage() {
  return (
    <>
      <p className="eyebrow">Legal · All Global Holding LLC</p>
      <h1>Política de Privacidad</h1>
      <p className="muted">Vigente desde el 1 de junio de 2026 · Versión 2.0</p>

      <p>All Global Holding LLC ("VForge") se compromete a proteger tu privacidad. Esta Política explica qué datos recopilamos, cómo los usamos y cuáles son tus derechos.</p>

      <h2>1. Datos que recopilamos</h2>
      <p><strong>Datos de cuenta:</strong> nombre, correo electrónico, foto de perfil (vía Clerk). <strong>Datos de uso:</strong> conversaciones con V, proyectos creados, integraciones conectadas, logs de deploy. <strong>Datos técnicos:</strong> dirección IP, tipo de dispositivo, browser, cookies de sesión. <strong>Datos de pago:</strong> procesados directamente por Stripe o Mercado Pago — no almacenamos números de tarjeta.</p>

      <h2>2. Cómo usamos tus datos</h2>
      <p>Para operar y mejorar el Servicio; para que V tenga contexto de tu proyecto y pueda ayudarte mejor; para enviarte notificaciones del Servicio (no marketing sin tu consentimiento); para detectar y prevenir fraude y abusos; para cumplir obligaciones legales.</p>

      <h2>3. Compartición de datos</h2>
      <p>No vendemos tus datos. Los compartimos únicamente con: (a) proveedores de infraestructura (Vercel, Neon, Hetzner) bajo acuerdos de confidencialidad; (b) servicios de autenticación (Clerk); (c) procesadores de pago (Stripe, Mercado Pago); (d) cuando la ley lo exija.</p>

      <h2>4. Seguridad</h2>
      <p>Todos los datos en tránsito se protegen con TLS 1.3. Los secretos de proyectos se almacenan encriptados. Las contraseñas nunca se almacenan en texto plano. Realizamos auditorías de seguridad periódicas.</p>

      <h2>5. Retención</h2>
      <p>Conservamos tus datos mientras tu cuenta esté activa. Tras la cancelación, los datos se eliminan en 30 días, salvo obligación legal de conservación. Los logs de seguridad se conservan por 90 días.</p>

      <h2>6. Tus derechos</h2>
      <p>Tienes derecho a: acceder a tus datos, corregirlos, solicitar su eliminación ("derecho al olvido"), portabilidad en formato JSON, y retirar tu consentimiento en cualquier momento. Para ejercer estos derechos: <a href="mailto:privacy@vforge.site" className="text-violet-400 hover:underline">privacy@vforge.site</a>.</p>

      <h2>7. Cookies</h2>
      <p>Usamos cookies estrictamente necesarias para la sesión (Clerk) y cookies de preferencias (tema, idioma). No usamos cookies de rastreo de terceros para publicidad.</p>

      <h2>8. Menores</h2>
      <p>El Servicio no está dirigido a menores de 18 años. Si detectamos que un menor ha creado una cuenta, la eliminaremos de inmediato.</p>

      <h2>9. Cambios</h2>
      <p>Te notificaremos cambios materiales por correo con 15 días de anticipación. El uso continuado tras la fecha de entrada en vigor implica aceptación.</p>

      <h2>10. Contacto</h2>
      <p><a href="mailto:privacy@vforge.site" className="text-violet-400 hover:underline">privacy@vforge.site</a> · All Global Holding LLC · Guadalajara, México.</p>
    </>
  );
}
