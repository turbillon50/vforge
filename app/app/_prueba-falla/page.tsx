// Página temporal: truena a propósito para comprobar que app/app/error.tsx
// atrapa de verdad. Se borra antes de mergear a main.
export const dynamic = "force-dynamic";

export default function PruebaFalla() {
  throw new Error("prueba deliberada de la red de seguridad");
}
