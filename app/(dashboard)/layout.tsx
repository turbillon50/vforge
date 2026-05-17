import { AppShellV3 } from "@/components/v3/app-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShellV3>{children}</AppShellV3>;
}
