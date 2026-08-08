import { requireCandidate } from "@/lib/requireCandidate";
import { getCurriculum } from "@/lib/data";
import { buildCandidateProfile } from "@/lib/candidateProfile";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardPage() {
  const candidate = await requireCandidate();
  const curriculum = getCurriculum();
  const profile = buildCandidateProfile(candidate);

  return (
    <DashboardShell
      member={candidate.member}
      signals={candidate.signals}
      missions={candidate.missions}
      cohort={curriculum.cohort}
      profile={profile}
      modules={curriculum.modules}
      curriculumDays={curriculum.days}
    />
  );
}
