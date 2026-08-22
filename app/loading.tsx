import { VWordmark } from "@/components/brand/VMark";

export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-white text-black">
      <div className="flex flex-col items-center gap-4">
        <VWordmark />
        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
          Cargando
        </span>
      </div>
    </div>
  );
}
