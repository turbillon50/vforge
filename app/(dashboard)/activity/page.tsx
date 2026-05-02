"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ACTIVITY, type ActivityItem } from "@/lib/mock-data";

const FILTERS = [
  { id: "all", label: "Hoy" },
  { id: "7d", label: "7 días" },
  { id: "deploys", label: "Deploys" },
  { id: "vault", label: "Bóveda" },
  { id: "errors", label: "Errores" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const kindColors: Record<ActivityItem["kind"], string> = {
  deploy: "bg-vf-green",
  vault: "bg-vf-info",
  error: "bg-vf-error",
  vision: "bg-vf-green",
  warning: "bg-vf-warning",
  create: "bg-vf-green",
  scout: "bg-vf-green",
  settings: "bg-vf-fg-2",
  backup: "bg-vf-info",
  refactor: "bg-vf-green",
};

function getTimeBucket(time: string): "today" | "week" | "before" {
  if (time.includes("min") || time.includes("h")) return "today";
  if (time.includes("d")) {
    const days = parseInt(time);
    if (days <= 7) return "week";
    return "before";
  }
  return "before";
}

function filterActivity(items: ActivityItem[], filter: FilterId): ActivityItem[] {
  switch (filter) {
    case "all":
      return items.filter((i) => getTimeBucket(i.time) === "today");
    case "7d":
      return items.filter((i) => getTimeBucket(i.time) !== "before");
    case "deploys":
      return items.filter((i) => i.kind === "deploy");
    case "vault":
      return items.filter((i) => i.kind === "vault");
    case "errors":
      return items.filter((i) => i.kind === "error" || i.kind === "warning");
    default:
      return items;
  }
}

interface GroupedActivity {
  today: ActivityItem[];
  week: ActivityItem[];
  before: ActivityItem[];
}

function groupByBucket(items: ActivityItem[]): GroupedActivity {
  return items.reduce<GroupedActivity>(
    (acc, item) => {
      const bucket = getTimeBucket(item.time);
      acc[bucket].push(item);
      return acc;
    },
    { today: [], week: [], before: [] }
  );
}

export default function ActivityPage() {
  const [activeFilter, setActiveFilter] = useState<FilterId>("7d");

  const filteredItems = useMemo(
    () => filterActivity(ACTIVITY, activeFilter),
    [activeFilter]
  );

  const grouped = useMemo(() => groupByBucket(filteredItems), [filteredItems]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <p
          className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2 stagger-fade-up"
          style={{ animationDelay: "0ms" }}
        >
          Registro
        </p>
        <h1
          className="text-3xl md:text-4xl font-semibold tracking-tight-vf text-vf-fg stagger-fade-up"
          style={{ animationDelay: "50ms" }}
        >
          Actividad
        </h1>
        <p
          className="text-vf-fg-1 stagger-fade-up"
          style={{ animationDelay: "100ms" }}
        >
          Todo lo que pasa en tu fábrica · cronológico
        </p>
      </header>

      {/* Filter Chips */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide stagger-fade-up"
        style={{ animationDelay: "150ms" }}
      >
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors",
              activeFilter === filter.id
                ? "bg-vf-green text-black"
                : "bg-vf-bg-1 text-vf-fg-1 hover:bg-vf-bg-2"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {grouped.today.length > 0 && (
          <TimelineSection label="Hoy" items={grouped.today} startDelay={200} />
        )}
        {grouped.week.length > 0 && (
          <TimelineSection
            label="Esta semana"
            items={grouped.week}
            startDelay={200 + grouped.today.length * 30}
          />
        )}
        {grouped.before.length > 0 && (
          <TimelineSection
            label="Antes"
            items={grouped.before}
            startDelay={200 + (grouped.today.length + grouped.week.length) * 30}
          />
        )}
        {filteredItems.length === 0 && (
          <p className="text-vf-fg-2 text-sm py-8 text-center">
            No hay actividad para este filtro
          </p>
        )}
      </div>
    </div>
  );
}

function TimelineSection({
  label,
  items,
  startDelay,
}: {
  label: string;
  items: ActivityItem[];
  startDelay: number;
}) {
  return (
    <section>
      <p
        className="font-mono text-[11px] uppercase tracking-wide text-vf-fg-2 mb-3 stagger-fade-up"
        style={{ animationDelay: `${startDelay}ms` }}
      >
        {label}
      </p>
      <div className="relative pl-5">
        {/* Vertical line */}
        <div className="absolute left-[5px] top-2 bottom-2 w-px bg-vf-border-1" />

        <div className="space-y-0">
          {items.map((item, index) => (
            <TimelineRow
              key={item.id}
              item={item}
              delay={startDelay + 50 + index * 30}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function TimelineRow({
  item,
  delay,
}: {
  item: ActivityItem;
  delay: number;
}) {
  return (
    <div
      className="relative flex items-start gap-3 py-3 stagger-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Dot on the timeline */}
      <span
        className={cn(
          "absolute left-[-17px] top-[18px] w-2.5 h-2.5 rounded-full ring-2 ring-vf-bg flex-shrink-0",
          kindColors[item.kind]
        )}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-mono text-xs text-vf-fg-2 min-w-[3.5rem]">
            {item.time}
          </span>
          <span className="text-sm font-medium text-vf-fg">{item.actor}</span>
          <span className="text-sm text-vf-fg-1">{item.verb}</span>
        </div>
        <p className="font-mono text-sm text-vf-fg-1 mt-0.5 truncate">
          {item.target}
        </p>
      </div>
    </div>
  );
}
