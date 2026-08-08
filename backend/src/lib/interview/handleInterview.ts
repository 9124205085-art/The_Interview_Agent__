import type { CandidateRecord } from "../../types/candidate";
import type { CurriculumDay, CurriculumModule } from "../../types/candidate";
import type {
  InterviewProctoringCounts,
  InterviewScoreBreakdown,
  InterviewTurnResponse,
} from "../../types/interview";
import {
  briefAcknowledgment,
  buildFinalFeedback,
  personalizeQuestion,
  scoreInterviewAnswer,
} from "./llm";
import {
  buildInterviewQuestions,
  canStartInterview,
  getCompletedCurriculumDays,
  pickInterviewDays,
  TOTAL_QUESTIONS,
} from "./planInterview";
import { computeFinalScore } from "./scoring";
import { saveInterviewResult } from "../interviewResults";
import {
  createSession,
  getSession,
  recordAnswer,
} from "./sessionStore";

function normalizeProctoring(
  input?: InterviewProctoringCounts,
): InterviewProctoringCounts {
  return {
    tab: Math.max(0, Math.floor(input?.tab ?? 0)),
    paste: Math.max(0, Math.floor(input?.paste ?? 0)),
    webcam_covered: Math.max(0, Math.floor(input?.webcam_covered ?? 0)),
    esc: Math.max(0, Math.floor(input?.esc ?? 0)),
  };
}

function attachTopicResults(
  session: NonNullable<ReturnType<typeof getSession>>,
  breakdown: InterviewScoreBreakdown,
): InterviewScoreBreakdown {
  const topicResults = session.questions.map((q, i) => ({
    questionNumber: i + 1,
    moduleTitle: q.moduleTitle,
    day: q.day,
    dayTitle: q.dayTitle,
    composite: session.answerScores[i]?.composite ?? 0,
    marks: breakdown.questionMarks[i]?.marks ?? 0,
  }));
  return { ...breakdown, topicResults };
}

async function finalizeSession(
  session: NonNullable<ReturnType<typeof getSession>>,
  proctoring: InterviewProctoringCounts,
): Promise<InterviewTurnResponse> {
  const qa = session.answers.map((a, i) => ({
    question: session.questions[i]?.text ?? "",
    answer: a.text,
  }));
  const scoreBreakdown = attachTopicResults(
    session,
    computeFinalScore(
      session.answerScores,
      proctoring,
      TOTAL_QUESTIONS,
    ),
  );
  const feedbackBase = await buildFinalFeedback(
    session.candidate.member.name,
    session.candidate.member.jobRole,
    qa,
  );
  saveInterviewResult(session.candidate.member.id, scoreBreakdown);
  const feedback = {
    ...feedbackBase,
    score: scoreBreakdown,
  };
  return {
    reply: `Interview completed. Your final score is ${scoreBreakdown.finalScore}/100 (performance ${scoreBreakdown.performanceRaw}, integrity penalty −${scoreBreakdown.integrityPenalty}). ${feedbackBase.summary}`,
    done: true,
    feedback,
    questionIndex: session.answerScores.length,
    totalQuestions: TOTAL_QUESTIONS,
  };
}

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
  proctoring?: InterviewProctoringCounts,
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

  const questionScore = await scoreInterviewAnswer(
    answeredQuestion.id,
    answeredQuestion.text,
    message,
    session.candidate.member.jobRole,
  );
  session.answerScores.push(questionScore);

  const ack = await briefAcknowledgment(
    answeredQuestion.text,
    message,
    session.candidate.member.name,
  );

  recordAnswer(session, message);

  const proctoringNorm = normalizeProctoring(proctoring);

  if (session.done) {
    const finalized = await finalizeSession(session, proctoringNorm);
    return {
      ...finalized,
      reply: `${ack}\n\nQuestion score: ${questionScore.composite}/100 (accuracy ${questionScore.accuracy}, depth ${questionScore.depth}, context ${questionScore.context}).\n\n${finalized.reply}`,
      questionScore,
    };
  }

  const next = session.questions[session.answerIndex];
  const idx = session.answerIndex + 1;
  const reply = `${ack}\n\nQuestion score: ${questionScore.composite}/100 (accuracy ${questionScore.accuracy}, depth ${questionScore.depth}, context ${questionScore.context}).\n\nQuestion ${idx} of ${TOTAL_QUESTIONS} (Module: ${next.moduleTitle}, Day ${next.day}):\n${next.text}`;

  return {
    reply,
    done: false,
    questionIndex: idx,
    totalQuestions: TOTAL_QUESTIONS,
    currentQuestion: next.text,
    questionScore,
  };
}

export async function finishInterviewEarly(
  sessionId: string,
  proctoring?: InterviewProctoringCounts,
): Promise<InterviewTurnResponse | { error: string; status: number }> {
  const session = getSession(sessionId);
  if (!session) {
    return { error: "Unknown session. Start a new interview.", status: 404 };
  }
  if (session.done) {
    return { error: "Interview already completed.", status: 400 };
  }
  session.done = true;
  const proctoringNorm = normalizeProctoring(proctoring);
  if (session.answerScores.length === 0) {
    const emptyBreakdown = computeFinalScore([], proctoringNorm, TOTAL_QUESTIONS);
    saveInterviewResult(session.candidate.member.id, emptyBreakdown);
    return {
      reply:
        "Interview ended with no scored answers. Final score: 0/100. Complete all eight questions on your next attempt for a full mark.",
      done: true,
      feedback: {
        summary: `${session.candidate.member.name} ended the session before submitting answers.`,
        strengths: [],
        gaps: ["Complete the full eight-question interview for an accurate score."],
        next: ["Review module tasks and retry when ready."],
        score: emptyBreakdown,
      },
      questionIndex: 0,
      totalQuestions: TOTAL_QUESTIONS,
    };
  }
  return finalizeSession(session, proctoringNorm);
}
