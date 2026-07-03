export default function ForgeLoader({ label = "Forge" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[40vh] w-full flex-col items-center justify-center gap-4"
      style={{ background: "#ffffff" }}
    >
      <svg viewBox="0 0 24 24" width="34" height="34" className="animate-pulse" aria-hidden>
        <path d="M2 3h20L12 21z" fill="#000000" />
      </svg>
      <p
        className="text-[10px] uppercase"
        style={{ color: "#6B7280", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.3em" }}
      >
        {label}
      </p>
    </div>
  );
}
