# PROMPTS.md — AI Technical Interviewer Agent

Documentation of prompts used with an AI coding assistant (Cursor) to design and implement this project. Submit this file together with the repository link below.

---

## Repository (Git)

**GitHub:** [https://github.com/9124205085-art/The_Interview_Agent__.git](https://github.com/9124205085-art/The_Interview_Agent__.git)

Clone:

```bash
git clone https://github.com/9124205085-art/The_Interview_Agent__.git
cd The_Interview_Agent__
npm install --prefix frontend
npm run dev
```

---

## Project summary

Build an **AI Technical Interviewer** web app: candidate login from JSON data, dashboard with profile/overview/modules, proctored **8-question** AI interview (voice + text), scoring out of **100** with integrity penalties, and cohort scoreboard on the profile page.

**Stack:** Next.js (frontend), TypeScript, Tailwind CSS, JSON data under `data/`, server logic under `backend/`.

---

## Prompts (in order of major features)

### 1. Dashboard navigation and modules

> In the left sidebar I need **Profile**, **Overview**, and **Modules**. If I click **Modules**, show **Module 1, Module 2**, … in the sidebar—not always expanded. Main content should match the selected view.

**Outcome:** Collapsible module list; profile / overview / modules views in `DashboardShell.tsx`.

---

### 2. Professional interview terms UI

> Make the interview terms and proctoring modal look more **professional** (clear layout, progress, icons, primary actions).

**Outcome:** Redesigned `InterviewTermsModal.tsx` and interview page header.

---

### 3. Interview scoring and profile marks

> During the AI interview the candidate answers by **text or voice**. **8 questions**, total mark **100**. After each answer assign marks; when the interview completes show the final mark on **Profile**. Use integrity penalty:
>
> - P_integrity = (N_tab × 10) + (N_paste × 15) + (N_webcam × 5)
> - S_final = max(0, 0.40·S_accuracy + 0.40·S_depth + 0.20·S_context − P_integrity)

**Outcome:** `scoring.ts`, LLM/heuristic per-question scores, `data/interview-scores.json`, profile score card, API `/api/interview/score`.

---

### 4. Profile: marks by topic and scoreboard

> Show the mark on profile **by topic** (module/day from completed cohort days). Add **View detail** for topic breakdown. Add a **scoreboard** of all participants with avatar and overall score; show **—** if they did not take the interview.

**Outcome:** `ProfileInterviewScore.tsx`, `InterviewScoreboard.tsx`, topic rows on finalize.

---

### 5. Scoreboard layout

> List all participants **vertically on the right** of the site, not in the middle. Later: show scoreboard on **Profile only**, not on Overview/Modules.

**Outcome:** Right sidebar scoreboard in `DashboardShell.tsx`, visible only when `view === "profile"`.

---

### 6. Full-screen exam after terms

> After accepting all terms, open the exam **full screen**: **information on the left**, **questions on the right**, **webcam bottom-left**.

**Outcome:** Full-screen exam layout in `InterviewSession.tsx`, browser fullscreen request, two-column UI.

---

### 7. Start test not advancing

> After checking all conditions and clicking **Start test**, the app does not move to the test page.

**Outcome:** Fixed camera/video mount timing (`flushSync`), stream binding, clearer errors on terms modal.

---

### 8. ESC / full-screen integrity penalty

> During the test the candidate must not press **ESC**; doing so should apply a **minus mark** (integrity penalty).

**Outcome:** `fullscreen_exit` violations, `esc` count in proctoring payload, −10 per incident in penalty formula; terms updated.

---

### 9. Global button styling

> Everywhere in the project, change primary buttons from purple/indigo to **dark navy** (`#0d1526`) with **sharp corners** (no border radius).

**Outcome:** `globals.css` brand tokens, `frontend/src/lib/ui.ts` (`btnPrimary`, `btnPrimaryMd`, `btnPrimaryLg`).

---

### 10. Login button contrast

> Change **Continue to dashboard** on the login page to a **lighter color** so it stands out on the dark card.

**Outcome:** Light slate button on `login/page.tsx` (sharp corners preserved).

---

## Optional environment prompt (developer)

> Set `OPENAI_API_KEY` in `frontend/.env.local` for LLM question personalization, answer scoring, and feedback (see `.env.example`).

---

## How to verify submission

| Step | Action |
|------|--------|
| 1 | Open repository link above |
| 2 | Run `npm run dev` from repo root |
| 3 | Login with e.g. `CAND-006` from `data/candidates.json` |
| 4 | Profile → interview mark & cohort scoreboard |
| 5 | Overview → **Go to interview test** → terms → proctored session |

---

## Author note

Prompts were iterated in chat; this file consolidates the **intent** of each request for academic/project submission. Implementation details live in the codebase and in [docs/technical-spec.md](./docs/technical-spec.md).
