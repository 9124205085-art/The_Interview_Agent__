# Documentation

Project requirements and API contracts for the AI Technical Interviewer.

| File | Description |
|------|-------------|
| [technical-spec.md](./technical-spec.md) | Official `POST /api/interview` flow, request/response shapes, and feedback format |

## Implementation

The Next.js app implements this contract in:

- `src/app/api/interview/route.ts` — HTTP endpoint
- `src/lib/interview/` — session planning, questions, optional LLM personalization

For local setup and routes, see the [root README](../README.md).
