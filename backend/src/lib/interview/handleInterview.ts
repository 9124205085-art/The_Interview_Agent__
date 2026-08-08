import type { CandidateRecord } from "../../types/candidate";
import type { CurriculumDay, CurriculumModule } from "../../types/candidate";
import type { InterviewTurnResponse } from "../../types/interview";
import {
  briefAcknowledgment,
  buildFinalFeedback,
  personalizeQuestion,
} from "./llm";
import {
  buildInterviewQuestions,
  canStartInterview,
  getCompletedCurriculumDays,
  pickInterviewDays,
  TOTAL_QUESTIONS,
} from "./planInterview";
import {
  createSession,
  getSession,
  recordAnswer,
} from "./sessionStore";

export async function startInterviewSession(
  sessionId: string,
  candidate: CandidateRecord,
  curriculumDays: CurriculumDay[],
  modules: CurriculumModule[],
): Promise<InterviewTurnResponse | { error: string; status: number }> {
  const completed = getCompletedCurriculumDays(
    candidate.missions,
    curriculumDays,
  );
  const gate = canStartInterview(completed);
  if (!gate.ok) {
    return { error: gate.message ?? "Cannot start interview.", status: 400 };
  }

  const days = pickInterviewDays(completed, candidate.member.id);
  const questions = await buildInterviewQuestions(
    days,
    modules,
    candidate.member,
    personalizeQuestion,
  );

  createSession(
    sessionId,
    candidate,
    questions,
    days.map((d) => d.day),
  );

  const first = questions[0];
  const welcome = `Welcome, ${candidate.member.name}. This personalized session covers ${days.length} completed cohort days with ${TOTAL_QUESTIONS} questions. You can answer by voice or text.\n\nQuestion 1 of ${TOTAL_QUESTIONS} (Module: ${first.moduleTitle}, Day ${first.day}):\n${first.text}`;

  return {
    reply: welcome,
    done: false,
    questionIndex: 1,
    totalQuestions: TOTAL_QUESTIONS,
    currentQuestion: first.text,
  };
}

export async function continueInterviewSession(
  sessionId: string,
  message: string,
): Promise<InterviewTurnResponse | { error: string; status: number }> {
  const session = getSession(sessionId);
  if (!session) {
    return { error: "Unknown session. Start a new interview.", status: 404 };
  }
  if (session.done) {
    return { error: "Interview already completed.", status: 400 };
  }

  const answeredQuestion = session.questions[session.answerIndex];
  if (!answeredQuestion) {
    return { error: "Invalid session state.", status: 400 };
  }

  const ack = await briefAcknowledgment(
    answeredQuestion.text,
    message,
    session.candidate.member.name,
  );

  recordAnswer(session, message);

  if (session.done) {
    const qa = session.answers.map((a, i) => ({
      question: session.questions[i]?.text ?? "",
      answer: a.text,
    }));
    const feedback = await buildFinalFeedback(
      session.candidate.member.name,
      session.candidate.member.jobRole,
      qa,
    );
    return {
      reply: `${ack}\n\nInterview completed. Here is your feedback summary: ${feedback.summary}`,
      done: true,
      feedback,
      questionIndex: TOTAL_QUESTIONS,
      totalQuestions: TOTAL_QUESTIONS,
    };
  }

  const next = session.questions[session.answerIndex];
  const idx = session.answerIndex + 1;
  const reply = `${ack}\n\nQuestion ${idx} of ${TOTAL_QUESTIONS} (Module: ${next.moduleTitle}, Day ${next.day}):\n${next.text}`;

  return {
    reply,
    done: false,
    questionIndex: idx,
    totalQuestions: TOTAL_QUESTIONS,
    currentQuestion: next.text,
  };
}
