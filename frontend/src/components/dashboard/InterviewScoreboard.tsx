"use client";

import { useEffect, useState } from "react";
import { CandidateAvatar } from "@/components/CandidateAvatar";
import type { ScoreboardEntry } from "@backend/lib/interviewResults";

type InterviewScoreboardProps = {
  currentCandidateId: string;
};

export function InterviewScoreboard({
  currentCandidateId,
}: InterviewScoreboardProps) {
  const [entries, setEntries] = useState<ScoreboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/interview/scoreboard", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { entries: ScoreboardEntry[] };
        if (!cancelled) setEntries(data.entries ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const completedCount = entries.filter((e) => e.finalScore !== null).length;

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Cohort scoreboard</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          AI interview · /100
        </p>
        {!loading ? (
          <p className="mt-2 text-[11px] font-medium text-slate-400">
            {completedCount} of {entries.length} completed
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <p className="px-1 text-sm text-slate-400">Loading…</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => {
              const isYou =
                entry.candidateId.toUpperCase() ===
                currentCandidateId.toUpperCase();
              return (
                <li
                  key={entry.candidateId}
                  className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2.5 ${
                    isYou
                      ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200"
                      : "border-slate-200 bg-slate-50/80"
                  }`}
                >
                  <CandidateAvatar
                    seed={entry.candidateId}
                    name={entry.name}
                    size="sm"
                    className="!h-9 !w-9"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-900">
                      {entry.name}
                      {isYou ? (
                        <span className="font-medium text-indigo-600"> · You</span>
                      ) : null}
                    </p>
                    <p className="truncate text-[10px] text-slate-500">
                      {entry.jobRole}
                    </p>
                  </div>
                  <div className="shrink-0 text-right leading-none">
                    {entry.finalScore !== null ? (
                      <p className="text-sm font-bold tabular-nums text-indigo-700">
                        {entry.finalScore}
                        <span className="text-[10px] font-medium text-slate-400">
                          /100
                        </span>
                      </p>
                    ) : (
                      <p
                        className="text-base font-semibold text-slate-300"
                        title="Interview not completed"
                      >
                        —
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
