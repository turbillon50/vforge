
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { POST_BY_SLUG, POSTS, CATEGORIES } from "@/lib/blog/posts";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = POST_BY_SLUG[params.slug];
  if (!post) return {};
  return {
    title: `${post.title} — VForge Blog`,
    description: post.excerpt,
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = POST_BY_SLUG[params.slug];
  if (!post) notFound();

  const cat = CATEGORIES[post.category];
  const related = POSTS.filter(
    (p) => p.category === post.category && p.slug !== post.slug
  ).slice(0, 3);

  // Simple markdown → HTML (headings, bold, code, paragraphs)
  const html = post.body
    .trim()
    .split("\n")
    .reduce((acc: string[], line) => {
      if (line.startsWith("## ")) return [...acc, `<h2>${line.slice(3)}</h2>`];
      if (line.startsWith("### ")) return [...acc, `<h3>${line.slice(4)}</h3>`];
      if (line.startsWith("```")) return [...acc, line.includes("```") && line.length > 3 ? `<pre><code>` : `</code></pre>`];
      if (line.startsWith("- ")) return [...acc, `<li>${line.slice(2)}</li>`];
      if (line.trim() === "") return [...acc, "<br/>"];
      return [...acc, `<p>${line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>")}</p>`];
    }, [])
    .join("\n");

  return (
    <>
      <MarketingHeader />
      <main className="min-h-screen bg-[#03020a] pb-32 pt-28">
        <div className="mx-auto max-w-2xl px-5">
          {/* Breadcrumb */}
          <div className="mb-8 flex items-center gap-2 font-mono text-[11px] text-[var(--fg-muted)]">
            <Link href="/" className="hover:text-[var(--fg-tertiary)] transition-colors">VForge</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-[var(--fg-tertiary)] transition-colors">Blog</Link>
            <span>/</span>
            <span style={{ color: cat.color }}>{cat.label}</span>
          </div>

          {/* Header */}
          <div className="mb-10">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider mb-4"
              style={{ background: `${cat.color}15`, color: cat.color }}
            >
              {cat.label}
            </span>
            <h1 className="text-[clamp(1.8rem,5vw,2.6rem)] font-bold leading-[1.1] tracking-[-0.03em] text-white">
              {post.title}
            </h1>
            <p className="mt-4 text-[1.05rem] leading-relaxed text-[var(--fg-tertiary)]">
              {post.excerpt}
            </p>
            <div className="mt-5 flex items-center gap-4 font-mono text-[11px] text-[var(--fg-muted)]">
              <span>{new Date(post.publishedAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</span>
              <span>·</span>
              <span>{post.readingTime} min de lectura</span>
            </div>
          </div>

          {/* Divider */}
          <div className="mb-10 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

          {/* Body */}
          <article
            className="blog-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {/* CTA */}
          <div className="mt-16 overflow-hidden rounded-2xl border border-violet-500/20 bg-violet-500/5 p-6">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/20 to-transparent" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-violet-400/70 mb-2">
              ¿Listo para construir?
            </p>
            <p className="text-lg font-semibold text-white mb-4">
              Despierta a V y empieza tu proyecto hoy.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Ir a VForge
              </Link>
              <Link
                href="/blog/vforge-mcp-instalacion"
                className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-5 py-2.5 text-sm text-[var(--fg-secondary)] hover:text-white transition-colors"
              >
                Instalar VForge MCP
              </Link>
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-16">
              <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">
                También en {cat.label}
              </p>
              <div className="space-y-3">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/blog/${r.slug}`}
                    className="flex items-start justify-between gap-4 rounded-xl border border-[var(--border-1)] bg-white/2 p-4 transition-all hover:border-[var(--border-1)] hover:bg-[var(--surface-1)]"
                  >
                    <div>
                      <p className="text-[13px] font-medium text-white leading-snug">{r.title}</p>
                      <p className="mt-1 font-mono text-[11px] text-[var(--fg-muted)]">{r.readingTime} min</p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-violet-400 mt-0.5">→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
