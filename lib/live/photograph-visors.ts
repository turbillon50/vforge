import { getProjectViewports } from "@/lib/projects/live-portal";
import { saveProjectEye } from "./project-eyes";
import {
  captureSeeViewports,
  visorDocumentName,
  type SeeFailure,
  type SeeShot,
} from "./see-page";

export async function persistVisorShots(projectId: string, shots: SeeShot[]): Promise<void> {
  for (const shot of shots) {
    await saveProjectEye({
      projectId,
      source: "visor",
      viewport: shot.viewport,
      url: shot.url,
      note: visorDocumentName(shot.viewport),
      image: `data:${shot.mimeType};base64,${shot.data}`,
    }).catch(() => null);
  }
}

export async function photographAndStoreVisors(input: {
  projectId: string;
  preferCdp: boolean;
}): Promise<{ shots: SeeShot[]; failures: SeeFailure[] }> {
  const project = await getProjectViewports(input.projectId);
  if (!project) throw new Error("Proyecto no encontrado");
  const result = await captureSeeViewports({
    desktop_url: project.desktop_url,
    mobile_url: project.mobile_url,
    admin_url: project.admin_url,
    viewports: ["desktop", "mobile", "admin"],
    preferCdp: input.preferCdp,
  });
  await persistVisorShots(input.projectId, result.shots);
  return result;
}
