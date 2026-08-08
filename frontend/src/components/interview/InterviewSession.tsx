"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import type { CandidateRecord, CurriculumDay } from "@backend/types/candidate";
import type { InterviewFeedback, InterviewTurnResponse } from "@backend/types/interview";
import { countProctoringViolations } from "@backend/lib/interview/scoring";
import {
  canStartInterview,
  getCompletedCurriculumDays,
  TOTAL_QUESTIONS,
} from "@backend/lib/interview/planInterview";
import { useSpeech } from "@/hooks/useSpeech";
import { useProctoring } from "@/hooks/useProctoring";
import { InterviewTermsModal } from "@/components/interview/InterviewTermsModal";

type ChatMessage = {
  id: string;
  role: "ai" | "candidate";
  text: string;
};

type InterviewSessionProps = {
  candidate: CandidateRecord;
  curriculumDays: CurriculumDay[];
};

function newSessionId(): string {
  return crypto.randomUUID();
}

async function enterExamFullscreen(): Promise<void> {
  try {
    await document.documentElement.requestFullscreen();
  } catch {
    /* fixed UI still used if fullscreen denied */
  }
}

function exitExamFullscreen(): void {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

function extractCurrentQuestionText(aiReply: string): string | null {
  const match = aiReply.match(
    /Question \d+ of \d+[^:]*:\s*([\s\S]+)$/i,
  );
  if (match?.[1]) return match[1].trim();
  const lines = aiReply.split("\n").filter(Boolean);
  return lines.length > 0 ? lines[lines.length - 1] : null;
}

export function InterviewSession({
  candidate,
  curriculumDays,
}: InterviewSessionProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [proctoring, setProctoring] = useState(false);
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [lastQuestionScore, setLastQuestionScore] = useState<number | null>(null);
  const draftRef = useRef("");
  const router = useRouter();

  const {
    listening,
    speechSupported,
    voiceSupported,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
  } = useSpeech();

  const {
    videoRef,
    violations,
    cameraReady,
    cameraError,
    liveStatus,
    startCamera,
    stopCamera,
    bindVideoStream,
  } = useProctoring({ enabled: proctoring });

  const proctoringPayload = useCallback(
    () => countProctoringViolations(violations),
    [violations],
  );

  const completedDays = useMemo(
    () => getCompletedCurriculumDays(candidate.missions, curriculumDays),
    [candidate.missions, curriculumDays],
  );

  const gate = useMemo(() => canStartInterview(completedDays), [completedDays]);

  const latestAiText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "ai") return messages[i].text;
    }
    return "";
  }, [messages]);

  const currentQuestionText = useMemo(
    () => extractCurrentQuestionText(latestAiText),
    [latestAiText],
  );

  useEffect(() => {
    return () => exitExamFullscreen();
  }, []);

  const inExamRoom = active || done;

  const pushMessage = useCallback((role: ChatMessage["role"], text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${role}-${prev.length}-${Date.now()}`, role, text },
    ]);
  }, []);

  const handleAiReply = useCallback(
    (data: InterviewTurnResponse) => {
      pushMessage("ai", data.reply);
      if (autoSpeak && voiceSupported) {
        const toSpeak =
          data.currentQuestion ?? data.reply.split("\n").slice(-3).join(" ");
        speak(toSpeak);
      }
      if (data.questionIndex) setQuestionIndex(data.questionIndex);
      if (data.questionScore) {
        setLastQuestionScore(data.questionScore.composite);
      }
      if (data.done) {
        setDone(true);
        setActive(false);
        setProctoring(false);
        stopCamera();
        exitExamFullscreen();
        if (data.feedback) {
          setFeedback(data.feedback);
          if (data.feedback.score) {
            router.refresh();
            router.push("/dashboard?profile=1");
          }
        }
      }
    },
    [autoSpeak, pushMessage, router, speak, stopCamera, voiceSupported],
  );

  async function beginTestAfterTerms() {
    setError(null);
    setFeedback(null);
    setLastQuestionScore(null);
    setDone(false);
    setMessages([]);
    setLoading(true);

    flushSync(() => {
      setTermsOpen(false);
      setActive(true);
      setProctoring(true);
    });

    const cameraStarted = await startCamera();
    if (!cameraStarted) {
      setLoading(false);
      setActive(false);
      setProctoring(false);
      setError(
        "Webcam access is required. Allow camera permission in your browser, then try again.",
      );
      setTermsOpen(true);
      return;
    }

    for (let i = 0; i < 15; i += 1) {
      const bound = await bindVideoStream();
      if (bound) break;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    }

    await enterExamFullscreen();

    const id = newSessionId();
    setSessionId(id);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id, candidate }),
      });
      const data = (await res.json()) as InterviewTurnResponse & {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not start interview");
        setSessionId(null);
        setActive(false);
        setProctoring(false);
        exitExamFullscreen();
        stopCamera();
        setTermsOpen(true);
        return;
      }
      handleAiReply(data);
    } catch {
      setError("Network error while starting interview.");
      setSessionId(null);
      setActive(false);
      setProctoring(false);
      exitExamFullscreen();
      stopCamera();
      setTermsOpen(true);
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(text: string) {
    if (!sessionId || !text.trim() || loading || done) return;
    const answer = text.trim();
    pushMessage("candidate", answer);
    setInput("");
    draftRef.current = "";
    setLoading(true);
    stopListening();

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: answer,
          proctoring: proctoringPayload(),
        }),
      });
      const data = (await res.json()) as InterviewTurnResponse & {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Failed to send answer");
        return;
      }
      handleAiReply(data);
    } catch {
      setError("Network error while sending your answer.");
    } finally {
      setLoading(false);
    }
  }

  function toggleMic() {
    if (listening) {
      stopListening();
      if (draftRef.current.trim()) {
        setInput((prev) => `${prev} ${draftRef.current}`.trim());
      }
      return;
    }
    draftRef.current = "";
    startListening((transcript, isFinal) => {
      if (isFinal) {
        draftRef.current = `${draftRef.current} ${transcript}`.trim();
        setInput(draftRef.current);
      } else {
        setInput(`${draftRef.current} ${transcript}`.trim());
      }
    });
  }

  function resetForNewSession() {
    setProctoring(false);
    setActive(false);
    exitExamFullscreen();
    setDone(false);
    setSessionId(null);
    setMessages([]);
    setFeedback(null);
    setLastQuestionScore(null);
    setQuestionIndex(0);
    setInput("");
    stopListening();
    stopSpeaking();
    stopCamera();
  }

  async function endInterview() {
    if (
      !window.confirm(
        "End this interview now? Proctoring will stop and remaining questions will be skipped.",
      )
    ) {
      return;
    }
    stopListening();
    stopSpeaking();
    const counts = proctoringPayload();
    setProctoring(false);
    setActive(false);
    stopCamera();
    exitExamFullscreen();
    setLoading(true);

    if (sessionId) {
      try {
        const res = await fetch("/api/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            action: "finish",
            proctoring: counts,
          }),
        });
        const data = (await res.json()) as InterviewTurnResponse & {
          error?: string;
        };
        if (res.ok) {
          handleAiReply(data);
          setSessionId(null);
          setInput("");
          setActive(false);
          setLoading(false);
          if (data.feedback?.score) {
            router.refresh();
            router.push("/dashboard?profile=1");
          }
          return;
        }
      } catch {
        /* fall through to local summary */
      }
    }

    setLoading(false);
    setActive(false);
    setDone(true);
    setSessionId(null);
    setInput("");
    pushMessage(
      "ai",
      "Interview ended. Thank you for your time. You may review the summary below or start a new session later.",
    );
    setFeedback({
      summary: `${candidate.member.name} ended the interview early (question ${Math.min(questionIndex, TOTAL_QUESTIONS)} of ${TOTAL_QUESTIONS}).`,
      strengths: [
        "Engaged with the proctored AI interview format.",
        "Completed answers submitted before ending the session.",
      ],
      gaps: [
        "Full eight-question coverage was not completed in this attempt.",
      ],
      next: [
        "Start a new session when ready to complete all module-based questions.",
        "Review module daily tasks before your next attempt.",
      ],
    });
  }

  return (
    <section className="flex flex-col gap-4" data-proctor={proctoring ? "on" : "off"}>
      <InterviewTermsModal
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAccept={() => void beginTestAfterTerms()}
        loading={loading}
        error={termsOpen ? error : null}
      />

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50 sm:p-8">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            AI interview session
          </h2>
          <p className="mt-2 text-base leading-relaxed text-slate-600">
            {TOTAL_QUESTIONS} personalized questions drawn from your completed cohort
            days. This is a proctored session with webcam monitoring, tab focus checks,
            and voice or typed responses.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              {completedDays.length} days completed
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              Voice input: {speechSupported ? "enabled" : "limited"}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              AI read-aloud: {voiceSupported ? "enabled" : "off"}
            </span>
          </div>
        </div>

        {!active && !done ? (
          <div className="mt-8 border-t border-slate-100 pt-6">
            {!gate.ok ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
                {gate.message}
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-relaxed text-slate-600">
                  When you are in a quiet space with a working webcam, review the
                  proctoring terms and begin your session.
                </p>
                <button
                  type="button"
                  onClick={() => setTermsOpen(true)}
                  className="shrink-0 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-500"
                >
                  Start interview
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {error && !inExamRoom ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {inExamRoom ? (
        <div className="fixed inset-0 z-[200] flex flex-col bg-slate-100">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                Proctored exam · full screen
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {candidate.member.name}{" "}
                <span className="font-normal text-slate-500">
                  · {candidate.member.id}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Q {Math.min(questionIndex, TOTAL_QUESTIONS)}/{TOTAL_QUESTIONS}
              </span>
              {!done ? (
                <button
                  type="button"
                  onClick={endInterview}
                  disabled={loading}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  End interview
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            {/* Left: session info + webcam bottom */}
            <div className="flex min-h-0 w-full shrink-0 flex-col border-b border-slate-200 bg-white lg:w-[min(420px,38vw)] lg:border-b-0 lg:border-r">
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                <h2 className="text-lg font-semibold text-slate-900">
                  Session information
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {TOTAL_QUESTIONS} questions from {completedDays.length} completed
                  cohort days · voice or text answers.
                </p>

                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-400">
                      Role
                    </dt>
                    <dd className="font-medium text-slate-900">
                      {candidate.member.jobRole}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-400">
                      Progress
                    </dt>
                    <dd className="font-medium text-slate-900">
                      Question {Math.min(questionIndex, TOTAL_QUESTIONS)} of{" "}
                      {TOTAL_QUESTIONS}
                      {lastQuestionScore !== null ? (
                        <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                          Last: {lastQuestionScore}/100
                        </span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-slate-400">
                      Proctor status
                    </dt>
                    <dd className="font-medium text-slate-900">{liveStatus}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                    Voice: {speechSupported ? "on" : "limited"}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                    Read-aloud: {voiceSupported ? "on" : "off"}
                  </span>
                </div>

                <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={autoSpeak}
                    onChange={(e) => setAutoSpeak(e.target.checked)}
                  />
                  AI read-aloud for questions
                </label>

                {cameraError ? (
                  <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {cameraError}
                  </p>
                ) : null}

                {error ? (
                  <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                  </p>
                ) : null}

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Proctor alerts
                  </p>
                  {violations.length > 0 ? (
                    <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                      {violations.slice(0, 8).map((v) => (
                        <li key={v.id}>{v.message}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-emerald-600">
                      No proctor flags yet.
                    </p>
                  )}
                </div>

                <p className="mt-4 text-xs leading-relaxed text-slate-500">
                  Keep your face visible. Tab switches, paste, ESC / leaving
                  full-screen (−10 each), and covering the camera are monitored.
                </p>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                  Webcam
                </p>
                <div className="overflow-hidden rounded-xl border border-slate-300 bg-slate-900 shadow-inner">
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="aspect-video w-full max-h-48 object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Right: questions & answers */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50">
              {currentQuestionText && !done ? (
                <div className="shrink-0 border-b border-indigo-100 bg-indigo-50/80 px-4 py-4 sm:px-6">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                    Current question
                  </p>
                  <p className="mt-2 text-base font-medium leading-relaxed text-slate-900">
                    {currentQuestionText}
                  </p>
                  {voiceSupported ? (
                    <button
                      type="button"
                      onClick={() => speak(currentQuestionText)}
                      className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Play question voice
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "candidate" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[95%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap select-none ${
                        msg.role === "ai"
                          ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/80"
                          : "bg-indigo-600 text-white"
                      }`}
                      onCopy={(e) => e.preventDefault()}
                    >
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                        {msg.role === "ai" ? "AI interviewer" : "You"}
                      </p>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {loading ? (
                  <p className="text-sm text-slate-400">AI is thinking…</p>
                ) : null}
              </div>

              {feedback ? (
                <div className="shrink-0 border-t border-emerald-200 bg-emerald-50/80 px-4 py-4 text-sm sm:px-6">
                  {feedback.score ? (
                    <p className="mb-2 text-lg font-bold text-emerald-900">
                      Final mark: {feedback.score.finalScore}/100
                    </p>
                  ) : null}
                  <p>{feedback.summary}</p>
                </div>
              ) : null}

              {!done ? (
                <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onPaste={(e) => e.preventDefault()}
                    onCopy={(e) => e.preventDefault()}
                    onCut={(e) => e.preventDefault()}
                    rows={4}
                    placeholder="Type or dictate your answer (paste disabled)…"
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                    disabled={loading || !cameraReady}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => submitAnswer(input)}
                      disabled={loading || !input.trim() || !cameraReady}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                    >
                      Send answer
                    </button>
                    <button
                      type="button"
                      onClick={toggleMic}
                      disabled={!speechSupported || loading}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                        listening
                          ? "border-red-300 bg-red-50 text-red-700"
                          : "border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {listening ? "Stop mic" : "Voice input"}
                    </button>
                    <button
                      type="button"
                      onClick={stopSpeaking}
                      disabled={!voiceSupported}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Stop AI voice
                    </button>
                  </div>
                </div>
              ) : (
                <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
                  <button
                    type="button"
                    onClick={() => {
                      resetForNewSession();
                      setTermsOpen(true);
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Start new session
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
