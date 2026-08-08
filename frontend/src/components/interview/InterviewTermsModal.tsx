"use client";

import { useEffect, useState } from "react";
import { btnPrimaryMd } from "@/lib/ui";

const TERMS = [
  {
    id: "tab",
    title: "Tab, focus & full screen",
    label:
      "Tab switching is monitored. Do not press ESC or leave full-screen during the test — each incident adds −10 to your integrity score.",
  },
  {
    id: "clipboard",
    title: "Copy, cut & paste",
    label:
      "Copy, cut, and paste are disabled. You must type or speak answers yourself.",
  },
  {
    id: "gaze",
    title: "Gaze monitoring",
    label:
      "Gaze and attention monitoring is enabled via your webcam — stay facing the screen.",
  },
  {
    id: "webcam",
    title: "Webcam required",
    label:
      "Your webcam must stay on and uncovered for the entire test. Covering the camera is not allowed.",
  },
  {
    id: "phone",
    title: "No secondary devices",
    label:
      "Using a mobile phone during the test is prohibited. The webcam checks for a phone in frame.",
  },
] as const;

function TermIcon({ id }: { id: (typeof TERMS)[number]["id"] }) {
  const className = "h-5 w-5 shrink-0 text-indigo-600";
  switch (id) {
    case "tab":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
        </svg>
      );
    case "clipboard":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "gaze":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      );
    case "webcam":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    case "phone":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    default:
      return null;
  }
}

type InterviewTermsModalProps = {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  loading?: boolean;
  error?: string | null;
};

export function InterviewTermsModal({
  open,
  onClose,
  onAccept,
  loading,
  error,
}: InterviewTermsModalProps) {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) setAccepted({});
  }, [open]);

  if (!open) return null;

  const acceptedCount = TERMS.filter((t) => accepted[t.id]).length;
  const allChecked = acceptedCount === TERMS.length;
  const progress = (acceptedCount / TERMS.length) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="flex max-h-[min(90vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/15"
        role="dialog"
        aria-labelledby="terms-title"
        aria-modal="true"
      >
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-brand text-white shadow-md shadow-black/20">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="terms-title" className="text-xl font-semibold tracking-tight text-slate-900">
                Interview terms & proctoring
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Confirm each policy below. Your session is recorded for integrity and fair assessment.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Acknowledgements</span>
              <span className="tabular-nums text-slate-700">
                {acceptedCount} of {TERMS.length}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-none bg-brand transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-4">
          {TERMS.map((term) => {
            const checked = Boolean(accepted[term.id]);
            return (
              <li key={term.id}>
                <label
                  className={`group flex cursor-pointer gap-3 rounded-xl border p-3.5 transition ${
                    checked
                      ? "border-indigo-200 bg-indigo-50/60 ring-1 ring-indigo-100"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                      checked
                        ? "border-brand bg-brand text-white"
                        : "border-slate-300 bg-white group-hover:border-slate-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={(e) =>
                        setAccepted((prev) => ({
                          ...prev,
                          [term.id]: e.target.checked,
                        }))
                      }
                    />
                    {checked ? (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : null}
                  </span>
                  <div className="flex min-w-0 gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200/80">
                      <TermIcon id={term.id} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{term.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{term.label}</p>
                    </div>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>

        {error ? (
          <p className="mx-6 mb-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-none border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!allChecked || loading}
            onClick={onAccept}
            className={`${btnPrimaryMd} shadow-md shadow-black/15 disabled:shadow-none`}
          >
            {loading ? "Starting session…" : "Start proctored test"}
          </button>
        </div>
      </div>
    </div>
  );
}
