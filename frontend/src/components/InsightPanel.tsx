import type { InsightResponse, CategoryImpact } from "../api";
import { Droplets, Zap, House, ShoppingCart } from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  food: <ShoppingCart size={16} />,
  electricity: <Zap size={16} />,
  water: <Droplets size={16} />,
  household: <House size={16} />,
};

function severityColor(s: CategoryImpact["severity"]): string {
  return s === "high" ? "var(--danger)" : s === "moderate" ? "var(--amber)" : "var(--green)";
}

export function InsightPanel({
  insight,
  impactByCategory,
}: {
  insight: InsightResponse;
  impactByCategory: Map<string, CategoryImpact>;
}) {
  const impacts = [...impactByCategory.values()].filter(
    (i) => i.projected_extra_spend > 0
  );

  return (
    <div className="insight-panel">
      <div className="insight-label">
        {insight.event_type.toUpperCase()} DISRUPTION ·{" "}
        {insight.highest_severity.toUpperCase()} IMPACT
      </div>

      {impacts.length > 0 && (
        <div className="insight-breakdown">
          {impacts.map((impact) => (
            <div key={impact.category} className="insight-breakdown-row">
              <span className="insight-breakdown-cat">
                {CATEGORY_ICONS[impact.category] ?? "•"}{" "}
                {impact.category.charAt(0).toUpperCase() + impact.category.slice(1)}
              </span>
              <span
                className="insight-breakdown-spend"
                style={{ color: severityColor(impact.severity) }}
              >
                −R{impact.projected_extra_spend.toFixed(2)}
              </span>
              <span className="insight-breakdown-remaining">
                R{impact.projected_remaining_after.toFixed(2)} left
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="insight-text">{insight.insight.text}</p>
    </div>
  );
}