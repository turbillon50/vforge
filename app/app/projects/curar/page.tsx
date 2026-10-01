import type { Metadata } from "next";
import ProjectCurationClient from "@/components/projects/ProjectCurationClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ordenar proyectos",
  description: "Curacion de repositorios y proyectos en VForge.",
};

export default function ProjectsCurationPage() {
  return <ProjectCurationClient />;
}
