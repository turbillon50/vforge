import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import Labs from "@/components/marketing/Labs";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "VForge Labs — El stack que hace posible la plataforma",
  description: "Claude, Grok, Cerebras, Vast.ai, Hetzner, Mastra, pgvector, Qdrant y mas. El stack real de VForge.",
};

export default function LabsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#050a14" }}>
      <MarketingHeader />
      <main style={{ paddingTop: 62 }}>
        <Labs />
      </main>
      <MarketingFooter />
    </div>
  );
}
