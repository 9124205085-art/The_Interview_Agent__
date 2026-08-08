import type { CandidateMission } from "@/types/candidate";
import type { CurriculumDay, CurriculumModule } from "@/types/candidate";

export type DayTaskStatus = "completed" | "skipped" | "pending";

export function getDayTaskStatus(
  day: number,
  missions: CandidateMission[],
): DayTaskStatus {
  const mission = missions.find((m) => m.day === day);
  if (!mission) return "pending";
  if (mission.skipped) return "skipped";
  if (mission.passed) return "completed";
  return "pending";
}

export function getModuleDays(
  module: CurriculumModule,
  curriculumDays: CurriculumDay[],
): CurriculumDay[] {
  const [start, end] = module.days;
  return curriculumDays
    .filter((d) => d.day >= start && d.day <= end)
    .sort((a, b) => a.day - b.day);
}

export function countModuleCompleted(
  module: CurriculumModule,
  curriculumDays: CurriculumDay[],
  missions: CandidateMission[],
): { completed: number; total: number } {
  const days = getModuleDays(module, curriculumDays);
  const completed = days.filter(
    (d) => getDayTaskStatus(d.day, missions) === "completed",
  ).length;
  return { completed, total: days.length };
}
