import "server-only";

import { queryAll } from "@/lib/db/client";
import { brainQueryAll } from "@/lib/db/brain";
import { formatBrainBrief } from "@/lib/live/room-context";

export { formatBrainBrief };

export async function loadBrainBrief(
  projectId: string,
  projectName?: string | null,
): Promise<string> {
  const needle = (projectName?.trim() || projectId).slice(0, 80);
  const like = `%${needle}%`;
  const [files, lessons] = await Promise.all([
    brainQueryAll<{ title: string; content: string }>(
      `SELECT name AS title, content
         FROM brain_files
        WHERE name ILIKE $1 OR content ILIKE $1
        ORDER BY updated_at DESC
        LIMIT 6`,
      [like],
    ).catch(() => [] as Array<{ title: string; content: string }>),
    queryAll<{ title: string; content: string }>(
      `SELECT title, content
         FROM knowledge_base
        WHERE title ILIKE $1 OR content ILIKE $1
        ORDER BY created_at DESC
        LIMIT 5`,
      [like],
    ).catch(() => [] as Array<{ title: string; content: string }>),
  ]);
  return formatBrainBrief({ files, lessons });
}
