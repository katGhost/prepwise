import os
import requests

ESP_BASE = "https://developer.sepush.co.za/business/3.1"
ESP_TOKEN = os.environ.get("ESP_TOKEN")

def _headers() -> dict:
    return {"token": ESP_TOKEN}

def check_allowance() -> dict:
    """Check remaining daily API quota — costs 0 calls."""
    resp = requests.get(f"{ESP_BASE}/api_allowance", headers=_headers(), timeout=10)
    resp.raise_for_status()
    return resp.json()

def fetch_area_status(area_id: str) -> dict:
    """
    Fetch current loadshedding status for one area.
    Returns a normalised dict: {status, stage, raw}.
    Costs 1 API call.
    """
    try:
        resp = requests.get(
            f"{ESP_BASE}/area",
            headers=_headers(),
            params={"id": area_id, "test": "current"},  # remove test= in prod
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        # ESP v3.1 area response shape:
        # { "events": [...], "info": {...}, "schedule": {...} }
        events = data.get("events", [])
        if events:
            # active event — extract stage from note e.g. "Stage 4 Loadshedding"
            note = events[0].get("note", "")
            stage = _parse_stage(note)
            status = f"stage{stage}" if stage else "active"
        else:
            stage = 0
            status = "none"

        return {"status": status, "stage": stage, "raw": data}

    except Exception as e:
        print(f"[ESP] fetch_area_status({area_id}) failed: {e}")
        return {"status": "unknown", "stage": 0, "raw": None}

def _parse_stage(note: str) -> int:
    """Extract stage number from an event note string."""
    import re
    match = re.search(r"stage\s*(\d+)", note, re.IGNORECASE)
    return int(match.group(1)) if match else 0