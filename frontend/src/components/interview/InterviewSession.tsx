"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { CandidateRecord, CurriculumDay } from "@backend/types/candidate";
import type { InterviewFeedback, InterviewTurnResponse } from "@backend/types/interview";
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
  const draftRef = useRef("");

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
  } = useProctoring({ enabled: proctoring });

  const completedDays = useMemo(
    () => getCompletedCurriculumDays(candidate.missions, curriculumDays),
    [candidate.missions, curriculumDays],
  );

  const gate = useMemo(() => canStartInterview(completedDays), [completedDays]);

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
      if (data.done) {
        setDone(true);
        setActive(false);
        setProctoring(false);
        stopCamera();
        if (data.feedback) setFeedback(data.feedback);
      }
    },
    [autoSpeak, pushMessage, speak, stopCamera, voiceSupported],
  );

  async function beginTestAfterTerms() {
    setError(null);
    setFeedback(null);
    setDone(false);
    setMessages([]);
    setLoading(true);
    setTermsOpen(false);
    setActive(true);
    setProctoring(true);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    await startCamera();
    if (!videoRef.current?.srcObject) {
      setLoading(false);
      setActive(false);
      setProctoring(false);
      setTermsOpen(true);
      return;
    }

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
        setProctoring(false);
        stopCamera();
        return;
      }
      setTermsOpen(false);
      handleAiReply(data);
    } catch {
      setError("Network error while starting interview.");
      setSessionId(null);
      setProctoring(false);
      stopCamera();
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
        body: JSON.stringify({ sessionId, message: answer }),
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
    setDone(false);
    setActive(false);
    setProctoring(false);
    setSessionId(null);
    setMessages([]);
    setFeedback(null);
    setQuestionIndex(0);
    setInput("");
    stopListening();
    stopSpeaking();
    stopCamera();
  }

  function endInterview() {
    if (
      !window.confirm(
        "End this interview now? Proctoring will stop and remaining questions will be skipped.",
      )
    ) {
      return;
    }
    stopListening();
    stopSpeaking();
    stopCamera();
    setProctoring(false);
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
        onAccept={beginTestAfterTerms}
        loading={loading}
      />

      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          AI interview session
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {TOTAL_QUESTIONS} personalized questions from 4 completed cohort days.
          Proctored session with webcam, tab monitoring, and voice + text answers.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Completed days: {completedDays.length} · Voice in:{" "}
          {speechSupported ? "yes" : "limited"} · AI voice:{" "}
          {voiceSupported ? "yes" : "off"}
        </p>
      </div>

      {!active && !done ? (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-5">
          {!gate.ok ? (
            <p className="text-sm text-amber-800">{gate.message}</p>
          ) : (
            <p className="text-sm text-slate-600">
              Ready for {candidate.member.name}. Review proctoring terms, then start
              the test with your webcam on.
            </p>
          )}
          <button
            type="button"
            disabled={!gate.ok}
            onClick={() => setTermsOpen(true)}
            className="mt-4 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start interview
          </button>
        </div>
      ) : null}

      {cameraError ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {cameraError}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {(active || done) && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
            <span>
              Question {Math.min(questionIndex, TOTAL_QUESTIONS)} /{" "}
              {TOTAL_QUESTIONS}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
              {liveStatus}
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoSpeak}
                  onChange={(e) => setAutoSpeak(e.target.checked)}
                />
                AI read-aloud
              </label>
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

          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
              <p className="text-xs text-slate-500">
                Webcam must remain visible and uncovered. Do not use a phone to scan
                questions.
              </p>
              {violations.length > 0 ? (
                <div className="max-h-36 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                  <p className="font-semibold">Proctor alerts</p>
                  <ul className="mt-1 space-y-1">
                    {violations.slice(0, 5).map((v) => (
                      <li key={v.id}>{v.message}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-emerald-600">No proctor flags yet.</p>
              )}
            </div>

            <div className="min-h-[280px] space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "candidate" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap select-none ${
                      msg.role === "ai"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "bg-indigo-600 text-white"
                    }`}
                    onCopy={(e) => e.preventDefault()}
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                      {msg.role === "ai" ? "AI interviewer" : "You"}
                    </p>
                    {msg.text}
                    {msg.role === "ai" && voiceSupported ? (
                      <button
                        type="button"
                        onClick={() => speak(msg.text)}
                        className="mt-2 block text-xs font-medium text-indigo-600 hover:underline"
                      >
                        Play voice
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              {loading ? (
                <p className="text-sm text-slate-400">AI is thinking…</p>
              ) : null}
            </div>
          </div>

          {feedback ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 text-sm text-slate-800">
              <h3 className="font-semibold text-emerald-900">Final feedback</h3>
              <p className="mt-2">{feedback.summary}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-emerald-800">
                    Strengths
                  </p>
                  <ul className="mt-1 list-disc pl-4">
                    {feedback.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-amber-800">
                    Gaps
                  </p>
                  <ul className="mt-1 list-disc pl-4">
                    {feedback.gaps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-indigo-800">
                    Next
                  </p>
                  <ul className="mt-1 list-disc pl-4">
                    {feedback.next.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {!done ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                }}
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                rows={3}
                placeholder="Type or dictate your answer (paste disabled)…"
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
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
                <button
                  type="button"
                  onClick={endInterview}
                  disabled={loading}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  End interview
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                resetForNewSession();
                setTermsOpen(true);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              Start new session
            </button>
          )}
        </div>
      )}
    </section>
  );
}
