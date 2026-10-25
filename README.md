# prepWise

FNB App of the Year Hackathon — Climate Resilience & Essential Services track.

> "Don't just tell me there's an outage — tell me what it costs me."

Connects local service disruption alerts (water/electricity) to a household's actual budget and spending patterns: what happened → what it costs your household → what to do now.

A Stage 4 load-shedding event on a real PrepWise household projects R378 in additional food spend and R85.50 in electricity costs — calculated from the household's own budget data before the outage ends.

## Architecture

```
household-resilience/
├── Dockerfile                  # multi-stage: Vite build -> Flask static/
├── railway.toml                # Railway deploy config
├── backend/
│   ├── app.py                  # Flask app factory, serves API + built frontend
│   ├── config.py               # all env vars, one place
│   ├── scheduler.py            # APScheduler — polls EskomSePush every 3.5h
│   ├── routes/
│   │   ├── household.py        # GET profile, budget state, area
│   │   ├── events.py           # trigger/list/resolve disruption events
│   │   ├── insights.py         # POST -> impact engine + insight generator
│   │   ├── notifications.py    # community alerts — read/mark
│   │   └── areas.py            # area lookup + household area assignment
│   ├── services/
│   │   ├── supabase_client.py  # server-side only, service-role key
│   │   ├── impact_engine.py    # pure rule logic — no I/O, fully unit tested
│   │   ├── insight_generator.py# cache-first LLM text, model fallback chain
│   │   ├── eskomsepush.py      # ESP v3.1 wrapper (allowance + area status)
│   │   ├── area_config.py      # 6 Tshwane poll areas + adjacency map
│   │   └── notifier.py         # fan-out community alerts to adjacent areas
│   └── tests/test_impact_engine.py
├── frontend/                   # React + Vite TS, mobile-first single page
│   ├── public/
│   │   ├── manifest.json       # PWA manifest
│   │   ├── icon-192x192.png
│   │   ├── icon-512x512.png
│   │   └── apple-touch-icon.png
│   └── src/
│       ├── App.tsx
│       ├── api.ts
│       ├── components/
│       └── styles.css
└── supabase/schema.sql         # schema + seed data
```

React never talks to Supabase directly — all requests go through Flask with the service-role key. JWT auth uses ES256 (asymmetric), verified via JWKS endpoint.

## Run it

### Backend only

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env
FLASK_ENV=development python3 app.py
# -> http://localhost:8080/api/health
```

### Frontend dev server

```bash
cd frontend
npm install
npm run dev
# -> http://localhost:5173  (proxies /api to Flask on :8080)
```

### Full container

```bash
docker build -t prepwise .
docker run -p 8080:8080 --env-file .env prepwise
# -> http://localhost:8080
```

## Environment variables

| Variable | Required at | Purpose |
|---|---|---|
| `SUPABASE_URL` | Runtime + Build | Supabase project URL |
| `SUPABASE_KEY` | Runtime | Service-role secret key |
| `VITE_SUPABASE_URL` | Build | Frontend Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Build | Frontend anon/publishable key |
| `OPENROUTER_API_KEY` | Runtime | LLM insight generation |
| `ESKOMSEPUSH_API_KEY` | Runtime | ESP v3.1 outage polling |
| `DEMO_MODE` | Runtime | `false` = live LLM calls; `true` = template fallback only |

## Key design decisions

**Impact engine** (`impact_engine.py`) is pure rule logic with no I/O — category-specific financial impact is projected from the household's actual `spent_amount` and `limit_amount`, not industry averages. No numbers are invented; the LLM is constrained to only reference figures present in the computed output.

**Insight generation** is cache-first: on the first trigger the model runs once and writes to Supabase; every subsequent call for the same household + event type returns instantly from cache with no further LLM cost.

**EskomSePush polling** runs via APScheduler every 3.5 hours (~41 calls/day against a 50/day free-tier limit), warming the `outage_cache` table. Event triggers read from cache — the ESP API is never called at request time.

**Community alerts** fan out to adjacent-area households on every event trigger via `notifier.py`, using a pre-defined Tshwane adjacency map (6 areas across two geographic clusters).

**Auth** is token-gated on every route. Household ID is always read from the verified JWT `sub` claim — never from the request body or URL.

## Known limitations

- **EskomSePush**: free tier is capped at 50 calls/day and covers 6 Tshwane areas only. Hyper-local coverage beyond those areas requires a paid tier or partner access.
- **Water signal**: no national real-time water-outage feed exists in South Africa (fragmented across ~257 municipalities). Water events are user-triggered; the platform frames this as "report and track," not "auto-detect."
- **Insight persistence**: insights are linked to a specific event row. A resolved event's insight is retained in Supabase but not currently surfaced in the UI history view.

## Supabase schema

Tables: `households`, `budget_categories`, `events`, `insights`, `outage_cache`, `notifications`.

All tables use UUID PKs with RLS enabled. `households.id` maps 1:1 to `auth.users.id` with cascade delete. Backend uses the service-role key and bypasses RLS entirely — RLS protects direct client access only.

## Demo account

- **Email:** mahlangu@prepwise.com
- **Household:** The Mahlangu Household
- **Area:** Hatfield, Tshwane
- **Budget:** Food R2,100/R2,500 · Electricity R950/R1,200 · Water R320/R500 · Household R550/R600

## Judging criteria

| Criterion | How PrepWise answers it |
|---|---|
| Product | Complete flow: budget → disruption alert → financial impact → recommendation |
| Creativity | Combines disruption intelligence with personal financial behaviour — outage alerts translated into rand values using the household's own spending history |
| Usability | Three-step contextual reveal: what happened → what it costs you → what to do now |
| Sustainability | Impact engine pattern generalises beyond electricity/water to any budget-affecting disruption type |
| Impact | Shifts households from reactive emergency spend to informed preparation |
| Presentation | Calm, civic UI — no alarmism, no dark patterns |
| Intelligence | `impact_engine.py` projects category-specific financial impact from spend history + disruption type; insight generator constrains the LLM to only the computed figures |

## Author

**Andries N Mogashoa** *| Backend AI Engineer Intern @FlyRank.AI | CS50AI & Cybersecurity Student*
