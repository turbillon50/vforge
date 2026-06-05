export const metadata = { title: "Aviso de Privacidad — VForge" };

export default function PrivacyPage() {
  return (
    <>
      <p className="eyebrow">Legal</p>
      <h1>Aviso de Privacidad</h1>
      <p className="muted">Vigente desde junio de 2026.</p>

      <p>
        All Global Holding LLC (“nosotros”), responsable de VForge, describe aquí cómo tratamos los
        datos personales de quienes usan el Servicio.
      </p>

      <h2>1. Datos que recabamos</h2>
      <ul>
        <li>Datos de cuenta: nombre, correo y autenticación (gestionada por nuestro proveedor de identidad).</li>
        <li>Tokens de conexión que autorizas (GitHub, Vercel, etc.), guardados cifrados.</li>
        <li>Datos de uso: actividad dentro de la app para operar y mejorar el Servicio.</li>
        <li>Contenido de tus proyectos que decidas crear o conectar.</li>
      </ul>

      <h2>2. Cómo usamos los datos</h2>
      <p>
        Usamos tus datos para prestarte el Servicio, ejecutar las acciones que autorizas sobre tus
        repositorios y despliegues, dar soporte, y mantener la seguridad. No vendemos tus datos ni los
        usamos para publicidad de terceros, y no usamos tu código para entrenar modelos.
      </p>

      <h2>3. Conexiones de terceros</h2>
      <p>
        Cuando conectas GitHub o Vercel, accedemos únicamente a lo que permiten los permisos que
        concedes, y solo para operar tu proyecto. Puedes revocar el acceso cuando quieras.
      </p>

      <h2>4. Almacenamiento y seguridad</h2>
      <p>
        Los secretos y tokens se guardan cifrados (cifrado en reposo) y ligados a tu cuenta. Aplicamos
        controles de acceso y buenas prácticas para protegerlos. Ningún sistema es 100% infalible, pero
        trabajamos para minimizar riesgos.
      </p>

      <h2>5. Conservación</h2>
      <p>
        Conservamos tus datos mientras tu cuenta esté activa o según sea necesario para prestar el
        Servicio y cumplir obligaciones legales. Puedes solicitar su eliminación.
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes acceder, corregir o eliminar tus datos personales, y revocar consentimientos,
        escribiéndonos al correo de contacto.
      </p>

      <h2>7. Contacto</h2>
      <p>
        Ejercicio de derechos y dudas de privacidad:{" "}
        <a href="mailto:luisdelator@vmomentums.info">luisdelator@vmomentums.info</a>.
      </p>
    </>
  );
}
