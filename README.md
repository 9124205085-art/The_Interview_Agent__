# AI Technical Interviewer Agent

Next.js app (TypeScript + Tailwind CSS) for candidate login and a personalized progress dashboard. Interview API contract is defined in [docs/technical-spec.md](docs/technical-spec.md).

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) and sign in with a candidate ID from `data/candidates.json` (e.g. `CAND-001`).

## Data files

| File | Purpose |
|------|---------|
| `data/candidates.json` | Candidate profiles, missions, and progress signals |
| `data/curriculum.json` | Cohort curriculum (shown on dashboard) |
| `docs/technical-spec.md` | `POST /api/interview` contract |

## Routes

- `/login` — candidate ID sign-in
- `/dashboard` — name, commit days, missions completed, first-try success
- `POST /api/interview` — personalized 8-question session (4 completed days × 2 questions); voice + text UI on **AI Interview**
