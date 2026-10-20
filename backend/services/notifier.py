from services.area_config import ADJACENT, resolve_area_id
from services.supabase_client import get_households_in_area, write_notification

def notify_nearby(
    triggering_household_id: str,
    triggering_area_id: str,
    event_type: str,
) -> int:
    """
    Write a notification row for every household in areas adjacent to
    triggering_area_id, excluding the triggering household itself.
    Returns the number of notifications written.
    """
    parent_area = resolve_area_id(triggering_area_id)
    adjacent_areas = ADJACENT.get(parent_area, [])

    if not adjacent_areas:
        return 0

    service_label = "electricity" if event_type == "electricity" else "water"
    from services.area_config import POLL_AREAS
    area_name = POLL_AREAS.get(parent_area, parent_area)
    message = (
        f"Heads up: a {service_label} outage was just reported in {area_name}, "
        f"which is close to your area. Check your household impact."
    )

    count = 0
    for area_id in adjacent_areas:
        households = get_households_in_area(area_id)
        for hh in households:
            if hh["id"] == triggering_household_id:
                continue  # don't notify yourself
            write_notification(hh["id"], message, parent_area)
            count += 1

    return count