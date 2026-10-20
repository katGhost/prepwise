"""
insight_generator.py
---------------------
Turns an ImpactResult into plain-language insight text.

Cache-first, by design: on the critical demo path, this NEVER blocks on a
live LLM call. The risk noted in the project context — "don't let the
OpenRouter call sit live on the critical demo path" — is handled structurally
here, not by remembering to be careful live on stage.

Call order on every request:
  1. Supabase/mock cache (instant, zero risk)
  2. If DEMO_MODE and no cache hit -> a deterministic template fallback
     (still instant, still zero risk, just less polished than real LLM text)
  3. Live OpenRouter call -> ONLY if DEMO_MODE is false. Reserved for a
     secondary, lower-stakes feature (e.g. "ask a follow-up question" on an
     insight already shown), never for the main reveal.
"""

import json
import urllib.request
import urllib.error

from config import Config
from services import supabase_client
from services.impact_engine import ImpactResult, result_to_dict


def _template_fallback(result: ImpactResult) -> str:
    """Zero-dependency fallback if there's no cache entry at all — keeps the
    app demoable even on a laptop with no network, worst case."""
    if not result.impacts:
        return "No significant budget impact predicted for this event."
    top = result.impacts[0]
    return (
        f"This {result.event_type.value} disruption is projected to add "
        f"roughly R{top.projected_extra_spend:.0f} to your {top.category} "
        f"spend this month ({top.pct_of_remaining_consumed:.0f}% of what you "
        f"have left in that category). {top.recommended_action}"
    )


def get_insight(result: ImpactResult) -> dict:
    """Returns {"text": str, "source": "cache" | "template" | "live"}."""
    cached = supabase_client.get_cached_insight(result.household_id, result.event_type.value)
    if cached:
        return {"text": cached, "source": "cache"}

    if Config.DEMO_MODE:
        return {"text": _template_fallback(result), "source": "template"}

    try:
        text = _call_openrouter(result)
        return {"text": text, "source": "live"}
    except Exception:
        # Live call failed (rate limit, network, bad key) — never let the
        # demo break because of it. Fall back silently to the template.
        return {"text": _template_fallback(result), "source": "template"}


def _build_prompt(result: ImpactResult) -> str:
    payload = result_to_dict(result)
    return (
        "You are a calm, practical household financial assistant. Given this "
        "disruption-impact data (JSON below), write ONE short paragraph "
        "(max 3 sentences) in plain language: what the disruption means for "
        "this household's budget, and one concrete thing to do now. No "
        "preamble, no markdown, no bullet points — a single paragraph only.\n\n"
        f"{json.dumps(payload)}"
    )


def _call_openrouter(result: ImpactResult) -> str:
    if not Config.OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY not set")

    body = json.dumps(
        {
            "model": Config.OPENROUTER_MODEL,
            "messages": [{"role": "user", "content": _build_prompt(result)}],
            "max_tokens": 200,
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        Config.OPENROUTER_BASE_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {Config.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=8) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["choices"][0]["message"]["content"].strip()
