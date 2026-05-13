# Patrones de la Competencia — Los 5 Más Poderosos

Análisis de: Cursor, Devin, Replit Agent, Bolt, v0, Claude Code, Windsurf
Fecha: 2026-05-14
Costo del análisis: $0.0004 (Gemini Flash)

---

## PATRÓN 1 — Thinking Blocks (Cursor)
**Impacto: CRÍTICO**

Antes de cada acción, el agente escribe su razonamiento interno explícito.
Nunca actúa sin pensar en voz alta primero.

**Por qué importa:**
- Elimina alucinaciones — verbalizar el razonamiento revela errores antes de ejecutar
- El usuario puede intervenir si el razonamiento es incorrecto
- Facilita debugging — sabemos POR QUÉ tomó una decisión, no solo QUÉ hizo

**Implementar en V:**
```
Antes de cada acción: bloque "THINKING:" obligatorio
Parser verifica que esté presente
UI lo muestra como "V está analizando..."
```

---

## PATRÓN 2 — Ciclos PLAN→ACT→VERIFY (Devin)
**Impacto: CRÍTICO**

Opera en ciclos con checkpoints obligatorios. Nunca hace más de un paso sin verificar el resultado anterior.

**Por qué importa:**
- Evita errores acumulativos — un error en paso 1 no se propaga a paso 10
- Puntos de recuperación claros
- Confianza: cada acción se valida antes de continuar

**Implementar en V:**
```
1. PLAN: describir el siguiente paso
2. ACT: ejecutar
3. VERIFY: confirmar resultado
4. RESULT: reportar
Si VERIFY falla → stop, reevaluar
```

---

## PATRÓN 3 — Scratchpad de Errores (Replit Agent)
**Impacto: ALTO**

Memoria interna de sesión. Registra errores y sus causas. Nunca repite el mismo error dos veces en una sesión.

**Por qué importa:**
- V hoy repite el mismo bug de "owner vacío" múltiples veces por sesión
- Sin scratchpad, cada intento fallido se olvida
- Con scratchpad: "ya intenté X, falló por Y, ahora intento Z"

**Implementar en V:**
```
Context manager con sección ERRORS_THIS_SESSION:
- Qué falló
- Por qué falló  
- Qué no intentar de nuevo
Inyectar en cada prompt de la sesión
```

---

## PATRÓN 4 — Atomic Commits (Bolt)
**Impacto: ALTO**

Cada commit hace UNA cosa. Si falla, sabe exactamente qué revertir.

**Por qué importa:**
- V hoy hace cambios grandes que si fallan, no sabe qué revertir
- Historial de cambios claro y reversible
- Aislamiento de fallos — un error no corrompe todo

**Implementar en V:**
```
Regla: un commit = un cambio lógico
Mensaje del commit describe exactamente qué cambió
Antes de cambio grande: branch + commits pequeños
```

---

## PATRÓN 5 — Cascade Memory (Windsurf)
**Impacto: MEDIO-ALTO**

Recuerda qué archivos tocó en la sesión y por qué. Antes de tocar un archivo verifica si ya lo tocó.

**Por qué importa:**
- V hoy puede intentar crear un archivo que ya existe → error
- Sin cascade memory: repite lecturas innecesarias
- Con cascade memory: "ya leí routing.ts, sé que está en línea 70"

**Implementar en V:**
```
SESSION_FILES_TOUCHED: dict de path → qué cambié → por qué
Antes de read/write: consultar si ya está en memoria
Ahorra tokens y evita conflictos
```

---

## Lo que V ya tiene bien (no reinventar):

```
✅ Permission Rings (Ring 0-3) — mejor que Claude Code
✅ Model cascade fallback — ninguno lo tiene
✅ Vault de secrets — solo Devin tiene algo similar
✅ memory_save cross-sesión — único en la competencia
```

---

## Plan de implementación (orden recomendado):

```
1. Scratchpad de errores → fix inmediato al loop de bugs
2. Atomic commits → ya casi lo hacemos, formalizar
3. PLAN→ACT→VERIFY → siguiente evolución del método
4. Thinking blocks → cuando tengamos Trigger.dev
5. Cascade memory → con Mastra memoria semántica
```
