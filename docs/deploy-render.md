# Deploy on Render

## Web service settings

| Field | Value |
|--------|--------|
| **Root directory** | *(repo root — leave empty)* |
| **Build command** | `npm install --prefix frontend --include=dev && npm run build` |
| **Start command** | `npm run start` |

Or connect the repo and use the included [`render.yaml`](../render.yaml) Blueprint.

## Environment variables

| Key | Required |
|-----|----------|
| `OPENAI_API_KEY` | Recommended (follow-ups, scoring, feedback) |
| `OPENAI_MODEL` | Optional (`gpt-4o-mini`) |

## Node version

`.node-version` pins **Node 20** (Render otherwise may use Node 24, which can differ from local builds).

## Troubleshooting

| Build error | Fix |
|-------------|-----|
| `Cannot find module '@tailwindcss/postcss'` | Use `--include=dev` in the install step (see build command above). |
| `Cannot find module 'next/headers'` in `backend/` | `requireCandidate` lives in `frontend/src/lib/` only — pull latest `main`. |
| Build OK but app 502 | Check **Logs**; confirm `OPENAI_API_KEY` if using vision proctoring. |
| Interview “Unknown session” | Use one Render instance; in-memory sessions do not span serverless replicas. |

After pushing to `main`, open **Manual Deploy → Deploy latest commit** if auto-deploy did not run.
