from flask import Blueprint, jsonify, request
from services import supabase_client
from services.impact_engine import EventType
from services.area_config import resolve_area_id
from services.notifier import notify_nearby
from utils.auth_util import require_auth

bp = Blueprint("events", __name__, url_prefix="/api/events")
VALID_TYPES = {e.value for e in EventType}

@bp.get("/me")
@require_auth
def list_events():
    return jsonify({"events": supabase_client.list_events(request.household_id)})

@bp.post("/trigger")
@require_auth
def trigger_event():
    data = request.get_json(silent=True) or {}
    event_type = data.get("event_type")

    if event_type not in VALID_TYPES:
        return jsonify({"error": f"event_type must be one of {sorted(VALID_TYPES)}"}), 400

    # Get household area for outage context + community notification
    household = supabase_client.get_household(request.household_id)
    area_id = household.get("area_id") if household else None

    # Read from cache (never blocks on ESP API at trigger time)
    outage_status = supabase_client.get_outage_status(area_id) if area_id else {"status": "unknown", "stage": 0}

    # Create event
    event = supabase_client.create_event(
        request.household_id, event_type, outage_status["status"], outage_status["stage"]
    )

    # Notify nearby households (fire-and-forget, don't fail the response if this errors)
    if area_id:
        try:
            notify_nearby(request.household_id, area_id, event_type)
        except Exception as e:
            print(f"[notifier] Failed to notify nearby: {e}")

    return jsonify(event), 201


@bp.get("/debug-whoami")
def debug_whoami():
    client = supabase_client.get_client()
    resp = client.rpc("auth_debug_whoami").execute()
    return jsonify(resp.data)