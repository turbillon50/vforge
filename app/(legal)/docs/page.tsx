export const metadata = { title: "Documentación — VForge" };

export default function DocsPage() {
  return (
    <>
      <p className="eyebrow">Documentación</p>
      <h1>Documentación de VForge</h1>
      <p>
        VForge es una plataforma para construir y operar productos de software a través de una
        conversación. El centro de la experiencia es el chat: abres la app y hablas con tu copiloto,
        que conecta tus repositorios, tus despliegues y los servicios de tu proyecto en un solo lugar.
        Esta documentación explica el método, las integraciones, los planes, la seguridad y el
        servidor MCP.
      </p>

      <h2>Qué es VForge</h2>
      <p>
        VForge existe para convertir el caos tecnológico en un sistema organizado, visual y
        ejecutable. En lugar de saltar entre veinte herramientas, repositorios dispersos y
        documentación desordenada, trabajas desde una sola interfaz conversacional donde construir una
        aplicación se siente tan natural como describir lo que quieres. La plataforma se encarga del
        orden: qué se construye, cómo se despliega y cómo se mantiene vivo el ecosistema de tus
        proyectos.
      </p>

      <h2>El método</h2>
      <p>
        VForge sigue un método claro, pensado para llevarte de la idea a la operación sin fricción:
      </p>
      <ul>
        <li><strong>El chat como centro:</strong> una sola conversación reemplaza menús y pantallas. Todo sucede alrededor del diálogo con tu copiloto.</li>
        <li><strong>Conecta tu mundo:</strong> enlazas GitHub, Vercel y los servicios de tu proyecto para que VForge pueda actuar dentro de los permisos que autorizas.</li>
        <li><strong>Define el alcance:</strong> un asistente te guía, una pregunta a la vez, para precisar qué hace tu aplicación: tipo, público, funcionalidades e integraciones, y con eso arma el plano (blueprint) del proyecto.</li>
        <li><strong>Construye y despliega:</strong> creas repositorios, generas interfaces, iteras por versiones con vista previa y lanzas a producción, viendo el avance en tiempo real.</li>
        <li><strong>Opera con orden:</strong> RepoVision y los Despliegues te dan una vista limpia de la arquitectura real de tus proyectos para mantener el ecosistema ordenado.</li>
      </ul>

      <h2>Integraciones</h2>
      <p>
        Desde el panel de Integraciones conectas tus servicios de dos formas, según el proveedor:
      </p>
      <ul>
        <li><strong>OAuth de un click:</strong> GitHub, Vercel y Stripe se conectan autorizando los permisos directamente en el proveedor, sin pegar tokens a mano.</li>
        <li><strong>Clave de API validada:</strong> Neon, Resend, Clerk, Twilio y Maps se conectan con una clave de API que tú proporcionas y que VForge valida antes de guardarla.</li>
      </ul>
      <p>
        Una vez conectado un servicio, VForge puede ejecutar en tu nombre las acciones que autorizas
        —crear repositorios, lanzar despliegues, gestionar variables y coordinar servicios—. Puedes
        revocar cualquier acceso en todo momento desde Integraciones o desde el propio proveedor.
      </p>

      <h2>Planes y límites</h2>
      <p>
        VForge ofrece planes para distintos niveles de uso, con precios en USD:
      </p>
      <ul>
        <li><strong>Free:</strong> acceso básico sin costo, con límites de uso para empezar.</li>
        <li><strong>Studio (USD $20/mes):</strong> para construir y operar proyectos de forma continua.</li>
        <li><strong>Forge (USD $100/mes):</strong> para mayor capacidad y volumen de trabajo.</li>
        <li><strong>Pay-as-you-go:</strong> consumo medido, pagas según lo que uses.</li>
      </ul>
      <p>
        Las suscripciones se renuevan automáticamente y puedes cancelar cuando quieras; consulta los{" "}
        <a href="/terms">Términos</a> para el detalle de pagos, renovación y cancelación.
      </p>

      <h2>RepoVision</h2>
      <p>
        RepoVision mapea la arquitectura real de tus proyectos: qué depende de qué, qué servicios
        están vinculados, qué repositorios y ramas siguen vivos y qué recursos conviene archivar. No
        es una decoración: es una herramienta para entender la salud de tus repos y limpiar el ruido
        que se acumula al construir múltiples aplicaciones al mismo tiempo. Los Despliegues se
        presentan como tarjetas por proyecto, con su actividad, dominios y estado.
      </p>

      <h2>Seguridad y bóveda cifrada</h2>
      <p>
        Tus secretos importan. Los tokens OAuth y las claves de API que conectas se guardan en una
        bóveda con cifrado en reposo, ligados a tu cuenta y nunca expuestos en claro. VForge aplica
        controles de acceso y un aislamiento multi-tenant que separa la información de cada usuario.
        Para el detalle de cómo tratamos tus datos, consulta el{" "}
        <a href="/privacy">Aviso de Privacidad</a>.
      </p>

      <h2>El servidor MCP de VForge</h2>
      <p>
        VForge expone un servidor MCP (Model Context Protocol) que permite que agentes y herramientas
        compatibles interactúen con la plataforma de forma programática y segura. A través de MCP, un
        agente autorizado puede consultar el estado de tus proyectos y coordinar acciones dentro de
        los permisos que concedes, integrando a VForge en tus propios flujos de trabajo. El uso del
        servidor MCP está sujeto a los <a href="/terms">Términos del Servicio</a> y a las políticas de
        uso responsable.
      </p>

      <h2>Soporte</h2>
      <p>
        ¿Dudas o problemas? Escríbenos a{" "}
        <a href="mailto:luisdelator@vmomentums.info">luisdelator@vmomentums.info</a> o visita la
        página de <a href="/support">Soporte</a>, donde encontrarás cómo reportar incidencias y
        preguntas frecuentes.
      </p>
      <p className="muted">All Global Holding LLC · VForge · Última actualización: junio 2026.</p>
    </>
  );
}
