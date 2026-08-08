import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import type { InterviewScoreBreakdown, InterviewTopicRow } from "../types/interview";
import { getRepoDataDir } from "./dataPaths";
import { getCandidateById, getCurriculum, getAllCandidates } from "./data";
import {
  buildInterviewQuestionsOutline,
  getCompletedCurriculumDays,
  pickInterviewDays,
} from "./interview/planInterview";

export type StoredInterviewResult = InterviewScoreBreakdown & {
  candidateId: string;
  completedAt: string;
};

type InterviewResultsFile = {
  results: StoredInterviewResult[];
};

const dataDir = getRepoDataDir();
const filePath = path.join(dataDir, "interview-scores.json");

function readFile(): InterviewResultsFile {
  if (!existsSync(filePath)) {
    return { results: [] };
  }
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as InterviewResultsFile;
}

function writeFile(data: InterviewResultsFile): void {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

function enrichTopicResults(
  result: StoredInterviewResult,
): StoredInterviewResult {
  if (result.topicResults && result.topicResults.length > 0) {
    return result;
  }
  const candidate = getCandidateById(result.candidateId);
  if (!candidate) return result;
  const curriculum = getCurriculum();
  const completed = getCompletedCurriculumDays(
    candidate.missions,
    curriculum.days,
  );
  const days = pickInterviewDays(completed, candidate.member.id);
  const outline = buildInterviewQuestionsOutline(days, curriculum.modules);
  const topicResults: InterviewTopicRow[] = outline.map((q, i) => ({
    questionNumber: i + 1,
    moduleTitle: q.moduleTitle,
    day: q.day,
    dayTitle: q.dayTitle,
    composite: result.questionScores[i]?.composite ?? 0,
    marks: result.questionMarks[i]?.marks ?? 0,
  }));
  return { ...result, topicResults };
}

export function getInterviewResult(
  candidateId: string,
): StoredInterviewResult | undefined {
  const normalized = candidateId.trim().toUpperCase();
  const data = readFile();
  const matches = data.results.filter(
    (r) => r.candidateId.toUpperCase() === normalized,
  );
  if (matches.length === 0) return undefined;
  const latest = matches.sort(
    (a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  )[0];
  return enrichTopicResults(latest);
}

export function saveInterviewResult(
  candidateId: string,
  breakdown: InterviewScoreBreakdown,
): StoredInterviewResult {
  const data = readFile();
  const entry: StoredInterviewResult = {
    ...breakdown,
    candidateId: candidateId.trim().toUpperCase(),
    completedAt: new Date().toISOString(),
  };
  data.results.push(entry);
  writeFile(data);
  return entry;
}

export type ScoreboardEntry = {
  candidateId: string;
  name: string;
  jobRole: string;
  finalScore: number | null;
};

export function buildInterviewScoreboard(): ScoreboardEntry[] {
  const candidates = getAllCandidates();
  const data = readFile();
  const latestById = new Map<string, StoredInterviewResult>();

  for (const r of data.results) {
    const id = r.candidateId.toUpperCase();
    const prev = latestById.get(id);
    if (
      !prev ||
      new Date(r.completedAt).getTime() > new Date(prev.completedAt).getTime()
    ) {
      latestById.set(id, r);
    }
  }

  const entries: ScoreboardEntry[] = candidates.map((c) => {
    const stored = latestById.get(c.member.id.toUpperCase());
    return {
      candidateId: c.member.id,
      name: c.member.name,
      jobRole: c.member.jobRole,
      finalScore: stored ? enrichTopicResults(stored).finalScore : null,
    };
  });

  return entries.sort((a, b) => {
    if (a.finalScore === null && b.finalScore === null) {
      return a.name.localeCompare(b.name);
    }
    if (a.finalScore === null) return 1;
    if (b.finalScore === null) return -1;
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    return a.name.localeCompare(b.name);
  });
}
