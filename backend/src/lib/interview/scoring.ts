import type {
  InterviewProctoringCounts,
  InterviewQuestionScore,
  InterviewScoreBreakdown,
} from "../../types/interview";

export function countProctoringViolations(
  violations: { type: string }[],
): InterviewProctoringCounts {
  let tab = 0;
  let paste = 0;
  let webcam_covered = 0;
  let esc = 0;
  for (const v of violations) {
    if (v.type === "tab_switch") tab += 1;
    else if (v.type === "copy_paste") paste += 1;
    else if (v.type === "fullscreen_exit") esc += 1;
    else if (
      v.type === "camera_covered" ||
      v.type === "gaze" ||
      v.type === "camera_off" ||
      v.type === "phone_detected"
    ) {
      webcam_covered += 1;
    }
  }
  return { tab, paste, webcam_covered, esc };
}

/** P_integrity = (N_tab × 10) + (N_paste × 15) + (N_webcam × 5) + (N_esc × 10) */
export function computeIntegrityPenalty(
  counts: InterviewProctoringCounts,
): number {
  return (
    counts.tab * 10 +
    counts.paste * 15 +
    counts.webcam_covered * 5 +
    (counts.esc ?? 0) * 10
  );
}

function average(dim: keyof Pick<InterviewQuestionScore, "accuracy" | "depth" | "context">, scores: InterviewQuestionScore[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((s, q) => s + q[dim], 0);
  return sum / scores.length;
}

/**
 * S_final = max(0, (0.40·S_accuracy + 0.40·S_depth + 0.20·S_context) − P_integrity)
 * Component scores are 0–100 averages across answered questions.
 */
export function computeFinalScore(
  questionScores: InterviewQuestionScore[],
  proctoring: InterviewProctoringCounts,
  totalQuestions: number,
): InterviewScoreBreakdown {
  const sAccuracy = average("accuracy", questionScores);
  const sDepth = average("depth", questionScores);
  const sContext = average("context", questionScores);
  const performanceRaw =
    0.4 * sAccuracy + 0.4 * sDepth + 0.2 * sContext;
  const integrityPenalty = computeIntegrityPenalty(proctoring);
  const finalScore = Math.max(0, Math.round(performanceRaw - integrityPenalty));

  const perQuestionMax = 100 / totalQuestions;
  const questionMarks = questionScores.map((q) => ({
    questionId: q.questionId,
    marks: Math.round(
      ((q.accuracy + q.depth + q.context) / 3 / 100) * perQuestionMax,
    ),
  }));

  return {
    finalScore,
    performanceRaw: Math.round(performanceRaw * 10) / 10,
    sAccuracy: Math.round(sAccuracy * 10) / 10,
    sDepth: Math.round(sDepth * 10) / 10,
    sContext: Math.round(sContext * 10) / 10,
    integrityPenalty,
    proctoring,
    questionsAnswered: questionScores.length,
    totalQuestions,
    questionMarks,
    questionScores,
  };
}
