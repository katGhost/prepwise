import type { DisruptionEvent } from "../api";
import "./EventFeed.css";
import { Droplets, Zap } from "lucide-react";

interface Props {
  events: DisruptionEvent[];
  onResolve: (eventId: string) => void;
}

export function EventFeed({ events, onResolve }: Props) {
  if (events.length === 0) {
    return <p className="empty-feed">No events yet — trigger one above to see the flow.</p>;
  }

  
  return (
    <div>
        {events.map((e) => (
            <div className="feed-item" key={e.id}>
                <span className="feed-item-type">
                    {e.type === "electricity" ? <Zap size={24} color="coral" /> : <Droplets size={24} color="skyblue" />} {e.type} outage
                </span>
                <span className="feed-item-time">
                    {new Date(e.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    })}
                </span>
                {e.status === "active" && (
                    <button
                        onClick={() => onResolve(e.id)}
                        className="text-xs px-3 py-1 rounded-full btn-mark-resolved"
                    >
                        Mark resolved
                    </button>
                )}
            </div>
        ))}
    </div>
  );
}
