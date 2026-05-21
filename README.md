# FRIL — Fleet Reliability Intelligence Layer

An operational intelligence platform for multi-vendor autonomous warehouse fleets. Built to demonstrate fleet observability, spatial memory, and reliability reasoning at the systems layer.

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm start          # runs on http://localhost:3000
```

Set `EMERGENT_LLM_KEY` in `backend/.env` to enable AI insights.

## Routes
- `/`               — Landing page
- `/command-center` — Live ops dashboard

## Stack
- **Backend**: FastAPI · asyncio simulation · Claude Haiku 4.5 AI insights
- **Frontend**: React 19 · Tailwind CSS · Framer Motion · Recharts · React Router

## Architecture

```
fril/
├── backend/
│   ├── server.py                   ← Simulation engine + FastAPI
│   ├── requirements.txt
│   └── .env                        ← ANTHROPIC_LLM_KEY
└── frontend/
    └── src/
        ├── App.js
        ├── lib/
        │   └── api.js              ← Polling + API calls
        ├── components/
        │   ├── WarehouseMap.jsx    ← Live map, route overlays, zone spike tinting
        │   ├── AgentInspector.jsx  ← Per-robot panel: battery, reliability, history
        │   ├── AIInsights.jsx      ← LLM-generated operational observations
        │   ├── IncidentFeed.jsx    ← Live incident stream
        │   ├── MetricsPanel.jsx    ← Fleet-wide metrics and charts
        │   ├── ControlPanel.jsx    ← Operator controls
        │   └── TopBar.jsx          ← Header
        └── pages/
            ├── CommandCenter.jsx   ← Main ops dashboard
            └── Landing.jsx
```

## Intelligence Features

**Spatial Memory** — Robots accumulate route checkpoints at every meaningful event (dispatch, reroute, failure, charge, complete). Selecting a robot draws its full operational trail on the map, color-coded by event type.

**Zone Congestion Memory** — Each zone tracks occupancy history across the session. Zones with repeated congestion spikes are tinted amber or red with a spike counter, giving the map persistent environmental context.

**Robot Health Scoring** — Every robot carries a 0–100 reliability score weighted by recent failure rate. Scores are classified into `nominal / degraded / critical` tiers, shown in the inspector and hover tooltip.

**AI Insights** — Claude Haiku generates 4 sharp operational observations per request, informed by zone congestion history, robot health scores, and incident context — not just instantaneous metrics.

**Multi-vendor Simulation** — Three vendor fleets with distinct speed, failure rate, and acknowledgment lag profiles, plus opportunistic charging, critical battery override, congestion redistribution, and stall recovery.