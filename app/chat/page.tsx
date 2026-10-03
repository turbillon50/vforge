import type { Metadata } from "next";
import { PublicVForgeChat } from "@/components/public-chat/PublicVForgeChat";

export const metadata: Metadata = {
  title: "Chat · VForge",
  description: "Chat publico de VForge para convertir una idea en una app lista para trabajar.",
};

export const dynamic = "force-dynamic";

export default function PublicChatPage() {
  return <PublicVForgeChat />;
}
