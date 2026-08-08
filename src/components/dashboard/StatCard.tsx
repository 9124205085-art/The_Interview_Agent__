import type { ReactNode } from "react";

type StatIconKind = "commit" | "missions" | "firstTry";

const iconClass = "h-5 w-5";

export function StatMetricIcon({ kind }: { kind: StatIconKind }) {
  switch (kind) {
    case "commit":
      return (
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100">
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect
              x="3"
              y="5"
              width="18"
              height="16"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.75"
            />
            <path
              d="M8 3v4M16 3v4M3 10h18"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <circle cx="12" cy="15" r="1.5" fill="currentColor" />
          </svg>
        </span>
      );
    case "missions":
      return (
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M9 11l2.5 2.5L15 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 21c4.5-1.2 7-5 7-10V6l-7-3-7 3v5c0 5 2.5 8.8 7 10z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      );
    case "firstTry":
      return (
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600 ring-1 ring-violet-100">
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.75" />
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
            <circle cx="12" cy="12" r="1.25" fill="currentColor" />
          </svg>
        </span>
      );
  }
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
