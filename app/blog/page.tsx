
import type { Metadata } from "next";
import Link from "next/link";
import { POSTS, CATEGORIES, FEATURED_POSTS } from "@/lib/blog/posts";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { BlogGrid } from "@/components/blog/BlogGrid";

export const metadata: Metadata = {
  title: "Blog — VForge",
  description: "Cómo construimos apps con IA, el Método VForge, MCP, y la historia de cómo nacimos.",
};

export default function BlogPage() {
  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-[#03020a] pt-24 pb-32">
        {/* Hero */}
        <div className="mx-auto max-w-5xl px-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-300/60">
              VForge · Conocimiento
            </span>
          </div>
          <h1 className="text-[clamp(2.5rem,8vw,4rem)] font-bold leading-[0.92] tracking-[-0.04em] text-white">
            De la idea al código.
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Documentado.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-[clamp(0.95rem,2vw,1.05rem)] font-light leading-relaxed text-white/40">
            La historia de VForge, el Método, el MCP, ahorros reales y casos de uso.
            {" "}{POSTS.length} artículos escritos por quien opera el sistema.
          </p>

          {/* Category pills */}
          <div className="mt-8 flex flex-wrap gap-2">
            {Object.entries(CATEGORIES).map(([key, cat]) => {
              const count = POSTS.filter((p) => p.category === key).length;
              return (
                <Link
                  key={key}
                  href={`/blog?cat=${key}`}
                  className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] transition-all hover:opacity-80"
                  style={{ borderColor: `${cat.color}30`, background: `${cat.color}0c`, color: cat.color }}
                >
                  {cat.label}
                  <span className="opacity-50">({count})</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Featured */}
        <div className="mx-auto mt-16 max-w-5xl px-5">
          <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.2em] text-white/25">
            Destacados
          </p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURED_POSTS.slice(0, 3).map((post) => {
              const cat = CATEGORIES[post.category];
              return (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] p-6 transition-all duration-300 hover:border-violet-500/30 hover:bg-white/[0.04]"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <span
                    className="mb-4 inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider"
                    style={{ background: `${cat.color}15`, color: cat.color }}
                  >
                    {cat.label}
                  </span>
                  <h2 className="text-[15px] font-semibold leading-snug text-white transition-colors group-hover:text-violet-300">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/40 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-mono text-[11px] text-white/25">{post.readingTime} min</span>
                    <span className="font-mono text-[11px] text-violet-400 opacity-0 transition-opacity group-hover:opacity-100">
                      Leer →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* All posts */}
        <BlogGrid posts={POSTS} />
      </main>
      <MarketingFooter />
    </>
  );
}
