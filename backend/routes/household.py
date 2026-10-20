from flask import Blueprint, jsonify, request

from services import supabase_client
from utils.auth_util import require_auth

bp = Blueprint("household", __name__, url_prefix="/api/household")


@bp.get("/me")
@require_auth
def get_household():
    household = supabase_client.get_household(request.household_id)
    if household is None:
        return jsonify({"error": "household not found"}), 404
    return jsonify(household)


@bp.get("/me/budget")
@require_auth
def get_budget():
    categories = supabase_client.get_budget_categories(request.household_id)
    return jsonify({"household_id": request.household_id, "categories": categories})

# /demo-id -> uncomment for DEMO
# Leave as is -> frontend gets the id from the auth session, not this endpoint