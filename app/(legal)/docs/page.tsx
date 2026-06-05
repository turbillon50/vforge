export const metadata = { title: "Documentación — VForge" };

export default function DocsPage() {
  return (
    <>
      <p className="eyebrow">Documentación</p>
      <h1>Cómo funciona VForge</h1>
      <p>
        VForge es una plataforma para construir y operar productos de software a través de una
        conversación. El centro de la experiencia es el chat: abres la app y hablas con tu copiloto,
        que conecta tus repositorios de GitHub, tus despliegues de Vercel y los servicios de tu
        proyecto en un solo lugar.
      </p>

      <h2>1. Conecta tu mundo</h2>
      <p>
        Desde Integraciones autorizas GitHub y Vercel con un click —sin pegar tokens manualmente—
        mediante OAuth. Tus credenciales se guardan cifradas y ligadas a tu cuenta; nunca se exponen
        en claro.
      </p>

      <h2>2. Define el alcance</h2>
      <p>
        Un asistente te guía, una pregunta a la vez, para definir qué hace tu aplicación: tipo,
        público, funcionalidades e integraciones. Con eso se arma el plano (blueprint) de tu proyecto.
      </p>

      <h2>3. Construye y despliega</h2>
      <p>
        Desde la conversación puedes crear repositorios, generar interfaces, iterar por versiones con
        vista previa, y desplegar a Vercel. Ves el avance en tiempo real, no solo el resultado final.
      </p>

      <h2>4. Opera con orden</h2>
      <p>
        RepoVision mapea la arquitectura real de tus proyectos —qué depende de qué, qué sigue vivo,
        qué conviene archivar— y los Despliegues se presentan como tarjetas por proyecto con su
        actividad, dominios y estado.
      </p>

      <h2>Soporte</h2>
      <p>
        ¿Dudas? Escríbenos a <a href="mailto:luisdelator@vmomentums.info">luisdelator@vmomentums.info</a>{" "}
        o visita la página de <a href="/support">Soporte</a>.
      </p>
      <p className="muted">Última actualización: junio 2026.</p>
    </>
  );
}
