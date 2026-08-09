# Hackathon compliance summary

Mapping of this repository to the **AI Interview Agent** hackathon brief and [technical-spec.md](./technical-spec.md).

---

## Minimum requirements

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Conversational technical interview | ✅ | Multi-turn `POST /api/interview` with `sessionId` |
| ≥ 8 questions, ≥ 4 curriculum days | ✅ | `TOTAL_QUESTIONS = 8`, 4 days × 2 questions (`backend/src/lib/interview/planInterview.ts`) |
| Personalized to cohort progress | ✅ | Days from passed missions; candidate-specific day selection; role/module/objectives in prompts |
| Maintain conversation context | ✅ | In-memory session per `sessionId` (`sessionStore.ts`) — Q&A and scores until `done: true` |
| Structured end feedback | ✅ | `feedback.summary`, `strengths`, `gaps`, `next` (`buildFinalFeedback` in `llm.ts`) |
| Required HTTP endpoint | ✅ | `frontend/src/app/api/interview/route.ts` — no API authentication |

---

## Challenge goals (experience)

| Goal | Status | Notes |
|------|--------|--------|
| Assess completed concepts | ✅ Strong | Questions tied to completed days and module titles |
| Follow-ups from prior responses | ✅ | **Q2 each day** generated via `generateFollowUpQuestion` after Q1 answer (LLM + answer-aware fallback) |
| Natural adaptation | ✅ | Acknowledgments + dynamic follow-ups referencing the candidate’s words |
| Actionable feedback | ✅ | With or without `OPENAI_API_KEY` |

---

## Provided resources

| Resource | Used |
|----------|------|
| Curriculum JSON | `data/curriculum.json` |
| Candidate profiles | `data/candidates.json` |
| Technical specification | `docs/technical-spec.md` |

---

## Out of scope (brief) vs this repo

| Brief says not required | This project |
|-------------------------|--------------|
| Voice | ✅ Included (Web Speech) — optional extra |
| User authentication | ✅ UI login only; **API remains open** |
| Persistent accounts | Light cookie session + `data/interview-scores.json` |
| Mobile app | Web only |

---

## Submission artifacts

| Item | Location |
|------|----------|
| Source code | GitHub (see root [README](../README.md)) |
| AI prompts log | [PROMPTS.md](../PROMPTS.md) |
| API contract | [technical-spec.md](./technical-spec.md) |
| Judge API walkthrough | [api-demo-for-judges.md](./api-demo-for-judges.md) |

---

## Evaluator quick test

1. `npm install --prefix frontend && npm run dev`
2. Follow [api-demo-for-judges.md](./api-demo-for-judges.md) with **`CAND-001`**, or use the UI at `/login` → `/dashboard/interview`.
3. Confirm **8 questions**, **4 days**, final **`done: true`** + **feedback** object.

Optional env: `OPENAI_API_KEY` in `frontend/.env.local` for LLM scoring, feedback, and vision-based phone proctoring.
