import Link from "next/link";
import { getCurriculum } from "@backend/lib/data";
import { requireCandidate } from "@backend/lib/requireCandidate";
import { InterviewSession } from "@/components/interview/InterviewSession";

export default async function InterviewTestPage() {
  const candidate = await requireCandidate();
  const curriculum = getCurriculum();

  return (
    <div className="min-h-full bg-[#eef1f6]">
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              Proctored AI interview
            </p>
            <h1 className="text-lg font-semibold text-slate-900">
              {candidate.member.name} · {candidate.member.id}
            </h1>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <InterviewSession
          candidate={candidate}
          curriculumDays={curriculum.days}
        />
      </main>
    </div>
  );
}
