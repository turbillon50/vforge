
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Post } from "@/lib/blog/posts";
import { CATEGORIES } from "@/lib/blog/posts";

const EASE: [number,number,number,number] = [0.22,1,0.36,1];

export function BlogGrid({ posts }: { posts: Post[] }) {
  const [active, setActive] = useState<string>("all");

  const filtered = active === "all"
    ? posts
    : posts.filter((p) => p.category === active);

  return (
    <div className="mx-auto mt-20 max-w-5xl px-5">
      {/* Filter bar */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActive("all")}
          className={`rounded-full border px-3 py-1.5 font-mono text-[11px] transition-all ${
            active === "all"
              ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
              : "border-white/8 text-white/30 hover:text-white/60"
          }`}
        >
          Todos ({posts.length})
        </button>
        {Object.entries(CATEGORIES).map(([key, cat]) => {
          const count = posts.filter((p) => p.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              className="rounded-full border px-3 py-1.5 font-mono text-[11px] transition-all"
              style={
                active === key
                  ? { borderColor: `${cat.color}50`, background: `${cat.color}15`, color: cat.color }
                  : { borderColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }
              }
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((post, i) => {
          const cat = CATEGORIES[post.category];
          return (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE, delay: i * 0.03 }}
            >
              <Link
                href={`/blog/${post.slug}`}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/6 bg-[#0a0a12] p-5 transition-all duration-300 hover:border-white/12 hover:bg-[#0e0e18]"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                {/* Accent line left */}
                <div
                  className="absolute left-0 top-0 h-full w-0.5 opacity-40 transition-opacity group-hover:opacity-80"
                  style={{ backgroundColor: cat.color }}
                />
                <span
                  className="mb-3 inline-flex w-fit items-center rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest"
                  style={{ background: `${cat.color}12`, color: cat.color }}
                >
                  {cat.label}
                </span>
                <h3 className="flex-1 text-[14px] font-semibold leading-snug text-white/90 transition-colors group-hover:text-white">
                  {post.title}
                </h3>
                <p className="mt-2 text-[12px] leading-relaxed text-white/35 line-clamp-2">
                  {post.excerpt}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-white/20">{post.readingTime} min</span>
                  <span
                    className="font-mono text-[10px] opacity-0 transition-all group-hover:opacity-100"
                    style={{ color: cat.color }}
                  >
                    Leer →
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
