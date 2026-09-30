import type { Metadata } from "next";
import { TallerDashboard } from "@/components/status/TallerDashboard";
export const metadata: Metadata = {
  title: "Estado",
  description: "Estado público de VForge.",
};
export default function Page() { return <TallerDashboard/>; }
