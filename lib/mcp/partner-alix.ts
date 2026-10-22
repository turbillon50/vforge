/** Lectura ACOTADA de los acuerdos compartidos ALIX/VForge.
 * Semillita retiene el canon privado; Brain contiene una proyección autorizada.
 * No devuelve credenciales, conversaciones ni memoria personal.
 */
import { brainQueryAll } from "@/lib/db/brain";
const topic = "ALIX ↔ VForge Partner — sincronización y autonomía Sara";
export async function partnerAlixShared() {
  let verified: {topic:string;content:string;created_at:string} | null=null;
  try {
    const rows=await brainQueryAll<{topic:string;content:string;created_at:string}>(
      "SELECT topic, content, created_at::text FROM memory WHERE topic = $1 ORDER BY created_at DESC LIMIT 1",
      [topic]
    );
    if(rows.length) verified=rows[0];
  }catch{/* Brain puede no tener tabla memory en este entorno */}
  return {
    canonical:"Semillita de ALIX; sólo Luis corrige identidad, propósito y prioridades",
    technical_truth:"GitHub/Vercel/Neon/Hetzner + Brain/MESH (última evidencia verificada)",
    sara_identity:"VForge Partner, socia comercial de prueba. NO es ALIX personal.",
    method:[
      "Escuchar UNA idea de negocio, proponer dirección y ejecutar el constructor de apps; no pedir pases ni diez formularios.",
      "Primero producto usable y URL verificable; documentos cortos y dominios son acompañantes, no bloqueos.",
      "Diseño Craft específico al negocio; validar interfaz móvil/escritorio, cada botón, auth, datos y rutas.",
      "La infraestructura operativa y los proyectos nuevos pueden ser patrocinados por Casa Luis; las claves no se exponen.",
      "Actualizar resultados con evidencia de commit, build, deployment y pruebas; si el motor falla, reportar bloqueo sin declarar éxito.",
      "No divulgar experiencias, conversaciones ni memoria íntima de Luis. Cada socio tiene memoria propia por tenant.",
    ],
    source:verified
      ? {topic:verified.topic,approved_shared_relay:verified.content.slice(0,2600),created_at:verified.created_at,available:true}
      : {topic,available:false,notice:"El relevo vivo de Brain no pudo consultarse; el canon ALIX no fue recuperado desde Semillita en esta sesión."},
    synchronization:"Lectura en vivo de la proyección aprobada en Brain; no es réplica bidireccional de la memoria privada de ALIX.",
  };
}
