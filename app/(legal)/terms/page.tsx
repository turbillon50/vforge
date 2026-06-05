export const metadata = { title: "Términos del Servicio — VForge" };

export default function TermsPage() {
  return (
    <>
      <p className="eyebrow">Legal</p>
      <h1>Términos del Servicio</h1>
      <p className="muted">Vigentes desde junio de 2026.</p>

      <p>
        Estos Términos del Servicio (los “Términos”) constituyen un acuerdo legal entre tú (el
        “Usuario” o “tú”) y All Global Holding LLC (“VForge”, “nosotros” o “nuestro”), y rigen el
        acceso y uso de la plataforma VForge, su sitio web, sus interfaces, su API y su servidor MCP
        (en conjunto, el “Servicio”). Lee estos Términos con atención. Al crear una cuenta, conectar
        un servicio de terceros o usar el Servicio de cualquier forma, declaras que has leído,
        entendido y aceptado quedar obligado por estos Términos. Si no estás de acuerdo, no debes
        usar el Servicio.
      </p>

      <h2>1. Aceptación de los Términos</h2>
      <p>
        Para usar el Servicio debes ser mayor de edad en tu jurisdicción y tener capacidad legal para
        celebrar contratos. Si usas el Servicio en nombre de una empresa u organización, declaras que
        cuentas con autoridad para vincular a esa entidad a estos Términos, en cuyo caso “tú” se
        refiere también a dicha entidad.
      </p>

      <h2>2. Descripción del Servicio</h2>
      <p>
        VForge es una plataforma para construir y operar productos de software a través de una
        conversación. El centro de la experiencia es el chat: desde una sola interfaz puedes definir
        el alcance de tu proyecto, generar código e interfaces, iterar por versiones con vista previa,
        crear repositorios y desplegar aplicaciones, todo a partir de instrucciones en lenguaje
        natural.
      </p>
      <p>
        Para operar tus proyectos, el Servicio te permite conectar servicios de terceros que tú
        autorizas, entre ellos:
      </p>
      <ul>
        <li>GitHub, Vercel y Stripe mediante autorización OAuth.</li>
        <li>Neon, Resend, Clerk, Twilio y otros mediante claves de API (API keys) que tú proporcionas y que son validadas.</li>
      </ul>
      <p>
        Una vez conectados, el Servicio actúa en tu nombre dentro de los permisos que concedes para
        ejecutar acciones tales como crear o modificar repositorios, lanzar despliegues, gestionar
        variables de entorno y coordinar los servicios de tu proyecto.
      </p>

      <h2>3. Cuentas y registro</h2>
      <p>
        Para usar el Servicio debes crear una cuenta. La autenticación se gestiona a través de nuestro
        proveedor de identidad. Te comprometes a proporcionar información veraz y actualizada, a
        mantener la confidencialidad de tus credenciales de acceso y a notificarnos de inmediato
        cualquier uso no autorizado de tu cuenta. Eres responsable de toda la actividad que ocurra
        bajo tu cuenta. Podemos suspender o cancelar cuentas que incumplan estos Términos o que
        representen un riesgo para el Servicio o para terceros.
      </p>

      <h2>4. Planes y pagos</h2>
      <p>
        El Servicio ofrece distintos planes. Los precios se expresan en dólares de los Estados Unidos
        de América (USD):
      </p>
      <ul>
        <li><strong>Free:</strong> acceso básico sin costo, sujeto a límites de uso.</li>
        <li><strong>Studio:</strong> USD $20 al mes.</li>
        <li><strong>Forge:</strong> USD $100 al mes.</li>
        <li><strong>Pay-as-you-go:</strong> consumo medido según el uso que realices.</li>
      </ul>
      <p>
        Los pagos se procesan a través de Stripe y de Mercado Pago, según el método disponible para
        tu región. Los planes de suscripción se renuevan automáticamente al inicio de cada periodo
        hasta que los canceles. Puedes cancelar en cualquier momento; la cancelación surte efecto al
        final del periodo en curso y conservas el acceso hasta entonces. Salvo que la ley aplicable
        disponga lo contrario, los importes correspondientes a un periodo ya prestado no son
        reembolsables. Los precios y las condiciones pueden cambiar; te avisaremos con antelación
        razonable de cualquier cambio que afecte un periodo futuro.
      </p>

      <h2>5. Conexiones de terceros y tus credenciales</h2>
      <p>
        Cuando conectas un servicio de terceros mediante OAuth o mediante una clave de API, nos
        autorizas a usar esa conexión exclusivamente para operar tu proyecto dentro de los permisos
        que otorgas. Eres el único responsable de las credenciales, tokens y claves que conectas, de
        contar con los derechos para usarlas y de cumplir los términos y políticas de cada proveedor.
        Puedes revocar cualquier acceso en todo momento desde el panel de Integraciones o directamente
        en el proveedor. No somos responsables de la disponibilidad, las políticas, los costos ni las
        decisiones de los servicios de terceros que decidas conectar.
      </p>

      <h2>6. Propiedad del contenido</h2>
      <p>
        Conservas la plena titularidad del código, los datos y demás contenido que crees, subas o
        conectes (tu “Contenido”). Nos otorgas una licencia limitada, no exclusiva y revocable para
        alojar, procesar y transmitir tu Contenido con el único fin de prestarte el Servicio y
        ejecutar las acciones que autorizas. <strong>No usamos tu código ni tu Contenido para entrenar
        modelos de inteligencia artificial.</strong>
      </p>

      <h2>7. Uso aceptable</h2>
      <p>
        Te comprometes a no usar el Servicio para:
      </p>
      <ul>
        <li>Actividades ilegales o que infrinjan derechos de terceros.</li>
        <li>Crear, alojar o distribuir malware, código malicioso o contenido fraudulento.</li>
        <li>Vulnerar, atacar o acceder sin autorización a sistemas, redes o datos de terceros.</li>
        <li>Eludir límites de uso, mecanismos de seguridad o cuotas del Servicio.</li>
        <li>Infringir derechos de propiedad intelectual, privacidad o de cualquier otra índole.</li>
      </ul>
      <p>
        Podemos retirar contenido, restringir funciones o suspender el acceso ante incumplimientos.
      </p>

      <h2>8. Servidor MCP</h2>
      <p>
        VForge expone un servidor MCP (Model Context Protocol) que permite que agentes y herramientas
        compatibles interactúen con el Servicio de forma programática. Su uso queda sujeto a estos
        Términos y a las políticas de uso aceptable. Debes usar el servidor MCP de manera responsable,
        respetando los límites de la plataforma, sin sobrecargar la infraestructura y sin ejecutar
        acciones para las que no tengas autorización.
      </p>

      <h2>9. Disponibilidad y garantías</h2>
      <p>
        El Servicio se ofrece “tal cual” y “según disponibilidad”. Hacemos esfuerzos razonables por
        mantenerlo operativo, seguro y actualizado, pero no garantizamos que funcione de forma
        ininterrumpida, libre de errores o adecuada para un fin particular. Eres responsable de
        mantener tus propias copias de seguridad cuando corresponda.
      </p>

      <h2>10. Limitación de responsabilidad</h2>
      <p>
        En la máxima medida permitida por la ley aplicable, VForge no será responsable por daños
        indirectos, incidentales, especiales, punitivos o consecuentes, ni por pérdida de datos,
        ingresos o lucro cesante, derivados del uso o la imposibilidad de uso del Servicio. Nuestra
        responsabilidad total acumulada por cualquier reclamación relacionada con el Servicio no
        excederá el importe que nos hayas pagado en los doce (12) meses anteriores al hecho que
        origine la reclamación.
      </p>

      <h2>11. Indemnización</h2>
      <p>
        Aceptas indemnizar y mantener en paz a All Global Holding LLC, sus directivos, empleados y
        colaboradores frente a cualquier reclamación, daño, pérdida o gasto (incluidos honorarios
        legales razonables) que surja de tu Contenido, de tu uso del Servicio o de tu incumplimiento
        de estos Términos o de la ley aplicable.
      </p>

      <h2>12. Modificaciones</h2>
      <p>
        Podemos actualizar estos Términos en cualquier momento. Si los cambios son sustanciales, lo
        notificaremos por medios razonables. El uso continuado del Servicio tras la entrada en vigor
        de los cambios implica tu aceptación de la versión vigente.
      </p>

      <h2>13. Terminación</h2>
      <p>
        Puedes dejar de usar el Servicio y cerrar tu cuenta en cualquier momento. Podemos suspender o
        terminar tu acceso si incumples estos Términos. A la terminación cesarán tus derechos de uso;
        las disposiciones que por su naturaleza deban subsistir (propiedad, limitación de
        responsabilidad, indemnización) seguirán vigentes.
      </p>

      <h2>14. Ley aplicable</h2>
      <p>
        Estos Términos se rigen por las leyes aplicables al domicilio de All Global Holding LLC, sin
        atender a sus reglas sobre conflicto de leyes. Cualquier controversia se someterá a los
        tribunales competentes de dicha jurisdicción, salvo que la ley imperativa de tu lugar de
        residencia disponga otra cosa.
      </p>

      <h2>15. Contacto</h2>
      <p>
        Para dudas sobre estos Términos, escríbenos a{" "}
        <a href="mailto:luisdelator@vmomentums.info">luisdelator@vmomentums.info</a>.
      </p>
      <p className="muted">All Global Holding LLC · VForge · Última actualización: junio 2026.</p>
    </>
  );
}
