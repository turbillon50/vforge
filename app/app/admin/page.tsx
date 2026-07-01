import Link from "next/link";
import { clerkClient } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";

export const dynamic = "force-dynamic";

/**
 * Panel de administración del owner: quién está registrado en VForge,
 * con qué correo, rol y última actividad. Solo el owner llega aquí
 * (gating en middleware sobre /app).
 */
export default async function AdminPage() {
  let users: Array<{
    id: string;
    name: string;
    email: string;
    owner: boolean;
    created: string;
    lastActive: string;
  }> = [];
  let error: string | null = null;

  try {
    const cc = await clerkClient();
    const list = await cc.users.getUserList({ limit: 100, orderBy: "-last_active_at" });
    users = list.data.map((u) => ({
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "—",
      email: u.emailAddresses[0]?.emailAddress ?? "—",
      owner: isOwnerUser(u),
      created: new Date(u.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }),
      lastActive: u.lastActiveAt
        ? new Date(u.lastActiveAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
        : "—",
    }));
  } catch {
    error = "No pude leer los usuarios de Clerk. Revisa CLERK_SECRET_KEY.";
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-28 pt-10 md:px-8 md:pt-14">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet-300">Administración</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-on-surface md:text-5xl">
          Usuarios
        </h1>
        <p className="mt-2 text-on-surface-variant">
          {users.length} {users.length === 1 ? "persona registrada" : "personas registradas"} en VForge.
        </p>
        <p className="mt-3">
          <Link
            href="/app/admin/billing"
            className="inline-flex items-center text-sm text-violet-400 hover:underline"
            style={{ minHeight: 44, touchAction: "manipulation" }}
          >
            Quién pagó qué →
          </Link>
        </p>
      </header>

      {error ? (
        <p className="mt-10 rounded-xl border border-error-crimson/30 bg-error-crimson/5 px-4 py-3 text-sm text-error-crimson">
          {error}
        </p>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-app bg-[var(--color-surface-low)] backdrop-blur-md">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-app text-muted">
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em]">Usuario</th>
                <th className="hidden px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] sm:table-cell">Correo</th>
                <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em]">Rol</th>
                <th className="hidden px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] md:table-cell">Alta</th>
                <th className="hidden px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] md:table-cell">Última actividad</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-app/40 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-on-surface">{u.name}</p>
                    <p className="text-[12px] text-muted sm:hidden">{u.email}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-on-surface-variant sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.owner ? (
                      <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-violet-300 ring-1 ring-violet-500/30">
                        Owner
                      </span>
                    ) : (
                      <span className="rounded-full bg-tint-2/[0.08] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
                        Usuario
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-on-surface-variant md:table-cell">{u.created}</td>
                  <td className="hidden px-4 py-3 text-on-surface-variant md:table-cell">{u.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
