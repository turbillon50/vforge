export const metadata = { title: "Términos del Servicio — VForge" };

export default function TermsPage() {
  return (
    <>
      <p className="eyebrow">Legal · All Global Holding LLC</p>
      <h1>Términos del Servicio</h1>
      <p className="muted">Vigentes desde el 1 de junio de 2026 · Versión 2.0</p>

      <h2>1. Partes y objeto</h2>
      <p>Estos Términos del Servicio ("Términos") constituyen un acuerdo vinculante entre <strong>All Global Holding LLC</strong> ("VForge", "nosotros", "la Compañía"), empresa constituida bajo las leyes del Estado de Wyoming, EE. UU., y tú ("Usuario", "tú"), persona física o moral que accede o usa la plataforma VForge, su sitio web, su API, su servidor MCP y cualesquiera servicios asociados (el "Servicio").</p>
      <p>Al crear una cuenta, conectar un servicio de terceros, usar el chat con V o acceder a cualquier parte del Servicio, declaras haber leído, comprendido y aceptado estos Términos en su totalidad.</p>

      <h2>2. Elegibilidad</h2>
      <p>Debes tener al menos 18 años de edad y capacidad legal para celebrar contratos en tu jurisdicción. Si usas el Servicio en nombre de una empresa, declaras estar autorizado para aceptar estos Términos en su nombre. No puedes usar el Servicio si has sido suspendido previamente o si tu uso viola leyes aplicables.</p>

      <h2>3. Descripción del Servicio</h2>
      <p>VForge es una plataforma de desarrollo de software asistido por inteligencia artificial. El Servicio incluye, sin limitarse a: (a) el agente V, que genera código, configura infraestructura y orquesta herramientas; (b) un servidor MCP para integrar agentes de IA externos (Claude, Cursor, Codex, entre otros); (c) un marketplace de apps, integraciones y templates (V-Shop); (d) herramientas de gestión de proyectos, despliegues y clientes; (e) almacenamiento de secretos y configuraciones de proyectos.</p>

      <h2>4. Cuentas y roles</h2>
      <p><strong>Owner:</strong> acceso completo a todas las funciones según el plan contratado. Responsable de todas las acciones realizadas desde su cuenta.</p>
      <p><strong>Cliente:</strong> usuario invitado por un Owner mediante enlace de acceso controlado. Solo puede interactuar con el workspace o proyecto al que fue invitado, dentro del scope definido por el Owner.</p>
      <p><strong>Developer (próximamente):</strong> acceso al portal de desarrollo, documentación técnica y versiones beta de nuevas funciones.</p>
      <p>Eres responsable de mantener la confidencialidad de tus credenciales y de toda actividad que ocurra bajo tu cuenta.</p>

      <h2>5. Planes, precios y facturación</h2>
      <p>El Servicio se ofrece en los siguientes planes: Explorer (gratuito), Studio ($30 USD/mes) y Forge ($60 USD/mes). Los precios pueden cambiar con 30 días de aviso previo. Los planes anuales ofrecen un descuento del 20% y se cobran en un único pago. No se realizan reembolsos parciales por cancelación anticipada de un período ya pagado.</p>
      <p>El cobro se realiza mediante Stripe en los métodos de pago aceptados en tu región. En México y LATAM también se acepta Mercado Pago. Todos los precios se expresan en dólares estadounidenses (USD) salvo indicación contraria.</p>
      <p>En caso de impago, el Servicio se degradará automáticamente al plan Explorer tras un período de gracia de 7 días.</p>

      <h2>6. Propiedad intelectual</h2>
      <p><strong>Tuya:</strong> todo el código, contenido y datos que crees, subas o generes a través del Servicio pertenecen a ti o a quien corresponda según los acuerdos con tus clientes. No reclamamos ningún derecho sobre el output generado para ti.</p>
      <p><strong>Nuestra:</strong> la plataforma VForge, el agente V, el servidor MCP, las marcas, el diseño y los algoritmos propietarios son propiedad exclusiva de All Global Holding LLC. No puedes copiar, vender, sublicenciar o hacer ingeniería inversa de ningún componente de la plataforma.</p>

      <h2>7. Conducta prohibida</h2>
      <p>No puedes usar el Servicio para: generar código malicioso, malware o exploits; enviar spam o mensajes no solicitados; intentar acceder a sistemas o datos de otros usuarios; violar leyes de propiedad intelectual; minar criptomonedas; automatizar solicitudes que sobrepasen límites razonables de la API; o realizar actividades ilegales en cualquier jurisdicción aplicable.</p>

      <h2>8. Limitación de responsabilidad</h2>
      <p>En la máxima medida permitida por la ley aplicable, VForge no será responsable por daños indirectos, incidentales, especiales, consecuentes o punitivos, incluyendo pérdida de datos, ingresos o ganancias. La responsabilidad total de VForge hacia ti en cualquier período de 12 meses no excederá el monto que hayas pagado durante ese período.</p>

      <h2>9. Disponibilidad y cambios al Servicio</h2>
      <p>No garantizamos disponibilidad ininterrumpida. Nos reservamos el derecho de modificar, suspender o descontinuar funciones del Servicio con aviso previo razonable, salvo en casos de emergencia de seguridad. Los cambios materiales a estos Términos se notificarán con al menos 15 días de anticipación.</p>

      <h2>10. Rescisión</h2>
      <p>Puedes cancelar tu cuenta en cualquier momento desde Ajustes. Nosotros podemos suspender o terminar tu acceso por violación de estos Términos, con o sin aviso previo según la gravedad. Tras la cancelación, tus datos se conservan por 30 días para recuperación, luego se eliminan de forma permanente.</p>

      <h2>11. Ley aplicable y resolución de disputas</h2>
      <p>Estos Términos se rigen por las leyes del Estado de Wyoming, EE. UU., sin consideración de sus normas de conflicto de leyes. Cualquier disputa se resolverá primero mediante negociación de buena fe. Si no se llega a un acuerdo en 30 días, se someterá a arbitraje vinculante ante la AAA en Guadalajara, México, o Wyoming, EE. UU., a elección de VForge.</p>

      <h2>12. Contacto</h2>
      <p>Para consultas legales o de privacidad: <a href="mailto:legal@vforge.site" className="text-violet-400 hover:underline">legal@vforge.site</a> · All Global Holding LLC · Guadalajara, México.</p>
    </>
  );
}
