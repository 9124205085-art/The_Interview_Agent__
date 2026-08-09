import { requireCandidate } from "@/lib/requireCandidate";
import { getCurriculum } from "@backend/lib/data";
import { getInterviewResult } from "@backend/lib/interviewResults";
import { buildCandidateProfile } from "@/lib/candidateProfile";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{ profile?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const candidate = await requireCandidate();
  const curriculum = getCurriculum();
  const profile = buildCandidateProfile(candidate);
  const interviewResult = getInterviewResult(candidate.member.id);
  const openProfile = params.profile === "1" || params.profile === "true";

  return (
    <DashboardShell
      member={candidate.member}
      signals={candidate.signals}
      missions={candidate.missions}
      cohort={curriculum.cohort}
      profile={profile}
      modules={curriculum.modules}
      curriculumDays={curriculum.days}
      interviewResult={interviewResult ?? null}
      initialView={openProfile ? "profile" : "overview"}
    />
  );
}
