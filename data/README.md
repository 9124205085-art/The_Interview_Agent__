# Data (source of truth)

JSON files the app reads at runtime. Edit these to change candidates, curriculum, or cohort content without touching application code.

| File | Description |
|------|-------------|
| [candidates.json](./candidates.json) | All candidates: profile, missions (pass/skip by day), progress signals |
| [curriculum.json](./curriculum.json) | 31-day cohort: modules, daily titles, objectives, tools |

## Used by

- Login (`/api/auth/login`) — validates `member.id` in `candidates.json`
- Dashboard — stats, modules, daily tasks, profile graph
- AI interview — picks questions from **completed** days in both files

## Candidate ID examples

Sign in with IDs like `CAND-001`, `CAND-002`, … from `candidates.json`.
