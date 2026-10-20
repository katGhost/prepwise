import type { DisruptionEvent } from "../api";

export function EventFeed({ events }: { events: DisruptionEvent[] }) {
  if (events.length === 0) {
    return <p className="empty-feed">No events yet — trigger one above to see the flow.</p>;
  }
  return (
    <div>
      {events.map((e) => (
        <div className="feed-item" key={e.id}>
          <span className="feed-item-type">
            {e.type === "electricity" ? "⚡" : "💧"} {e.type} outage
          </span>
          <span className="feed-item-time">
            {new Date(e.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
