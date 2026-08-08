# AI Technical Interviewer Agent

Monorepo-style layout: **frontend** (Next.js UI), **backend** (server logic), **data**, and **docs**.

**Repository:** [https://github.com/9124205085-art/The_Interview_Agent__.git](https://github.com/9124205085-art/The_Interview_Agent__.git)

**Submission docs:** [PROMPTS.md](./PROMPTS.md) — AI prompts used to build this project.

---

## Folder map (read in this order)

| # | Folder | What it is |
|---|--------|------------|
| 1 | **[`data/`](./data/README.md)** | **Source JSON** — candidates, curriculum |
| 2 | **[`docs/`](./docs/README.md)** | **Specs** — interview API (`technical-spec.md`) |
| 3 | **[`frontend/`](./frontend/README.md)** | **UI** — pages, components, proctored interview |
| 4 | **[`backend/`](./backend/README.md)** | **Server code** — data loaders, interview engine, types |

```
The_Interview_Agent/
├── data/           ← candidates.json, curriculum.json
├── docs/           ← technical-spec.md
├── frontend/       ← Next.js app (run dev from repo root)
├── backend/        ← imported by frontend API routes
├── package.json    ← npm run dev / build (delegates to frontend)
├── PROMPTS.md      ← prompts + git link (for online submission)
└── README.md
```

---

## Run locally

```bash
npm install --prefix frontend
npm run dev
```

- Login: http://localhost:3000/login — IDs from `data/candidates.json`
- Dashboard: http://localhost:3000/dashboard
- Interview: http://localhost:3000/dashboard/interview

Optional: `frontend/.env.local` with `OPENAI_API_KEY` (see `.env.example` at repo root).

---

## Troubleshooting: “Internal Server Error” on localhost

This usually means an **old dev server** is still running from before the **frontend/** folder move. It looks for `src/app` at the repo root (which no longer exists).

1. **Stop every** `npm run dev` / Next.js terminal (**Ctrl+C**). Close extra terminals if needed.
2. From the **repo root** (`The_Interview_Agent`), start fresh:

   ```bash
   npm run dev
   ```

   That runs the app inside **`frontend/`**. You can also:

   ```bash
   cd frontend
   npm run dev
   ```

3. Open the URL shown in the terminal (often **http://localhost:3000**). If the port is busy, Next.js may use **3001** — use that link instead.
4. Do **not** run plain `next dev` at the repo root unless you are inside **`frontend/`**.

If problems persist, delete stale caches **only at the repo root** (not inside `frontend/`): remove the `.next` folder and restart `npm run dev`. Keep `frontend/node_modules` installed (`npm install --prefix frontend`).

---

## Routes

| Route | Layer |
|-------|--------|
| `/login`, `/dashboard`, `/dashboard/interview` | frontend |
| `POST /api/auth/*`, `POST /api/interview` | frontend routes → backend libs |

Contract: [docs/technical-spec.md](./docs/technical-spec.md)
