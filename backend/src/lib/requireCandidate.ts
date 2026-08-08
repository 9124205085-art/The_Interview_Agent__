import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCandidateById } from "./data";
import { CANDIDATE_SESSION_COOKIE } from "./session";
import type { CandidateRecord } from "../types/candidate";

export async function requireCandidate(): Promise<CandidateRecord> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CANDIDATE_SESSION_COOKIE)?.value;

  if (!sessionId) {
    redirect("/login");
  }

  const candidate = getCandidateById(sessionId);
  if (!candidate) {
    redirect("/login");
  }

  return candidate;
}
