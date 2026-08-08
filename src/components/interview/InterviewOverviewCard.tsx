"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { CandidateMission, CurriculumDay } from "@/types/candidate";
import {
  canStartInterview,
  getCompletedCurriculumDays,
  TOTAL_QUESTIONS,
} from "@/lib/interview/planInterview";

type InterviewOverviewCardProps = {
  candidateName: string;
  missions: CandidateMission[];
  curriculumDays: CurriculumDay[];
};

export function InterviewOverviewCard({
  candidateName,
  missions,
  curriculumDays,
}: InterviewOverviewCardProps) {
  const completedDays = useMemo(
    () => getCompletedCurriculumDays(missions, curriculumDays),
    [missions, curriculumDays],
  );
  const gate = useMemo(() => canStartInterview(completedDays), [completedDays]);

  return (
    <section className="mt-10 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">AI interview session</h2>
      <p className="mt-1 text-sm text-slate-600">
        {TOTAL_QUESTIONS} personalized questions from 4 completed cohort days.
        Proctored test with webcam, tab monitoring, and voice + text answers — on a
        dedicated interview page.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Completed days: {completedDays.length} · Candidate: {candidateName}
      </p>

      {!gate.ok ? (
        <p className="mt-4 text-sm text-amber-800">{gate.message}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/dashboard/interview"
          className={`inline-flex rounded-lg px-5 py-2.5 text-sm font-medium ${
            gate.ok
              ? "bg-indigo-600 text-white hover:bg-indigo-500"
              : "pointer-events-none bg-slate-200 text-slate-500"
          }`}
          aria-disabled={!gate.ok}
        >
          Go to interview test
        </Link>
        <span className="self-center text-xs text-slate-500">
          Review terms & start test on the next page
        </span>
      </div>
    </section>
  );
}
