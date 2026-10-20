from flask import Blueprint, jsonify, request
from services.area_config import AREA_OPTIONS
from services import supabase_client
from utils.auth_util import require_auth

bp = Blueprint("areas", __name__, url_prefix="/api/areas")

@bp.get("/")
def list_areas():
    """Public — no auth needed. Returns the 6 selectable areas."""
    return jsonify({"areas": AREA_OPTIONS})

@bp.post("/me")
@require_auth
def set_area():
    data = request.get_json(silent=True) or {}
    area_id = data.get("area_id")
    valid_ids = {a["id"] for a in AREA_OPTIONS}
    if area_id not in valid_ids:
        return jsonify({"error": "invalid area_id"}), 400
    supabase_client.update_household_area(request.household_id, area_id)
    return jsonify({"ok": True, "area_id": area_id})