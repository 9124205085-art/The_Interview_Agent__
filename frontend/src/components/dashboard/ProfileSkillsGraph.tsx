"use client";

import { useMemo, useState } from "react";

type ProfileSkillsGraphProps = {
  candidateName: string;
  jobRole: string;
  wellFocusedAreas: string[];
  strengths: string[];
};

type BubbleItem = {
  id: string;
  shortLabel: string;
  fullLabel: string;
};

type PlacedBubble = {
  id: string;
  x: number;
  y: number;
  r: number;
  role: "center" | "orbit";
  item: BubbleItem;
};

const SLOT_POSITIONS = [
  { x: 200, y: 132, r: 78, role: "center" as const },
  { x: 92, y: 58, r: 58, role: "orbit" as const },
  { x: 308, y: 58, r: 58, role: "orbit" as const },
  { x: 92, y: 206, r: 58, role: "orbit" as const },
  { x: 308, y: 206, r: 58, role: "orbit" as const },
];

function shortTopic(text: string): string {
  const cleaned = text
    .replace(/^Applied learning:\s*/i, "")
    .replace(/^First-try mastery in\s*/i, "");
  const parts = cleaned.split(/[&·,]/).map((p) => p.trim());
  const first = parts[0] ?? cleaned;
  const words = first.split(/\s+/);
  if (words.length <= 3) return first;
  return words.slice(0, 3).join(" ");
}

function toBubbleItems(labels: string[], prefix: string): BubbleItem[] {
  return labels.slice(0, 5).map((fullLabel, i) => ({
    id: `${prefix}-${i}`,
    shortLabel: shortTopic(fullLabel),
    fullLabel,
  }));
}

function wrapBubbleText(text: string, maxLine = 14): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLine && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function BubbleCluster({
  title,
  subtitle,
  items,
  accent,
}: {
  title: string;
  subtitle: string;
  items: BubbleItem[];
  accent: "teal" | "blue";
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const activeId = pinnedId ?? hoveredId;
  const accentFill =
    accent === "teal" ? "rgba(45, 212, 191, 0.35)" : "rgba(96, 165, 250, 0.35)";
  const accentStroke =
    accent === "teal" ? "rgba(45, 212, 191, 0.9)" : "rgba(96, 165, 250, 0.9)";
  const textColor = accent === "teal" ? "#2dd4bf" : "#60a5fa";
  const textColorMuted = accent === "teal" ? "#5eead4" : "#93c5fd";

  const placed: PlacedBubble[] = useMemo(() => {
    if (items.length === 0) return [];
    const slots = SLOT_POSITIONS.slice(0, items.length);
    return slots.map((slot, i) => {
      const item = items[i];
      return {
        id: item.id,
        x: slot.x,
        y: slot.y,
        r: slot.r,
        role: slot.role,
        item,
      };
    });
  }, [items]);

  const activeItem = placed.find((b) => b.id === activeId)?.item;

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-[#141820] p-6 text-sm text-slate-400">
        No {title.toLowerCase()} data yet.
      </div>
    );
  }

  function handleBubbleClick(id: string) {
    setPinnedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="rounded-xl border border-slate-700/80 bg-[#141820] p-4 shadow-sm">
      <div className="mb-2 px-1">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          {title}
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>

      <svg
        viewBox="0 0 400 264"
        className="mx-auto w-full max-w-md touch-none select-none"
        role="application"
        aria-label={`Interactive ${title} graph. Hover or click bubbles for details.`}
        onMouseLeave={() => setHoveredId(null)}
      >
        {placed.map((bubble) => {
          const isActive = activeId === bubble.id;
          const isDimmed = activeId != null && !isActive;
          const scale = isActive ? 1.06 : 1;
          const displayR = bubble.r * scale;

          return (
            <g
              key={bubble.id}
              style={{
                transition: "opacity 0.2s ease",
                opacity: isDimmed ? 0.45 : 1,
              }}
            >
              <circle
                cx={bubble.x}
                cy={bubble.y}
                r={displayR + 8}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredId(bubble.id)}
                onFocus={() => setHoveredId(bubble.id)}
                onClick={() => handleBubbleClick(bubble.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleBubbleClick(bubble.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={bubble.item.fullLabel}
                aria-pressed={pinnedId === bubble.id}
              />
              <circle
                cx={bubble.x}
                cy={bubble.y}
                r={displayR}
                fill={isActive ? accentFill : "rgba(148, 163, 184, 0.22)"}
                stroke={isActive ? accentStroke : "rgba(148, 163, 184, 0.35)"}
                strokeWidth={isActive ? 2.5 : 1.5}
                className="pointer-events-none transition-[r,fill,stroke] duration-200"
              />
              {isActive ? (
                <circle
                  cx={bubble.x}
                  cy={bubble.y}
                  r={displayR + 6}
                  fill="none"
                  stroke={accentStroke}
                  strokeWidth={1}
                  opacity={0.5}
                  className="pointer-events-none animate-pulse"
                />
              ) : null}
              {wrapBubbleText(
                bubble.item.shortLabel,
                bubble.role === "center" ? 16 : 13,
              ).map((line, i, arr) => (
                <text
                  key={i}
                  x={bubble.x}
                  y={bubble.y + (i - (arr.length - 1) / 2) * 14}
                  textAnchor="middle"
                  fill={isActive ? textColor : textColorMuted}
                  fontSize={bubble.role === "center" ? 13 : 11}
                  fontWeight={isActive ? 700 : 600}
                  className="pointer-events-none"
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </svg>

      <div
        className={`mt-3 min-h-[3.25rem] rounded-lg border px-3 py-2.5 text-sm transition-colors ${
          activeItem
            ? accent === "teal"
              ? "border-teal-500/40 bg-teal-950/40 text-teal-100"
              : "border-blue-500/40 bg-blue-950/40 text-blue-100"
            : "border-slate-700/80 bg-slate-900/50 text-slate-500"
        }`}
        aria-live="polite"
      >
        {activeItem ? (
          <>
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">
              {pinnedId === activeItem.id ? "Selected" : "Preview"}
            </p>
            <p className="mt-0.5 leading-snug">{activeItem.fullLabel}</p>
          </>
        ) : (
          <p>Hover or click a bubble to see the full description.</p>
        )}
      </div>
    </div>
  );
}

export function ProfileSkillsGraph({
  jobRole,
  wellFocusedAreas,
  strengths,
}: ProfileSkillsGraphProps) {
  const focusBubbles = useMemo(
    () => toBubbleItems(wellFocusedAreas, "focus"),
    [wellFocusedAreas],
  );
  const strengthBubbles = useMemo(
    () => toBubbleItems(strengths, "strength"),
    [strengths],
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-800">Skills at a glance</p>
        <p className="text-xs text-slate-500">
          Interactive map for {jobRole}. Hover to preview · click to pin a bubble.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BubbleCluster
          title="Well focused area"
          subtitle="Center = primary focus · corners = supporting topics"
          items={focusBubbles}
          accent="teal"
        />
        <BubbleCluster
          title="Your strength"
          subtitle="Center = top strength · corners = more highlights"
          items={strengthBubbles}
          accent="blue"
        />
      </div>
    </div>
  );
}
