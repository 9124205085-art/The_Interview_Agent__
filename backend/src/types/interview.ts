export type InterviewQuestion = {
  id: string;
  day: number;
  dayTitle: string;
  moduleTitle: string;
  text: string;
};

export type InterviewFeedback = {
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
  score?: InterviewScoreBreakdown;
};

export type InterviewProctoringCounts = {
  tab: number;
  paste: number;
  webcam_covered: number;
  /** ESC or leaving full-screen during the exam */
  esc: number;
};

export type InterviewQuestionScore = {
  questionId: string;
  accuracy: number;
  depth: number;
  context: number;
  /** Average of accuracy, depth, context (0–100) for this answer */
  composite: number;
};

export type InterviewTopicRow = {
  questionNumber: number;
  moduleTitle: string;
  day: number;
  dayTitle: string;
  /** Points toward 100 for this question */
  marks: number;
  /** Answer quality 0–100 */
  composite: number;
};

export type InterviewScoreBreakdown = {
  /** S_final out of 100 */
  finalScore: number;
  performanceRaw: number;
  sAccuracy: number;
  sDepth: number;
  sContext: number;
  integrityPenalty: number;
  proctoring: InterviewProctoringCounts;
  questionsAnswered: number;
  totalQuestions: number;
  questionMarks: { questionId: string; marks: number }[];
  questionScores: InterviewQuestionScore[];
  /** Module / day topic per interview question */
  topicResults?: InterviewTopicRow[];
};

export type InterviewTurnResponse = {
  reply: string;
  done: boolean;
  feedback?: InterviewFeedback;
  questionIndex?: number;
  totalQuestions?: number;
  currentQuestion?: string;
  /** Scores for the answer just submitted */
  questionScore?: InterviewQuestionScore;
};
