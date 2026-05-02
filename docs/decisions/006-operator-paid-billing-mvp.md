# ADR-006: Billing en cuenta de operador en MVP, pass-through en v2

- **Estado:** Accepted
- **Fecha:** 2026-05-02
- **Decisores:** Luis, Claude Code
- **Contexto técnico:** Modelo de cobro de las API calls de Forge

## Contexto

Forge consume tokens de Anthropic, OpenAI, Vercel, etc. Cada request tiene un costo. La pregunta es quién paga y cómo se tracking.

Opciones:
1. **Operator-paid (MVP):** todas las API calls cargan a la cuenta de Anthropic/OpenAI de All Global Holding. El usuario final no ve el costo.
2. **Pass-through (v2):** cada usuario tiene su propia cuenta de cada proveedor; la app solo orquesta.
3. **Marketplace markup:** All Global Holding cobra por el servicio + costo de tokens + margen.

## Decisión

- **MVP:** modelo **operator-paid**. All Global Holding paga todas las API calls. Los usuarios (Luis al principio, después clientes externos invitados) no ven costo de tokens.
- **v2 (cuando entren clientes externos pagantes):** transitar a **marketplace markup** — el cliente paga una mensualidad o por uso, All Global Holding margenea sobre el costo de tokens.
- **Nunca:** pass-through puro. El usuario no debería estar metiendo sus propias API keys en una app de terceros si no es 100% necesario; la complejidad onboarding mata la conversión.

## Razón

1. **Simplicidad MVP.** No tenemos que construir billing antes del producto. Luis es el único usuario en MVP; el costo es un OPEX, no un problema de pricing.
2. **Mejor UX.** Los usuarios no quieren cargar API keys propias; quieren que "funcione". Operator-paid permite eso.
3. **Margenes posibles.** En v2, el markup permite monetizar sin que el cliente sepa cuánto cuesta cada llamada (ventaja competitiva).
4. **Datos de uso.** Operator-paid centraliza el tracking en una sola cuenta; analytics más simple.
5. **Escalable.** Pasar de operator-paid a markup es trivial (agregar `cost` y `markup` columns al audit log y un módulo de billing). Pasar de pass-through a markup es traumático.

## Consecuencias

**Fácil:**
- MVP envía sin diseñar pricing.
- Una sola fuente de verdad para tracking de costo.
- Tests y demos no se rompen por límites de API key del usuario.

**Difícil:**
- Costo es invisible al usuario; hay riesgo de "uso ilimitado". Hay que poner caps.
- Si Luis o un usuario abusa (loop infinito, prompt injection, etc.), All Global Holding paga la cuenta. Mitigación: cost caps por usuario y por proyecto.
- Cuando llegue v2, hay que diseñar el modelo de cobro y comunicarlo a los clientes existentes.

**Deuda técnica asumida:**
- Cost tracking robusto desde M9 (audit log incluye cost por llamada).
- Sistema de cost caps automáticos (cortar al rebasar X tokens/mes/proyecto).
- Migración a v2 requiere comunicación a usuarios + UI de plan/billing.

## Alternativas consideradas

| Alternativa | Descartada porque |
|---|---|
| **Pass-through** | UX pésimo; cada usuario tiene que crear cuenta en Anthropic/OpenAI/Vercel/etc. y pegar keys |
| **Markup desde día 1** | Sobreingeniería para MVP; sin clientes externos no tiene sentido cobrar |
| **Free hasta v2 + sorpresa de pricing** | Mata confianza; mejor comunicar el modelo desde temprano |
