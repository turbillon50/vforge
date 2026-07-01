"use client";

import { memo, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { IconCheck, IconCopy } from "@/components/brand/VFIcons";

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className"]],
    span: [...(defaultSchema.attributes?.span ?? []), ["className"]],
  },
};

function CodeBlock({ inline, className, children }: {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const raw = String(children ?? "");
  const text = raw.replace(/\n$/, "");
  const [copied, setCopied] = useState(false);

  // react-markdown v10 ya NO pasa `inline`. Heurística robusta: es
  // inline si NO tiene className de lenguaje Y el texto crudo no
  // contiene saltos de línea. Los fenced blocks SIEMPRE traen al
  // menos un \n del tokenizer de remark (incluso si la línea trimmed
  // queda en blanco), los inline ` ` jamás llevan \n. Cuidado: hay
  // que revisar el `raw` ANTES del trim, si no un fence de una sola
  // línea sin lenguaje (```\nhello\n```) pasaría como inline.
  const looksInline =
    inline === true ||
    (inline === undefined &&
      !/^language-/.test(className ?? "") &&
      !/\n/.test(raw));

  if (looksInline) {
    return (
      <code className="rounded-[5px] border border-violet-500/25 bg-violet-500/[0.1] px-1.5 py-px font-mono text-[0.88em] text-violet-300">
        {children}
      </code>
    );
  }

  const lang = /language-([\w-]+)/.exec(className ?? "")?.[1];

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  }

  return (
    <div className="vf-md-codewrap group relative my-3 overflow-hidden rounded-lg border border-violet-500/25 bg-[#0d1117]">
      <div className="flex items-center justify-between gap-2 border-b border-violet-500/15 bg-[#161b22] px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          {lang || "code"}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#e6edf3]-variant transition hover:text-violet-300"
          aria-label="Copy code"
        >
          {copied ? <IconCheck size={11} /> : <IconCopy size={11} />}
          <span className="hidden sm:inline">{copied ? "Copiado" : "Copy"}</span>
        </button>
      </div>
      <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words px-3 py-2.5 font-mono text-[13px] leading-relaxed text-[#e6edf3] select-text">
        <code className={className}>{text}</code>
      </pre>
    </div>
  );
}

const components: Components = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: CodeBlock as any,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-violet-400 underline decoration-cyan-400/40 underline-offset-2 transition hover:decoration-cyan-400"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="vf-md-block my-2.5 ml-0 list-disc space-y-1.5 pl-5 marker:text-violet-400/80">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="vf-md-block my-2.5 ml-0 list-decimal space-y-1.5 pl-5 marker:text-violet-400/80">{children}</ol>
  ),
  li: ({ children }) => <li className="vf-md-block pl-1 leading-[1.65]">{children}</li>,
  h1: ({ children }) => (
    <h1 className="vf-md-block mt-5 mb-2.5 font-display text-[1.2rem] font-semibold leading-tight tracking-[-0.01em] text-on-surface">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="vf-md-block mt-4 mb-2 font-display text-[1.08rem] font-semibold leading-tight tracking-[-0.01em] text-on-surface">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="vf-md-block mt-3.5 mb-1.5 font-display text-[0.98rem] font-semibold leading-snug tracking-[-0.005em] text-on-surface">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="vf-md-block my-2 leading-[1.65]">{children}</p>,
  blockquote: ({ children }) => (
    <blockquote className="vf-md-block my-3 border-l-2 border-violet-400/60 bg-violet-500/[0.04] py-1.5 pl-3 italic text-on-surface-variant">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-0 border-t border-violet-500/15" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-on-surface">{children}</strong>
  ),
  em: ({ children }) => <em className="text-on-surface-variant">{children}</em>,
  table: ({ children }) => (
    <div className="my-3 max-w-full overflow-x-auto rounded-lg border border-app">
      <table className="w-full border-collapse text-left text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-tint-1/[0.05] font-mono text-[11px] uppercase tracking-widest text-muted">
      {children}
    </thead>
  ),
  th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
  td: ({ children }) => (
    <td className="border-t border-app/50 px-3 py-2">{children}</td>
  ),
};

interface MarkdownProps {
  text: string;
  /** When streaming, show a soft caret at the end. */
  streaming?: boolean;
}

function MarkdownInner({ text, streaming }: MarkdownProps) {
  const plugins = useMemo(() => [remarkGfm], []);
  const rehype = useMemo(() => [[rehypeSanitize, sanitizeSchema]] as const, []);

  return (
    <div
      className="vf-md min-w-0 max-w-full font-sans text-[15px] font-normal leading-[1.65] tracking-[-0.005em] text-on-surface sm:text-[16px]"
      style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
    >
      <ReactMarkdown
        remarkPlugins={plugins}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rehypePlugins={rehype as any}
        components={components}
      >
        {text}
      </ReactMarkdown>
      {streaming && (
        <span
          aria-hidden
          className="vf-stream-caret ml-px inline-block h-[1.05em] w-[2px] -translate-y-[2px] translate-x-[1px] rounded-sm bg-gradient-to-b from-violet-400 to-violet-400 align-middle"
        />
      )}
    </div>
  );
}

export const Markdown = memo(MarkdownInner);