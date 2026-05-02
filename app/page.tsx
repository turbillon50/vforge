import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-6">
        <div className="brand-logo justify-center text-2xl">
          <span className="brand-v">V</span>
          <span className="brand-text">
            <span>F</span>
            <span className="brand-o" aria-hidden />
            <span>rge</span>
          </span>
        </div>

        <p className="text-[var(--fg-1)] text-sm leading-relaxed">
          Scaffold listo. El frontend MVP se está construyendo en{" "}
          <Link
            href="https://v0.dev"
            className="text-[var(--green)] underline-offset-4 hover:underline"
          >
            v0.dev
          </Link>{" "}
          usando el prompt maestro guardado en{" "}
          <code className="text-[var(--fg)] bg-[var(--bg-2)] px-1.5 py-0.5 rounded">
            docs/v0-prompt.md
          </code>
          .
        </p>

        <p className="text-[var(--fg-2)] text-xs">
          Build · Deploy · Evolve
        </p>
      </div>

      <style>{`
        .brand-logo {
          display: inline-flex;
          align-items: center;
          font-weight: 700;
          letter-spacing: -0.04em;
          line-height: 1;
        }
        .brand-v {
          position: relative;
          padding: 0 2px;
          color: var(--fg);
          margin-right: 1px;
        }
        .brand-v::before {
          content: "";
          position: absolute;
          inset: -3px 0 -3px 0;
          border-left: 1.5px solid var(--green);
          border-right: 1.5px solid var(--green);
          transform: skewX(-14deg);
          box-shadow: 0 0 6px var(--green-glow);
          pointer-events: none;
        }
        .brand-text {
          display: inline-flex;
          align-items: center;
          letter-spacing: -0.02em;
        }
        .brand-text > span:not(.brand-o) {
          background: linear-gradient(180deg, #ffffff 0%, #777777 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .brand-o {
          position: relative;
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 1.5px solid var(--green);
          border-radius: 50%;
          margin: 0 1px;
          box-shadow: 0 0 8px var(--green-glow);
          flex-shrink: 0;
        }
        .brand-o::before {
          content: "";
          position: absolute;
          top: -3px;
          left: 50%;
          width: 1.5px;
          height: 5px;
          background: var(--green);
          transform: translateX(-50%);
          box-shadow: 0 0 4px var(--green-glow);
        }
      `}</style>
    </main>
  );
}
