import type { CurriculumDay } from "../../types/candidate";
import type { InterviewSession } from "./sessionStore";
import {
  followUpFallbackTemplate,
  isFollowUpQuestion,
} from "./planInterview";
import { generateFollowUpQuestion } from "./llm";

/** Ensures follow-up questions (Q2 per day) are generated from the prior answer. */
export async function materializeFollowUpQuestion(
  session: InterviewSession,
  questionIndex: number,
  interviewDays: CurriculumDay[],
): Promise<string> {
  const question = session.questions[questionIndex];
  if (!question) return "";

  if (!isFollowUpQuestion(question) || question.text.trim().length > 0) {
    return question.text;
  }

  const prevIndex = questionIndex - 1;
  const previousQuestion = session.questions[prevIndex]?.text ?? "";
  const previousAnswer = session.answers[prevIndex]?.text ?? "";

  const dayMeta =
    interviewDays.find((d) => d.day === question.day) ??
    ({
      day: question.day,
      title: question.dayTitle,
      type: "BUILD",
    } as CurriculumDay);

  const member = session.candidate.member;
  const fallback = followUpFallbackTemplate(
    dayMeta,
    member,
    previousQuestion,
    previousAnswer,
  );

  const generated = await generateFollowUpQuestion({
    candidateName: member.name,
    jobRole: member.jobRole,
    day: question.day,
    dayTitle: question.dayTitle,
    moduleTitle: question.moduleTitle,
    objectives: dayMeta.objectives,
    tools: dayMeta.tools,
    previousQuestion,
    previousAnswer,
    fallback,
  });

  session.questions[questionIndex] = {
    ...question,
    text: generated,
    followUpPending: false,
  };

  return generated;
}
