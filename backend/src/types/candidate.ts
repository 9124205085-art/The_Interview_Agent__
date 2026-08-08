export type CandidateMember = {
  id: string;
  name: string;
  jobRole: string;
  yearsExperience: number;
  education: string;
  status: string;
};

export type CandidateMission = {
  day: number;
  title: string;
  passed?: boolean;
  skipped?: boolean;
  attempts?: number;
};

export type CandidateSignals = {
  commitDays: number;
  missionsCompleted: number;
  missionsFirstTry: number;
};

export type CandidateRecord = {
  member: CandidateMember;
  missions: CandidateMission[];
  signals: CandidateSignals;
};

export type CandidatesFile = {
  candidates: CandidateRecord[];
};

export type CurriculumModule = {
  n: number;
  title: string;
  days: number[];
};

export type CurriculumDay = {
  day: number;
  title: string;
  type: string;
  tools?: string[];
  objectives?: string[];
};

export type CurriculumFile = {
  cohort: string;
  modules: CurriculumModule[];
  days: CurriculumDay[];
};
