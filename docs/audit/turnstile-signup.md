# Hallazgo: el sign-up limpia el formulario al fallar Turnstile / bot-check

Fecha: 2026-06-04

## Síntoma
En `/sign-up`, cuando la verificación de bots de Clerk (Cloudflare Turnstile / Smart CAPTCHA)
falla o expira, el componente `<SignUp />` reinicia su estado interno: el formulario queda
vacío y, en algunos temas, el mensaje de error resulta poco visible o se oculta. El usuario
percibe que "el form se borró sin razón".

## Causa
Usamos el componente alojado `<SignUp />` de Clerk (`app/sign-up/[[...sign-up]]/page.tsx`).
No controlamos su formulario ni su ciclo de error: el bot-check ocurre dentro del iframe de
Turnstile y Clerk maneja el reintento. No hay API pública para interceptar ese error desde
el wrapper.

## Mitigación aplicada en este repo
En `lib/clerk-appearance.ts` se añadieron `elements` para que los errores de Clerk sean
siempre visibles en ambos temas:
- `formFieldErrorText`, `alert`, `alertText` con `color: var(--color-error-crimson)`,
  `!opacity-100` y sin ocultamiento.

## Recomendación (acción en Clerk Dashboard)
1. Producción: habilitar **Smart CAPTCHA invisible** (Bot sign-up protection → Smart) para
   que Turnstile solo escale a desafío visible cuando sea necesario, reduciendo fallos.
2. Desarrollo: desactivar **Bot sign-up protection** en la instancia de dev para no perder
   formularios durante pruebas.
3. Verificar que el dominio del deploy esté en la allowlist de Turnstile/Clerk; un dominio
   no autorizado provoca fallos silenciosos del widget.
