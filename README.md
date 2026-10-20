# prepWise

FNB App of the Year Hackathon — Climate Resilience & Essential Services track.

> "Don't just tell me there's an outage — tell me how to prepare."

Connects local service disruption alerts (water/electricity) to a household's
actual budget and spending patterns: what happened → why it matters for your
money → what to do now.

## Status (MVP build sequence)

- [x] 1. Household profile + budget data model (hardcoded/mock, Supabase schema ready)
- [x] 2. Impact engine rules for 2 demo scenarios — electricity + water
      (`backend/services/impact_engine.py`, unit tested: `backend/tests/test_impact_engine.py`)
- [x] 3. Seeded event trigger + UI feed
- [x] 4. OpenRouter insight generation, wired to cached fallback
      (`backend/services/insight_generator.py` — cache-first, never blocks demo on a live call)
- [ ] 5. Real Eskom national-stage data — enhancement, **do last**, only once 1-4 work end to end live

**End-to-end smoke test passed on mock data**: household → budget → trigger
event → impact engine → cached insight, all verified working (see commit
history / re-run `backend/tests/test_impact_engine.py`).

## Run it

### Backend only (fastest loop while building)

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env   # fill in later; blank is fine, runs on mock data
FLASK_ENV=development python3 app.py
# -> http://localhost:8080/api/health
```

### Frontend dev server (hot reload, proxies /api to Flask above)
```bash
cd frontend
npm install
npm run dev
# -> http://localhost:5173
```

### Full container (what actually ships to Railway)
```bash
docker build -t household-resilience .
docker run -p 8080:8080 --env-file .env household-resilience
# -> http://localhost:8080
```

## Architecture

```
household-resilience/
├── Dockerfile                 # multi-stage: Vite build -> Flask static/
├── backend/
│   ├── app.py                  # Flask app factory, serves API + built frontend
│   ├── config.py                # all env vars, one place
│   ├── routes/
│   │   ├── household.py         # GET profile, budget state
│   │   ├── events.py            # trigger/list scripted disruption events
│   │   └── insights.py          # POST -> impact engine + insight generator
│   ├── services/
│   │   ├── supabase_client.py   # server-side only; in-memory mock fallback
│   │   ├── impact_engine.py     # pure rule logic — no I/O, fully unit tested
│   │   └── insight_generator.py # cache-first LLM text, demo-safe by design
│   └── tests/test_impact_engine.py
├── frontend/                   # React + Vite, mobile-first single page
│   └── src/{App.tsx, api.ts, components/, styles.css}
└── supabase/schema.sql         # schema + seed data matching the mock exactly
```

React never talks to Supabase directly — everything goes through Flask with
the service-role key. The whole app runs on mock data with zero config
(`SUPABASE_URL` blank, `DEMO_MODE=true`), so it's demoable offline, on a
clean laptop, from a fresh clone.

## Demo script (fill in before demo day — this is the judge-facing narrative)

Household: **The Mahlangu Household** (seeded) — R2500 food budget (R2100
spent), R1200 electricity budget (R950 spent), R600 household budget (R550
spent). Already tight on food and household categories — this is
deliberate, so the demo event visibly matters.

1. Open the app — calm "ALL NORMAL" status, budget bars shown, nothing alarming.
2. Hit **⚡ Electricity outage** in demo controls.
3. Event appears in the feed immediately.
4. Insight panel reveals: food budget flagged HIGH severity (94% of
   remaining budget), electricity flagged MODERATE — with plain-language
   text and one concrete action each ("cook and freeze meals now",
   "unplug non-essential appliances").
5. Say the line: *"This isn't just an outage alert — it's the same alert,
   translated into what it costs you and what to do about it, using your
   own spending history."*
6. (Optional, if time) trigger **💧 Water outage** to show the engine
   generalises to a second disruption type with different affected categories.

_TODO before demo: swap in real numbers if the seed data changes, time the
walkthrough, write the 60-second verbal pitch to go with it._

## Known limitations (be upfront about these in the pitch, don't get caught out)

- **Electricity signal**: EskomSePush free tier is paid-only for area lookups
  and capped at 50 calls/day. MVP uses Eskom's public *national* stage data
  as the one live signal (coarse), with a scripted local event layered on
  top for the demo. Hyper-local requires a future partnership — say this
  explicitly rather than let a judge discover it.
- **Water signal**: no national real-time water-outage feed exists in SA
  (fragmented across ~257 municipalities). Scripted/seeded only. Framed in
  the pitch as "receive," not "detect."
- **FNB sandbox**: not yet confirmed to exist for this hackathon. Falls back
  to the realistic mock dataset in `supabase/schema.sql` / `supabase_client.py`.
- **LLM insight**: cache-first by design (`DEMO_MODE=true`). A live
  OpenRouter call is wired but reserved for a secondary, lower-stakes
  feature later — never the main reveal.

## Prep checklist (do regardless of pre-build rule confirmation)

- [ ] Confirm with FNB organizers: can work happen before the 72-hour
      window, or must it be live-only?
- [ ] Apply for FNB sandbox access today if it exists (long lead time risk).
- [ ] Request elevated/partner EskomSePush API access (ZATech Slack,
      #eskomsepush) today (same lead-time risk).
- [ ] Get OpenRouter account/key live; test prompt in a scratch file first.
- [ ] Fill in the demo script above with final numbers and timing.

## Judging criteria mapping (for the pitch deck, not just this file)

| Criterion | How this MVP answers it |
|---|---|
| Product | Complete flow: budget → alert → impact → recommendation |
| Creativity | Combines disruption intelligence with personal financial behaviour — nobody else does this (see competitive validation in project notes) |
| Usability | 3-step contextual reveal: what happened → why it matters → what to do |
| Sustainability | Impact-engine pattern generalises past electricity/water to transport, food, etc. |
| Impact | Nudges away from avoidable emergency/reactive spending |
| Presentation | One-line pitch, calm UI, no alarmism |
| Intelligence | `impact_engine.py` projects category-specific financial impact from spend history + disruption type — this is the one file judges should see if they ask "where's the AI" |

## Governing principle for any new idea in this project

Not "has this been done before" — ask **why the gap still exists**: can the
obvious players not close it structurally (no data access, no position), or
could they close it in a sprint if they decided to? The former is worth
building. The latter is a weak, contestable gap even if currently true.
