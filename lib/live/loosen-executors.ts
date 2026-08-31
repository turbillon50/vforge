import "server-only";
import { queryOne } from "@/lib/db/client";

export async function loosenExecutorConstraint(): Promise<void> {
  await queryOne(
    `ALTER TABLE project_agent_runs
       DROP CONSTRAINT IF EXISTS project_agent_runs_requested_executor_check`,
  ).catch(() => null);
}
