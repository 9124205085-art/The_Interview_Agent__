# Frontend

Next.js (TypeScript + Tailwind) UI: login, dashboard, modules, proctored interview.

## Run

From the **repository root**:

```bash
npm install --prefix frontend
npm run dev
```

Or from this folder: `npm install && npm run dev`

## Layout

```
frontend/src/
├── app/           pages & API route entrypoints
├── components/    dashboard, interview UI
├── hooks/         voice & webcam proctoring
└── lib/           UI-only helpers (profile graph, module task labels)
```

Server logic is imported from **`../backend/`** via the `@backend/*` alias.

## Related folders

| Folder | Purpose |
|--------|---------|
| [../data](../data/README.md) | Candidate & curriculum JSON |
| [../docs](../docs/README.md) | API specification |
| [../backend](../backend/README.md) | Shared server libraries |
