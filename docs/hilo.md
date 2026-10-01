# Hilo

Hilo es el servicio privado de VForge para observar dos sesiones vivas de WhatsApp Web en el servidor:

- `personal`: WhatsApp normal de Luis.
- `negocio`: WhatsApp Business de publicaciones.

No usa Baileys ni la API de Meta. Usa dos perfiles persistentes de Chromium vinculados como dispositivos de WhatsApp Web.

## Garantia de solo lectura

El listener no envia mensajes, no contesta, no hace clicks de chat y no llama APIs internas de envio. Al cargar WhatsApp Web inyecta guardas que bloquean input, submits, clicks de envio y botones del footer. La captura normal sucede por evento del `Store.Msg` interno de WhatsApp Web; si WhatsApp cambia sus modulos, cae a `MutationObserver` DOM y marca la linea como `degradado`.

Para conservar esa garantia operativa, nadie debe usar manualmente esos perfiles de Chromium para abrir conversaciones o escribir. Hilo esta pensado para correr headless y vincularse por QR desde `/app/hilo`.

## Variables

Archivo sugerido: `/etc/hilo/hilo.env`.

```bash
HILO_SECRET=...
HILO_DATABASE_URL=postgres://...
HILO_ACTIVO=0
HILO_CHROMIUM_PATH=/opt/pw-browsers/chromium
HILO_DATA_DIR=/var/lib/hilo
HILO_API_HOST=127.0.0.1
HILO_API_PORT=9320

MESH_URL=https://mesh.example/v1
MESH_KEY=...
MESH_MODEL=gpt-oss-120b
```

Variables de VForge para la pantalla:

```bash
HILO_DATABASE_URL=postgres://...
HILO_ACTIVO=0
HILO_API_BASE=http://127.0.0.1:9320
HILO_SECRET=...
```

`HILO_ACTIVO` es el interruptor maestro. El default operativo es `0`: VForge permite subir ZIPs y editar chats ligados, pero el servicio no arranca sesiones de WhatsApp Web ni guarda mensajes vivos. Para encender el vivo se requieren las dos cosas:

- `HILO_ACTIVO=1`.
- El chat ligado debe tener `monitorear=true`.

## Base de datos

La migracion idempotente vive en `migrations/048_hilo.sql`. El servicio tambien asegura el schema al arrancar.

Tablas principales:

- `hilo_chats`: chats ligados a un proyecto. Un ZIP crea un chat con `origen = 'zip'`, `monitorear = false`, `linea = null` y `chat_id` importado. Cuando el vivo vea un chat con el mismo nombre/numero y `monitorear = true`, completa `linea` y `chat_id`.
- `hilo_mensajes`: un registro por mensaje y linea, con `UNIQUE (linea, id_wa)`.
- `hilo_analisis_cursor`: cursor barato por conversacion.
- `hilo_hallazgos`: pendientes, oportunidades y riesgos detectados por el analista.

Datos guardados por mensaje:

```json
{
  "linea": "personal|negocio",
  "chat_id": "...",
  "chat_nombre": "...",
  "es_grupo": false,
  "autor": "...",
  "de_mi": false,
  "tipo": "texto|audio|imagen|documento|otro",
  "texto": "...",
  "ts": "...",
  "id_wa": "...",
  "media_ref": "...",
  "media_tipo": "...",
  "origen": "vivo|zip",
  "hilo_chat_id": "..."
}
```

Media: Hilo guarda referencia y tipo. La descarga de binarios y la transcripcion de audio quedan separadas como TODO en `servicios/hilo/hilo.mjs` (`descargarMediaMensaje` y `transcribirAudioMensaje`).

## Importar ZIP de WhatsApp por proyecto

Luis exporta desde WhatsApp en su telefono con **Exportar chat** y sube el `.zip` desde:

- `/app/projects/<projectId>/expediente`
- `/app/hilo` tras elegir un proyecto

La ruta owner-only es:

- `POST /api/hilo/projects/<projectId>/zip`

Body `multipart/form-data`:

- `file`: ZIP exportado por WhatsApp.
- `etiqueta` opcional: texto libre como `socio` o `asistente`.

