# V Server — Hetzner backend para las "manos" de V

Archivos en esta carpeta:

| Archivo | Qué es |
|---|---|
| `api.py` | Flask v2 con endpoints `/health`, `/execute`, `/ssh-execute`, `/browser`, `/generate-image`. |
| `install.sh` | Instala paquetes Python + Chromium en el Hetzner. Idempotente. |

El servidor vive en `http://178.105.135.26:5000` y arranca solo con `systemd` (unit `v-server.service`, `Restart=always`).

## Opción A — V se auto-actualiza (sin SSH manual)

V tiene la tool `remote_execution` que ya ejecuta código Python como `root` en el Hetzner. Puede:

1. **Escribir el `api.py` nuevo** (V le pasa el contenido a su propia tool).
2. **Instalar deps** (correr `install.sh` o sus comandos inline).
3. **Programar un restart diferido** (el restart mata al proceso actual; con `nohup`+`sleep 1` la respuesta sale antes de morir y systemd respawnea v2).
4. **Verificar** llamando `/health` en una segunda invocación, 10s después.

Snippet que V puede ejecutar con `remote_execution(language="python", code=...)`:

```python
import subprocess, os, base64

NEW_API_PY = """[CONTENIDO DE api.py PEGADO AQUÍ]"""

# 1) backup del actual por si hay que rollback
subprocess.run(["cp", "/home/v-server/api.py", "/home/v-server/api.py.bak"], check=True)

# 2) escribir el nuevo
with open("/home/v-server/api.py", "w") as f:
    f.write(NEW_API_PY)

# 3) instalar deps si faltan (idempotente)
subprocess.run(
    ["/home/v-server/venv/bin/pip", "install", "flask", "paramiko", "playwright", "requests"],
    check=True,
)
subprocess.run(["/home/v-server/venv/bin/playwright", "install", "chromium"], check=False)

# 4) restart diferido — desacoplado del proceso actual para que respondamos antes de morir
subprocess.Popen(
    ["bash", "-c", "sleep 1 && systemctl restart v-server"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
    start_new_session=True,
)
print("restart programado en 1s — verifica con /health en 10s")
```

Después de eso, V espera 10-15 segundos y vuelve a llamar a `remote_execution`:

```python
import urllib.request, json
r = urllib.request.urlopen("http://localhost:5000/health", timeout=2)
print(r.read().decode())   # debe decir {"status":"healthy","version":2}
```

Si responde con `version=2` → deploy OK. Si timeout/error → rollback:

```python
import subprocess
subprocess.run(["cp", "/home/v-server/api.py.bak", "/home/v-server/api.py"], check=True)
subprocess.Popen(
    ["bash", "-c", "sleep 1 && systemctl restart v-server"],
    stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    start_new_session=True,
)
print("rollback hecho")
```

## Opción B — Luis con SSH manual

Si V no puede o falla:

```bash
ssh root@178.105.135.26

# 1) bajar archivos
cd /home/v-server
# (subir api.py + install.sh por scp, o pegar contenido con cat > archivo)

# 2) instalar deps
bash install.sh

# 3) reiniciar servicio
systemctl restart v-server

# 4) verificar
curl http://localhost:5000/health
# → {"status":"healthy","version":2}
```

## Configuración opcional

Para activar `/generate-image` o auth, agregar variables al systemd unit:

```bash
systemctl edit v-server
```

Y poner:

```
[Service]
Environment="STABILITY_API_KEY=sk-..."
Environment="V_SERVER_TOKEN=algun-token-largo-y-secreto"
```

Después `systemctl daemon-reload && systemctl restart v-server`.

Si pones `V_SERVER_TOKEN`, todas las requests (menos `/health`) requieren header `X-V-Token: <ese-valor>`. La tool TypeScript en `lib/forge/v-server.ts` necesitará una pequeña edición para mandar ese header.

## Seguridad pendiente (NO para producción todavía)

- **TLS**: hoy el servidor escucha en HTTP plano. Si V manda credenciales SSH (password o private_key) por `/ssh-execute`, viajan en claro. Antes de uso real: nginx + Let's Encrypt delante del Flask, redirigir 80→443.
- **Firewall**: hoy el puerto 5000 está abierto al mundo. Ideal: cerrarlo y solo dejar 443 (con nginx delante).
- **Auth obligatorio**: setear `V_SERVER_TOKEN` para que solo V pueda usar el server, no cualquiera con la IP.
