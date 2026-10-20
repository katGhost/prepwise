import type { Category, CategoryImpact } from "../api";

function severityClass(severity?: string) {
  if (severity === "high") return "danger";
  if (severity === "moderate") return "warn";
  return "";
}

export function BudgetCard({
  category,
  impact,
}: {
  category: Category;
  impact?: CategoryImpact;
}) {
  const pctSpent = Math.min((category.spent_amount / category.limit_amount) * 100, 100);
  const pctProjected = impact
    ? Math.min(
        ((category.spent_amount + impact.projected_extra_spend) / category.limit_amount) * 100,
        100
      )
    : pctSpent;

  const accentColor = impact
    ? impact.severity === "high"
      ? "var(--accent-high)"
      : impact.severity === "moderate"
      ? "var(--accent-alert)"
      : "var(--accent-safe)"
    : undefined;

  return (
    <div
      className={`budget-card ${impact ? "impacted" : ""}`}
      style={accentColor ? ({ "--category-color": accentColor } as React.CSSProperties) : undefined}
    >
      <div className="budget-card-top">
        <span className="budget-card-category">{category.category}</span>
        <span className="budget-card-amounts">
          R{category.spent_amount.toFixed(0)} / R{category.limit_amount.toFixed(0)}
        </span>
      </div>
      <div className="budget-bar-track">
        <div
          className={`budget-bar-fill ${severityClass(impact?.severity)}`}
          style={{ width: `${pctSpent}%` }}
        />
        {impact && pctProjected > pctSpent && (
          <div
            className="budget-bar-projection"
            style={{ left: `${pctSpent}%`, width: `${pctProjected - pctSpent}%` }}
          />
        )}
      </div>
      {impact && (
        <>
          <p className="impact-note">
            <strong>+R{impact.projected_extra_spend.toFixed(0)} projected</strong> —{" "}
            {impact.rationale}
          </p>
          <p className="impact-action">→ {impact.recommended_action}</p>
        </>
      )}
    </div>
  );
}
