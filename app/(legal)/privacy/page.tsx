export const metadata = { title: "Aviso de Privacidad — VForge" };

export default function PrivacyPage() {
  return (
    <>
      <p className="eyebrow">Legal</p>
      <h1>Aviso de Privacidad</h1>
      <p className="muted">Vigente desde junio de 2026.</p>

      <p>
        All Global Holding LLC (“VForge”, “nosotros”), en su carácter de responsable del tratamiento,
        describe en este Aviso de Privacidad cómo recaba, usa, protege y comparte los datos personales
        de quienes usan la plataforma VForge (el “Servicio”). Al usar el Servicio aceptas las
        prácticas descritas en este Aviso.
      </p>

      <h2>1. Responsable</h2>
      <p>
        El responsable del tratamiento de tus datos personales es All Global Holding LLC. Para
        cualquier asunto relacionado con tu privacidad puedes contactarnos en{" "}
        <a href="mailto:luisdelator@vmomentums.info">luisdelator@vmomentums.info</a>.
      </p>

      <h2>2. Datos que recabamos</h2>
      <ul>
        <li>
          <strong>Datos de cuenta:</strong> nombre y correo electrónico, gestionados a través de
          Clerk, nuestro proveedor de identidad y autenticación.
        </li>
        <li>
          <strong>Tokens OAuth y claves de API:</strong> las credenciales de los servicios que
          conectas (GitHub, Vercel, Stripe, Neon, Resend, Twilio, entre otros). Se guardan{" "}
          <strong>cifradas en una bóveda, con cifrado en reposo</strong>, y nunca se exponen en claro.
        </li>
        <li>
          <strong>Datos de uso:</strong> actividad dentro de la app, registros técnicos y métricas
          necesarias para operar, asegurar y mejorar el Servicio.
        </li>
        <li>
          <strong>Contenido de proyectos:</strong> el código, la configuración y los datos que crees,
          subas o conectes a tus proyectos.
        </li>
      </ul>

      <h2>3. Finalidades del tratamiento</h2>
      <p>
        Tratamos tus datos personales para las siguientes finalidades:
      </p>
      <ul>
        <li>Prestar, mantener y operar el Servicio y sus funciones.</li>
        <li>Ejecutar las acciones que autorizas sobre tus repositorios, despliegues y servicios conectados.</li>
        <li>Procesar pagos y administrar tu plan o consumo.</li>
        <li>Brindarte soporte y comunicarnos contigo sobre el Servicio.</li>
        <li>Mantener la seguridad, prevenir fraudes y cumplir obligaciones legales.</li>
      </ul>

      <h2>4. Base legal y consentimiento</h2>
      <p>
        El tratamiento se sustenta en la ejecución del contrato que celebras al usar el Servicio, en
        tu consentimiento al conectar servicios de terceros, en el cumplimiento de obligaciones
        legales y en nuestro interés legítimo de operar y proteger la plataforma. Puedes retirar tu
        consentimiento en cualquier momento, sin que ello afecte la licitud del tratamiento previo.
      </p>

      <h2>5. No venta de datos y no entrenamiento de modelos</h2>
      <p>
        <strong>No vendemos tus datos personales</strong> ni los usamos para publicidad de terceros.
        <strong> No usamos tu código ni el contenido de tus proyectos para entrenar modelos de
        inteligencia artificial.</strong>
      </p>

      <h2>6. Encargados y terceros</h2>
      <p>
        Para prestar el Servicio nos apoyamos en proveedores que actúan como encargados del
        tratamiento, cada uno con su propia política de privacidad:
      </p>
      <ul>
        <li><strong>Clerk:</strong> autenticación e identidad.</li>
        <li><strong>Stripe</strong> y <strong>Mercado Pago:</strong> procesamiento de pagos.</li>
        <li><strong>Vercel:</strong> alojamiento y despliegue.</li>
        <li><strong>Neon:</strong> base de datos.</li>
        <li><strong>GitHub:</strong> repositorios y control de versiones.</li>
        <li><strong>Resend:</strong> envío de correos.</li>
        <li><strong>Twilio:</strong> mensajería y notificaciones.</li>
      </ul>
      <p>
        Compartimos con estos proveedores únicamente los datos necesarios para la función que prestan.
      </p>

      <h2>7. Transferencias internacionales</h2>
      <p>
        Algunos de nuestros proveedores procesan datos en los Estados Unidos de América u otras
        jurisdicciones. Al usar el Servicio reconoces que tus datos pueden transferirse y tratarse
        fuera de tu país de residencia, con medidas razonables de protección.
      </p>

      <h2>8. Conservación</h2>
      <p>
        Conservamos tus datos personales mientras tu cuenta esté activa o durante el tiempo necesario
        para prestar el Servicio y cumplir obligaciones legales. Cuando dejan de ser necesarios, los
        eliminamos o anonimizamos de forma segura.
      </p>

      <h2>9. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas para proteger tus datos: cifrado en reposo de
        secretos y tokens, controles de acceso, y aislamiento multi-tenant que separa la información
        de cada usuario. Ningún sistema es completamente infalible, pero trabajamos de forma continua
        para minimizar riesgos.
      </p>

      <h2>10. Tus derechos (ARCO)</h2>
      <p>
        Tienes derecho a acceder, rectificar, cancelar (eliminar) y oponerte al tratamiento de tus
        datos personales, así como a revocar el consentimiento otorgado. Para ejercer estos derechos
        escríbenos a{" "}
        <a href="mailto:luisdelator@vmomentums.info">luisdelator@vmomentums.info</a>. Atenderemos tu
        solicitud en los plazos que marque la ley aplicable.
      </p>

      <h2>11. Cookies</h2>
      <p>
        Usamos un conjunto mínimo de cookies esenciales, necesarias para la autenticación y el
        funcionamiento básico del Servicio. No usamos cookies para publicidad de terceros.
      </p>

      <h2>12. Menores de edad</h2>
      <p>
        El Servicio no está dirigido a menores de 18 años y no recabamos datos de menores de forma
        consciente. Si crees que un menor nos ha proporcionado datos, contáctanos para eliminarlos.
      </p>

      <h2>13. Cambios a este Aviso</h2>
      <p>
        Podemos actualizar este Aviso de Privacidad. Cuando los cambios sean sustanciales lo
        notificaremos por medios razonables. El uso continuado del Servicio tras la entrada en vigor
        implica la aceptación de la versión vigente.
      </p>

      <h2>14. Contacto</h2>
      <p>
        Para el ejercicio de derechos y cualquier duda de privacidad:{" "}
        <a href="mailto:luisdelator@vmomentums.info">luisdelator@vmomentums.info</a>.
      </p>
      <p className="muted">All Global Holding LLC · VForge · Última actualización: junio 2026.</p>
    </>
  );
}
