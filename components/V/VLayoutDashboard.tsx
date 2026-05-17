'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChatPage } from './ChatPage';

interface Project {
  id: string;
  name: string;
  image: string;
  status: 'active' | 'idle' | 'error';
  connections: number;
  lastActive: string;
}

interface Connection {
  id: string;
  name: string;
  type: 'github' | 'vercel' | 'database' | 'api' | 'secret';
  status: 'connected' | 'error' | 'pending';
  project?: string;
  icon: string;
}

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'vForge',
    image: '🔧',
    status: 'active',
    connections: 5,
    lastActive: 'Ahora',
  },
  {
    id: '2',
    name: 'Break Runtime',
    image: '⚡',
    status: 'active',
    connections: 3,
    lastActive: '2h',
  },
  {
    id: '3',
    name: 'Tanit Trading',
    image: '📈',
    status: 'idle',
    connections: 4,
    lastActive: '1d',
  },
];

const mockConnections: Connection[] = [
  {
    id: '1',
    name: 'GitHub (turbillon50)',
    type: 'github',
    status: 'connected',
    icon: '🔗',
  },
  {
    id: '2',
    name: 'Vercel Deploy',
    type: 'vercel',
    status: 'connected',
    icon: '▲',
  },
  {
    id: '3',
    name: 'Neon PostgreSQL',
    type: 'database',
    status: 'connected',
    icon: '🗄️',
  },
  {
    id: '4',
    name: 'OpenRouter API',
    type: 'api',
    status: 'connected',
    icon: '🧠',
  },
  {
    id: '5',
    name: 'Railway (pending)',
    type: 'secret',
    status: 'pending',
    icon: '🚂',
  },
];

const ProjectCard = ({ project }: { project: Project }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'p-4 rounded-xl border cursor-pointer transition-all',
        'hover:border-vf-green/50 hover:bg-vf-bg-2/80',
        project.status === 'active'
          ? 'bg-vf-bg-2 border-vf-green/30'
          : 'bg-vf-bg-1 border-vf-border'
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl">{project.image}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-vf-fg-1 text-sm">{project.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                project.status === 'active'
                  ? 'bg-vf-green animate-pulse'
                  : project.status === 'error'
                    ? 'bg-red-500'
                    : 'bg-vf-fg-3'
              )}
            />
            <span className="text-xs text-vf-fg-3 capitalize">
              {project.status === 'active' ? 'Activo' : project.status === 'idle' ? 'Inactivo' : 'Error'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-vf-fg-2">{project.connections} conexiones</span>
        <span className="text-vf-fg-3">{project.lastActive}</span>
      </div>
    </motion.div>
  );
};

const ConnectionBadge = ({ connection }: { connection: Connection }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
        'border transition-all',
        connection.status === 'connected'
          ? 'bg-vf-green/10 border-vf-green/30 text-vf-green'
          : connection.status === 'pending'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
            : 'bg-red-500/10 border-red-500/30 text-red-500'
      )}
    >
      <span>{connection.icon}</span>
      <span>{connection.name}</span>
    </motion.div>
  );
};

export const VLayoutDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedProject, setSelectedProject] = useState(mockProjects[0]);
  const [showConnections, setShowConnections] = useState(false);

  return (
    <div className="flex h-screen bg-vf-bg-0">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-80 border-r border-vf-border bg-vf-bg-1/50 p-6 flex flex-col overflow-y-auto"
          >
            {/* Sidebar Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-vf-green to-vf-green/50 flex items-center justify-center">
                  <span className="text-lg font-bold text-vf-bg-0">V</span>
                </div>
                <h1 className="font-bold text-vf-fg-1">V Projects</h1>
              </div>

              <button className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-vf-green/15 border border-vf-green/30 text-vf-green hover:bg-vf-green/25 transition-colors text-sm font-medium">
                <Plus size={16} />
                Nuevo Proyecto
              </button>
            </div>

            {/* Projects List */}
            <div className="space-y-3 mb-8">
              <p className="text-xs font-semibold text-vf-fg-2 uppercase tracking-wider">
                Mis Proyectos
              </p>
              {mockProjects.map((project) => (
                <motion.button
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  whileHover={{ x: 4 }}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-lg transition-all',
                    selectedProject.id === project.id
                      ? 'bg-vf-green/15 border border-vf-green/50'
                      : 'hover:bg-vf-bg-2 border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{project.image}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-vf-fg-1 truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-vf-fg-3">
                        {project.connections} conectados
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-vf-border my-6" />

            {/* Connections Section */}
            <div className="flex-1">
              <p className="text-xs font-semibold text-vf-fg-2 uppercase tracking-wider mb-4">
                Conexiones Globales
              </p>
              <div className="space-y-2 mb-6">
                {mockConnections.slice(0, 4).map((conn) => (
                  <motion.div
                    key={conn.id}
                    whileHover={{ x: 2 }}
                    className="flex items-center gap-2 p-2 rounded hover:bg-vf-bg-2 cursor-pointer transition-colors"
                  >
                    <span className="text-lg">{conn.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-vf-fg-1 truncate">{conn.name}</p>
                      <div className="flex items-center gap-1">
                        <div
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            conn.status === 'connected'
                              ? 'bg-vf-green'
                              : conn.status === 'pending'
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                          )}
                        />
                        <span className="text-xs text-vf-fg-3 capitalize">
                          {conn.status === 'connected'
                            ? 'OK'
                            : conn.status === 'pending'
                              ? 'Pendiente'
                              : 'Error'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <button
                onClick={() => setShowConnections(!showConnections)}
                className="w-full text-xs text-vf-green hover:text-vf-green/80 font-medium transition-colors"
              >
                {showConnections ? 'Ocultar detalles' : 'Ver todas las conexiones →'}
              </button>
            </div>

            {/* Footer */}
            <div className="pt-6 border-t border-vf-border">
              <button className="w-full flex items-center gap-2 px-4 py-2 text-vf-fg-2 hover:text-vf-fg-1 transition-colors text-sm rounded-lg hover:bg-vf-bg-2">
                <Settings size={16} />
                Configuración
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-50 p-2 bg-vf-bg-1 border border-vf-border rounded-r-lg hover:bg-vf-bg-2 transition-colors"
      >
        {sidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header con Project Info */}
        <div className="border-b border-vf-border bg-vf-bg-1/50 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{selectedProject.image}</div>
              <div>
                <h2 className="text-lg font-bold text-vf-fg-1">
                  {selectedProject.name}
                </h2>
                <p className="text-sm text-vf-fg-2">
                  {selectedProject.connections} recursos conectados
                </p>
              </div>
            </div>

            {showConnections && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-wrap gap-2 max-w-2xl"
              >
                {mockConnections.map((conn) => (
                  <ConnectionBadge key={conn.id} connection={conn} />
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Real V chat — streams from /api/forge/run with full system prompt,
            tools, skills and memory. */}
        <div className="flex-1 min-h-0">
          <ChatPage />
        </div>
      </div>
    </div>
  );
};
