# ADR-003: API keys server-side cifradas en Vault (AES-256-GCM)

- **Estado:** Accepted
- **Fecha:** 2026-05-02
- **Decisores:** Luis, Claude Code
- **Contexto técnico:** Vault adapter del cerebro Forge + pantalla `/vault`

## Contexto

vForge maneja API keys críticas (Anthropic, OpenAI, Vercel, GitHub, Cloudflare, Stripe, etc.) propias del operador y, eventualmente, de clientes. La pantalla `/vault` ya está diseñada como interfaz para esto. Hay que decidir el modelo de almacenamiento y acceso.

## Decisión

- **Storage:** las keys viven en Neon (Postgres serverless) **cifradas en reposo** con **AES-256-GCM**.
- **Master key:** derivada de la contraseña del usuario vía **Argon2id** (memoria-hard, resistente a GPU). Nunca persiste en clear; solo vive en memoria server durante la sesión.
- **Cliente:** el navegador **nunca** ve las keys en clear. El frontend solo ve nombres, fechas de uso y proyectos. Para usar una key, el frontend pide al backend: "ejecuta acción X con la key Y para el proyecto Z" — el backend descifra on-demand y la inyecta al adapter correcto.
- **Recovery:** 3 backup codes generados al setup + recovery email firmado con timestamps.

## Razón

1. **"Zero-knowledge para el usuario" no significa cliente-side.** Significa cifrado en reposo + nunca en clear en el cliente. El backend de confianza puede descifrar, pero los datos nunca pasan por terceros sin cifrar.
2. **Compliance.** SOC 2, GDPR, ISO 27001 esperan cifrado en reposo + control de acceso. AES-256-GCM con master key derivada cumple estándares.
3. **Argon2id sobre PBKDF2/bcrypt.** Es memoria-hard, lo cual lo hace resistente a ataques con GPUs/ASICs. Es el estándar moderno para password derivation.
4. **Centralización del riesgo.** Una sola master key (la del operador) protege todo. Si se compromete, se rotan todas las keys downstream con un script. Si vivieran en cliente, no hay rotación posible sin perder data.
5. **Simplicidad para el usuario.** Luis no carga claves en su celular. Las pone una vez en `/vault`, después solo aprueba acciones que las usan.

## Consecuencias

**Fácil:**
- Rotar cualquier key sin invalidar la sesión del usuario.
- Auditar qué key se usó en qué request (audit log incluye `key_id` no `key_value`).
- Compartir keys entre proyectos del mismo operador (scope `platform-global`) o aislarlas (scope `client`).

**Difícil:**
- La master key se vuelve crítica. Si se pierde y los backup codes se pierden, las keys cifradas son irrecuperables.
- Hay que implementar recovery flow robusto (3 códigos de backup + email firmado + opcional: dispositivos confiables).
- Edge runtime tiene límites de memoria; Argon2id consume ~64 MB. Habrá que hacer la derivación en runtime Node, no Edge.

**Deuda técnica asumida:**
- El recovery flow es complejo y debe diseñarse antes de v1 GA.
- Auditoría externa de seguridad recomendada antes de aceptar keys de clientes externos.

## Alternativas consideradas

| Alternativa | Descartada porque |
|---|---|
| **Cliente-side cifrado (zero-knowledge real)** | Imposible que el backend ejecute acciones server-side sin tener el clear value |
| **Vercel env vars** | No granular por proyecto/usuario; no tiene UI; no permite rotación visible en `/vault` |
| **Vault de HashiCorp** | Sobreingeniería para v1; añade infraestructura |
| **AWS KMS / Google Cloud KMS** | Vendor lock-in; queremos seguir self-hosted en Vercel + Neon |
| **PBKDF2 / bcrypt** | Menos resistente a GPU que Argon2id |
