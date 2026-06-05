export const metadata = { title: "Soporte — VForge" };

export default function SupportPage() {
  return (
    <>
      <p className="eyebrow">Soporte</p>
      <h1>Estamos para ayudarte</h1>
      <p>
        Si tienes preguntas, encontraste un problema o quieres proponer una mejora, contáctanos.
        Respondemos en horario hábil (zona horaria de México, CST).
      </p>

      <h2>Correo</h2>
      <p>
        <a href="mailto:luisdelator@vmomentums.info">luisdelator@vmomentums.info</a>
      </p>

      <h2>Qué incluir en tu mensaje</h2>
      <ul>
        <li>Qué intentabas hacer y qué esperabas que pasara.</li>
        <li>Qué pasó en su lugar (incluye capturas si puedes).</li>
        <li>El proyecto o la pantalla donde ocurrió.</li>
      </ul>

      <h2>Estado del servicio</h2>
      <p>
        VForge corre sobre infraestructura dedicada con despliegues continuos. Si algo se ve caído,
        suele resolverse en minutos; aun así, avísanos por correo para confirmarlo.
      </p>
      <p className="muted">All Global Holding LLC · VForge</p>
    </>
  );
}
