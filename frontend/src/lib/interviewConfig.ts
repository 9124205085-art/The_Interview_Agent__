/** Proctored interview must complete within this window (all 8 questions). */
export const INTERVIEW_TIME_LIMIT_SEC = 15 * 60;

export function formatInterviewTimeLeft(totalSeconds: number): string {
  const sec = Math.max(0, totalSeconds);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
