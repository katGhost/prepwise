"""
supabase_client.py
-------------------
Server-side-only Supabase access (service-role key). The React frontend
never talks to Supabase directly — everything goes through Flask routes.

Includes an in-memory mock fallback so the app still boots and demos end to
end if Supabase isn't reachable (flaky wifi on demo day, sandbox access not
confirmed yet, etc). The mock mirrors the real schema exactly so swapping
back to real Supabase is a one-line change (see get_client()).
"""
from datetime import datetime
import uuid
from config import Config
from supabase import create_client

_client = None


def get_client():
    """Returns a real Supabase client if configured, else None (caller should
    fall back to mock_data). Lazily imported so `supabase` isn't a hard
    dependency for anyone just running the impact engine / tests."""
    global _client
    if _client is not None:
        return _client

    if not Config.SUPABASE_URL or not Config.SUPABASE_KEY:
        return None

    

    _client = create_client(supabase_url=Config.SUPABASE_URL, supabase_key=Config.SUPABASE_KEY)
    return _client


# ---------------------------------------------------------------------------
# In-memory mock — mirrors the Supabase schema in supabase/schema.sql exactly.
# This is what the demo runs on until/unless Supabase + sandbox access are
# confirmed working. Swap for real queries in routes/*.py behind the same
# function signatures below once Supabase is live.
# ---------------------------------------------------------------------------

MOCK_HOUSEHOLD = {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "The Mahlangu Household",
    "electricity_budget": 1200.0,
    "food_budget": 2500.0,
}

MOCK_CATEGORIES = [
    {"id": "cat-food", "household_id": "11111111-1111-1111-1111-111111111111", "category": "food",
     "limit_amount": 2500.0, "spent_amount": 2100.0},
    {"id": "cat-electricity", "household_id": "11111111-1111-1111-1111-111111111111", "category": "electricity",
     "limit_amount": 1200.0, "spent_amount": 950.0},
    {"id": "cat-household", "household_id": "11111111-1111-1111-1111-111111111111", "category": "household",
     "limit_amount": 600.0, "spent_amount": 550.0},
]

# Mutated at runtime when a demo event is triggered via POST /api/events/trigger
MOCK_EVENTS: list[dict] = []

# Cached LLM insight text, keyed by f"{household_id}:{event_type}" — this is
# what insight_generator.py reads first before ever considering a live call.
MOCK_INSIGHTS_CACHE: dict[str, str] = {
    "11111111-1111-1111-1111-111111111111:electricity": (
        "Electricity spending is already 18% above your normal monthly "
        "average this cycle. This outage is unlikely to touch your savings "
        "goal, but your food budget is the one to watch — past outages have "
        "pushed takeaway spend up fast once cooking gets harder."
    ),
    "11111111-1111-1111-1111-111111111111:water": (
        "Your household budget has room to absorb this one, but your "
        "household-essentials category is already at 92% of its monthly "
        "limit. Past water disruptions here have meant last-minute bottled "
        "water purchases at a premium — buying a few bottles now, ahead of "
        "time, is the cheaper move."
    ),
}


def get_household(household_id: str) -> dict | None:
    client = get_client()
    if client is None:
        return MOCK_HOUSEHOLD if household_id == MOCK_HOUSEHOLD["id"] else None

    resp = (client.table("households")
        .select("id, name")
        .eq("id", household_id)
        .single()
        .execute())

    return resp.data


def get_budget_categories(household_id: str) -> list[dict]:
    client = get_client()
    if client is None:
        return [c for c in MOCK_CATEGORIES if c["household_id"] == household_id]
    
    resp = (client.table("budget_categories")
        .select("*")
        .eq("household_id", household_id)
        .execute())
    return resp.data


def create_event(household_id: str, event_type: str, outage_status: str, stage: int) -> dict:
    client = get_client()
    result = (
        client.table("events")
        .insert({
            "household_id": household_id,
            "type":         event_type,
            "status":       "active",       # lifecycle — always starts active
            "outage_status": outage_status, # ESP snapshot
            "stage":         stage,
        })
        .execute()
    )
    return result.data[0]


