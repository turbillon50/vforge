# VForge solo — boceto de cómo la fábrica podría hacer una app de punta a punta

> Boceto vivo (1-oct-2026). Sale de correr de verdad el primer cliente por el embudo completo: **Jiraki Soccer League (Said)**.
> No es un plan para construir todo ya: VForge crece por necesidad real. Cada pieza se gana su lugar cuando un cliente la pide.

## La meta
Que un cliente nuevo pase de "¡Hola! Quiero más información" en WhatsApp a "app en producción y cobrada" con Luis
interviniendo sólo en lo que es suyo: **decidir precio, cuidar la relación y aprobar lo visual**. Todo lo demás lo
mueven agentes, y cada paso queda en el expediente (GitHub + Vercel + Neon + etapa + conversación).

## Lo que ya funciona (probado con Jiraki el 1-oct)
| Paso | Quién lo hace hoy | Estado |
|---|---|---|
| Llega el cliente por anuncio a la línea Business | Meta / WhatsApp | ✅ |
| Alta del cliente con demo base del catálogo (fork-copia) | VForge → GitHub (repo privado propio) | ✅ |
| Chat del cliente al expediente | ZIP manual → Hilo / **en vivo vía TRAMA** | ✅ ZIP · 🟡 en vivo recién conectado |
| Entender qué pidió (audios incluidos) | Whisper local + brief en el repo | ✅ manual (lo hizo Vulcano) |
| Base de datos y despliegue propios | Neon + Vercel ligados al repo | ✅ automático en altas nuevas (falta crear la Neon sola) |
| Construir la demo premium | Codex + skills de diseño | 🟡 se cayó a media corrida (compactación) |
| QA en pantalla y correcciones | Vulcano + Playwright | ✅ manual |
| Fotos fotorrealistas | Higgsfield | ✅ (cuidar marcas en ropa) |
| Avanzar la línea de avance | Vulcano picando la API | ✅ |
| Leer lo que contesta el cliente y sugerir el siguiente paso | Analista de señales | 🟡 recién conectado |
| Contrato | LUTOR | 🟡 en construcción |
| Firma | aceptación simple en LUTOR | 🟡 (firma avanzada: después) |
| Cobro del anticipo | Mercado Pago / Stripe | ❌ |
| Construcción de la versión real y entrega | agentes | ❌ (mismo motor que la demo, con más alcance) |
| Mantenimiento | salud + sanidad + alertas | 🟡 piezas sueltas |

## El circuito que queremos (cada flecha es un evento en el expediente)
```
WhatsApp (Business)
   │  TRAMA (conectores vivos) ──► VForge /api/hilo/ingest
   ▼
[1] Alta automática  ── el analista detecta "cliente nuevo + qué quiere" y PROPONE el alta
   │                     (Luis la aprueba con un toque: nombre, rubro, demo base sugerida)
   ▼
[2] Brief           ── transcribe audios, junta logo/fotos del chat, escribe docs/BRIEF.md en el repo
   ▼
[3] Demo            ── orquestador por FASES (no una sola corrida gigante):
   │                     a) modelo de datos + seed  b) pantallas núcleo  c) marca/diseño premium
   │                     d) QA automático (MUST-500 + SANIDAD + capturas)  e) deploy
   │                     cada fase en su propia corrida, con verificación, y reintento si un agente se cae
   ▼
[4] Revisión de Luis ── sólo lo visual: le llegan 4 capturas al celular y aprueba / pide cambios por voz
   ▼
[5] Entrega          ── mensaje sugerido al cliente (Luis lo manda: los mensajes salen de Luis, no de un bot)
   ▼
[6] Escucha          ── señales: interés / acepta / pide cambios / precio / se enfrió
   │                     "pide cambios" → vuelve a [3] con la lista de cambios
   │                     "acepta" → [7]
   ▼
[7] Contrato         ── LUTOR con la plantilla oficial; Luis sólo pone el precio → link al cliente
   ▼
[8] Firma + anticipo ── aceptación en LUTOR + link de pago → al pagar: "En construcción"
   ▼
[9] Construcción     ── mismo orquestador por fases, ahora contra el alcance del contrato
   ▼
[10] Entrega + mantenimiento ── salud diaria, sanidad semanal, avisos al cliente
```

## Qué falta para cerrar el circuito (en orden de valor)
1. **Orquestador por fases que no se cae.** Hoy Codex truena al compactar en tareas largas. Partir el trabajo en fases
   cortas con un supervisor que relanza la fase caída con el contexto del repo (el repo es la memoria, no el agente).
2. **Disco del servidor.** Estuvo al 98-100% dos veces el 1-oct. Política automática: borrar `node_modules`/`.next` de
   worktrees cerrados y vigilancia con alerta. Sin esto, cualquier agente puede tronar a media obra.
3. **Neon automática en el alta.** El repo y Vercel ya nacen solos; falta crear su base y su `DATABASE_URL`.
4. **Brief automático.** Transcribir los audios del chat (Whisper) y sacar logo/fotos del ZIP o de TRAMA sin intervención.
5. **Cobro.** Link de pago del anticipo dentro del contrato (Mercado Pago, que ya está certificado) y webhook → etapa.
6. **Propuesta de alta desde la escucha.** Que un chat nuevo de anuncio se convierta en "¿le abro expediente?".
7. **Aprobación visual por celular.** Capturas + "va / cámbiale esto" por voz, que regrese como lista de cambios.

## Reglas que no cambian
- Los mensajes al cliente los manda Luis. La IA sugiere, no habla por él.
- Nada vive sólo en el servidor: código, prompts, briefs y fotos en GitHub; despliegue en Vercel; reporte en el expediente.
- Nunca afirmar avance sin evidencia (build verde, captura vista, URL respondiendo).
- Lo visual de marca se aprueba antes de aplicarse.
- Crecer por necesidad: cada pieza de esta lista se construye cuando un cliente real la necesita.
