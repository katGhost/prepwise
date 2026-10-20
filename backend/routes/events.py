from flask import Blueprint, jsonify, request

from services import supabase_client
from services.impact_engine import EventType
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

    event = supabase_client.create_event(request.household_id, event_type)
    return jsonify(event), 201


@bp.get("/debug-whoami")
def debug_whoami():
    client = supabase_client.get_client()
    resp = client.rpc("auth_debug_whoami").execute()
    return jsonify(resp.data)