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
      <code className="rounded-[5px] border border-[var(--vf-border)] bg-[var(--vf-bg-2)] px-1.5 py-px font-mono text-[0.88em] text-[var(--vf-fg)]">
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
    <div className="vf-md-codewrap group relative my-3 overflow-hidden rounded-lg border border-[var(--vf-fg)] bg-[var(--vf-fg)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--vf-bg-3)] bg-[var(--vf-fg)] px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--vf-bg-3)]">
          {lang || "code"}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[var(--vf-bg-2)] transition hover:text-[var(--vf-bg-1)]"
          aria-label="Copy code"
        >
          {copied ? <IconCheck size={11} /> : <IconCopy size={11} />}
          <span className="hidden sm:inline">{copied ? "Copiado" : "Copy"}</span>
        </button>
      </div>
      <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-words px-3 py-2.5 font-mono text-[13px] leading-relaxed text-[var(--vf-bg-1)] select-text">
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
      className="font-medium text-[var(--vf-fg)] underline decoration-[var(--vf-border-1)] underline-offset-2 transition hover:decoration-[var(--vf-fg)]"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="vf-md-block my-2.5 ml-0 list-disc space-y-1.5 pl-5 marker:text-[var(--vf-fg)]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="vf-md-block my-2.5 ml-0 list-decimal space-y-1.5 pl-5 marker:text-[var(--vf-fg)]">{children}</ol>
  ),
  li: ({ children }) => <li className="vf-md-block pl-1 leading-[1.65]">{children}</li>,
  h1: ({ children }) => (
    <h1 className="vf-md-block mt-5 mb-2.5 font-display text-[1.2rem] font-semibold leading-tight tracking-[-0.01em] text-[var(--vf-fg)]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="vf-md-block mt-4 mb-2 font-display text-[1.08rem] font-semibold leading-tight tracking-[-0.01em] text-[var(--vf-fg)]">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="vf-md-block mt-3.5 mb-1.5 font-display text-[0.98rem] font-semibold leading-snug tracking-[-0.005em] text-[var(--vf-fg)]">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="vf-md-block my-2 leading-[1.65]">{children}</p>,
  blockquote: ({ children }) => (
    <blockquote className="vf-md-block my-3 border-l-2 border-[var(--vf-fg)] bg-[var(--vf-bg-2)] py-1.5 pl-3 italic text-[var(--vf-fg-1)]">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-0 border-t border-[var(--vf-border)]" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-[var(--vf-fg)]">{children}</strong>
  ),
  em: ({ children }) => <em className="text-[var(--vf-fg-1)]">{children}</em>,
  table: ({ children }) => (
    <div className="my-3 max-w-full overflow-x-auto rounded-lg border border-[var(--vf-border)]">
      <table className="w-full border-collapse text-left text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[var(--vf-bg-2)] font-mono text-[11px] uppercase tracking-widest text-[var(--vf-fg-2)]">
      {children}
    </thead>
  ),
  th: ({ children }) => <th className="px-3 py-2 font-semibold">{children}</th>,
  td: ({ children }) => (
    <td className="border-t border-[var(--vf-border)] px-3 py-2">{children}</td>
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
      className="vf-md min-w-0 max-w-full font-sans text-[13px] font-normal leading-[1.65] tracking-[-0.005em] text-[var(--vf-fg)] sm:text-[14px]"
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
          className="vf-stream-caret ml-px inline-block h-[1.05em] w-[2px] -translate-y-[2px] translate-x-[1px] rounded-sm bg-[var(--vf-fg)] align-middle"
        />
      )}
    </div>
  );
}

export const Markdown = memo(MarkdownInner);
