from flask import Blueprint, jsonify, request

from services import supabase_client
from services.impact_engine import CategoryState, EventType, compute_impact, result_to_dict
from services.insight_generator import get_insight
from utils.auth_util import require_auth

bp = Blueprint("insights", __name__, url_prefix="/api/insights")


@bp.post("")
@require_auth
def generate_insight():
    data = request.get_json(silent=True) or {}
    event_type_raw = data.get("event_type")

    try:
        event_type = EventType(event_type_raw)
    except ValueError:
        return jsonify({"error": f"invalid event_type: {event_type_raw!r}"}), 400

    household_id = request.household_id  # from token, not body
    categories = supabase_client.get_budget_categories(household_id)
    if not categories:
        return jsonify({"error": "no budget data for household"}), 404

    states = [
        CategoryState(
            category=c["category"],
            limit_amount=float(c["limit_amount"]),
            spent_amount=float(c["spent_amount"]),
        )
        for c in categories
    ]

    result = compute_impact(household_id, event_type, states)
    insight = get_insight(result)

    response = result_to_dict(result)
    response["insight"] = insight
    return jsonify(response)