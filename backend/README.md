# Backend

Server-side logic for the AI Technical Interviewer: data loading, auth cookies, and the interview API.

## Layout

```
backend/src/
├── lib/
│   ├── data.ts              reads ../data/*.json
│   ├── session.ts           candidate cookie helpers
│   (auth: `frontend/src/lib/requireCandidate.ts`)
│   └── interview/           session store, questions, LLM, handlers
├── types/
│   ├── candidate.ts
│   └── interview.ts
```

## HTTP surface

Next.js route handlers live in **`frontend/src/app/api/`** and call into this folder:

| Route | Backend module |
|-------|----------------|
| `POST /api/auth/login` | `lib/data`, `lib/session` |
| `POST /api/auth/logout` | `lib/session` |
| `POST /api/interview` | `lib/interview/handleInterview` |

## Data & docs

- **[../data/README.md](../data/README.md)** — `candidates.json`, `curriculum.json`
- **[../docs/technical-spec.md](../docs/technical-spec.md)** — interview contract
