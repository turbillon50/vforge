"use client";

import Link from "next/link";
import { PendingTaskRunner } from "@/components/studio/PendingTaskRunner";

export default function TaskPage() {
  return <main className="p-4">
    <h1 className="mb-4 text-xl font-semibold">Tarea del proyecto</h1>
    <PendingTaskRunner />
    <Link href="/app/projects" className="mt-4 inline-block underline">Volver a proyectos</Link>
  </main>;
}
