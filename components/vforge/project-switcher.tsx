"use client";

import { useEffect, useState } from "react";
import { Plus, ChevronDown, Folder } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface ProjectSwitcherProps {
  currentProjectId?: string;
  onProjectSelect: (projectId: string) => void;
  onNewProject: () => void;
}

export function ProjectSwitcher({
  currentProjectId,
  onProjectSelect,
  onNewProject,
}: ProjectSwitcherProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      const res = await fetch("/api/forge/projects");
      if (res.ok) {
        const { projects } = await res.json();
        setProjects(projects);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  }

  const currentProject = projects.find((p) => p.id === currentProjectId);

  return (
    <div className="flex flex-col bg-slate-900 border-r border-slate-700 min-h-screen w-64">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition"
          >
            <Folder size={16} />
            Proyectos
            <ChevronDown
              size={16}
              className={`transition ${expanded ? "rotate-180" : ""}`}
            />
          </button>
          <button
            onClick={onNewProject}
            className="p-1 hover:bg-slate-700 rounded transition"
            title="Nuevo proyecto"
          >
            <Plus size={16} className="text-slate-400 hover:text-white" />
          </button>
        </div>

        {currentProject && (
          <div className="text-xs text-slate-400 truncate">
            {currentProject.name}
          </div>
        )}
      </div>

      {/* Projects List */}
      {expanded && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="text-xs text-slate-500 p-2">Cargando...</div>
          ) : projects.length === 0 ? (
            <div className="text-xs text-slate-500 p-2">
              Sin proyectos. Crea uno nuevo.
            </div>
          ) : (
            projects.map((project) => (
              <button
                key={project.id}
                onClick={() => onProjectSelect(project.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                  project.id === currentProjectId
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <div className="font-medium truncate">{project.name}</div>
                {project.description && (
                  <div className="text-xs opacity-75 truncate">
                    {project.description}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
