import { ClientShell } from "@/components/workspace/ClientShell";
import { ConexionesView } from "@/components/workspace/ConexionesView";
export const dynamic = "force-dynamic";
export default function Page() { return <ClientShell><ConexionesView /></ClientShell>; }
