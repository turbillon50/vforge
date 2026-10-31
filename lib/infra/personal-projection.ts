import type { InfraSnapshot } from "./types";
import type { PersonalSpace } from "@/lib/workspace/personal-policy";

/** Never forward another house, global endpoints, keys, or global catalog. */
export function projectPersonalInfrastructure(snapshot: InfraSnapshot, space: PersonalSpace) {
  const source = snapshot.houses.find((h) => h.id === space.infra_house);
  if (!source) return null;
  const house = {
    id: source.id, name: source.name, status: source.status,
    hostname: source.hostname, load: source.load, cpuCount: source.cpuCount,
    memory: source.memory, disk: source.disk, services: source.services,
    nginx: source.nginx, inventory: source.inventory,
  };
  return {
    generatedAt: snapshot.generatedAt, house,
    gateway: { status: snapshot.houses.find((h) => h.id === "luis")?.metamcp?.status || "unknown", shared: true },
  };
}
