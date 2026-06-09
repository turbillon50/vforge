export const metadata = { title: "Aviso de Privacidad — VForge" };

export default function PrivacidadPage() {
  return (
    <>
      <p className="eyebrow">Legal</p>
      <h1>Aviso de Privacidad</h1>
      <p className="muted">Vigente desde junio de 2026.</p>

      <p>
        All Global Holding LLC ("VForge", "nosotros"), con domicilio en Cancún, Quintana Roo, México,
        en su carácter de responsable del tratamiento de datos personales, describe en este Aviso de
        Privacidad ("Aviso") la forma en que recaba, usa, protege y comparte tus datos personales
        cuando usas la plataforma VForge (el "Servicio"). Al usar el Servicio aceptas las prácticas
        descritas en este Aviso.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        El responsable del tratamiento de tus datos personales es{" "}
        <strong>All Global Holding LLC / VMomentum</strong>. Para cualquier asunto relacionado con tu
        privacidad puedes contactarnos en{" "}
        <a href="mailto:luisdelator@vmomentums.info">luisdelator@vmomentums.info</a>.
        Domicilio para notificaciones: Cancún, Quintana Roo, México.
      </p>

      <h2>2. Datos que recopilamos</h2>
      <ul>
        <li>
          <strong>Datos de identidad y cuenta:</strong> nombre completo y correo electrónico,
          administrados a través de Clerk, nuestro proveedor de autenticación.
        </li>
        <li>
          <strong>Datos de proyecto:</strong> el código, la configuración, repositorios y cualquier
          contenido que crees o conectes a tus proyectos dentro de la plataforma.
        </li>
        <li>
          <strong>Credenciales y tokens:</strong> claves de API y tokens OAuth de servicios que tú
          conectas (GitHub, Vercel, Stripe, Neon, Resend, Twilio, entre otros). Se almacenan
          cifradas en reposo (AES-256-GCM) y nunca se exponen en texto claro fuera de la plataforma.
        </li>
        <li>
          <strong>Datos de uso y técnicos:</strong> actividad dentro de la app, registros del
          servidor (logs), métricas de rendimiento y eventos de auditoría necesarios para operar y
          mejorar el Servicio.
        </li>
      </ul>

      <h2>3. Uso de los datos</h2>
      <p>Usamos tus datos para las siguientes finalidades:</p>
      <ul>
        <li>Prestar, mantener y mejorar el Servicio y sus funciones.</li>
        <li>Ejecutar las acciones que autorizas sobre tus repositorios, despliegues y servicios conectados.</li>
        <li>Administrar contratos, facturas y plan de pagos.</li>
        <li>Comunicarnos contigo sobre el Servicio, soporte técnico y avisos importantes.</li>
        <li>Garantizar la seguridad de la plataforma, prevenir fraudes y cumplir obligaciones legales.</li>
      </ul>

      <h2>4. No vendemos tus datos</h2>
      <p>
        <strong>No vendemos, rentamos ni compartimos tus datos personales con terceros para fines
        publicitarios o comerciales.</strong> No usamos tu código ni el contenido de tus proyectos
        para entrenar modelos de inteligencia artificial.
      </p>

      <h2>5. Proveedores y encargados del tratamiento</h2>
      <p>
        Para prestar el Servicio nos apoyamos en proveedores que actúan como encargados del
        tratamiento bajo sus propias políticas de privacidad:
      </p>
      <ul>
        <li><strong>Clerk:</strong> autenticación e identidad.</li>
        <li><strong>Vercel:</strong> alojamiento y despliegue.</li>
        <li><strong>Neon:</strong> base de datos en la nube.</li>
        <li><strong>Stripe / Mercado Pago:</strong> procesamiento de pagos.</li>
        <li><strong>GitHub:</strong> repositorios y control de versiones.</li>
        <li><strong>Resend:</strong> envío de correos transaccionales.</li>
        <li><strong>Twilio:</strong> mensajería y notificaciones.</li>
      </ul>
      <p>
        Compartimos con estos proveedores únicamente los datos estrictamente necesarios para la
        función que prestan.
      </p>

      <h2>6. Conservación de datos</h2>
      <p>
        Conservamos tus datos personales mientras tu cuenta esté activa o durante el tiempo necesario
        para cumplir con las finalidades del tratamiento y nuestras obligaciones legales. Al concluir
        dicho período los datos son eliminados o anonimizados de forma segura.
      </p>

      <h2>7. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas para proteger tus datos: cifrado en reposo de
        secretos y tokens (AES-256-GCM), control de accesos por roles, aislamiento de datos por
        proyecto y registros de auditoría. Trabajamos de forma continua para minimizar riesgos, aunque
        ningún sistema es infalible.
      </p>

      <h2>8. Tus derechos (ARCO)</h2>
      <p>
        Tienes derecho a <strong>Acceder, Rectificar, Cancelar</strong> (eliminar) y{" "}
        <strong>Oponerte</strong> al tratamiento de tus datos personales, así como a revocar el
        consentimiento previamente otorgado. Para ejercer estos derechos escríbenos a{" "}
        <a href="mailto:luisdelator@vmomentums.info">luisdelator@vmomentums.info</a>. Atenderemos tu
        solicitud en los plazos que establezca la ley aplicable.
      </p>

      <h2>9. Jurisdicción y ley aplicable</h2>
      <p>
        Este Aviso se rige por las leyes aplicables en Cancún, Quintana Roo, México. Para la
        resolución de cualquier controversia las partes se someten a la jurisdicción de los
        tribunales competentes de dicha ciudad.
      </p>

      <h2>10. Cambios a este Aviso</h2>
      <p>
        Podemos actualizar este Aviso de Privacidad. Cuando los cambios sean sustanciales lo
        notificaremos por medios razonables antes de su entrada en vigor. El uso continuado del
        Servicio implica la aceptación de la versión vigente.
      </p>

      <h2>11. Contacto</h2>
      <p>
        Para el ejercicio de derechos ARCO, dudas de privacidad o cualquier consulta relacionada:
      </p>
      <p>
        <a href="mailto:luisdelator@vmomentums.info">luisdelator@vmomentums.info</a>
      </p>

      <p className="muted">
        All Global Holding LLC · VMomentum · VForge · Cancún, Q.R. · Última actualización: junio 2026.
      </p>
    </>
  );
}
