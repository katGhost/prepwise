from apscheduler.schedulers.background import BackgroundScheduler
from services.eskomsepush import fetch_area_status
from services.area_config import POLL_AREAS
from services.supabase_client import write_outage_cache

_scheduler: BackgroundScheduler | None = None

def poll_all_areas():
    """
    Fetch status for all 6 parent areas and upsert into outage_cache.
    6 calls per run × ~6 runs/day = ~36 calls/day (well within free tier limit of 50).
    """
    print("[scheduler] Polling EskomSePush...")
    for area_id, area_name in POLL_AREAS.items():
        result = fetch_area_status(area_id)
        write_outage_cache(area_id, area_name, result["status"], result["stage"], result["raw"])
    print("[scheduler] Poll complete.")

def start_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is not None:
        return _scheduler
    _scheduler = BackgroundScheduler(daemon=True)
    # Every 3.5 hours → ~6.8 runs/day → ~41 API calls/day
    _scheduler.add_job(poll_all_areas, "interval", hours=3, minutes=30, id="esp_poll")
    _scheduler.start()
    # Run once immediately on boot so the cache is warm before any user request
    poll_all_areas()
    print("[scheduler] Started — polling every 3.5 hours.")
    return _scheduler