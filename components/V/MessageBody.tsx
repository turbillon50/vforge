'use client';

import { useState, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBodyProps {
  content: string;
  className?: string;
}

export function MessageBody({ content, className }: MessageBodyProps) {
  return (
    <div className={cn('text-sm leading-relaxed text-vf-fg-1', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

const mdComponents: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0 whitespace-pre-wrap">{children}</p>,
  ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h1 className="mt-4 mb-2 text-base font-semibold text-vf-fg-1">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-3 mb-2 text-sm font-semibold text-vf-fg-1">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1 text-sm font-semibold text-vf-fg-1">{children}</h3>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-vf-green underline decoration-vf-green/40 underline-offset-2 hover:decoration-vf-green"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-vf-fg-1">{children}</strong>,
  em: ({ children }) => <em className="italic text-vf-fg-2">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-vf-green/40 pl-3 text-vf-fg-2">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-md border border-vf-border">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-vf-bg-2/60">{children}</thead>,
  th: ({ children }) => (
    <th className="px-2.5 py-1.5 text-left font-semibold text-vf-fg-1 border-b border-vf-border">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2.5 py-1.5 text-vf-fg-2 border-b border-vf-border/50">{children}</td>
  ),
  hr: () => <hr className="my-3 border-vf-border" />,
  code: ({ inline, className: cls, children, ...rest }: any) => {
    const text = String(children).replace(/\n$/, '');
    if (inline) {
      return (
        <code
          className="rounded bg-vf-bg-2/80 px-1 py-0.5 font-mono text-[12px] text-vf-green-text"
          {...rest}
        >
          {text}
        </code>
      );
    }
    const lang = /language-(\w+)/.exec(cls ?? '')?.[1];
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
    <div className="my-2 group rounded-md border border-vf-border bg-vf-bg-2/60 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1 text-[10px] uppercase tracking-wider text-vf-fg-3 border-b border-vf-border/60">
        <span>{language ?? 'code'}</span>
        <button
          type="button"
          onClick={onCopy}
          className={cn(
            'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
            'text-vf-fg-3 hover:text-vf-fg-1 hover:bg-vf-bg-3/40',
            'transition-colors',
          )}
          aria-label="Copy code"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          <span>{copied ? 'copiado' : 'copiar'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2 text-[12.5px] leading-relaxed font-mono text-vf-fg-1">
        <code>{text}</code>
      </pre>
    </div>
  );
}
