"""
impact_engine.py
-----------------
Pure logic: disruption event + household budget state -> category-specific
financial impact + recommended action.

No network calls, no Supabase, no LLM. This is deliberately the easiest
module to unit test and the one most worth getting right early, since every
other feature (UI, insight text, demo) is downstream of this being correct
and explainable to judges.

Design notes (read before editing rules):
- Each event type maps to one or more CategoryRule entries. A rule says:
  "this disruption historically pushes category X spend up by Y%, because Z."
- The multiplier is a stand-in for a real historical-correlation computation
  (e.g. "average spend in the 48h after past electricity outages vs a normal
  48h window"). For the hackathon demo this is a seeded constant tied to the
  specific demo household's seeded transaction history — NOT a live stat.
  Swap `multiplier_source="seeded"` for `"computed"` once real historical
  aggregation exists; nothing downstream needs to change.
- severity is derived from how much of the *remaining* category budget the
  projected extra spend would consume, not from the raw rand amount. A R150
  projected overspend matters a lot on a R300 remaining food budget and
  barely at all on a R3000 one.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Severity(str, Enum):
    LOW = "low"           # projected extra spend < 15% of remaining budget
    MODERATE = "moderate"  # 15-40%
    HIGH = "high"          # > 40%, or pushes category over budget entirely


class EventType(str, Enum):
    ELECTRICITY = "electricity"
    WATER = "water"


@dataclass(frozen=True)
class CategoryRule:
    category: str                  # must match a budget_categories.category value
    multiplier: float              # e.g. 1.18 = spend trends 18% above normal
    multiplier_source: str         # "seeded" | "computed" (see module docstring)
    rationale: str                 # plain-language "why", shown to judges/users
    action: str                    # the single recommended action, imperative voice


@dataclass(frozen=True)
class CategoryState:
    category: str
    limit_amount: float
    spent_amount: float

    @property
    def remaining(self) -> float:
        return max(self.limit_amount - self.spent_amount, 0.0)


@dataclass
class CategoryImpact:
    category: str
    limit_amount: float
    spent_amount: float
    remaining_before: float
    projected_extra_spend: float
    projected_remaining_after: float
    pct_of_remaining_consumed: float
    severity: Severity
    rationale: str
    recommended_action: str
    multiplier_source: str


@dataclass
class ImpactResult:
    event_type: EventType
    household_id: str
    event_id: str = ""                 # set by the trigger route after DB insert
    impacts: list = field(default_factory=list)  # list[CategoryImpact]

    @property
    def highest_severity(self) -> Severity:
        order = {Severity.LOW: 0, Severity.MODERATE: 1, Severity.HIGH: 2}
        if not self.impacts:
            return Severity.LOW
        return max((i.severity for i in self.impacts), key=lambda s: order[s])


# ---------------------------------------------------------------------------
# Rule tables — the 2 demo scenarios named in the project context.
# Extend this dict as more event types / categories are added; everything
# else in this file is generic and doesn't need to change.
# ---------------------------------------------------------------------------

EVENT_RULES: dict[EventType, list[CategoryRule]] = {
    EventType.ELECTRICITY: [
        CategoryRule(
            category="food",
            multiplier=1.18,
            multiplier_source="seeded",
            rationale=(
                "In this household's past electricity outages, takeaway and "
                "delivery spend ran about 18% above a normal week — cooking "
                "becomes harder, so eating out fills the gap."
            ),
            action="Cook and freeze 1-2 meals now, before the power goes.",
        ),
        CategoryRule(
            category="electricity",
            multiplier=1.09,
            multiplier_source="seeded",
            rationale=(
                "Prepaid electricity top-ups tend to run slightly higher the "
                "week of an outage, likely from appliances left on standby "
                "and restart surges once power returns."
            ),
            action="Unplug non-essential appliances before the outage window.",
        ),
    ],
    EventType.WATER: [
        CategoryRule(
            category="food",
            multiplier=1.12,
            multiplier_source="seeded",
            rationale=(
                "Water disruptions in this household's history correlate with "
                "a bump in bottled water and takeaway spend under the food "
                "category — cooking and dishes get harder without running water."
            ),
            action="Fill containers and the bath with water now, for cooking and flushing.",
        ),
        CategoryRule(
            category="household",
            multiplier=1.25,
            multiplier_source="seeded",
            rationale=(
                "Past water outages show a spend spike in the household/"
                "essentials category, mostly bottled water and sanitation "
                "supplies bought reactively once the taps are already dry."
            ),
            action="Buy bottled water ahead of time, at normal (non-panic) prices.",
        ),
    ],
}


def _severity_from_pct(pct_of_remaining: float, will_exceed_budget: bool) -> Severity:
    if will_exceed_budget or pct_of_remaining > 40:
        return Severity.HIGH
    if pct_of_remaining > 15:
        return Severity.MODERATE
    return Severity.LOW


def compute_impact(
    household_id: str,
    event_type: EventType,
    category_states: list[CategoryState],
) -> ImpactResult:
    """
    Given the household's current budget state and a disruption event type,
    return the category-specific projected impact.

    category_states: current limit/spent for every budget category the
    household tracks. Categories not referenced by the event's rules are
    left out of the result entirely (no impact == no noise in the UI).
    """
    rules = EVENT_RULES.get(event_type, [])
    states_by_category = {s.category: s for s in category_states}

    impacts: list[CategoryImpact] = []
    for rule in rules:
        state = states_by_category.get(rule.category)
        if state is None:
            continue  # household doesn't track this category — skip silently

        projected_extra = state.spent_amount * (rule.multiplier - 1.0)
        projected_remaining_after = state.remaining - projected_extra
        will_exceed = projected_remaining_after < 0

        pct_of_remaining = (
            (projected_extra / state.remaining * 100.0) if state.remaining > 0 else 100.0
        )

        impacts.append(
            CategoryImpact(
                category=state.category,
                limit_amount=state.limit_amount,
                spent_amount=state.spent_amount,
                remaining_before=state.remaining,
                projected_extra_spend=round(projected_extra, 2),
                projected_remaining_after=round(projected_remaining_after, 2),
                pct_of_remaining_consumed=round(pct_of_remaining, 1),
                severity=_severity_from_pct(pct_of_remaining, will_exceed),
                rationale=rule.rationale,
                recommended_action=rule.action,
                multiplier_source=rule.multiplier_source,
            )
        )

    # Highest-impact category first — this is what the UI should lead with.
    impacts.sort(key=lambda i: i.pct_of_remaining_consumed, reverse=True)

    return ImpactResult(event_type=event_type, household_id=household_id, impacts=impacts)


def impact_to_dict(impact: CategoryImpact) -> dict:
    """JSON-serialisable view for the API layer / insight prompt builder."""
    return {
        "category": impact.category,
        "limit_amount": impact.limit_amount,
        "spent_amount": impact.spent_amount,
        "remaining_before": round(impact.remaining_before, 2),
        "projected_extra_spend": impact.projected_extra_spend,
        "projected_remaining_after": impact.projected_remaining_after,
        "pct_of_remaining_consumed": impact.pct_of_remaining_consumed,
        "severity": impact.severity.value,
        "rationale": impact.rationale,
        "recommended_action": impact.recommended_action,
    }


def result_to_dict(result: ImpactResult) -> dict:
    return {
        "event_type": result.event_type.value,
        "household_id": result.household_id,
        "highest_severity": result.highest_severity.value,
        "impacts": [impact_to_dict(i) for i in result.impacts],
    }
