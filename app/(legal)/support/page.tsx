export const metadata = { title: "Soporte — VForge" };

export default function SupportPage() {
  return (
    <>
      <p className="eyebrow">Soporte</p>
      <h1>Estamos para ayudarte</h1>
      <p>
        Si tienes preguntas, encontraste un problema o quieres proponer una mejora, contáctanos.
        Respondemos en horario hábil (zona horaria de México, CST). Atendemos a usuarios en México
        y los Estados Unidos.
      </p>

      <h2>Correo de contacto</h2>
      <p>
        <a href="mailto:luisdelator@vmomentums.info">luisdelator@vmomentums.info</a>
      </p>

      <h2>Qué incluir en tu mensaje</h2>
      <ul>
        <li>Qué intentabas hacer y qué esperabas que pasara.</li>
        <li>Qué ocurrió en su lugar (incluye capturas de pantalla si puedes).</li>
        <li>El proyecto, workspace o la pantalla donde sucedió.</li>
        <li>La hora aproximada y, si aplica, el servicio conectado involucrado (GitHub, Vercel, Stripe, etc.).</li>
      </ul>

      <h2>Temas frecuentes</h2>
      <ul>
        <li>
          <strong>Conexiones:</strong> puedes conectar o revocar GitHub, Vercel, Stripe, Neon,
          Resend, Clerk, Twilio y Google Maps desde la sección de Integraciones. Tus credenciales
          se guardan cifradas y solo tú accedes a ellas.
        </li>
        <li>
          <strong>Planes y facturación:</strong> los pagos se procesan con Stripe. Para cambios de
          plan (Free, Studio, Forge o pago por uso), cancelaciones o aclaraciones de cobro,
          escríbenos al correo de soporte.
        </li>
        <li>
          <strong>Cuenta y acceso:</strong> el inicio de sesión se gestiona con Clerk (correo o
          login social). Si tienes problemas para entrar, indícanos el correo con el que te
          registraste.
        </li>
        <li>
          <strong>Privacidad y datos:</strong> para ejercer tus derechos o solicitar la eliminación
          de tu información, revisa el <a href="/privacy">Aviso de Privacidad</a> y escríbenos.
        </li>
      </ul>

      <h2>Estado del servicio</h2>
      <p>
        VForge corre sobre infraestructura dedicada con despliegues continuos. Si algo se ve caído,
        suele resolverse en minutos; aun así, avísanos por correo para confirmarlo y darle
        seguimiento. Algunas funciones, como construcciones y despliegues, dependen de servicios de
        terceros (por ejemplo GitHub o Vercel), por lo que su disponibilidad también puede influir.
      </p>

      <h2>Más recursos</h2>
      <p>
        Revisa la <a href="/docs">Documentación</a> para entender cómo funciona VForge, los{" "}
        <a href="/terms">Términos del Servicio</a> y el{" "}
        <a href="/privacy">Aviso de Privacidad</a>.
      </p>
      <p className="muted">All Global Holding LLC · VForge</p>
    </>
  );
}
