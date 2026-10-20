import type { InsightResponse } from "../api";

export function InsightPanel({ insight }: { insight: InsightResponse }) {
  return (
    <div className="insight-panel">
      <div className="insight-label">
        {insight.event_type.toUpperCase()} DISRUPTION · {insight.highest_severity.toUpperCase()}{" "}
        IMPACT
      </div>
      <p className="insight-text">{insight.insight.text}</p>
    </div>
  );
}
