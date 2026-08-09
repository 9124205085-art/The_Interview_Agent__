# API demo script for judges

Quick verification of the hackathon contract: **`POST /api/interview`** ([technical-spec.md](./technical-spec.md)).

**Prerequisites**

- App running: `npm run dev` from repo root (note port, often **3000** or **3001**).
- Use a candidate with **≥ 4 completed cohort days** (passed missions). Example: **`CAND-001`** in `data/candidates.json`.
- Optional: `OPENAI_API_KEY` in `frontend/.env.local` for richer wording, scoring, and feedback (heuristic fallbacks work without it).

Set your base URL:

```powershell
$BASE = "http://localhost:3000"
```

---

## 1. Load candidate JSON

From the repo root in PowerShell:

```powershell
$all = Get-Content "data\candidates.json" -Raw | ConvertFrom-Json
$candidate = $all.candidates | Where-Object { $_.member.id -eq "CAND-001" } | Select-Object -First 1
$sessionId = "judge-demo-" + [guid]::NewGuid().ToString()
```

---

## 2. Start interview

```powershell
$startBody = @{
  sessionId = $sessionId
  candidate = $candidate
} | ConvertTo-Json -Depth 20 -Compress

Invoke-RestMethod -Uri "$BASE/api/interview" -Method POST `
  -ContentType "application/json" -Body $startBody
```

**Expect:** `done: false`, `reply` with welcome + **Question 1 of 8**, `totalQuestions: 8`, questions spanning **4 curriculum days** (2 questions per day).

---

## 3. Answer turns (repeat until `done: true`)

Send at least **8 answers** to complete the interview. Example for one turn:

```powershell
$turnBody = @{
  sessionId = $sessionId
  message   = "I built a RAG pipeline using embeddings and a vector store, evaluated retrieval quality with held-out queries, and iterated on chunk size and top-k."
} | ConvertTo-Json -Compress

Invoke-RestMethod -Uri "$BASE/api/interview" -Method POST `
  -ContentType "application/json" -Body $turnBody
```

**Expect each turn:** `done: false`, `reply` with acknowledgment + next question (until the last answer).

**Loop (PowerShell):** run the turn block 8 times with different `message` text, or paste eight sample answers.

---

## 4. Final turn — structured feedback

After the **8th** answer, the same `POST` returns:

```json
{
  "done": true,
  "reply": "...",
  "feedback": {
    "summary": "...",
    "strengths": ["..."],
    "gaps": ["..."],
    "next": ["..."]
  }
}
```

This implementation may also include **`feedback.score`** (0–100 breakdown) and **`questionScore`** on turns — extra fields beyond the spec minimum.

---

## 5. curl (Git Bash / WSL / macOS)

Export candidate to a file once:

```bash
# From repo root — requires jq
jq '.candidates[] | select(.member.id=="CAND-001")' data/candidates.json > /tmp/candidate.json
SESSION="judge-demo-$(uuidgen | tr '[:upper:]' '[:lower:]')"
BASE="http://localhost:3000"

# Start
jq -n --arg sid "$SESSION" --slurpfile c /tmp/candidate.json \
  '{sessionId:$sid, candidate:$c[0]}' | \
  curl -s -X POST "$BASE/api/interview" -H "Content-Type: application/json" -d @-

# One turn
curl -s -X POST "$BASE/api/interview" -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION\",\"message\":\"Your answer here.\"}"
```

---

## 6. UI demo (optional)

| Step | URL |
|------|-----|
| Login | `/login` — enter `CAND-001` |
| Dashboard | `/dashboard` |
| Proctored interview | `/dashboard/interview` |

---

## Notes for evaluators

| Topic | Detail |
|--------|--------|
| **Auth** | API has **no auth** (per spec). UI login is optional for the demo portal. |
| **Session** | State is keyed by **`sessionId`** in server memory — keep the same ID for all turns on **one running server**. |
| **Personalization** | Questions come from the candidate’s **completed missions** and cohort **curriculum** (modules, days, tools, objectives). |
| **Follow-ups** | After each **first question of a day**, the **second question** is generated from that answer (`backend/src/lib/interview/followUp.ts`, `llm.ts`). |
| **Deployment** | Prefer a **long-running** Node host (Railway, Render, VPS). Serverless multi-instance hosts may lose in-memory sessions mid-interview. |

Contract reference: [technical-spec.md](./technical-spec.md) · Compliance summary: [hackathon-compliance.md](./hackathon-compliance.md)
