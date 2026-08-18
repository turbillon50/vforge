/**
 * DESACTIVADO (P0 de seguridad).
 *
 * Este endpoint hacía `DROP TABLE IF EXISTS skills CASCADE` y la recreaba, SIN
 * autenticación y fuera de la lista de rutas protegidas del middleware — es
 * decir, cualquiera en internet podía borrar la tabla `skills`. Se neutraliza:
 * ya no ejecuta SQL destructivo. La reparación real del esquema vive en el
 * auto-heal idempotente (lib/db/auto-heal.ts), que usa CREATE/ALTER ... IF NOT
 * EXISTS y nunca dropea datos.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function gone() {
  return Response.json(
    {
      ok: false,
      error:
        "Endpoint desactivado por seguridad. Usa el auto-heal idempotente del esquema.",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = gone;
export const POST = gone;
