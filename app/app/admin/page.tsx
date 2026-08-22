import { clerkClient } from "@clerk/nextjs/server";
import { PageHeader } from "@/components/workspace/PageHeader";
import { IconShield, IconUsers } from "@/components/brand/VFIcons";
import { isOwnerUser } from "@/lib/auth/owner";

export const dynamic = "force-dynamic";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  owner: boolean;
  created: string;
  lastActive: string;
}

function formatDate(value: number | null | undefined, includeTime = false) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: includeTime ? undefined : "numeric",
    hour: includeTime ? "2-digit" : undefined,
    minute: includeTime ? "2-digit" : undefined,
  });
}

export default async function AdminPage() {
  let users: AdminUser[] = [];
  let error: string | null = null;

  try {
    const client = await clerkClient();
    const list = await client.users.getUserList({
      limit: 100,
      orderBy: "-last_active_at",
    });
    users = list.data.map((user) => ({
      id: user.id,
      name:
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.username ||
        "Sin nombre",
      email: user.emailAddresses[0]?.emailAddress ?? "Sin correo",
      owner: isOwnerUser(user),
      created: formatDate(user.createdAt),
      lastActive: formatDate(user.lastActiveAt, true),
    }));
  } catch {
    error =
      "No se pudo leer el directorio real de Clerk. Revisa la configuración de autenticación.";
  }

  const ownerCount = users.filter((user) => user.owner).length;

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader
        eyebrow="Alcance y permisos"
        title="Administración."
        description="Personas registradas, propietario de plataforma y última actividad. Esta vista se alimenta directamente de Clerk."
      />

      <section className="grid border-b border-[var(--border-1)] bg-[#f7f7f5] sm:grid-cols-3">
        <Metric label="Usuarios registrados" value={String(users.length)} />
        <Metric label="Propietarios" value={String(ownerCount)} />
        <Metric
          label="Usuarios estándar"
          value={String(Math.max(0, users.length - ownerCount))}
        />
      </section>

      {error ? (
        <div className="m-5 border border-black bg-white px-4 py-4 md:m-8">
          <div className="flex items-start gap-3">
            <IconShield size={15} className="mt-0.5 shrink-0" />
            <p className="text-[13px] leading-5">{error}</p>
          </div>
        </div>
      ) : null}

      <section className="bg-white px-5 py-6 md:px-8 md:py-8">
        {users.length === 0 && !error ? (
          <div className="border border-dashed border-black px-6 py-20 text-center">
            <IconUsers size={19} className="mx-auto" />
            <p className="mt-4 text-[14px] font-medium">
              No hay usuarios para mostrar.
            </p>
            <p className="mt-2 text-[12px] text-[var(--fg-muted)]">
              El directorio no agrega personas de demostración.
            </p>
          </div>
        ) : users.length > 0 ? (
          <div className="overflow-x-auto border border-[var(--border-1)]">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-black bg-black text-white">
                  <th className="px-4 py-3 font-mono text-[8px] font-normal uppercase tracking-[0.15em]">
                    Usuario
                  </th>
                  <th className="px-4 py-3 font-mono text-[8px] font-normal uppercase tracking-[0.15em]">
                    Correo
                  </th>
                  <th className="px-4 py-3 font-mono text-[8px] font-normal uppercase tracking-[0.15em]">
                    Rol
                  </th>
                  <th className="px-4 py-3 font-mono text-[8px] font-normal uppercase tracking-[0.15em]">
                    Alta
                  </th>
                  <th className="px-4 py-3 font-mono text-[8px] font-normal uppercase tracking-[0.15em]">
                    Última actividad
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--border-1)] last:border-b-0 hover:bg-[#f7f7f5]"
                  >
                    <td className="px-4 py-4">
                      <p className="text-[12px] font-medium">{user.name}</p>
                      <p className="mt-1 font-mono text-[8px] text-[var(--fg-muted)]">
                        {user.id}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-[11px] text-[var(--fg-secondary)]">
                      {user.email}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={
                          user.owner
                            ? "inline-flex border border-black bg-black px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white"
                            : "inline-flex border border-[var(--border-1)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em]"
                        }
                      >
                        {user.owner ? "Owner" : "Usuario"}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-[9px] text-[var(--fg-muted)]">
                      {user.created}
                    </td>
                    <td className="px-4 py-4 font-mono text-[9px] text-[var(--fg-muted)]">
                      {user.lastActive}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[var(--border-1)] px-5 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 md:px-8">
      <p className="mono-label">{label}</p>
      <p className="mt-3 text-[28px] font-medium tracking-[-0.05em]">{value}</p>
    </div>
  );
}