"""client = get_client()
if client is None:
    MOCK_EVENTS.append(event)
    return event
resp = client.table("events").insert(event).execute()
return resp.data[0]"""


def list_events(household_id: str) -> list[dict]:
    client = get_client()
    if client is None:
        return [e for e in MOCK_EVENTS if e["household_id"] == household_id][::-1]
    resp = (
        client.table("events")
        .select("*")
        .eq("household_id", household_id)
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data


def get_cached_insight(household_id: str, event_type: str) -> str | None:
    client = get_client()
    cache_key = f"{household_id}:{event_type}"
    if client is None:
        return MOCK_INSIGHTS_CACHE.get(cache_key)

    # Find the most recent event of this type for the household
    event_resp = (
        client.table("events")
        .select("id")
        .eq("household_id", household_id)
        .eq("type", event_type)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not event_resp.data:
        return None
    event_id = event_resp.data[0]["id"]

    # OR look up the cached insight for that specific event
    resp = (
        client.table("insights")
        .select("content")
        .eq("event_id", event_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return resp.data[0]["content"] if resp.data else None


def save_insight(household_id: str, event_id: str, content: str):
    client = get_client()
    return (
        client.table("insights")
        .insert({
            "household_id": household_id,
            "event_id": event_id,
            "content": content,
        })
        .execute()
    )

    
def write_outage_cache(area_id: str, area_name: str, status: str, stage: int, raw: dict | None) -> None:
    client = get_client()
    if client is None:
        return
    client.table("outage_cache").upsert({
        "area_id":   area_id,
        "area_name": area_name,
        "status":    status,
        "stage":     stage,
        "raw":       raw,
        "fetched_at": "now()",
    }).execute()

def get_outage_status(area_id: str) -> dict:
    client = get_client()
    result = (
        client.table("outage_cache")
        .select("status, stage")
        .eq("area_id", area_id)
        .single()
        .execute()
    )
    if not result.data:
        return {"outage_status": "unknown", "stage": 0}
    
    return {
        "outage_status": result.data["status"],  # remap: cache.status -> outage_status
        "stage": result.data.get("stage") or 0,
    }


def get_households_in_area(area_id: str) -> list[dict]:
    """Return all households whose area_id matches (for notification fanout)."""
    client = get_client()
    if client is None:
        return []
    resp = (
        client.table("households")
        .select("id")
        .eq("area_id", area_id)
        .execute()
    )
    return resp.data

# Resolve event
def resolve_event(household_id: str, event_id: str) -> dict:
    """Set status='resolved', resolved_at=now() for an owned event."""
    client = get_client()
    result = (
        client.table("events")
        .update({
            "status": "resolved",
            "resolved_at": datetime.utcnow().isoformat(),
        })
        .eq("id", event_id)
        .eq("household_id", household_id)   # ownership guard — never trust URL alone
        .execute()
    )
    if not result.data:
        return None   # not found or not owned
    return result.data[0]

def write_notification(household_id: str, message: str, source_area: str) -> None:
    client = get_client()
    if client is None:
        return
    client.table("notifications").insert({
        "household_id": household_id,
        "message":      message,
        "source_area":  source_area,
    }).execute()

def get_notifications(household_id: str) -> list[dict]:
    client = get_client()
    if client is None:
        return []
    resp = (
        client.table("notifications")
        .select("*")
        .eq("household_id", household_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return resp.data

def mark_notifications_read(household_id: str) -> None:
    client = get_client()
    if client is None:
        return
    client.table("notifications").update({"read": True}).eq(
        "household_id", household_id
    ).eq("read", False).execute()

def update_household_area(household_id: str, area_id: str) -> None:
    client = get_client()
    if client is None:
        return
    client.table("households").update({"area_id": area_id}).eq(
        "id", household_id
    ).execute()
