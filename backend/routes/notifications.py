from flask import Blueprint, jsonify, request
from services import supabase_client
from utils.auth_util import require_auth

bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")

@bp.get("/me")
@require_auth
def get_notifications():
    notes = supabase_client.get_notifications(request.household_id)
    unread = sum(1 for n in notes if not n["read"])
    return jsonify({"notifications": notes, "unread": unread})

@bp.post("/read")
@require_auth
def mark_read():
    supabase_client.mark_notifications_read(request.household_id)
    return jsonify({"ok": True})