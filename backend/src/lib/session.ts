export const CANDIDATE_SESSION_COOKIE = "candidate_session";

export function normalizeCandidateId(id: string): string {
  return id.trim().toUpperCase();
}
