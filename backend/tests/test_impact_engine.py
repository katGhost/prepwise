import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.impact_engine import (
    CategoryState,
    EventType,
    Severity,
    compute_impact,
)

DEMO_HOUSEHOLD_ID = "demo-household-001"


def make_states():
    return [
        CategoryState(category="food", limit_amount=2500.0, spent_amount=2100.0),
        CategoryState(category="electricity", limit_amount=1200.0, spent_amount=950.0),
        CategoryState(category="household", limit_amount=600.0, spent_amount=550.0),
    ]


def test_electricity_event_hits_food_and_electricity_only():
    result = compute_impact(DEMO_HOUSEHOLD_ID, EventType.ELECTRICITY, make_states())
    categories = {i.category for i in result.impacts}
    assert categories == {"food", "electricity"}
    assert "household" not in categories


def test_water_event_hits_food_and_household_only():
    result = compute_impact(DEMO_HOUSEHOLD_ID, EventType.WATER, make_states())
    categories = {i.category for i in result.impacts}
    assert categories == {"food", "household"}
    assert "electricity" not in categories


def test_food_already_near_limit_is_high_severity_on_electricity_event():
    # food has only R400 remaining (2500 - 2100); 18% of 2100 spent = R378 extra
    result = compute_impact(DEMO_HOUSEHOLD_ID, EventType.ELECTRICITY, make_states())
    food_impact = next(i for i in result.impacts if i.category == "food")
    assert food_impact.projected_extra_spend > 0
    assert food_impact.pct_of_remaining_consumed > 40  # should land in HIGH
    assert food_impact.severity == Severity.HIGH


def test_highest_severity_rolls_up_from_worst_category():
    result = compute_impact(DEMO_HOUSEHOLD_ID, EventType.ELECTRICITY, make_states())
    assert result.highest_severity == Severity.HIGH


def test_impacts_sorted_worst_first():
    result = compute_impact(DEMO_HOUSEHOLD_ID, EventType.ELECTRICITY, make_states())
    pcts = [i.pct_of_remaining_consumed for i in result.impacts]
    assert pcts == sorted(pcts, reverse=True)


def test_category_not_tracked_by_household_is_skipped_not_errored():
    states = [CategoryState(category="food", limit_amount=1000.0, spent_amount=200.0)]
    result = compute_impact(DEMO_HOUSEHOLD_ID, EventType.ELECTRICITY, states)
    # only food is tracked, electricity rule has nothing to attach to
    assert {i.category for i in result.impacts} == {"food"}


def test_healthy_budget_yields_low_severity():
    states = [
        CategoryState(category="food", limit_amount=3000.0, spent_amount=300.0),
        CategoryState(category="electricity", limit_amount=1200.0, spent_amount=100.0),
    ]
    result = compute_impact(DEMO_HOUSEHOLD_ID, EventType.ELECTRICITY, states)
    assert result.highest_severity == Severity.LOW


def test_empty_event_rules_yield_no_impacts():
    result = compute_impact(DEMO_HOUSEHOLD_ID, EventType.WATER, [])
    assert result.impacts == []
    assert result.highest_severity == Severity.LOW
