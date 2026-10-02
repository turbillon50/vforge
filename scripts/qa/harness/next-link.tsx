/**
 * `next/link` fuera de Next: un ancla normal. Sólo para el banco de pruebas.
 */
import type { AnchorHTMLAttributes } from "react";

export default function Link({
  href,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
