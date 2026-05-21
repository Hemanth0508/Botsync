# Fleet Reliability Intelligence Layer (FRIL) — PRD

## Architecture
- Backend: FastAPI in-memory simulation, 16 robots, 3 vendors, 6 zones, ~0.9s tick
- Endpoints: /api/sim/state, /api/sim/incidents, /api/sim/metrics, /api/sim/insights, /api/sim/reset
- Frontend: React + Tailwind + Framer Motion + Recharts. Routes: / (landing), /command-center

## AI
Claude Haiku 4.5 via Emergent Universal Key — generates 3–5 operational observations per request.
