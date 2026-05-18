import { redirect } from "next/navigation";

/**
 * Cualquier ruta inválida regresa al landing — no mostramos pantalla 404.
 * Si el usuario llegó aquí fue por URL pegada mal, link viejo o typo;
 * lo más útil es devolverlo a la puerta principal donde V lo espera.
 *
 * Note: Next.js todavía devuelve status 404 al browser/SEO pero el
 * usuario nunca ve la página de error — ve el landing.
 */
export default function NotFound() {
  redirect("/");
}
