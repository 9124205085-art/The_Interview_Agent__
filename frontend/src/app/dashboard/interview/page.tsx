import Link from "next/link";
import { getCurriculum } from "@backend/lib/data";
import { requireCandidate } from "@backend/lib/requireCandidate";
import { InterviewSession } from "@/components/interview/InterviewSession";

export default async function InterviewTestPage() {
  const candidate = await requireCandidate();
  const curriculum = getCurriculum();

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-100 via-[#eef1f6] to-slate-100">
      <header className="border-b border-slate-200/80 bg-white/90 px-6 py-5 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Proctored AI interview
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                {candidate.member.name}
              </h1>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-medium text-slate-600">
                {candidate.member.id}
              </span>
            </div>
          </div>
          <Link
            href="/dashboard?profile=1"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <span aria-hidden>←</span>
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <InterviewSession
          candidate={candidate}
          curriculumDays={curriculum.days}
        />
      </main>
    </div>
  );
}
