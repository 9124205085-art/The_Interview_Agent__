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
};

export type InterviewTurnResponse = {
  reply: string;
  done: boolean;
  feedback?: InterviewFeedback;
  questionIndex?: number;
  totalQuestions?: number;
  currentQuestion?: string;
};
