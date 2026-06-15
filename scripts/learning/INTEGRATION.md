# Protocolo de Aprendizaje de Vulcano — integración

Sistema que hace que Vulcano mejore **sin intervención humana**. Vive en
`/root/agents/learning/` en el server (Hetzner).

## Los 5 mecanismos

| # | Mecanismo | Archivo | Trigger |
|---|-----------|---------|---------|
| 1 | Reflexión post-sesión (worked/failed/new pattern) | `post_session.py` | cron `auto` c/20min sobre sesiones idle >10 turnos |
| 2 | Contraste de intentos + ajuste de weights | `contrast.py` | cron `contrast` c/hora |
| 3 | Señales débiles de Luis ("no"/"espera"/"perfecto") | `signals.py` | hook realtime (relay) + batch c/20min |
| 4 | Consolidación nocturna + digest a Luis | `digest.py` | cron `night` 3am |
| 5 | Olvido inteligente (decay + archivar 90d) | `decay.py` | cron `night` 3am |

Orquesta todo `run.py`. Reusa lo que ya existía: `sleep_rem.py` (dedup embeddings),
`contrast_audit.py` (auditoría), `learning_loop()`/`knowledge_graph_extract()` del daemon.

## Instalación
```bash
bash /root/agents/learning/install.sh   # migra esquema + instala cron
python3 /root/agents/learning/run.py status
```

## Hook de señales débiles en tiempo real (brain-relay.py)
En el handler donde llega el mensaje de Luis, después de tener la respuesta previa de V:

```python
import sys; sys.path.insert(0, "/root/agents/learning")
from signals import register_user_signal
try:
    register_user_signal(
        user_text=mensaje_de_luis,
        prev_assistant_text=respuesta_anterior_de_V,
        session_id=session_id,            # o None
        project_id=project_id or "vulcano",
    )
except Exception as _e:
    pass  # el aprendizaje nunca debe tumbar el chat
```

> Sin el hook igual funciona: el batch (`run auto`) reprocesa los turnos de
> `vulcano_memory` cada 20 min. El hook solo lo hace instantáneo.

## Cómo usar el weight aprendido al recuperar conocimiento
Al hacer recall de patterns/lessons, ordena por weight y filtra archivados:

```sql
SELECT * FROM patterns
WHERE COALESCE(archived,false)=false
ORDER BY weight DESC, times_used DESC;
```
Y cuando apliques un pattern, márcalo usado (alimenta el decay y las señales):
```sql
UPDATE patterns SET times_used=times_used+1, last_used_at=now() WHERE id=%s;
```

## Verificación
```bash
python3 run.py post_session --all     # fuerza análisis (incluye sesiones cortas)
python3 run.py digest --dry-run       # arma el digest sin notificar
python3 run.py decay  --dry-run       # simula olvido sin mutar
python3 run.py status                 # foto del estado
psql "$DB" -c "SELECT kind,summary,created_at FROM learning_runs ORDER BY id DESC LIMIT 10;"
```
