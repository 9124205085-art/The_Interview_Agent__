import type { CandidateRecord } from "../../types/candidate";
import type { InterviewQuestion, InterviewFeedback } from "../../types/interview";
import type { InterviewQuestionScore } from "../../types/interview";

export type InterviewSession = {
  sessionId: string;
  candidate: CandidateRecord;
  questions: InterviewQuestion[];
  selectedDayNumbers: number[];
  answerIndex: number;
  answers: { questionId: string; text: string }[];
  answerScores: InterviewQuestionScore[];
  done: boolean;
};

const sessions = new Map<string, InterviewSession>();

export function createSession(
  sessionId: string,
  candidate: CandidateRecord,
  questions: InterviewQuestion[],
  selectedDayNumbers: number[],
): InterviewSession {
  const session: InterviewSession = {
    sessionId,
    candidate,
    questions,
    selectedDayNumbers,
    answerIndex: 0,
    answers: [],
    answerScores: [],
    done: false,
  };
  sessions.set(sessionId, session);
  return session;
}

export function getSession(sessionId: string): InterviewSession | undefined {
  return sessions.get(sessionId);
}

export function recordAnswer(
  session: InterviewSession,
  text: string,
): InterviewSession {
  const q = session.questions[session.answerIndex];
  if (q) {
    session.answers.push({ questionId: q.id, text });
  }
  session.answerIndex += 1;
  if (session.answerIndex >= session.questions.length) {
    session.done = true;
  }
  sessions.set(session.sessionId, session);
  return session;
}

export function attachFeedback(
  sessionId: string,
  _feedback: InterviewFeedback,
): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.done = true;
    sessions.set(sessionId, session);
  }
}
