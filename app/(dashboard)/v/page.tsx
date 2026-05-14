import { VLayoutDashboard } from '@/components/V/VLayoutDashboard';

export const metadata = {
  title: 'V - Panel de Control | vForge',
  description: 'Panel de control para V, tu asistente autónomo. Gestiona proyectos, conexiones y tareas.',
};

export default function VPage() {
  return <VLayoutDashboard />;
}