La API valida que sea ZIP, que no supere 50 MB y que incluya un `.txt`. El importador lee el TXT de WhatsApp, soporta Android/iOS en español/ingles, fechas con o sin corchetes, 12 h/24 h, mensajes multilinea, mensajes de sistema, `<adjunto: ...>` y `<Media omitted>`. Los adjuntos del ZIP solo se listan por nombre y tipo; no se procesan ni se extraen como binario persistente.

Cada mensaje importado usa `origen = 'zip'` y un `uid/id_wa` determinista `zip:<sha256(chat+autor+ts+texto)>`, de modo que subir el mismo ZIP otra vez devuelve repetidos y no duplica filas.

Respuesta resumida:

```json
{
  "chat_detectado": {},
  "participantes": ["Luis", "Socio"],
  "rango_fechas": { "desde": "...", "hasta": "..." },
  "mensajes": { "nuevos": 10, "repetidos": 0, "total": 10 },
  "adjuntos": [{ "nombre": "IMG-...", "tipo": "imagen" }]
}
```

La etiqueta y el switch se guardan con:

- `PATCH /api/hilo/chats/<chatId>`

Body JSON:

```json
{ "etiqueta": "socio", "monitorear": true }
```

## Instalar servicio

```bash
useradd --system --home /var/lib/hilo --shell /usr/sbin/nologin hilo
mkdir -p /opt/vforge /var/lib/hilo /etc/hilo
chown -R hilo:hilo /var/lib/hilo
rsync -a /root/worktrees/codex-hilo/ /opt/vforge/
cp /opt/vforge/servicios/hilo/hilo.service /etc/systemd/system/hilo.service
systemctl daemon-reload
systemctl enable --now hilo.service
```

Con `HILO_ACTIVO=0`, el proceso expone `/estado` pero no abre Chromium ni inicia sesiones. Para encender el vivo, cambia `HILO_ACTIVO=1` en `/etc/hilo/hilo.env` y reinicia el servicio.

Ver estado:

```bash
journalctl -u hilo.service -f
curl -H "x-hilo-key: $HILO_SECRET" http://127.0.0.1:9320/estado
```

## Vincular las lineas

1. Abre `/app/hilo` como Owner.
2. Si una linea esta `Esperando QR`, escanea el QR desde el telefono de Luis.
3. WhatsApp guardara el dispositivo vinculado en `/var/lib/hilo/<linea>`.
4. Reinicios posteriores reutilizan el perfil persistente y no deben pedir QR salvo revocacion o caducidad.

Endpoints locales protegidos:

- `GET /estado`
- `GET /qr/personal`
- `GET /qr/negocio`

Todos exigen `x-hilo-key: $HILO_SECRET`.

## Analista batch

Una corrida:

```bash
cd /opt/vforge/servicios/hilo
node analista.mjs
```

Loop barato:

```bash
HILO_ANALISTA_LOOP=1 HILO_ANALISTA_INTERVAL_MS=600000 node analista.mjs
```

El analista usa `MESH_URL`, `MESH_KEY` y `MESH_MODEL` con API compatible con OpenAI. Guarda hallazgos en `hilo_hallazgos`; si un hallazgo es importante publica un evento Unicorn con `tipo = "hilo"` y `origen = "hilo"`.

El analista solo toma mensajes ligados a `hilo_chats`. No analiza chats sueltos ni intenta adivinar proyecto; el `project_id` del chat ligado manda.

## VForge

- Pantalla: `/app/hilo`.
- API JSON owner-only: `/api/hilo`.
- QR owner-only: `/api/hilo/qr/<linea>`.
- Import ZIP owner-only: `/api/hilo/projects/<projectId>/zip`.
- Editar chat ligado owner-only: `/api/hilo/chats/<chatId>`.

El menu principal incluye Hilo. La pantalla separa mensajes recientes por `Personal | Negocio`, muestra `Chats del proyecto` con upload/etiqueta/seguimiento y paneles de `Pendientes`, `Oportunidades` y `Riesgos` con filtro por proyecto.
