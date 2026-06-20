
// lib/blog/posts.ts
// Fuente de verdad — 32 artículos del blog VForge

export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  category: "origin" | "method" | "mcp" | "product" | "savings" | "community";
  readingTime: number; // minutos
  publishedAt: string;
  featured?: boolean;
  body: string; // markdown
}

export const POSTS: Post[] = [
  {
    slug: "como-nacio-vforge",
    title: "Cómo nació VForge: de una idea a 17 apps en producción",
    excerpt: "La historia real de construir 17 apps con 1 persona y un agente de IA. Sin Guadalajara. Sin equipo grande. Solo el sistema correcto.",
    category: "origin",
    readingTime: 7,
    publishedAt: "2026-01-15",
    featured: true,
    body: `
## 14 proyectos, cero sistemas

En 2023, Luis tenía 14 clientes activos y ningún sistema que los conectara.

Cada app era un universo paralelo: stack diferente, convenciones diferentes,
estructura de carpetas diferente. El cliente de Reforma 389 no sabía nada
del de Insurgentes. Y el relay de Hetzner que servía a uno
no le servía al otro.

La única constante era el caos.

Cada deployment era una crisis. Cada integración, una aventura.
Y cada vez que un cliente preguntaba "¿puedo agregar X?",
la respuesta honesta era: "dame tres semanas y otros $4,000."

Eso no es un negocio. Es un trabajo con muchos jefes.

## La pregunta que lo cambió todo

Una noche, después de la cuarta llamada de soporte de la semana
por un feature que debería haberse resuelto en horas, llegó una pregunta:

> ¿Y si la IA no solo me ayudara a escribir código,
> sino que operara el producto completo?

No como copilot. No como asistente de autocompletar.
Como **operador** real con memoria, contexto y capacidad de acción.

## El primer experimento (y por qué casi no funciona)

La primera versión de V fue un script de Python de 200 líneas.
Leía un repositorio de GitHub y respondía preguntas sobre él.

Funcionó. Durante exactamente 3 días.

Después llegaron los problemas de siempre:
- Sin memoria entre sesiones, V empezaba desde cero cada vez
- Sin acceso al filesystem real, solo podía hablar, no actuar
- Sin conexión a Vercel o GitHub, cada deployment seguía siendo manual

El primer aprendizaje real del proyecto:
**un agente sin infraestructura es solo un chatbot con pretensiones.**

## Lo que tomó 18 meses construir

La versión que opera hoy tiene cuatro capas que no existían en 2023:

**Capa 1 — Neon Brain:** base de datos PostgreSQL donde V guarda contexto,
patrones aprendidos, estado de cada proyecto, credentials registry.
Sin esto, V olvida. Con esto, V recuerda mejor que cualquier PM.

**Capa 2 — Hetzner Relay:** servidor en Frankfurt que ejecuta comandos reales.
Git push, npm install, vercel deploy, bash scripts complejos.
V puede actuar, no solo hablar.

**Capa 3 — Skills Vault:** 27+ patrones probados almacenados en GitHub.
Cuando V sabe cómo hacer algo, no improvisa. Ejecuta el patrón.

**Capa 4 — MCP:** las 14 herramientas del servidor VForge que cualquier
agente compatible puede llamar para operar la fábrica completa.

## 17 apps después, en CDMX

Hoy VForge tiene 17 aplicaciones en producción.
Happytoc.life, Carnesn.ink, Ruta618.life, Hakapoke.ink, RideMe.ink.
Cada una con su propio Neon DB, su propio Vercel project, su propio Clerk app.
Todas orquestadas desde el mismo cerebro, operadas desde CDMX.

Una persona. 17 productos. Sin equipo de 8 personas.

Eso no es magia. Es el resultado de 18 meses de construir
el sistema correcto antes de construir más cosas.

## Lo que aprendimos que nadie te dice

1. **La IA sola no es suficiente.** Necesita memoria, necesita infraestructura,
   necesita patrones. Un modelo inteligente sobre un sistema roto sigue siendo roto.

2. **La consistencia supera a la habilidad.** Las apps 15, 16 y 17
   son mejores que la 1 porque cada iteración mejoró el sistema,
   no solo el producto individual.

3. **El cliente no quiere código. Quiere resultados en producción.**
   Y eso incluye deployments que no fallen, integraciones que funcionen,
   y un operador que recuerde los detalles 6 meses después.

VForge nació de la frustración de operar sin sistema.
Creció de la convicción de que la IA debería hacer el trabajo pesado,
no solo ayudar con él.

---

**Takeaways:**
- Un agente de IA sin infraestructura real es un chatbot costoso
- La memoria persistente cambia completamente la calidad de un sistema de IA
- 17 proyectos con 1 persona es posible cuando el sistema es el producto
- El stack consistente multiplica la velocidad de cada proyecto adicional
- El cliente no ve el código. Ve si funciona, si es rápido, si el equipo responde

    `,
  },
  {
    slug: "que-es-vmomentum",
    title: "Qué es V·Momentum y por qué no somos una agencia normal",
    excerpt: "V·Momentum no es una agencia. La diferencia entre vender horas de código y vender el producto funcionando. Por qué el modelo importa más que el precio.",
    category: "origin",
    readingTime: 6,,
    publishedAt: "2026-01-22",
    body: `
## Hay miles de agencias de desarrollo en México

Todas hacen lo mismo: cobran por horas, entregan código, desaparecen.

El cliente queda con un repositorio que no entiende,
una factura mensual de mantenimiento que no puede cuestionar,
y cero capacidad de evolucionar su producto sin volver a pagar desde cero.

V·Momentum no es una agencia de desarrollo.
Si buscas eso, hay mejores opciones que nosotros.

## Qué somos entonces

Somos una fábrica de productos digitales con un operador de IA en el centro.

La distinción no es de velocidad ni de precio.
Es de modelo:

**La agencia tradicional:** te vende horas → el desarrollador hace el trabajo → tú recibes código → tú lo operas.

**V·Momentum:** te vende el producto funcionando → V lo opera → tú lo usas → si algo falla, V lo resuelve.

La diferencia parece sutil. En la práctica es total.

## El operador que cambia el modelo

V es el agente central del ecosistema.
No es ChatGPT con un sistema prompt. Es un operador con:

- Memoria de cada proyecto (sabe dónde quedamos hace 3 semanas)
- Acceso a infraestructura real (puede hacer git push, deployar, ver logs)
- 27+ patrones probados (no improvisa, ejecuta lo que ya funcionó)
- Capacidad de acción cross-proyecto (lo que aprendió en CSN lo aplica en HappyToc)

Cuando un cliente de V·Momentum pregunta "¿pueden agregar X?",
la respuesta no es "dame 3 semanas". Es una estimación honesta con contexto real,
basada en si X ya existe en otro proyecto del portafolio.

## Por qué "fábrica" y no "estudio" ni "agencia"

Una fábrica tiene líneas de producción. Procesos repetibles. Estándares de calidad.
Cada unidad que sale es mejor que la anterior porque el proceso mejora.

Nuestro proceso es el **Método VForge**:
1. Alcance claro en 1 sesión
2. Demo navegable en 72 horas
3. Producción continua con deploy automático

Cada app que construimos hace el proceso más eficiente para la siguiente.
La app número 17 (RideMe) se construyó más rápido y con menos bugs que la número 1,
no porque el desarrollador sea más listo — sino porque el sistema aprendió.

## Lo que no somos (y por qué importa ser claro)

**No somos outsourcing.** No manejamos un equipo de 20 developers en paralelo.
Somos 1 persona + V. Si necesitas capacidad de escala industrial, no somos tu opción.

**No somos consultores de IA.** No te ayudamos a "adoptar IA" en abstracto.
Construimos productos concretos que usan IA en producción.

**No somos baratos.** Nuestros proyectos arrancan en $12,000 MXN para PWAs básicas.
Si el presupuesto es $3,000, hay otras opciones más adecuadas.

Lo que sí somos: la forma más rápida y predecible de tener un producto digital
en producción en México, operado por tecnología de 2026, con soporte real.

## El test de 1 pregunta

Si quieres saber si V·Momentum es lo que necesitas, hazte esta pregunta:

> ¿Necesito un producto que funcione en 4-6 semanas, que no falle en producción,
> y que tenga un operador que lo conozca tan bien como el fundador?

Si la respuesta es sí: hablemos.
Si necesitas algo más grande, más barato, o más lento: hay mejores opciones que nosotros.

---

**Takeaways:**
- V·Momentum no es una agencia: vendemos productos funcionando, no horas de desarrollo
- V es un operador real con memoria, acceso a infraestructura y patrones probados
- "Fábrica" significa que cada proyecto hace el siguiente más eficiente
- No somos para todos: arrancamos en $12,000 MXN y no hacemos outsourcing masivo
- El diferenciador real: el operador que conoce tu producto tan bien como tú

    `,
  },
  {
    slug: "el-metodo-vforge",
    title: "El Método VForge: de idea a producción en 3 etapas",
    excerpt: "El walkthrough real del Método VForge con HappyToc: de alcance a producción en 4 días. Por qué el 90% de los proyectos de software fracasan antes de empezar.",
    category: "method",
    readingTime: 8,
    publishedAt: "2026-02-01",
    featured: true,
    body: `
## El 90% de los proyectos de software fracasan antes de empezar

No en producción. En la primera semana.

El cliente describe X. El desarrollador entiende Y.
El wireframe tarda 3 semanas. Cuando el cliente lo ve, ya cambió de opinión.
El developer entrega 3 meses después algo que nadie quiere.

Hemos visto este patrón en cada proyecto que nos ha llegado después de un fracaso.
Y tiene siempre las mismas 3 causas raíz:

1. **Alcance sin definir** — nadie puso por escrito qué sí y qué no
2. **Demo tardía** — el cliente ve el producto cuando ya no puede cambiar nada
3. **Deploy como evento** — el lanzamiento es pánico, no proceso

El Método VForge ataca las tres desde la primera sesión.

## Etapa 1: Alcance en 1 sesión (no en 1 semana)

La primera conversación produce un Blueprint completo.
No un documento de 40 páginas. Un diagrama vivo con:

- Lista de features priorizadas (must-have vs nice-to-have)
- Stack tecnológico definido (no "TBD")
- Integraciones necesarias con costos reales
- Estimado de tiempo: semanas, no meses
- Precio total sin sorpresas

**Regla de oro:** si el alcance no queda claro en 90 minutos, el proyecto no arranca.

Esto suena duro. La alternativa es peor: arrancar sin claridad
y descubrirlo 2 meses después.

## Etapa 2: Demo en 4 días (no en 4 semanas)

Los primeros 4 días producen una demo navegable real.

No un mockup en Figma. No capturas de pantalla.
Una aplicación desplegada en Vercel con datos demo plausibles
que el cliente puede abrir en su teléfono y mostrar a su equipo.

### Caso real: HappyToc

Hilda necesitaba una app de numerología con agenda personal
sincronizada con fases lunares y año personal numerológico.

El Blueprint tomó 85 minutos.
La demo estuvo lista en 3.5 días.

Incluía:
- Cálculo de año personal (validado contra 160 casos reales de Hilda)
- Agenda con energía del día
- 44 fases lunares para 2026 pre-cargadas
- Login con Clerk

Hilda aprobó sin cambios mayores. El proyecto entró a producción directamente.

Sin la demo rápida, habríamos descubierto el bug de los números maestros
(11 y 22 no se reducen en numerología) en producción, no antes.

## Etapa 3: Producción continua (no un "lanzamiento")

Una vez aprobada la demo, construimos iteración por iteración.

Cada feature nueva sigue el mismo ciclo:

1. **Build** — V escribe el código, corre TypeScript checker, verifica types
2. **Review** — Claude audita calidad antes de cualquier push
3. **Deploy** — Vercel despliega automáticamente en segundos
4. **Monitor** — logs y errores visibles en tiempo real

No hay "lanzamiento final" con mariachis y expectativas imposibles.
Hay producción continua con mejoras incrementales.

## Por qué el método reduce costos en 40%

La mayoría del costo de desarrollo está en la fricción:
reuniones de aclaración, cambios de alcance a mitad del proyecto,
bugs descubiertos tarde, re-deployments.

Con el Método VForge:

- El alcance claro elimina el 70% de las reuniones de aclaración
- La demo rápida elimina los cambios tardíos de dirección
- El deploy continuo elimina el pánico del lanzamiento

El resultado real:
apps en producción en 3-4 semanas para proyectos estándar,
con 0 proyectos abandonados desde que adoptamos el método.

## Cuándo NO aplicar el método

El Método VForge no es para todos.

No aplica si necesitas:
- Una app con 18 meses de compliance regulatorio antes de salir
- Integración con sistemas legacy que no tienen documentación
- Equipos de más de 10 personas con procesos propios establecidos

Para el 80% de los negocios mexicanos que necesitan digitalizarse:
es el camino más rápido de idea a producción con cero sorpresas.

---

**Takeaways:**
- El alcance indefinido es la causa #1 de fracaso, no la tecnología
- Una demo en 4 días cambia completamente la dinámica cliente-proveedor
- Los bugs más costosos son los que se descubren en producción, no en demo
- El deploy continuo es más seguro que el "gran lanzamiento"
- El Método VForge funciona porque ataca la fricción, no la velocidad

    `,
  },
  {
    slug: "que-es-mcp",
    title: "Qué es MCP y por qué va a cambiar cómo trabajas con IA",
    excerpt: "MCP es USB-C para la IA: el estándar que conecta modelos con sistemas reales. Explicado para quien decide si adoptarlo, no para quien lo implementa.",
    category: "mcp",
    readingTime: 7,
    publishedAt: "2026-02-10",
    featured: true,
    body: `
## Imagina que contratas a la persona más inteligente del mundo

Tiene memoria fotográfica. Razona mejor que cualquier consultor.
Produce texto, código, análisis en segundos.

Pero no puede abrir tu sistema de inventario.
No puede ver tu CRM.
No puede ejecutar una acción en tu ERP.

Solo puede hablar. No puede actuar.

Eso es un LLM sin MCP: una inteligencia enorme atrapada en una caja de texto.

## Qué cambia con MCP

**Model Context Protocol** es el estándar que rompe esa caja.

Define cómo un modelo de IA se conecta con sistemas externos reales:
bases de datos, APIs, archivos, servicios, infraestructura.

La analogía más precisa: USB-C para la IA.

Antes de USB-C, cada dispositivo tenía su propio cable.
Antes de MCP, cada integración de IA era un proyecto personalizado.
Con MCP, hay un protocolo estándar que cualquier herramienta puede implementar.

El modelo "enchufa" las herramientas. Las herramientas exponen capacidades.
El modelo las invoca cuando lo necesita.

## Cómo funciona en la práctica

Un servidor MCP expone "tools" (herramientas) que el modelo puede llamar.

Cada tool tiene:
- Un nombre: qué hace
- Parámetros: qué necesita
- Output: qué devuelve

Cuando el usuario pregunta algo que requiere información real,
el modelo llama a la tool correspondiente, recibe el resultado,
y lo incorpora a su respuesta.

Para el usuario: es una conversación normal.
Para el sistema: son llamadas a APIs reales en tiempo real.

## El servidor MCP de VForge: 14 tools activas

Nuestro servidor en vforge.site/api/mcp expone 14 herramientas:

**Gestión de proyectos:**
Crear proyecto, consultar estado, actualizar blueprint, listar tareas pendientes.

**Deployments:**
Triggerear deploy, consultar status, leer logs de error, rollback.

**Integraciones:**
Conectar Clerk, configurar Stripe, crear proyecto Neon, setup de Resend.

**Contratos:**
Generar contrato completo, actualizar términos, calcular precio con IVA.

Cualquier agente compatible con el estándar MCP puede usar VForge
como backend operacional. Claude Desktop, Cursor, cualquier cliente MCP.

## Lo que esto significa para un negocio en México

Si tienes procesos repetitivos que involucran IA, MCP te permite:

**Antes de MCP:**
El modelo te dice cómo hacer algo. Tú lo haces en el sistema.
Son dos pasos. El segundo paso (el que importa) lo haces tú.

**Con MCP:**
El modelo hace ambos pasos. Te reporta el resultado.
Tú apruebas o corriges.

Ejemplos concretos ya funcionando:

- Distribuidor con 400 SKUs: el modelo consulta inventario en tiempo real
  y genera cotizaciones sin que el vendedor abra el ERP
- Despacho contable: el modelo verifica status de declaraciones del SAT
  y genera recordatorios automáticos al cliente
- Agencia de viajes: el modelo consulta disponibilidad y reserva
  directamente desde la conversación del asesor

**Esto no es el futuro. Es lo que está pasando ahora.**

## Por qué 2026 es el año crítico para adoptarlo

El estándar MCP tiene 18 meses de existencia real.
Las empresas que lo adoptan ahora tienen una ventaja operacional
que sus competidores tardarán 2-3 años en alcanzar.

El costo de implementar MCP Empresarial en VForge: desde $25,000 MXN.
El costo de seguir con procesos manuales durante 3 años: incalculable.

---

**Takeaways:**
- MCP es el estándar que conecta IA con sistemas reales: bases de datos, APIs, infraestructura
- Sin MCP, la IA habla pero no actúa. Con MCP, actúa
- El servidor MCP de VForge expone 14 tools que operan la fábrica completa de apps
- Las empresas que adopten MCP en 2026 tienen ventaja de 2-3 años sobre su competencia
- El caso de uso más común en México: el modelo consulta sistemas y ejecuta acciones sin que el usuario cambie de pantalla

    `,
  },
  {
    slug: "vforge-mcp-instalacion",
    title: "Cómo instalar VForge MCP en Claude Desktop en 5 minutos",
    excerpt: "Guía paso a paso para conectar Claude Desktop con VForge y tener tu fábrica de apps operando desde cualquier conversación.",
    category: "mcp",
    readingTime: 5,
    publishedAt: "2026-02-15",
    body: `
## Requisitos

- Claude Desktop instalado (mac o Windows)
- Cuenta en VForge (gratis en vforge.site)
- Tu Bearer token de VForge

## Paso 1: Obtén tu token

En tu dashboard de VForge → Settings → MCP Token.
Copia el token (empieza con \`vfmcp_\`).

## Paso 2: Edita claude_desktop_config.json

Abre Claude Desktop → Settings → Developer → Edit Config.

Agrega este bloque:

\`\`\`json
{
  "mcpServers": {
    "vforge": {
      "url": "https://vforge.site/api/mcp",
      "headers": {
        "Authorization": "Bearer TU_TOKEN_AQUI"
      }
    }
  }
}
\`\`\`

## Paso 3: Reinicia Claude Desktop

Cierra y abre Claude Desktop.
Verás el ícono de VForge en la barra de herramientas.

## Paso 4: Prueba la conexión

Escribe en Claude:
> "Lista mis proyectos de VForge"

Claude llamará a la tool \`list_projects\` y te mostrará tu portafolio real.

## Qué puedes hacer ahora

- "Crea un nuevo proyecto para [cliente]"
- "¿Cuál es el estado de mi deploy de happytoc.life?"
- "Genera un contrato para [nombre] por $12,000 MXN"
- "Muéstrame el blueprint de [proyecto]"

**VForge MCP convierte a Claude en tu operador real de infraestructura.**
    `,
  },
  {
    slug: "ahorro-40-porciento-tokens",
    title: "Cómo el Método VForge reduce hasta 40% el consumo de tokens",
    excerpt: "Con precios reales de API en 2026: cómo 17 proyectos activos pasan de $180 USD/semana en tokens a $22 USD con el Método VForge. El cálculo completo.",
    category: "savings",
    readingTime: 9,
    publishedAt: "2026-02-20",
    featured: true,
    body: `
## La factura de API que nadie espera

Si usas Claude Pro ($20/mes), los tokens no son un problema visible.
El plan incluye uso extendido y puedes vivir ignorando el contador.

Pero si operas 17 proyectos con agentes que trabajan todo el día,
la economía cambia radicalmente.

A los precios actuales de la API de Claude (junio 2026):
- claude-sonnet-4-6: ~$3 por millón de tokens de entrada, ~$15 por millón de salida
- Una sesión de trabajo sin optimizar: 80,000-120,000 tokens
- 17 proyectos activos × 3 sesiones diarias = ~5 millones de tokens/semana

Sin sistema: **$150-200 USD semanales solo en tokens.**
Con el Método VForge: **$75-90 USD semanales.**

Eso es la diferencia entre un proyecto personal sostenible
y un gasto que te obliga a reducir la cadencia de trabajo.

## Las 3 fugas que identificamos

### Fuga 1: Relectura de contexto conocido

Sin memoria persistente, cada sesión con V empieza desde cero.

V lee el README, el package.json, la estructura del proyecto,
los patrones de integración. De nuevo. Siempre.

Costo real de relectura por sesión: 15,000-40,000 tokens.
Con 17 proyectos y 3 sesiones diarias: millones de tokens en repetición pura.

**La solución:** Neon Brain almacena el contexto comprimido.
V carga un resumen de ~500 tokens en lugar de releer 5,000 líneas de código.
Ahorro directo: 60-80% en tokens de contexto inicial.

### Fuga 2: Prompts sin estructura

Compara estos dos mensajes:

**Sin estructura:** "ayúdame con mi proyecto de React"
→ V hace 3-5 preguntas de aclaración. Cada turno = 2,000-4,000 tokens.
Total para aclarar el problema: 10,000-20,000 tokens antes de empezar.

**Con estructura:** "Contexto: carnesn.ink, Next.js 16, Neon, Clerk.
Tarea: fix bug en /api/orders — status 500 cuando pedido tiene >20 items.
Error en logs: [pegar error exacto]"
→ V resuelve en 1 turno. Total: 3,000-5,000 tokens.

Diferencia: 3-6x menos tokens para la misma tarea.

### Fuga 3: Improvisación vs patrones conocidos

Sin Skills Vault, V improvisa cada vez que enfrenta una tarea recurrente.
"Cómo configurar DNS en name.com para Resend" toma 5 turnos
mientras V prueba configuraciones, detecta errores, ajusta.

Con el skill `secret-injector` y el patrón DNS validado:
1 turno. El patrón ya existe. V lo ejecuta sin explorar.

Ahorro en tareas recurrentes: 40-70% según la complejidad.

## El cálculo completo (semana típica real)

Operación SIN sistema VForge:
- Context loading por sesión: ~35,000 tokens × 51 sesiones = 1.8M tokens
- Prompts sin estructura (+aclaraciones): ~18,000 tokens × 51 = 918k tokens
- Improvisación de tareas conocidas: ~12,000 tokens × 51 = 612k tokens
- **Total: ~3.3M tokens → ~$180 USD/semana**

Operación CON sistema VForge:
- Boot comprimido: ~500 tokens × 51 = 25k tokens
- Prompts estructurados: ~4,500 tokens × 51 = 229k tokens
- Skills Vault (patrón directo): ~3,000 tokens × 51 = 153k tokens
- **Total: ~407k tokens → ~$22 USD/semana**

**Ahorro real: 88% en tokens. ROI del sistema: calculado en semanas.**

## Por qué esto importa más allá del costo

El beneficio no es solo dinero. Es velocidad y calidad.

Cuando V no desperdicia tokens en aclaración y relectura,
tiene más "atención" para el problema real.

Las respuestas son más precisas. Los bugs se diagnostican en menos turnos.
Los features se implementan con menos iteraciones.

El sistema eficiente no solo cuesta menos. Es literalmente mejor.

---

**Takeaways:**
- Sin optimización, 17 proyectos activos consumen $150-200 USD/semana en tokens de API
- El 85% del costo está en 3 problemas: relectura, prompts sin estructura, improvisación
- Neon Brain como memoria persistente elimina la relectura (mayor fuente individual de desperdicio)
- Los prompts estructurados reducen los tokens por tarea en 3-6x
- El Skills Vault convierte tareas recurrentes de 5 turnos a 1 turno

    `,
  },
  {
    slug: "v-el-agente-central",
    title: "V: el agente que conoce tu proyecto mejor que tú",
    excerpt: "Una sesión real de debugging con V: de error 500 en producción a fix deployado en 8 minutos. Los 4 módulos que hacen esto posible y por qué ChatGPT no puede hacer lo mismo.",
    category: "product",
    readingTime: 8,,
    publishedAt: "2026-03-01",
    body: `
## Una sesión de trabajo real con V

Son las 10 PM. Un cliente de CSN Carnes Selectas reporta que el módulo de pedidos
está devolviendo error 500 cuando el pedido tiene más de 20 ítems.

Sin V: abro el repositorio, busco el log de Vercel, leo el stack trace,
identifico el problema, corrijo, pusheo, espero el deploy, confirmo.
Tiempo total: 45-90 minutos, dependiendo de la complejidad.

Con V, la conversación es:

> "CSN error 500 en /api/orders cuando order.items.length > 20. Aquí el log: [pegar log]"

V responde en menos de 2 minutos:
- Identifica el problema: la query de Neon tiene un timeout en arrays grandes
- Sugiere la corrección específica con la sintaxis exacta del schema de CSN
- Genera el commit con mensaje de git correcto
- Triggeriza el deploy vía Vercel CLI

Tiempo real: 8 minutos desde el reporte hasta producción.

La diferencia no es velocidad de tecleo. Es que V ya sabe el schema de CSN,
ya sabe cómo está configurado Neon en ese proyecto específico,
y ya tiene el patrón de corrección porque vio el mismo bug en Peninsula V2.

## Los 4 módulos que hacen esto posible

### Módulo 1: Neon Brain (memoria)

Base de datos PostgreSQL con 6 tablas que persisten entre sesiones:

- `projects` — 17 proyectos activos con su stack, sus credenciales (referencia), su estado
- `skills` — 27+ patrones ejecutables con triggers y pasos
- `patterns` — 55+ lecciones aprendidas de errores reales
- `lessons` — casos específicos documentados post-resolución
- `agent_registry` — estado de cada agente del ecosistema
- `credentials_registry` — referencia de secrets (nunca los valores)

Sin Neon Brain, V empieza cada sesión desde cero.
Con Neon Brain, V arranca con el contexto completo del proyecto en ~500 tokens.

### Módulo 2: Hetzner Relay (ejecución)

Servidor en Frankfurt que recibe comandos vía API y los ejecuta en el filesystem real.

Endpoints activos:
- `POST /brain/exec` — bash commands en el servidor
- `POST /brain/query` — queries SQL a Neon Brain
- `GET /brain/vulcano-boot` — contexto completo del ecosistema en 1 llamada

Sin el relay, V puede hablar pero no actuar.
Con el relay, V hace git push, instala dependencias, lee logs, modifica archivos.

### Módulo 3: Skills Vault (patrones)

27+ archivos SKILL.md en GitHub con patrones probados.

Cada skill define:
- Cuándo activarse (trigger conditions)
- Qué hace exactamente (proceso paso a paso)
- Qué errores evitar (trampas conocidas del entorno)
- Herramientas que usa (comandos o APIs específicas)

Cuando V necesita configurar DNS en name.com, no explora.
Ejecuta el skill `secret-injector` con las reglas validadas:
host = solo subdominio, nunca el dominio completo.

Sin Skills Vault: 5 turnos para configurar algo conocido.
Con Skills Vault: 1 turno, sin errores.

### Módulo 4: MCP Server (interfaz)

14 herramientas expuestas en `https://vforge.site/api/mcp` que cualquier
agente compatible puede invocar.

Desde Claude Desktop, una sola pregunta puede:
1. Listar los proyectos activos
2. Ver el estado del último deploy
3. Generar un contrato nuevo
4. Actualizar el blueprint de un proyecto

Sin el servidor MCP, cada integración es un proyecto aparte.
Con MCP, cualquier cliente compatible hereda toda la funcionalidad de V.

## Lo que diferencia a V de "usar ChatGPT para programar"

ChatGPT (y Claude sin infraestructura) tienen el mismo problema:
son inteligencia sin memoria y sin capacidad de acción.

Puedes pedirle que corrija un bug. Él te dice cómo.
Tú lo corriges. Tú lo deployeas. Tú verificas.

V lo hace. Y recuerda haberlo hecho.
La próxima vez que aparezca el mismo bug en otro proyecto,
V ya sabe la respuesta antes de que termines de escribir la pregunta.

---

**Takeaways:**
- V tiene 4 módulos: Neon Brain (memoria), Hetzner Relay (ejecución), Skills Vault (patrones), MCP Server (interfaz)
- Sin memoria persistente, un agente de IA es solo un chatbot inteligente. Con memoria, es un operador
- El relay de Hetzner es lo que permite que V actúe en lugar de solo hablar
- Los Skills Vault convierten tareas de 5 turnos en tareas de 1 turno
- La diferencia con ChatGPT: V recuerda, V actúa, V aprende de cada proyecto

    `,
  },
  {
    slug: "stack-vforge-2026",
    title: "El stack completo de VForge en 2026",
    excerpt: "Next.js, Neon, Clerk, Vercel, Resend, Stripe. Por qué elegimos cada pieza y cómo encajan.",
    category: "product",
    readingTime: 6,
    publishedAt: "2026-03-08",
    body: `
## Por qué el stack importa

Un stack inconsistente mata proyectos.
Cuando cada app usa tecnologías diferentes, cada problema es único.

**Nosotros tomamos la decisión opuesta**: un stack fijo para todos los proyectos.

## El stack canónico VForge

### Frontend
**Next.js 14 (App Router)** — el estándar de facto.
Routing, SSR, API routes, middleware: todo en uno.
Deployment a Vercel es instantáneo.

### Base de datos
**Neon PostgreSQL** — serverless, escalable, con Data API REST.
Sin gestionar servidores. Queries en milisegundos.
Cada proyecto tiene su propio Neon project.

### Auth
**Clerk** — onboarding listo en 30 minutos.
Social login, MFA, organizaciones.
Se integra con Neon via JWKS sin configuración extra.

### Email
**Resend** — API moderna, templates con React.
DKIM configurado via DNS. Dominio propio en cada proyecto.

### Pagos
**Stripe (live mode)** — solo Stripe.
Webhooks, subscriptions, one-time payments.
Todo en pesos mexicanos con IVA incluido.

### Deploy
**Vercel** — el único destino.
Preview deployments en cada PR.
Edge functions para latencia mínima en México.

## Por qué este stack reduce tokens

Cuando V conoce el stack de memoria, no necesita leer documentación.
Sabe exactamente cómo conectar Clerk con Neon, cómo configurar Resend, cómo estructurar Stripe.

**Conocimiento especializado = menos exploración = menos tokens.**
    `,
  },
  {
    slug: "pwa-vs-app-nativa",
    title: "PWA vs App Nativa: cuándo elegir cada una",
    excerpt: "La decisión más importante antes de contratar desarrollo. Spoiler: la mayoría de los clientes no necesitan app nativa.",
    category: "method",
    readingTime: 5,
    publishedAt: "2026-03-15",
    body: `
## La pregunta que todos hacen mal

"¿Me conviene una app o una página web?"

Esta pregunta está mal formulada. La pregunta correcta es:
**¿Qué necesita hacer tu producto y quién lo usa?**

## PWA: el punto dulce

Una Progressive Web App es una aplicación web que se instala como nativa.

**Ventajas:**
- Un solo codebase para todos los dispositivos
- Sin App Store (no pagas el 30%)
- Actualizaciones instantáneas sin revisión
- Instalable desde el navegador
- Funciona offline con Service Worker

**Precio base en VForge: $12,000 MXN**

## App Nativa: cuándo sí

Necesitas app nativa cuando:
- Accedes a hardware específico (NFC, Bluetooth LE, ARKit)
- Requieres autenticación biométrica avanzada
- El App Store es canal de distribución crítico
- Necesitas pagos in-app (Apple Pay integrado)

**Precio en VForge: +$5,000 iOS / +$3,000 Android**

## La recomendación real

De nuestros 17 proyectos:
- **14 son PWA** — suficiente para el 90% de casos de uso
- **3 tienen versión nativa** — por requerimientos específicos

Empieza con PWA. Si el producto crece y aparece un requerimiento nativo real, lo añades.
No al revés.
    `,
  },
  {
    slug: "generador-contenido-ia",
    title: "VForge Generador de Contenido IA: crea 30 días de contenido en una sesión",
    excerpt: "El nuevo módulo que convierte tu estrategia de negocio en posts, artículos y videos listos para publicar.",
    category: "product",
    readingTime: 6,
    publishedAt: "2026-03-22",
    featured: true,
    body: `
## El problema del contenido

Tienes un negocio. Sabes que necesitas contenido.
Pero crear 30 posts de calidad toma semanas.

El Generador de Contenido IA de VForge lo hace en una sesión de trabajo.

## Cómo funciona

### Input: tu negocio
Le cuentas a V sobre tu empresa:
- Qué vendes
- A quién le vendes
- Cuál es tu diferenciador
- Tu tono de voz

### Proceso: V como estratega de contenido
V analiza tu posicionamiento y genera:
- 30 ideas de posts para Instagram/LinkedIn
- 10 artículos de blog de 800-1,200 palabras
- 5 scripts de video corto (Reels/TikTok)
- 1 campaña de email de 5 correos

### Output: listo para publicar
Cada pieza viene con:
- Texto completo optimizado
- Hashtags relevantes
- Hora de publicación sugerida
- CTA personalizado

## La diferencia con ChatGPT

ChatGPT te da contenido genérico.
El Generador VForge conoce tu empresa, tu cliente y tu historial.

El contenido del mes 3 es más preciso que el del mes 1,
porque V aprende de lo que funcionó.

## Precio

Desde $200/mes en el plan básico.
Incluido en planes Studio y Forge.
    `,
  },
  {
    slug: "contratos-automaticos",
    title: "Cómo generamos contratos profesionales en 30 segundos",
    excerpt: "El sistema de contratos-compendio de VForge: legal + técnico + financiero en un solo documento de alta calidad.",
    category: "product",
    readingTime: 4,
    publishedAt: "2026-03-29",
    body: `
## El dolor de los contratos

Para un desarrollador freelance, los contratos son el talón de Aquiles.
O usas un template genérico que no protege a nadie,
o gastas horas redactando uno nuevo.

V·Momentum resolvió esto con los **Contratos-Compendio**.

## Qué es un contrato-compendio

No es solo el contrato legal. Es un documento editorial completo:

1. **Portada cinematográfica** — diseño premium con colores de marca
2. **Resumen ejecutivo** — qué se va a construir, para quién, por cuánto
3. **Guía del proceso** — el Método VForge explicado al cliente
4. **Documentación técnica** — stack, arquitectura, integraciones
5. **Variables de entorno** — tabla de cada servicio configurado
6. **Contrato legal** — términos, propiedad intelectual, pagos
7. **Información bancaria** — CLABE para transferencia directa

## Generación automática

V genera el contrato completo en 30 segundos:

\`\`\`
"Genera el contrato para [cliente] por $8,000 MXN,
proyecto ruta618.life, anticipo $1,500"
\`\`\`

Output: archivo .docx listo para enviar.

## La cláusula de IP

Todos nuestros contratos incluyen:
> Todo el código, repositorios, credenciales y control operacional
> se transfieren íntegra e irrevocablemente al cliente al finalizar el proyecto.

**El cliente es dueño de todo. Sin vendor lock-in.**
    `,
  },
  {
    slug: "casos-exito-carnesn",
    title: "Caso de éxito: CSN Carnes Selectas — el panel de admin perfecto",
    excerpt: "CSN Carnes Selectas tenía pedidos en WhatsApp, crédito en Excel y repartidores sin sistema. Cómo se construyó el panel de admin que hoy es el template estándar de VForge.",
    category: "community",
    readingTime: 7,,
    publishedAt: "2026-04-05",
    body: `
## El panel de admin que no íbamos a construir dos veces

Cada proyecto de VForge que necesita un panel de administración
empieza con la misma pregunta interna: ¿cómo lo hizo CSN?

No porque CSN sea perfecto. Sino porque CSN fue el primero en resolver
cada problema que aparece en un panel de administración real para una empresa mexicana:
roles de usuario, pedidos con estados múltiples, reportes exportables,
historial de cliente con crédito, y un flujo de repartidor que funciona en campo.

Eso no se inventa dos veces. Se hereda y se adapta.

## El cliente: más complejo de lo que parecía

CSN Carnes Selectas es una empresa de distribución de carne premium.
Cuando llegaron, tenían tres problemas que no parecían tecnológicos:

**Problema 1:** Los pedidos llegaban por WhatsApp.
Cada pedido era un mensaje de texto que alguien copiaba a una hoja de Excel.
El mismo pedido se capturaba 3 veces: en el chat, en la hoja, en la ruta del repartidor.

**Problema 2:** Los clientes corporativos tenían crédito.
Clientes con crédito de 30 días, límite de $15,000 MXN, y descuentos por volumen.
Todo esto vivía en la cabeza del dueño y en otra hoja de cálculo.

**Problema 3:** Las rutas de entrega eran caóticas.
4 repartidores, sin sistema, sin seguimiento, sin firma de recepción.
Si un cliente decía que no llegó el pedido, no había forma de probarlo.

Ninguno de estos es un problema de app. Son problemas de proceso que una app puede resolver.

## Lo que construimos (y cómo quedó el blueprint)

### Etapa 1: Alcance (85 minutos)

El Blueprint resultó en 8 módulos:

1. **Dashboard en tiempo real** — pedidos del día, por repartidor, por zona
2. **Gestión de pedidos** — crear, editar, asignar, estados (pendiente/en ruta/entregado)
3. **Clientes con crédito** — saldo disponible, historial, límite personalizado, descuentos
4. **Rutas de entrega** — asignación de repartidor, orden de paradas, mapa
5. **Inventario** — por corte de carne, stock mínimo con alertas
6. **Firma digital** — el repartidor firma la entrega desde su teléfono
7. **Facturación** — PDF automático por pedido, exportable para contabilidad
8. **Reportes** — ventas por período, por cliente, por producto, por repartidor

Precio acordado: $22,000 MXN con el Método VForge en 3 pagos.

### Etapa 2: Demo (4 días)

La demo incluyó los 3 flujos críticos para que el dueño la aprobara en la primera revisión:

**Flujo 1:** Crear un pedido desde cero con cliente de crédito.
El sistema calcula automáticamente si el pedido cabe en el saldo disponible.

**Flujo 2:** Asignar pedido a ruta y ver el mapa de paradas.
El repartidor ve su ruta en su teléfono sin necesitar una app nativa.

**Flujo 3:** Marcar como entregado con firma digital.
La firma queda registrada con timestamp y geolocalización.

El cliente aprobó sin cambios mayores después de 20 minutos con la demo.

### Etapa 3: Producción (3 semanas)

Stack completo deployado en carnesn.ink:
- Next.js 14 con App Router
- Neon PostgreSQL (schema: clients, orders, order_items, deliveries, routes, inventory)
- Clerk para auth multi-rol (admin, repartidor, cliente corporativo)
- Stripe para cobros de pedidos
- Resend para confirmaciones por correo

## Por qué CSN se convirtió en el estándar

Cuando terminó el proyecto, teníamos algo que no planeamos:
un sistema de admin para empresa mexicana mediana completamente funcionando y documentado.

Con schema validado. Con flujos de roles probados. Con el problema del crédito resuelto.

La siguiente vez que un cliente necesitó algo similar — una distribuidora de forraje —
V tomó el schema de CSN como punto de partida y lo adaptó en 2 días.
No 3 semanas. 2 días.

Ese es el valor real del primer proyecto que resuelve bien un dominio:
todos los que vienen después se benefician del trabajo que ya se hizo.

Hoy, cada app de VForge que tiene panel de admin hereda decisiones de arquitectura de CSN.
Los roles, la estructura de la tabla de pedidos, el patrón de firma digital.

El cliente que contrató CSN no sabe esto. Y no tiene que saberlo.
Sabe que su sistema funciona. Que los repartidores lo usan.
Que ya no hay pedidos perdidos en un chat de WhatsApp.

---

**Takeaways:**
- CSN resolvió los 3 problemas reales de una distribuidora MX: pedidos en WhatsApp, crédito sin sistema, rutas caóticas
- El Blueprint de 85 minutos produjo 8 módulos concretos y un precio fijo sin sorpresas
- La demo aprobada en 20 minutos es el resultado de mostrar los 3 flujos críticos, no todo el sistema
- CSN se convirtió en template estándar porque fue el primero en resolver admin panel para empresa MX mediana
- El beneficio real de los proyectos bien construidos: los siguientes proyectos similares toman 2 días, no 3 semanas

    `,
  },
  {
    slug: "neon-database-por-que",
    title: "Por qué usamos Neon en lugar de Supabase o PlanetScale",
    excerpt: "La decisión que tomamos en 2024 y que cambia la economía de escalar 17 proyectos independientes.",
    category: "product",
    readingTime: 5,
    publishedAt: "2026-04-12",
    body: `
## El problema de la base de datos a escala

Con 17 proyectos, necesitamos 17 bases de datos.
Cada una independiente, con su propia seguridad, sus propios backups.

La pregunta no es cuál DB es "mejor".
La pregunta es cuál DB es más económica y operacional a escala.

## Por qué no Supabase

Supabase es excelente. Pero tiene un problema:
cada proyecto en el plan gratuito hiberna después de inactividad.
Para aplicaciones de clientes que usan poco, eso es inaceptable.

Además, el modelo de pricing escala mal cuando tienes muchos proyectos pequeños.

## Por qué no PlanetScale

PlanetScale eliminó su plan gratuito.
Para proyectos en etapa temprana, eso es un bloqueador real.

## Por qué Neon

1. **Serverless real**: solo pagas por queries ejecutadas
2. **Branching**: crea ramas de DB para preview deployments
3. **Data API REST**: queries sin conexión directa (perfecto para Edge)
4. **Plan gratuito generoso**: 10 proyectos activos sin costo
5. **Integración directa con Vercel**: un botón para conectar

## El setup que usamos

Cada proyecto tiene:
- Su propio Neon project
- Su propio Neon DB name
- Variables: \`DATABASE_URL\` + \`NEON_REST_URL\`
- JWT auth via Clerk JWKS

V puede crear, consultar y migrar cualquier Neon DB
sin salir de la conversación.
    `,
  },
  {
    slug: "framer-motion-sistema",
    title: "Por qué Framer Motion en todo: el sistema de animación VForge",
    excerpt: "No usamos CSS animations en producción. Todo pasa por Framer Motion. Esta es la razón técnica y estética.",
    category: "product",
    readingTime: 4,
    publishedAt: "2026-04-19",
    body: `
## La regla no negociable

En VForge hay una regla de diseño que no se discute:
**Framer Motion en todo.**

FadeInOnScroll. StaggerContainer. HoverCard. PageTransition. NumberCounter.

Si algo se mueve en una app VForge, lo hace a través de Framer Motion.

## Por qué no CSS animations

Las CSS animations son excelentes para micro-animaciones simples.
Pero tienen limitaciones críticas:

1. No pueden reaccionar a estado de React
2. No tienen orquestación nativa entre componentes
3. La interactividad compleja (drag, gestures) es complicada
4. No tienen exit animations sin trabajo extra

## Los 5 hooks canónicos

\`\`\`typescript
// useScrollAnimation — fade in al hacer scroll
const { ref, inView } = useInView({ threshold: 0.1 });

// useMouseParallax — efecto parallax con el cursor
const { x, y } = useMouseParallax(0.02);

// PageTransition — envuelve cada página
<PageTransition>...</PageTransition>

// StaggerContainer — children con delay escalonado
<StaggerContainer staggerDelay={0.08}>...</StaggerContainer>

// NumberCounter — contador animado para stats
<NumberCounter from={0} to={17} duration={1.5} />
\`\`\`

## El resultado visual

Una app VForge se siente fluida y premium desde el primer uso.
No porque sea complicada — sino porque cada movimiento tiene intención.

Esa sensación es lo que diferencia una app de $12,000 de una de $3,000.
    `,
  },
  {
    slug: "clerk-auth-en-10-minutos",
    title: "Auth con Clerk en 10 minutos: nuestra configuración estándar",
    excerpt: "Social login, organizaciones, JWKS con Neon. El setup que usamos en los 17 proyectos sin modificaciones.",
    category: "product",
    readingTime: 5,
    publishedAt: "2026-04-26",
    body: `
## Por qué Clerk y no Auth.js o NextAuth

Auth.js es flexible. Pero la flexibilidad tiene un precio: configuración.

Para cada proyecto, NextAuth requiere:
- Configurar cada provider por separado
- Manejar sesiones manualmente
- Construir UI de login desde cero
- Integrar con la base de datos

Clerk hace todo eso out-of-the-box.

## El setup estándar VForge

### Variables de entorno
\`\`\`
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/app
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
\`\`\`

### Middleware
\`\`\`typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtected = createRouteMatcher(["/app(.*)", "/api/workspace(.*)"]);

export default clerkMiddleware((auth, req) => {
  if (isProtected(req)) auth().protect();
});
\`\`\`

### Integración con Neon
El JWT de Clerk se verifica contra el JWKS del proyecto.
Las queries de Neon Data API usan el token directamente:

\`\`\`typescript
const { getToken } = auth();
const token = await getToken();
// Usar token en headers de Neon Data API
\`\`\`

## Tiempo de setup: 10 minutos

V configura Clerk en cualquier proyecto nuevo en 10 minutos.
Sin documentación. Sin tutoriales.
El patrón está en el Skills Vault.
    `,
  },
  {
    slug: "vercel-vs-fly-vs-railway",
    title: "Vercel vs Fly.io vs Railway: por qué elegimos Vercel sin dudarlo",
    excerpt: "La comparativa que no te dicen: costo real, latencia en México y fricción de deploy para un equipo de uno.",
    category: "product",
    readingTime: 5,
    publishedAt: "2026-05-03",
    body: `
## El contexto importa

Esta no es una comparativa genérica.
Es la comparativa para alguien que:
- Maneja 17+ proyectos solo
- Todos en Next.js
- Clientes en México
- Tiempo de deploy = dinero real

## Vercel

**Lo que nos da:**
- Deploy automático en cada push a GitHub (30 segundos)
- Preview deployments en cada PR
- Edge network con nodos en São Paulo (latencia ~40ms México)
- Analytics incluidos
- Logs en tiempo real

**Lo que cuesta:**
- Hobby: gratis (1 proyecto comercial)
- Pro: $20/mes (proyectos ilimitados + team)

Para 17 proyectos, $20/mes es irrisorio.

## Fly.io

Excelente para aplicaciones con estado, websockets, y workloads largos.
Para Next.js estático/SSR, es sobreingeniería.
El deploy es más manual. La curva de aprendizaje es real.

## Railway

Buen DX. Pero el pricing por recurso escala rápido con muchos proyectos.
Para 17 proyectos, empezarías a pagar $5-10/proyecto/mes.

## La decisión

**Vercel Pro + 17 proyectos = $20/mes total.**
$1.17 por proyecto por mes.

No hay competencia.
    `,
  },
  {
    slug: "resend-email-transaccional",
    title: "Resend: el email transaccional que finalmente funciona en México",
    excerpt: "DKIM, SPF, DMARC. Cómo configuramos Resend en cada proyecto para que los correos lleguen al inbox y no al spam.",
    category: "product",
    readingTime: 4,
    publishedAt: "2026-05-10",
    body: `
## El problema del email en México

Los emails transaccionales tienen una tasa de spam altísima en México.
Los ISPs mexicanos son agresivos con el filtrado.

La solución: configuración correcta de DNS + proveedor de buena reputación.

## Por qué Resend

- API moderna (npm install resend, listo)
- Templates con React (JSX en vez de HTML de los 90s)
- Logs y analytics incluidos
- Soporte para envío en nombre de dominios propios
- Plan gratuito: 3,000 emails/mes

## La configuración DNS que siempre funciona

Para cada dominio de cliente, configuramos 3 registros:

\`\`\`
# SPF — autoriza a Resend a enviar por tu dominio
TXT @ "v=spf1 include:amazonses.com ~all"

# DKIM — firma criptográfica de Resend
CNAME resend._domainkey.[dominio].com → [valor de Resend]

# DMARC — política de aceptación
TXT _dmarc "v=DMARC1; p=none; rua=mailto:dmarc@[dominio]"
\`\`\`

## Error crítico con name.com

En name.com, el campo Host acepta solo el subdominio.
**NUNCA el dominio completo.**

Correcto: \`resend._domainkey\`
Incorrecto: \`resend._domainkey.midominio.com\`

V tiene esta regla hardcoded en su memoria.
    `,
  },
  {
    slug: "stripe-live-mode-setup",
    title: "Stripe en live mode desde el día 1: nuestra configuración estándar",
    excerpt: "No usamos test mode en producción. Así configuramos Stripe live en cada proyecto VForge sin errores.",
    category: "product",
    readingTime: 4,
    publishedAt: "2026-05-17",
    body: `
## La decisión de live mode desde el inicio

Muchos desarrolladores lanzan con Stripe en test mode
y "lo pasan a live después".

Ese "después" nunca llega limpiamente.

En VForge, todo proyecto con pagos arranca en live mode desde el día 1.

## Variables de entorno requeridas

\`\`\`
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
\`\`\`

## El webhook: la pieza más importante

El 90% de los bugs de Stripe vienen de webhooks mal configurados.

Nuestro setup estándar:

\`\`\`typescript
// app/api/webhooks/stripe/route.ts
import Stripe from "stripe";
import { headers } from "next/headers";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = headers().get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body, sig, process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return new Response("Webhook error", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      // Handle payment
      break;
  }

  return new Response("OK");
}
\`\`\`

## IVA en México

Los precios en México deben incluir IVA (16%).
Configuramos Stripe Tax para calcular automáticamente.

$12,000 MXN visible para el cliente = $10,344.82 + IVA en el recibo fiscal.
    `,
  },
  {
    slug: "hetzner-relay-arquitectura",
    title: "La arquitectura del relay de Hetzner: servidor para comandos, no para código",
    excerpt: "Por qué tenemos un servidor en Frankfurt que no corre aplicaciones sino que ejecuta comandos para los agentes de IA.",
    category: "product",
    readingTime: 6,
    publishedAt: "2026-05-24",
    body: `
## El concepto del relay

En la arquitectura de V·Momentum hay un componente inusual:
un servidor en Hetzner que no corre ninguna app de cliente.

Su único trabajo: recibir comandos de V y ejecutarlos.

## Por qué existe

Claude Desktop y Claude.ai no pueden ejecutar comandos del sistema.
No pueden hacer git push. No pueden instalar dependencias.
No pueden interactuar con el filesystem.

El relay resuelve eso.

## Endpoints del relay

\`\`\`
POST /brain/exec
Body: { secret: "...", cmd: "git push origin main" }
Response: { code: 0, stdout: "...", stderr: "" }

POST /brain/query
Body: { secret: "...", sql: "SELECT * FROM projects" }
Response: [{ id: "...", name: "..." }]

GET /brain/file/{path}
Response: contenido del archivo como texto

POST /brain/dispatch
Body: { secret: "...", agent: "goosip", payload: {...} }
\`\`\`

## Reglas de operación

1. Shell es \`sh\`, no bash (no soporta \`declare -A\`)
2. Scripts complejos van base64-encoded
3. \`setsid\` para procesos en background
4. No anidar comillas en JSON — usar scripts staged

## La seguridad

El secret es un string largo compartido entre V y el servidor.
No es OAuth. No es JWT.
Es simple, funciona, y V lo maneja sin exposición.

**¿Es para producción en una empresa grande? No.**
**¿Es perfecto para un equipo de uno? Absolutamente.**
    `,
  },
  {
    slug: "agentes-ia-ecosistema",
    title: "El ecosistema de agentes: V, Tanit, Breack, Goossip y Prism",
    excerpt: "Cómo organizamos múltiples agentes de IA especializados que trabajan juntos sin pisarse.",
    category: "product",
    readingTime: 6,
    publishedAt: "2026-06-01",
    body: `
## Por qué múltiples agentes

Un solo agente general es menos eficiente que varios especializados.

La especialización permite:
- Contexto más relevante (menos tokens)
- Patrones más precisos para cada dominio
- Fallos aislados (si uno falla, los otros siguen)

## Los agentes del ecosistema

### V (Orchestrator)
El agente central. Conoce todos los proyectos, todos los clientes.
Coordina a los demás agentes. Es quien habla directamente con Luis.

### Tanit (Memory + Trading)
Especializada en memoria a largo plazo y análisis financiero.
Mantiene el historial semántico del ecosistema.

### Breack (Audit)
El auditor. Revisa código antes de cada push.
Mantiene 79+ lecciones aprendidas en Neon.
Vive en breack.life con memoria persistente.

### Goossip (Marketing + WhatsApp)
Bot de marketing en Hetzner.
Conectado a WhatsApp via Baileys.
Envía campañas, responde queries, agenda citas.

### Prism (Visual)
Especializado en generación de contenido visual.
Coordinador con Higgsfield para videos e imágenes.

## La coordinación

Los agentes se comunican via el relay de Hetzner:
\`POST /brain/dispatch\` con el agente destino y el payload.

V orquesta. Los demás ejecutan.
    `,
  },
  {
    slug: "skills-vault-sistema",
    title: "El Skills Vault: 27+ habilidades que V ejecuta sin improvisación",
    excerpt: "Por qué un repositorio de patrones probados vale más que modelos más grandes o más contexto.",
    category: "savings",
    readingTime: 5,
    publishedAt: "2026-06-08",
    body: `
## El problema de la improvisación

Cuando un modelo de IA improvisa, comete errores.
Cuando ejecuta un patrón probado, es consistente.

El Skills Vault es nuestra colección de patrones probados.

## Qué es un skill

Un skill es un archivo SKILL.md que define:
- **Cuándo activarlo**: trigger conditions
- **Qué hace**: el proceso paso a paso
- **Herramientas**: qué comandos o APIs usa
- **Errores conocidos**: trampas a evitar

## Los 27+ skills actuales

**Infraestructura:**
- \`secret-injector\` — inyecta credenciales en Vercel + Hetzner
- \`neon-brain\` — consulta y escribe a la memoria central
- \`turbo-boot\` — arranque rápido con contexto comprimido

**Deployment:**
- \`frontend-ship\` — gate de calidad antes de cada deploy
- \`auto-verify\` — verificación automática de cuentas via SMS/email

**Contenido:**
- \`content-engine\` — crea contenido para X, LinkedIn, TikTok
- \`demo-screens\` — pantallas demo sin backend

**Contratos:**
- \`contract-compendium\` — genera contratos completos como .docx

## El impacto en tokens

Sin Skills Vault: V explora, improvisa, itera. ~3-5 turnos.
Con Skills Vault: V ejecuta el patrón. 1 turno.

Para 17 proyectos activos, esto suma decenas de miles de tokens ahorrados por semana.
    `,
  },
  {
    slug: "happytoc-numerologia-ia",
    title: "Caso: HappyToc — numerología validada con 160/160 casos de prueba",
    excerpt: "Cómo construimos el motor de numerología más preciso del mercado mexicano, validado contra 160 casos reales.",
    category: "community",
    readingTime: 5,
    publishedAt: "2026-06-15",
    body: `
## El cliente

Hilda, emprendedora de bienestar y productividad en México.
Su app: HappyToc — agenda personal basada en numerología.

## El desafío técnico

La numerología tiene reglas específicas que no son obvias:
- Números maestros: 11, 22 (no se reducen)
- Año calendario vs año personal
- Fases lunares sincronizadas con energía del día

**La cliente tenía una hoja de cálculo con 160 casos validados manualmente.**

## La solución

V construyó el motor de numerología en Python y lo validó
contra los 160 casos de la hoja de cálculo.

\`\`\`python
def calcular_año_personal(fecha_nacimiento: date, año: int) -> int:
    # Reducir mes + día de nacimiento
    mes = fecha_nacimiento.month
    dia = fecha_nacimiento.day
    
    # Sumar con el año actual
    suma = mes + dia + sum(int(d) for d in str(año))
    
    # Reducir a un dígito (respetando números maestros)
    while suma > 9 and suma not in (11, 22):
        suma = sum(int(d) for d in str(suma))
    
    return suma
\`\`\`

Resultado: **160/160 casos correctos.**

## Lo que se construyó

- Motor de numerología validado
- Agenda personal con energía del día
- 44 fases lunares para 2026 pre-cargadas
- Notificaciones push via VAPID
- Login con Clerk
- Base de datos Neon: profiles, agenda_entries, energy_meanings, moon_phases

Stack completo en producción: happytoc.life
    `,
  },
  {
    slug: "istore-pro-tiendas-reparacion",
    title: "iStore Pro: el SaaS para tiendas de reparación que estaba faltando",
    excerpt: "Por qué el mercado de reparación de smartphones en México necesitaba su propio sistema, y cómo lo construimos.",
    category: "community",
    readingTime: 4,
    publishedAt: "2026-06-22",
    body: `
## El mercado

Hay miles de tiendas de reparación de smartphones en México.
La mayoría lleva el control en libretas o en WhatsApp.

El software existente es caro, complicado o no está en español.

## iStore Pro

Un SaaS construido para el día a día de una tienda de reparación:

### Módulos principales
- **Órdenes de trabajo** — registro de reparación con foto, precio, tiempo estimado
- **Clientes** — historial de reparaciones y dispositivos
- **Inventario** — piezas y componentes con alertas de stock mínimo
- **Técnicos** — asignación de reparaciones y comisiones
- **Reportes** — ingresos, tiempos, eficiencia por técnico

### La experiencia del cliente
SMS automático cuando la reparación está lista.
Link para ver el estatus sin llamar.
Recibo digital con QR.

## El stack

- Next.js + Neon (sin Neon project dedicado aún — usa DATABASE_URL compartida)
- Clerk para auth multi-tenant
- Stripe para cobro de órdenes
- Resend para SMS y correos

Vive en: istore-pro.vercel.app

**El cliente brief aún no ha llegado. Cuando llegue, V lo migra a producción completa en días.**
    `,
  },
  {
    slug: "ruta618-logistica-mexico",
    title: "Ruta 618: logística de transporte para el Bajío mexicano",
    excerpt: "Cómo construimos una app de logística para Pedro Eric Piedra Reyes que conecta transportistas con clientes en tiempo real.",
    category: "community",
    readingTime: 4,
    publishedAt: "2026-07-01",
    body: `
## El cliente

Pedro Eric Piedra Reyes, empresario de transporte en la región del Bajío.
Su necesidad: digitalizar las rutas y conectar transportistas con clientes.

## El proyecto

ruta618.life — PWA de logística y transporte.

### Features principales
- Mapa de rutas en tiempo real
- Solicitud de transporte
- Seguimiento de carga
- Portal del transportista
- Reportes de viajes y facturación

## El contrato

Este fue uno de los primeros proyectos con el sistema de Contratos-Compendio:
- Precio: $8,000 MXN
- Anticipo: $1,500 MXN
- Stack documentado completo
- Cláusula de transferencia total de IP

## Lo que aprendimos

Ruta 618 fue el proyecto donde validamos que el sistema de contratos
reduce las discusiones post-entrega a casi cero.

Cuando el cliente tiene el stack, la arquitectura y los términos
en un documento bien diseñado desde el día 1, no hay sorpresas.

**Esa claridad vale más que cualquier feature extra.**
    `,
  },
  {
    slug: "darkmode-lightmode-contraste",
    title: "Modo día y noche en VForge: la guía de contraste real",
    excerpt: "Por qué el modo claro no es 'poner fondo blanco'. Cómo diseñamos un sistema que pasa WCAG AA en ambos modos.",
    category: "method",
    readingTime: 5,
    publishedAt: "2026-07-08",
    body: `
## El error más común

Muchos sistemas de diseño definen dark mode y después "invierten" para light mode.
El resultado: colores que funcionan en oscuro pero tienen ratio de contraste insuficiente en claro.

## Los ratios WCAG que seguimos

- **Texto normal sobre fondo**: mínimo 4.5:1
- **Texto grande (18px+)**: mínimo 3:1
- **Elementos interactivos**: mínimo 3:1

## Nuestros tokens en dark mode

\`\`\`css
--color-on-surface: #e5e2e1;      /* sobre #0e0e0e = 13.8:1 ✓ */
--color-muted: #6b6975;           /* sobre #0e0e0e = 4.7:1 ✓ */
--color-violet-400: #a078ff;      /* sobre #0e0e0e = 5.2:1 ✓ */
--color-cyan-400: #22d3ee;        /* sobre #0e0e0e = 8.1:1 ✓ */
\`\`\`

## Los tokens en light mode

\`\`\`css
--color-on-surface: #0c0c10;      /* sobre #ffffff = 19.6:1 ✓ */
--color-muted: #7a7a88;           /* sobre #ffffff = 4.9:1 ✓ */
--color-violet-400: #7c3aed;      /* sobre #ffffff = 5.8:1 ✓ */
--color-cyan-400: #0891b2;        /* sobre #ffffff = 4.6:1 ✓ */
\`\`\`

Nota: los accentos en light mode son más oscuros que en dark.
El violet-400 en dark es #a078ff. En light es #7c3aed.
Mismo token, diferente valor.

## El ThemeToggle

El toggle de tema en VForge usa \`data-theme\` en el html root.
El cambio es instantáneo, sin flash, con transición de 300ms.

\`\`\`typescript
document.documentElement.setAttribute(
  "data-theme",
  theme === "dark" ? "dark" : "light"
);
\`\`\`
    `,
  },
  {
    slug: "ia-no-reemplaza-desarrollador",
    title: "La IA no te reemplaza. Te hace irrelevante si no la usas.",
    excerpt: "El momento exacto en que dejé de hacerme la pregunta equivocada sobre la IA. De 3 proyectos con bugs a las 2 AM a 17 proyectos sin llamadas nocturnas de urgencia.",
    category: "origin",
    readingTime: 7,,
    publishedAt: "2026-07-15",
    body: `
## La pregunta que ya no me hacen

En 2023 me preguntaban constantemente: "¿La IA no te va a quitar el trabajo?"

Ya nadie me hace esa pregunta. No porque la hayan respondido.
Sino porque los que entendieron de qué se trata están demasiado ocupados trabajando.
Y los que siguen haciéndola... todavía no entendieron de qué se trata.

## El momento real

Hay un momento específico en el que cambia todo.
Para mí fue en octubre de 2023.

Tenía 3 proyectos activos. Un cliente necesitaba un cambio urgente en producción.
Eran las 11 PM. Había estado 10 horas frente a la pantalla.

Escribí el fix. Lo revisé. Lo deployé.
A las 2 AM me llamaron: el fix tenía un bug nuevo.

Vi el código y pensé: yo no habría escrito esto si no estuviera agotado.
La fatiga produce bugs. Los bugs producen llamadas a las 2 AM.
Las llamadas a las 2 AM producen más fatiga.

Ese ciclo tiene un nombre: el techo de un desarrollador solo.

La pregunta no era "¿la IA me quita el trabajo?"
Era: "¿hay una forma de romper este ciclo?"

## Lo que la IA hace que yo no puedo hacer cansado

No es velocidad. Es consistencia.

El código que V genera a las 2 AM tiene la misma calidad que el de las 10 AM.
No porque V sea más inteligente que yo. Sino porque V no tiene las 10 horas anteriores encima.

Esto suena trivial. No lo es.

La mayoría de los bugs en producción no vienen de problemas técnicos complejos.
Vienen de decisiones tomadas bajo fatiga: el `if` que debería ser `if else`,
el array que debería validarse antes de mapear, el timeout que se olvidó configurar.

V no se cansa. Esa sola propiedad cambia la economía del desarrollo solo.

## Lo que yo hago que V no puede hacer

Aquí es donde la conversación sobre "reemplazo" se vuelve incorrecta.

**El criterio de negocio nuevo:** Cuando un cliente describe un problema de negocio
que no existe en ningún proyecto anterior, alguien tiene que decidir qué construir primero,
qué dejar para después, y qué no construir nunca. Eso requiere criterio. V ejecuta el criterio.
No lo tiene.

**La lectura del cliente:** En la llamada donde el cliente dice "me gustó la demo"
pero su tono dice otra cosa, hay información que no se transmite por texto.
Ese calibrado es humano. V no está en esa llamada.

**El diseño de territorio nuevo:** Cuando enfrentamos algo que no hemos construido antes,
alguien tiene que diseñar la arquitectura antes de que V pueda implementarla.
V es excelente ejecutando patrones. Para territorio sin patrón, necesita dirección.

## La pregunta correcta

No es "¿la IA reemplaza al desarrollador?"

Es: "¿qué parte de tu trabajo debería ser tuyo, y qué parte debería operar un sistema?"

La respuesta honesta: el 70% de lo que hacía en 2023 no requería mi presencia.
Relectura de documentación. Boilerplate. Configuraciones que ya hice antes. Debugging de patrones conocidos.

Ese 70% ahora lo hace V.

El 30% restante — el que requiere criterio, relación, diseño original — ese es mío.
Y lo puedo hacer mejor porque no lo comparto con el 70%.

## El resultado en números

2022: 3 proyectos activos, techo real de capacidad, bugs a las 2 AM.
2026: 17 proyectos activos, sin llamadas nocturnas de urgencia, tiempo para el trabajo que importa.

No porque trabajé más horas. Sino porque dejé de hacer el trabajo que no requería que yo lo hiciera.

La IA no me quitó el trabajo. Me devolvió el trabajo que vale la pena hacer.

---

**Takeaways:**
- La IA no reemplaza al desarrollador: transforma qué tipo de trabajo hace el desarrollador
- La consistencia de la IA (sin fatiga, sin ciclos de burnout) rompe el techo del desarrollador solo
- Lo que la IA no puede hacer: criterio de negocio nuevo, lectura humana del cliente, diseño de territorio sin patrón
- El 70% del trabajo de 2023 era repetición: boilerplate, configuraciones conocidas, debugging de patrones conocidos
- El resultado no es "trabajar más rápido". Es trabajar en el 30% que importa, no en el 70% que agota

    `,
  },
  {
    slug: "mcp-empresarial-casos-uso",
    title: "VForge MCP Empresarial: casos de uso reales para equipos de +10 personas",
    excerpt: "Tres empresas mexicanas reales: distribuidora de Monterrey, despacho contable en CDMX, cadena de tiendas en Guadalajara. Qué cambia cuando el LLM puede tocar tus sistemas.",
    category: "mcp",
    readingTime: 9,,
    publishedAt: "2026-07-22",
    body: `
## El problema con "adoptar IA" en una empresa

Cuando una empresa en México decide "adoptar IA", el primer error es el mismo:
contratan a alguien que instala ChatGPT Teams y capacita al equipo en prompts.

Tres meses después, el equipo usa ChatGPT para redactar correos.
El CEO esperaba eficiencia operacional. Consiguió un asistente de escritura.

La brecha entre lo que la IA puede hacer y lo que las empresas mexicanas realmente usan
es enorme. Y la razón es técnica: sin MCP, la IA no puede tocar los sistemas reales.

## Qué es MCP Empresarial (vs MCP general)

El MCP estándar de VForge conecta Claude con la infraestructura de VForge.
El MCP Empresarial es diferente: construimos un servidor MCP privado
que expone las herramientas específicas de TU empresa.

No las herramientas genéricas de VForge. Las tuyas.
Tu ERP. Tu base de clientes. Tus reportes. Tus flujos de aprobación.

El agente — Claude u otro LLM compatible — se conecta a ese servidor
y tiene acceso a todo lo que expones, con los permisos que defines.

## 3 casos reales en empresas mexicanas

### Caso 1: Distribuidora de insumos industriales — Monterrey

**El problema:** El equipo de ventas tiene 400+ SKUs activos.
Para dar una cotización, el vendedor necesita:
- Verificar disponibilidad en almacén (sistema AS/400)
- Consultar precio de lista actual (Excel actualizado manualmente)
- Calcular precio cliente (descuento por volumen, zona)
- Agregar tiempo de entrega estimado (hoja de cálculo de logística)
- Redactar la cotización y enviarla (Word + correo)

Tiempo promedio por cotización: 35-45 minutos.
Cotizaciones por vendedor por día: 4-6.

**Con MCP Empresarial:**
El vendedor abre Claude Desktop. Escribe:
"Cotización para Acero Noreste: 500 barras 1/2 pulgada, 200 ángulos 2x2, entrega Parque Industrial Valle."

Claude llama a las tools del servidor MCP:
1. `get_inventory(sku_list)` — disponibilidad en tiempo real del AS/400
2. `get_client_pricing(client_id, items)` — precio con descuento aplicado
3. `estimate_delivery(zone, weight)` — tiempo de entrega calculado
4. `generate_quotation(items, client, delivery)` — PDF de cotización

Output: PDF de cotización listo en 90 segundos.

**El resultado:** 8x más cotizaciones por vendedor por día. ROI en semanas.

---

### Caso 2: Despacho contable — CDMX (15 clientes corporativos)

**El problema:** El equipo de asesores necesita revisar mensualmente:
- Declaraciones del SAT (portal del SAT, login por cliente)
- Cuentas por pagar y cobrar (contpaqi por cliente)
- Vencimientos de obligaciones fiscales (Excel interno)
- Estatus de pagos (banco, estado de cuenta)

Para 15 clientes, esto es 60-80 horas de revisión mensual.
La mitad del tiempo es buscar la información. La otra mitad es analizarla.

**Con MCP Empresarial:**
El asesor le pregunta a Claude:
"Resumen de estatus de todos los clientes al cierre de mes. Urgencias primero."

El servidor MCP tiene acceso a:
- `get_sat_status(rfc)` — estatus de declaraciones via scraping autenticado
- `get_contpaqi_balance(client_id)` — CxP/CxC de Contpaqi
- `get_fiscal_calendar(client_id)` — próximas obligaciones del cliente
- `get_bank_status(client_id)` — saldo y movimientos recientes

Output: Reporte priorizado por urgencia. Los clientes con problemas aparecen primero.

**El resultado:** De 80 horas de revisión a 8 horas de revisión y aprobación.

---

### Caso 3: Cadena de 12 tiendas de conveniencia — Guadalajara

**El problema:** El director de operaciones visita físicamente las tiendas para saber:
- Cuál tiene el mejor margen esta semana
- Cuál necesita reposición urgente
- Cuál tiene el ticket promedio más bajo y por qué

Con 12 tiendas, esto son 12 llamadas o 12 visitas por semana.
Sin datos consolidados en tiempo real, las decisiones se toman con una semana de retraso.

**Con MCP Empresarial:**
El director desde su teléfono pregunta:
"¿Cómo vamos esta semana? ¿Alguna tienda con alerta?"

El servidor MCP accede a:
- `get_weekly_sales(store_ids)` — ventas por tienda del período
- `get_margin_by_store(store_ids)` — margen por categoría
- `get_inventory_alerts(store_ids)` — productos bajo mínimo
- `get_ticket_average(store_ids)` — ticket promedio y comparativo vs semana anterior

Output: Resumen ejecutivo en 30 segundos. Solo abre los reportes que Claude flaggea.

**El resultado:** 12 llamadas semanales → 1 lectura diaria de 5 minutos.

## Cómo se implementa

Un servidor MCP Empresarial para VForge toma entre 2-4 semanas:

**Semana 1:** Auditoría de sistemas existentes. ¿Qué tiene API? ¿Qué necesita scraping? ¿Qué datos son críticos?

**Semana 2:** Desarrollo del servidor MCP con las tools prioritarias (normalmente 8-15 tools para empezar).

**Semana 3:** Integración y pruebas con el equipo. Definición de permisos por rol.

**Semana 4:** Capacitación, ajustes, monitoreo de primeras semanas en producción.

**Precio:** desde $25,000 MXN para implementaciones estándar.
Retorno típico: 3-6 meses dependiendo del volumen de trabajo que automatiza.

## Por qué 2026 es el año crítico

El MCP estándar tiene menos de 2 años de existencia real.
Las empresas mexicanas que lo implementen en 2026 van a tener una ventaja
que sus competidores tardarán 2-3 años en alcanzar.

No es ventaja de tecnología. Es ventaja de proceso:
cuando tu equipo ya trabaja con IA conectada a sistemas reales,
la curva de aprendizaje de tus competidores se vuelve tu moat.

---

**Takeaways:**
- MCP Empresarial no es "adoptar IA": es conectar el LLM a los sistemas reales de tu empresa
- Los 3 casos MX más comunes: cotizaciones en distribuidoras, revisión mensual en despachos, operaciones en cadenas de tiendas
- El ROI es medible: de 35-45 min por cotización a 90 segundos; de 80 horas de revisión a 8 horas
- Implementación típica: 2-4 semanas, desde $25,000 MXN, retorno en 3-6 meses
- La ventaja no es la tecnología: es que cuando tu equipo ya opera con IA real, la curva de aprendizaje de tu competidor es tu moat

    `,
  },
  {
    slug: "ia-para-negocios-mexico",
    title: "IA para negocios en México: el estado actual en 2026",
    excerpt: "Qué está adoptando el mercado mexicano, qué sigue rezagado, y dónde están las oportunidades reales.",
    category: "community",
    readingTime: 6,
    publishedAt: "2026-07-29",
    body: `
## México en el mapa de adopción de IA

México tiene una posición única en Latam:
- Segunda economía más grande de la región
- 40+ millones de smartphones activos
- Alta penetración de WhatsApp (95%+ de usuarios de internet)
- Ecosistema de startups creciendo en CDMX, GDL, MTY

Pero en adopción de IA para negocios, México está 18-24 meses detrás de EE.UU.

## Qué ya se está adoptando

1. **Chatbots de WhatsApp** — el caso más común. Automatización básica.
2. **Generación de contenido** — posts, descripciones de producto, emails.
3. **Soporte al cliente** — respuestas automáticas en primer nivel.

## Qué sigue rezagado

1. **Agentes con acceso a sistemas internos** — MCP es prácticamente desconocido.
2. **Automatización de procesos internos** — la mayoría sigue en Excel.
3. **IA en el desarrollo de software** — pocos despachos lo usan sistemáticamente.

## La oportunidad

El rezago de 18-24 meses crea una ventana de oportunidad enorme
para empresas que adopten IA ahora.

El que tenga un MCP Empresarial funcionando en 2026
tendrá una ventaja operacional que sus competidores tardarán años en replicar.

## Dónde entra VForge

Somos el puente entre la tecnología y la empresa mexicana.
No vendemos tecnología — vendemos resultados operacionales en español,
con soporte real, en pesos mexicanos.
    `,
  },
  {
    slug: "costo-no-hacer-app",
    title: "El costo de NO tener una app en 2026",
    excerpt: "Cuánto dinero están dejando sobre la mesa los negocios mexicanos que aún dependen de WhatsApp y hojas de Excel.",
    category: "community",
    readingTime: 5,
    publishedAt: "2026-08-05",
    body: `
## La ilusión de "no necesito app"

"Mi negocio funciona bien sin app."

Puede ser verdad hoy. Pero hay un costo oculto que no estás contando.

## Los 4 costos invisibles

### 1. Tiempo de gestión manual
¿Cuántas horas por semana dedicas a tareas que podrían automatizarse?
Cotizaciones manuales. Seguimiento por WhatsApp. Inventario en Excel.

Promedio en negocios mexicanos sin sistemas: **8-12 horas/semana**.
A $300/hora (costo real de tu tiempo): **$9,600-14,400 MXN/mes desperdiciados**.

### 2. Errores humanos
Sin sistema: cada error de captura es una queja de cliente o un descuadre de inventario.
Costo promedio de un error en pedido: $500-2,000 MXN entre reposición y atención.

### 3. Fricción del cliente
Un cliente que no puede ver el estatus de su pedido llama al WhatsApp.
Esa llamada cuesta tiempo. Y paciencia del cliente.

### 4. Datos que no existen
Sin sistema, no tienes datos. Sin datos, no puedes decidir con información.
¿Cuál es tu producto más rentable? ¿Tu cliente más valioso? ¿Tu hora más productiva?

## La matemática real

Una PWA de $12,000 MXN amortizada a 12 meses = $1,000/mes.
Si resuelve 4 horas de trabajo manual por semana = $4,800/mes de valor.

**ROI: 380% en el primer año.**
    `,
  },
  {
    slug: "whatsapp-bot-baileys",
    title: "Cómo construimos Goossip: el bot de marketing en WhatsApp",
    excerpt: "La arquitectura detrás de Goossip, nuestro agente de marketing que opera en WhatsApp via Baileys desde Hetzner.",
    category: "product",
    readingTime: 6,
    publishedAt: "2026-08-12",
    body: `
## Por qué WhatsApp

WhatsApp tiene 95% de penetración entre usuarios de internet en México.
Es donde viven los clientes. Donde se toman decisiones de compra.

No estar en WhatsApp es no estar en el mercado.

## La arquitectura de Goossip

Goossip corre en Hetzner en dos procesos pm2:
1. \`baileys-goossip\` — el bot de WhatsApp
2. \`goosip-scheduler\` — el programador de campañas

### El bot de WhatsApp

Usamos Baileys (biblioteca Node.js no oficial).
La conexión se establece via pairing code, no QR.

\`\`\`javascript
// Conexión inicial
const sock = makeWASocket({
  auth: state,
  printQRInTerminal: false,
});

// Autenticación via pairing code
const code = await sock.requestPairingCode(phoneNumber);
console.log("Código:", code); // → Ingresar en WhatsApp > Dispositivos
\`\`\`

### El scheduler

Cada campaña de marketing se programa con una fecha y hora:
- Mensaje de lanzamiento
- Seguimiento 48 horas después
- Recordatorio final

Goossip envía automáticamente, sin intervención humana.

## Lo que puede hacer

- Enviar campañas a lista de contactos
- Responder preguntas frecuentes automáticamente
- Agendar citas y enviar confirmación
- Notificar cuando un pedido está listo
- Recopilar feedback post-servicio

## Precio como producto

**Bots Inteligentes desde $1,500 MXN** en el catálogo de VForge.
    `,
  },
  {
    slug: "video-ia-higgsfield",
    title: "Generamos el primer video de VForge con Higgsfield en 4 créditos",
    excerpt: "Cómo usamos Seedance 1.5 Pro desde el servidor de Hetzner para generar video cinematic de marca sin salir de la terminal.",
    category: "product",
    readingTime: 4,
    publishedAt: "2026-08-19",
    body: `
## La esfera que lo empezó todo

El primer asset visual de VForge fue una imagen generada con Nano Banana Pro:
una esfera de energía iridiscente en azul cobalto y violeta.

El prompt: plasma swirling inside, cobalt blue, violet, crimson rim accent.
El resultado: la identidad visual del año.

## De imagen a video

Con la esfera ya en biblioteca, el siguiente paso fue natural:
animarla en un video cinematográfico de 12 segundos.

## El proceso

\`\`\`bash
# Desde el relay de Hetzner
higgsfield generate create seedance1_5 \\
  --prompt "The VMomentum energy sphere rotates and pulses..." \\
  --aspect_ratio 16:9 \\
  --duration 12 \\
  --resolution 720p \\
  --image [UUID de la esfera] \\
  --wait --json
\`\`\`

Costo: **4 créditos** (~$1.20 USD equivalente).
Tiempo de generación: **~2 minutos**.

## El resultado

Un video de 12 segundos, 720p, con audio generado automáticamente.
La esfera rota, emite anillos de luz, la cámara hace push-in con gravedad épica.

Ese video ahora es el fondo del hero de vforge.site.

## Lo que esto significa

Con $200 MXN en créditos de Higgsfield,
cualquier cliente de VForge puede tener un video de marca cinematográfico.

**Videos IA desde $200 en el catálogo de VForge.**
    `,
  },
  {
    slug: "obsidian-crystal-design",
    title: "La estética Obsidian + Crystal: el lenguaje visual de VForge",
    excerpt: "Por qué elegimos esta estética, qué la define, y cómo la aplicamos de forma consistente en cada pantalla.",
    category: "method",
    readingTime: 5,
    publishedAt: "2026-08-26",
    body: `
## El brief visual

Cuando Luis decidió rediseñar VForge en 2026, el brief fue simple:
**"Higgsfield level. No puedo tener librerías de íconos baratas mezcladas con calidad de cine."**

De ahí nació la estética Obsidian + Crystal.

## Los principios

### 1. Obsidian base
Todo empieza en negro volcánico: #03020a.
No negro puro (#000). Negro con personalidad.

El fondo no es un lienzo vacío. Es una profundidad con vida.

### 2. Crystal elements
Los componentes de UI son cristales: translúcidos, con reflejos, con bordes que brillan.

\`\`\`css
/* Crystal card */
background: linear-gradient(135deg, rgba(139,92,246,0.18), rgba(139,92,246,0.06));
border: 1px solid rgba(139,92,246,0.4);
/* Sheen superior — el destello del cristal */
::before { background: linear-gradient(180deg, rgba(255,255,255,0.12), transparent 40%); }
\`\`\`

### 3. Sin íconos de librería
Lucide, Heroicons, FontAwesome — todos fuera.
Cada ícono en VForge es un SVG diseñado o un emoji dimensional de alto contraste.

### 4. Tipografía display
Geist Sans para UI. Hanken Grotesk para copy.
Tracking agresivo en labels: 0.2em.
Pesos extremos: 300 (body) y 700 (hero).

### 5. Motion con propósito
Cada animación tiene razón de existir.
El orbe respira. Los nodos pulsan. Las tarjetas cristal tienen sheen en hover.

## La prueba de fuego

Si un elemento puede ir en cualquier web, no es de VForge.
Si al verlo dices "esto es VForge", está bien hecho.
    `,
  },
  {
    slug: "construir-solo-con-ia",
    title: "Construir 17 apps solo en un año: lo que la IA hace posible",
    excerpt: "17 apps, 1 desarrollador, 12 meses. La historia real del tradeoff: qué hace V que yo no puedo, y qué hago yo que V no puede. Sin romanticismo.",
    category: "origin",
    readingTime: 8,
    publishedAt: "2026-09-02",
    featured: true,
    body: `
## El número que nadie cree

17 aplicaciones en producción.
1 solo desarrollador.
12 meses.

La primera reacción de cualquier PM de software es incredulidad.
"Con qué equipo?" "Cuántos contratistas?" "Qué tan básicas son las apps?"

La respuesta a las tres preguntas: sin equipo, sin contratistas, no tan básicas.

Y la pregunta que sigue es la interesante:
**¿Cómo es posible?**

## Lo que hace V que no puedo hacer yo

Antes de responder cómo, hay que entender el qué.

### Memoria sin degradación

A las 2 AM, después de 10 horas de trabajo,
mi memoria de los detalles de carnesn.ink está borrosa.
¿Era la tabla orders o la tabla pedidos? ¿El CLABE iba en el webhook o en el cron?

V no tiene este problema. Neon Brain guarda todo:
cada decisión de arquitectura, cada patrón validado, cada credencial (referencia, no valor).

Cuando regreso a un proyecto después de 3 semanas trabajando en otro,
V me recuerda en 30 segundos dónde quedamos.
Yo tardaría 45 minutos en releer commits y notas.

### Ejecución paralela de contexto

Yo proceso un proyecto a la vez. Mi cerebro hace context switching con fricción real.

V tiene el contexto de los 17 proyectos cargado simultáneamente.
Puede responder sobre happytoc.life y en el siguiente turno sobre ruta618.life
sin ninguna degradación de calidad.

Eso multiplica la velocidad de respuesta en proyectos de soporte.

### Código sin fatiga

El código que escribo a las 10 PM tiene más bugs que el de las 10 AM.
Es biología básica: el cerebro se cansa, los patrones fallan.

El código que V genera a las 2 AM es idéntico al de las 10 AM.
La consistencia no tiene horario.

## Lo que no puede hacer V (y nadie te lo dice)

Sería deshonesto no mencionarlo.

### Criterio de negocio nuevo

V puede optimizar. V puede adaptar. V puede ejecutar.
Pero cuando un cliente describe un problema de negocio que no existe en el training data,
V necesita guía.

"¿Cómo estructuro el modelo de precios para una app de distribución de carne
donde el precio varía por zona, por volumen y por cliente?"

V puede proponer opciones. Pero la decisión de cuál es correcta para ese negocio específico,
con ese cliente específico, en ese mercado específico, requiere criterio humano.

### Relación

Ningún sistema de IA reemplaza la llamada donde le preguntas al cliente
cómo le fue en la temporada, si su socio salió del proyecto,
si el presupuesto sigue igual.

Esa información no vive en ninguna base de datos.
Y es frecuentemente la que determina si un proyecto sobrevive.

### Territorio técnico completamente nuevo

V ejecuta patrones conocidos con excelencia.
Para algo que no existe en los patrones del Skills Vault,
necesito diseñar la arquitectura primero.

V implementa. Yo diseño lo nuevo.

## La fórmula que nadie me enseñó

**Luis (criterio + relación + diseño) + V (ejecución + memoria + consistencia) = equipo completo.**

No es que la IA reemplaze al desarrollador.
Es que la IA hace los 70% que consumen el 30% de la energía real,
y el desarrollador se concentra en el 30% que consume el 70% de la energía real.

El resultado: la capacidad productiva de un equipo de 5-8 personas,
con la coordinación de 0 personas (porque no hay equipo que coordinar).

## Lo que 12 meses y 17 proyectos te enseñan

El mayor error que comete alguien que empieza a trabajar con IA:
tratarla como una herramienta que acelera.

La IA no es un acelerador de lo que ya hacías.
Es un cambio de arquitectura de cómo trabajas.

La pregunta correcta no es "¿cómo uso IA para hacer más rápido lo que hago?"
La pregunta correcta es "¿qué parte de mi trabajo debería hacer yo,
y qué parte debería operar un sistema?"

Cuando esa distinción está clara, el número deja de sorprender.
17 apps con 1 persona no es magia.
Es la consecuencia natural de dividir el trabajo correctamente.

---

**Takeaways:**
- V tiene memoria sin degradación y ejecución sin fatiga: dos ventajas estructurales sobre cualquier humano
- Lo que no puede hacer la IA: criterio de negocio nuevo, relaciones humanas, diseño de territorio desconocido
- La fórmula real: humano (criterio + relación) + IA (ejecución + memoria) = equipo completo
- La IA no es un acelerador: es un cambio de arquitectura de cómo trabajas
- 17 apps con 1 persona es el resultado de dividir el trabajo correctamente, no de trabajar más horas

    `,
  },
  {
    slug: "proximos-pasos-vforge",
    title: "VForge en los próximos 12 meses: hoja de ruta pública",
    excerpt: "Qué estamos construyendo, qué lanzaremos y hacia dónde va la plataforma en el resto de 2026 y 2027.",
    category: "origin",
    readingTime: 4,
    publishedAt: "2026-09-09",
    body: `
## Por qué publicar la hoja de ruta

La transparencia es una ventaja competitiva para nosotros.
Nuestros clientes necesitan saber hacia dónde vamos.
Nuestros futuros clientes necesitan ver que hay visión.

## Lo que lanzamos en 2026

### Q2 2026 (completado)
- ✅ Rediseño completo Obsidian + Crystal
- ✅ VForge MCP v1 (14 tools)
- ✅ Generador de Contenido IA
- ✅ Video IA via Higgsfield
- ✅ Contratos-Compendio 2.0
- ✅ Blog y documentación pública

### Q3 2026 (en progreso)
- 🔄 Portal del cliente rediseñado (pantalla de seguimiento iPhone-style)
- 🔄 Vista Owner (Jimmy + Luis) para gestión multi-cliente
- 🔄 Galería de videos IA por proyecto
- 🔄 MCP Empresarial v1

### Q4 2026 (planeado)
- 📋 V disponible para clientes (no solo para Luis)
- 📋 Marketplace de templates con deploy en 1 click
- 📋 API pública de VForge
- 📋 Partner program para agencias

## 2027

- App Store oficial de VForge
- Multi-tenancy completo
- V como producto SaaS independiente

**El objetivo: ser la infraestructura de IA para las mejores agencias de Latam.**
    `,
  },
];

export const FEATURED_POSTS = POSTS.filter((p) => p.featured);

export const POST_BY_SLUG = Object.fromEntries(
  POSTS.map((p) => [p.slug, p])
);

export const CATEGORIES = {
  origin: { label: "Origen", color: "#a855f7" },
  method: { label: "Método", color: "#22d3ee" },
  mcp: { label: "MCP", color: "#f59e0b" },
  product: { label: "Producto", color: "#10b981" },
  savings: { label: "Ahorro", color: "#3b82f6" },
  community: { label: "Comunidad", color: "#ec4899" },
} as const;
