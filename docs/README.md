# Documentation

Project requirements and API contracts for the AI Technical Interviewer.

| File | Description |
|------|-------------|
| [technical-spec.md](./technical-spec.md) | Official `POST /api/interview` flow, request/response shapes, and feedback format |
| [hackathon-compliance.md](./hackathon-compliance.md) | Hackathon minimum requirements vs this repo |
| [api-demo-for-judges.md](./api-demo-for-judges.md) | Step-by-step API demo for evaluators |
| [deploy-render.md](./deploy-render.md) | Render build/start commands and troubleshooting |

## Implementation

The Next.js app implements this contract in:

- `src/app/api/interview/route.ts` — HTTP endpoint
- `src/lib/interview/` — session planning, questions, optional LLM personalization

For local setup and routes, see the [root README](../README.md).
