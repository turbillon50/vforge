export interface InfraSource {
  status: string;
  error?: string;
  account?: string;
  complete?: boolean;
  items?: Array<{ id: string; name: string; url: string | null; repo?: string | null; state?: string }>;
}
export interface InfraHouse {
  id: string;
  name: string;
  status: string;
  hostname?: string;
  load?: number;
  cpuCount?: number;
  memory?: { total: number; available: number };
  disk?: { total: number; used: number; percent: number };
  services?: Array<{ name: string; state: string }>;
  nginx?: { status: string; valid?: boolean; domains?: string[]; proxyRoutes?: number; conflicts?: number; loadedBackups?: string[] };
  metamcp?: { status: string; namespaces?: number; servers?: number; activeKeys?: number; auditAvailable?: boolean;
    endpoints?: Array<{ name: string; namespace: string; authenticated: boolean; oauth: boolean; private: boolean }> };
  inventory?: { github?: InfraSource; vercel?: InfraSource };
}
export interface InfraSnapshot {
  generatedAt: string;
  houses: InfraHouse[];
  catalog?: { status: string; projects?: number; repositories?: number; syncedAt?: string; error?: string };
}

export function isInfraSnapshot(value: unknown): value is InfraSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<InfraSnapshot>;
  return typeof v.generatedAt === "string" && Number.isFinite(Date.parse(v.generatedAt)) &&
    Array.isArray(v.houses) && v.houses.length > 0 && v.houses.length <= 2 &&
    v.houses.every((h) => h && typeof h === "object" &&
      (h.id === "luis" || h.id === "acevedo") && typeof h.name === "string" && typeof h.status === "string");
}
