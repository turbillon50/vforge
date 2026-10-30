"use client";
import { parseChart, type ChartArtifact } from "@/lib/v-canonical/charts";
export function ChartResult({ value }: { value: unknown }) {
  let chart: ChartArtifact;
  try {
    chart = parseChart(value);
  } catch {
    return null;
  }
  const W = 640,
    H = 300,
    left = 54,
    right = 18,
    top = 22,
    bottom = 74;
  const min = Math.min(0, ...chart.data.map((x) => x.value)),
    max = Math.max(0, ...chart.data.map((x) => x.value));
  const span = max - min || 1;
  const y = (n: number) => top + ((max - n) / span) * (H - top - bottom);
  const band = (W - left - right) / chart.data.length;
  const x = (i: number) => left + band * (i + 0.5);
  return (
    <figure className="mt-4 overflow-hidden rounded-xl border border-black/15 bg-white p-3 text-black">
      <figcaption className="mb-2 text-sm font-medium">
        {chart.title}
      </figcaption>
      <div className="overflow-x-auto">
        <svg
          viewBox={"0 0 " + W + " " + H}
          role="img"
          aria-label={chart.title}
          className="w-full min-w-[640px]"
        >
          <line
            x1={left}
            y1={y(0)}
            x2={W - right}
            y2={y(0)}
            stroke="currentColor"
            opacity=".25"
          />
          {[0, 0.5, 1].map((f) => {
            const n = min + f * span;
            return (
              <g key={f}>
                <line
                  x1={left}
                  y1={y(n)}
                  x2={W - right}
                  y2={y(n)}
                  stroke="currentColor"
                  opacity=".08"
                />
                <text x={left - 6} y={y(n) + 4} textAnchor="end" fontSize="12">
                  {n.toLocaleString("es-MX", { maximumFractionDigits: 1 })}
                </text>
              </g>
            );
          })}
          {chart.kind === "line" && (
            <polyline
              points={chart.data
                .map((d, i) => x(i) + "," + y(d.value))
                .join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            />
          )}
          {chart.data.map((d, i) => (
            <g key={i}>
              {chart.kind === "bar" ? (
                <rect
                  x={x(i) - Math.min(36, band * 0.32)}
                  y={Math.min(y(d.value), y(0))}
                  width={Math.min(72, band * 0.64)}
                  height={Math.max(1, Math.abs(y(d.value) - y(0)))}
                  rx="3"
                  fill="currentColor"
                />
              ) : (
                <circle cx={x(i)} cy={y(d.value)} r="4" fill="currentColor" />
              )}
              <text
                x={x(i)}
                y={H - bottom + 18}
                textAnchor="end"
                transform={"rotate(-35 " + x(i) + " " + (H - bottom + 18) + ")"}
                fontSize="12"
              >
                {d.label.length > 22 ? d.label.slice(0, 20) + "…" : d.label}
              </text>
              <title>{d.label + ": " + d.value}</title>
            </g>
          ))}
        </svg>
      </div>
      <p className="mt-1 text-xs text-black/65">{chart.source}</p>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer">Ver datos</summary>
        <table className="mt-2 w-full text-left">
          <tbody>
            {chart.data.map((d, i) => (
              <tr key={i}>
                <td className="py-1">{d.label}</td>
                <td className="text-right tabular-nums">
                  {d.value.toLocaleString("es-MX")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
