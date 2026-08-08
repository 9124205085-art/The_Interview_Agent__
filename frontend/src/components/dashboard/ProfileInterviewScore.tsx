"use client";

import { useEffect, useState } from "react";
import type { StoredInterviewResult } from "@backend/lib/interviewResults";

type ProfileInterviewScoreProps = {
  initialResult: StoredInterviewResult | null;
};

function TopicMarksDetail({ result }: { result: StoredInterviewResult }) {
  const topics = result.topicResults ?? [];

  const byModule = topics.reduce<
    Record<
      string,
      { moduleTitle: string; rows: typeof topics; totalMarks: number }
    >
  >((acc, row) => {
    const key = row.moduleTitle;
    if (!acc[key]) {
      acc[key] = { moduleTitle: row.moduleTitle, rows: [], totalMarks: 0 };
    }
    acc[key].rows.push(row);
    acc[key].totalMarks += row.marks;
    return acc;
  }, {});

  return (
    <div className="mt-4 border-t border-slate-100 pt-5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Marks by topic (module & day)
      </h4>
      <p className="mt-1 text-sm text-slate-600">
        Eight questions from four completed days — two questions per cohort day.
      </p>

      <div className="mt-4 space-y-4">
        {Object.values(byModule).map((group) => (
          <div
            key={group.moduleTitle}
            className="overflow-hidden rounded-lg border border-slate-200"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-2.5">
              <p className="text-sm font-semibold text-slate-900">
                {group.moduleTitle}
              </p>
              <p className="text-xs font-medium text-indigo-700">
                Module subtotal: {group.totalMarks} pts
              </p>
            </div>
            <ul className="divide-y divide-slate-100">
              {group.rows.map((row) => (
                <li
                  key={row.questionNumber}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      Day {row.day}: {row.dayTitle}
                    </p>
                    <p className="text-xs text-slate-500">
                      Question {row.questionNumber} · quality score{" "}
                      {row.composite}/100
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold tabular-nums text-indigo-800 ring-1 ring-indigo-100">
                    +{row.marks} pts
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {topics.length === 0 && result.questionScores.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
              <tr>
                <th className="px-4 py-2">Question</th>
                <th className="px-4 py-2">Mark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.questionScores.map((q, i) => (
                <tr key={q.questionId || i}>
                  <td className="px-4 py-2">Q{i + 1}</td>
                  <td className="px-4 py-2 font-medium tabular-nums">
                    {q.composite}/100
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="text-[11px] font-semibold uppercase text-slate-500">
            Accuracy (40%)
          </dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
            {result.sAccuracy}
          </dd>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="text-[11px] font-semibold uppercase text-slate-500">
            Depth (40%)
          </dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
            {result.sDepth}
          </dd>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="text-[11px] font-semibold uppercase text-slate-500">
            Context (20%)
          </dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">
            {result.sContext}
          </dd>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="text-[11px] font-semibold uppercase text-slate-500">
            Integrity penalty
          </dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-amber-700">
            −{result.integrityPenalty}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function ProfileInterviewScore({
  initialResult,
}: ProfileInterviewScoreProps) {
  const [result, setResult] = useState<StoredInterviewResult | null>(
    initialResult,
  );
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    setResult(initialResult);
  }, [initialResult]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/interview/score", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          result: StoredInterviewResult | null;
        };
        if (!cancelled && data.result) {
          setResult(data.result);
        }
      } catch {
        /* keep server-provided result */
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {!result ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            AI interview mark
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Complete the proctored eight-question interview. Your final mark out
            of 100 will appear here on your profile.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-indigo-200 bg-white p-6 shadow-sm ring-1 ring-indigo-100/80">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-slate-900">
                AI interview mark
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Proctored test from your completed cohort topics ·{" "}
                {new Date(result.completedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              <button
                type="button"
                onClick={() => setShowDetail((v) => !v)}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
              >
                {showDetail ? "Hide detail" : "View detail"}
                <span
                  className={`inline-block transition ${showDetail ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  ▾
                </span>
              </button>
            </div>
            <div className="rounded-none bg-brand px-5 py-3 text-center text-white shadow-md shadow-black/15">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-100">
                Final mark
              </p>
              <p className="text-3xl font-bold tabular-nums">
                {result.finalScore}
                <span className="text-lg font-semibold text-indigo-200">
                  /100
                </span>
              </p>
            </div>
          </div>

          {showDetail ? <TopicMarksDetail result={result} /> : null}
        </section>
      )}
    </>
  );
}
