"""
insight_generator.py

Turns an ImpactResult into plain-language insight text.

Call order on every request:
  1. Supabase cache  -> instant, zero risk
  2. Live OpenRouter -> tried when DEMO_MODE is False; cycles through
                        MODELS until one succeeds, then writes to cache
  3. Template        -> deterministic fallback, never crashes the demo
"""
import json
import re
import requests
from config import Config
from services import supabase_client
from services.impact_engine import ImpactResult, result_to_dict

# Model preference order: fast + cheap first, capable as fallback.
# Slugs verified against account's available model list.
MODELS = [
    "mistralai/mistral-small-3.2-24b-instruct",          # Qwen3.5 Flash — fast, cheap, good instruction following
    "meta-llama/llama-3.1-8b-instruct",  # Llama 3.1 8B — reliable fallback
    "google/gemma-4-26b-a4b-it:free",    # Gemma 4 26B — free tier, capable
    "openrouter/free",                   # last resort meta-router
]


def _clean_json(text: str) -> str:
    """Strip markdown fences that some models wrap around JSON."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?", "", text, flags=re.IGNORECASE).strip()
    text = re.sub(r"```$", "", text).strip()
    return text


def _template_fallback(result: ImpactResult) -> str:
    """Zero-dependency fallback — keeps the app demoable with no network."""
    if not result.impacts:
        return "No significant budget impact predicted for this event."
    top = result.impacts[0]
    return (
        f"This {result.event_type.value} disruption is projected to add "
        f"roughly R{top.projected_extra_spend:.0f} to your {top.category} "
        f"spend this month ({top.pct_of_remaining_consumed:.0f}% of what you "
        f"have left in that category). {top.recommended_action}"
    )


def _build_prompt(result: ImpactResult) -> str:
    payload = result_to_dict(result)
    return (
        f"""You are a calm, practical household financial assistant for South African households affected by load shedding and water outages.
        Given the disruption-impact data below, write ONE short paragraph (maximum 3 sentences) in plain language:
            - What the disruption means for this household's budget
            - One concrete, actionable thing to do right now
        Rules: no preamble, no markdown, no bullet points, no JSON — a single plain-text paragraph only.
        Use ONLY the numbers that appear in the impact data below. Do not calculate, round, estimate, or invent any rand amount, percentage, or dollar figure that is not explicitly present in the data.
        Return ONLY the paragraph and nothing else.

        Impact data: {json.dumps(payload, indent=2)}"""
    )


def _call_openrouter(result: ImpactResult) -> str | None:
    """
    Try each model in order. Return the insight text on first success,
    or None if every model fails.
    """
    if not Config.OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY not set")

    prompt = _build_prompt(result)

    for model in MODELS:
        try:
            print(f"[openrouter] trying model: {model}")
            print(f"[openrouter] base url: {Config.OPENROUTER_BASE_URL}")

            response = requests.post(
                Config.OPENROUTER_BASE_URL,
                headers={
                    "Authorization": f"Bearer {Config.OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 200,
                    "temperature": 0.5,
                    "thinking": {"type": "disabled"},
                },
                timeout=15,
            )

            data = response.json()

            if response.status_code != 200 or "error" in data:
                print(f"[openrouter] model failed ({response.status_code}): {model} — {data.get('error')}")
                continue

            content = data["choices"][0]["message"]["content"]
            content = _clean_json(content).strip()

            if not content:
                print(f"[openrouter] empty content from {model}, trying next")
                continue

            print(f"[openrouter] success with model: {model}")
            return content

        except Exception as e:
            print(f"[openrouter] exception with {model}: {e}")
            continue

    return None


def get_insight(result: ImpactResult) -> dict:
    """Returns {"text": str, "source": "cache" | "live" | "template"}."""

    # 1. Cache hit
    cached = supabase_client.get_cached_insight(
        result.household_id, result.event_type.value
    )
    if cached:
        print("[insight] cache hit")
        return {"text": cached, "source": "cache"}

    # 2. Live call (only when DEMO_MODE is False)
    if not Config.DEMO_MODE:
        text = _call_openrouter(result)
        if text:
            # Write to cache so the next trigger is instant
            try:
                supabase_client.save_insight(
                    result.household_id, result.event_id, text
                )
            except Exception as e:
                print(f"[insight] cache write failed (non-fatal): {e}")
            return {"text": text, "source": "live"}
        else:
            print("[insight] all models failed, falling back to template")

    # 3. Template fallback
    return {"text": _template_fallback(result), "source": "template"}