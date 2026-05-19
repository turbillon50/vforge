"use client";

import { useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

interface MessageBodyProps {
  content: string;
}

export function MessageBody({ content }: MessageBodyProps) {
  return (
    <div className="text-[14.5px] leading-relaxed text-on-surface">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

const mdComponents: Components = {
  p: ({ children }) => (
    <p className="my-1.5 first:mt-0 last:mb-0 whitespace-pre-wrap">{children}</p>
  ),
  ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h1 className="mt-3 mb-2 text-base font-semibold text-on-surface">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-3 mb-1.5 text-[15px] font-semibold text-on-surface">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-2.5 mb-1 text-sm font-semibold text-on-surface">{children}</h3>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-violet-300 underline decoration-violet-300/30 underline-offset-2 hover:decoration-violet-300"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-on-surface">{children}</strong>,
  em: ({ children }) => <em className="italic text-on-surface-variant">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-violet-500/40 pl-3 text-on-surface-variant">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-md border border-app">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-tint-1">{children}</thead>,
  th: ({ children }) => (
    <th className="px-2.5 py-1.5 text-left font-semibold text-on-surface border-b border-app">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2.5 py-1.5 text-on-surface-variant border-b border-app/50">{children}</td>
  ),
  hr: () => <hr className="my-3 border-app" />,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: ({ inline, className: cls, children, ...rest }: any) => {
    const text = String(children).replace(/\n$/, "");
    if (inline) {
      return (
        <code
          className="rounded bg-tint-2 px-1 py-0.5 font-mono text-[12px] text-violet-300"
          {...rest}
        >
          {text}
        </code>
      );
    }
    const lang = /language-(\w+)/.exec(cls ?? "")?.[1];
    return <CodeBlock language={lang}>{text}</CodeBlock>;
  },
  pre: ({ children }) => <>{children}</>,
};

function CodeBlock({ language, children }: { language?: string; children: ReactNode }) {
  const text = String(children);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="my-2 group overflow-hidden rounded-md border border-app bg-tint-1">
      <div className="flex items-center justify-between border-b border-app/60 px-3 py-1 text-[10px] uppercase tracking-wider text-muted">
        <span>{language ?? "code"}</span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-muted hover:bg-tint-2 hover:text-on-surface transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          <span>{copied ? "copiado" : "copiar"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2 text-[12.5px] leading-relaxed font-mono text-on-surface">
        <code>{text}</code>
      </pre>
    </div>
  );
}
