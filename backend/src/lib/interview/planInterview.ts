import type { CandidateMember, CandidateMission } from "../../types/candidate";
import type { CurriculumDay, CurriculumModule } from "../../types/candidate";
import type { InterviewQuestion } from "../../types/interview";

const TOTAL_DAYS = 4;
const QUESTIONS_PER_DAY = 2;
export const TOTAL_QUESTIONS = TOTAL_DAYS * QUESTIONS_PER_DAY;

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getCompletedCurriculumDays(
  missions: CandidateMission[],
  curriculumDays: CurriculumDay[],
): CurriculumDay[] {
  const passed = missions.filter((m) => m.passed && !m.skipped);
  const byDay = new Map<number, CurriculumDay>();

  for (const mission of passed) {
    const fromCurriculum = curriculumDays.find((d) => d.day === mission.day);
    byDay.set(
      mission.day,
      fromCurriculum ?? {
        day: mission.day,
        title: mission.title,
        type: "BUILD",
      },
    );
  }

  return [...byDay.values()].sort((a, b) => a.day - b.day);
}

export function pickInterviewDays(
  completedDays: CurriculumDay[],
  candidateId: string,
): CurriculumDay[] {
  if (completedDays.length === 0) return [];
  if (completedDays.length <= TOTAL_DAYS) return completedDays;

  const seed = hashSeed(candidateId);
  const picked: CurriculumDay[] = [];
  const used = new Set<number>();
  const stride = Math.max(1, Math.floor(completedDays.length / TOTAL_DAYS));

  for (let i = 0; i < TOTAL_DAYS; i += 1) {
    let idx = (seed + i * stride) % completedDays.length;
    while (used.has(idx) && used.size < completedDays.length) {
      idx = (idx + 1) % completedDays.length;
    }
    used.add(idx);
    picked.push(completedDays[idx]);
  }

  return picked.sort((a, b) => a.day - b.day);
}

function moduleForDay(
  dayNum: number,
  modules: CurriculumModule[],
): CurriculumModule | undefined {
  return modules.find((m) => {
    const [start, end] = m.days;
    return dayNum >= start && dayNum <= end;
  });
}

export function followUpFallbackTemplate(
  day: CurriculumDay,
  member: CandidateMember,
  previousQuestion: string,
  previousAnswer: string,
): string {
  const snippet = previousAnswer.trim().slice(0, 100);
  const quoted =
    snippet.length > 15
      ? `"${snippet}${previousAnswer.trim().length > 100 ? "…" : ""}"`
      : "your last point";
  return `${member.name}, following up on Day ${day.day} (${day.title}): you said ${quoted} in response to my earlier question. Pick one detail from that—architecture, tooling, or evaluation—and explain how you implemented it and what trade-off you considered.`;
}

export function isFollowUpQuestion(question: InterviewQuestion): boolean {
  return question.followUpPending === true;
}

function questionTemplates(
  day: CurriculumDay,
  member: CandidateMember,
  slot: 1 | 2,
): string {
  const tools =
    day.tools && day.tools.length > 0
      ? day.tools.slice(0, 3).join(", ")
      : "the tools for that day";
  const objective =
    day.objectives?.[0] ?? "the learning objectives for that session";

  if (slot === 1) {
    return `${member.name}, as a ${member.jobRole}, walk me through Day ${day.day}: "${day.title}". How did you apply it in practice, and what outcome did you achieve?`;
  }
  return `Still on Day ${day.day} (${day.title}): you worked with ${tools}. ${member.name}, describe a concrete problem you solved related to "${objective}" and how you would explain it in a technical interview.`;
}

export async function buildInterviewQuestions(
  days: CurriculumDay[],
  modules: CurriculumModule[],
  member: CandidateMember,
  personalize?: (template: string, context: string) => Promise<string>,
): Promise<InterviewQuestion[]> {
  const questions: InterviewQuestion[] = [];
  let q = 0;

  for (const day of days) {
    const mod =
      moduleForDay(day.day, modules) ??
      ({ n: 0, title: "Cohort", days: [day.day, day.day] } as CurriculumModule);

    for (const slot of [1, 2] as const) {
      q += 1;
      if (slot === 1) {
        let text = questionTemplates(day, member, 1);
        if (personalize) {
          text = await personalize(
            text,
            `Day ${day.day} ${day.title}; candidate ${member.id} ${member.jobRole}`,
          );
        }
        questions.push({
          id: `q-${q}`,
          day: day.day,
          dayTitle: day.title,
          moduleTitle: mod.title,
          text,
          followUpPending: false,
        });
      } else {
        questions.push({
          id: `q-${q}`,
          day: day.day,
          dayTitle: day.title,
          moduleTitle: mod.title,
          text: "",
          followUpPending: true,
        });
      }
    }
  }

  return questions;
}

/** Topic metadata for each question (no LLM personalization). */
export function buildInterviewQuestionsOutline(
  days: CurriculumDay[],
  modules: CurriculumModule[],
): Pick<InterviewQuestion, "id" | "day" | "dayTitle" | "moduleTitle">[] {
  const questions: Pick<
    InterviewQuestion,
    "id" | "day" | "dayTitle" | "moduleTitle"
  >[] = [];
  let q = 0;
  for (const day of days) {
    const mod =
      moduleForDay(day.day, modules) ??
      ({ n: 0, title: "Cohort", days: [day.day, day.day] } as CurriculumModule);
    for (const _slot of [1, 2] as const) {
      q += 1;
      questions.push({
        id: `q-${q}`,
        day: day.day,
        dayTitle: day.title,
        moduleTitle: mod.title,
      });
    }
  }
  return questions;
}

export function canStartInterview(completedDays: CurriculumDay[]): {
  ok: boolean;
  message?: string;
} {
  if (completedDays.length === 0) {
    return {
      ok: false,
      message:
        "Complete at least one cohort day before starting an AI interview.",
    };
  }
  if (completedDays.length < TOTAL_DAYS) {
    return {
      ok: false,
      message: `You need at least ${TOTAL_DAYS} completed days for this session. You have ${completedDays.length}. Finish more module tasks first.`,
    };
  }
  return { ok: true };
}
