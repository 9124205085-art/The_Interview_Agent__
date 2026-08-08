import { readFileSync } from "fs";
import path from "path";
import type {
  CandidateRecord,
  CandidatesFile,
  CurriculumFile,
} from "../types/candidate";
import { getRepoDataDir } from "./dataPaths";

const dataDir = getRepoDataDir();

function readJsonFile<T>(filename: string): T {
  const filePath = path.join(dataDir, filename);
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export function getAllCandidates(): CandidateRecord[] {
  const data = readJsonFile<CandidatesFile>("candidates.json");
  return data.candidates;
}

export function getCandidateById(id: string): CandidateRecord | undefined {
  const normalized = id.trim().toUpperCase();
  return getAllCandidates().find(
    (c) => c.member.id.toUpperCase() === normalized,
  );
}

export function getCurriculum(): CurriculumFile {
  return readJsonFile<CurriculumFile>("curriculum.json");
}
