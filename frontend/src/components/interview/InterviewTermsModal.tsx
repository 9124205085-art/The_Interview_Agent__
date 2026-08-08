"use client";

import { useState } from "react";

const TERMS = [
  {
    id: "tab",
    label:
      "Tab switching is monitored. Leaving this tab or opening other windows may be flagged.",
  },
  {
    id: "clipboard",
    label:
      "Copy, cut, and paste are disabled. You must type or speak answers yourself.",
  },
  {
    id: "gaze",
    label:
      "Gaze and attention monitoring is enabled via your webcam — stay facing the screen.",
  },
  {
    id: "webcam",
    label:
      "Your webcam must stay on and uncovered for the entire test. Covering the camera is not allowed.",
  },
  {
    id: "phone",
    label:
      "Using a mobile phone to scan or photograph questions is prohibited and may be detected.",
  },
] as const;

type InterviewTermsModalProps = {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  loading?: boolean;
};

export function InterviewTermsModal({
  open,
  onClose,
  onAccept,
  loading,
}: InterviewTermsModalProps) {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});

  if (!open) return null;

  const allChecked = TERMS.every((t) => accepted[t.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
        role="dialog"
        aria-labelledby="terms-title"
      >
        <h2 id="terms-title" className="text-lg font-semibold text-slate-900">
          Interview terms & proctoring
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Read and accept each rule before starting the proctored AI interview.
        </p>

        <ul className="mt-5 space-y-3">
          {TERMS.map((term) => (
            <li key={term.id}>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(accepted[term.id])}
                  onChange={(e) =>
                    setAccepted((prev) => ({
                      ...prev,
                      [term.id]: e.target.checked,
                    }))
                  }
                />
                {term.label}
              </label>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!allChecked || loading}
            onClick={onAccept}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Starting…" : "Start test"}
          </button>
        </div>
      </div>
    </div>
  );
}
