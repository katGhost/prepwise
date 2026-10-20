import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Droplets,
  FileText,
  House,
  Map,
  MapPin,
  Settings2,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";
import { EventFeed } from "../components/EventFeed";
import { EventTrigger } from "../components/EventTrigger";
import { InsightPanel } from "../components/InsightPanel";
import type {
  Category,
  CategoryImpact,
  DisruptionEvent,
  InsightResponse,
} from "../api";
import "./Dashboard.css";

type Tab = "home" | "outages" | "events" | "impact" | "profile";

type DashboardProps = {
  categories: Category[];
  impactByCategory: Map<string, CategoryImpact>;
  events: DisruptionEvent[];
  insight: InsightResponse | null;
  loading: boolean;
  onTrigger: (eventType: "electricity" | "water") => Promise<void>;
};

const navigation: { id: Tab; label: string; icon: typeof House }[] = [
  { id: "home", label: "Home", icon: House },
  { id: "outages", label: "Outages", icon: Map },
  { id: "events", label: "Events", icon: FileText },
  { id: "impact", label: "Impact", icon: TrendingUp },
  { id: "profile", label: "Profile", icon: UserRound },
];

const SEVERITY_LABEL: Record<CategoryImpact["severity"], string> = {
  low: "Low impact",
  moderate: "Moderate impact",
  high: "High impact",
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function sortedByRecent(events: DisruptionEvent[]) {
  return [...events].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function Dashboard({
  categories,
  impactByCategory,
  events,
  insight,
  loading,
  onTrigger,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const serviceCategories = categories.filter(
    (c) => c.category === "electricity" || c.category === "water",
  );
  const area = categories.length > 0 ? (categories[0]?.category ?? null) : null;
  const outageCount = events.length;
  const recentEvents = sortedByRecent(events);

  const impacts = [...impactByCategory.values()];
  const totalExtraSpend = impacts.reduce(
    (sum, i) => sum + (i.projected_extra_spend ?? 0),
    0,
  );
  const highestSeverity: CategoryImpact["severity"] | null = impacts.length
    ? impacts.reduce<CategoryImpact["severity"]>((worst, i) => {
        const rank = { low: 0, moderate: 1, high: 2 } as const;
        return rank[i.severity] > rank[worst] ? i.severity : worst;
      }, "low")
    : null;

  function navigate(tab: Tab) {
    setActiveTab(tab);
  }

  // Trigger an event, then jump to Impact once the insight is ready.
  async function handleTriggerAndNavigate(eventType: "electricity" | "water") {
    await onTrigger(eventType);
    navigate("impact");
  }

  return (
    <div className="dashboard">
      <main className="dashboard-content">
        {activeTab === "home" && (
          <>
            <section className="welcome-section">
              <p className="section-eyebrow">YOUR HOUSEHOLD</p>
              <h1>Good to have you back.</h1>
              <p className="subtitle">
                Know what the disruption means for your money
              </p>
            </section>

            <div className="metric-grid">
              <article className="metric-card">
                <span className="metric-icon amber-metric">
                  <AlertTriangle size={19} />
                </span>
                <strong className="metric-value">{outageCount}</strong>
                <span className="metric-label">Logged outages</span>
              </article>
              <article className="metric-card">
                <span className="metric-icon green-metric">
                  <Wallet size={19} />
                </span>
                <strong className="metric-value">
                  {insight
                    ? `R ${totalExtraSpend.toLocaleString("en-ZA")}`
                    : "R —"}
                </strong>
                <span className="metric-label">Projected extra spend</span>
              </article>
            </div>

            <button
              type="button"
              className="area-card"
              onClick={() => navigate("profile")}
            >
              <span className="area-icon">
                <MapPin size={19} />
              </span>
              <span className="area-copy">
                <strong className="household-setter">
                  {area ?? "Set your household area"}
                </strong>
                <small>
                  {area
                    ? "Your local service overview"
                    : "Personalise your outage overview"}
                </small>
              </span>
              <ChevronRight size={19} />
            </button>

            <section className="events-section">
              <div className="section-heading">
                <div>
                  <h2>Recent activity</h2>
                  <p>Everything that's happened lately, newest first.</p>
                </div>
                <button
                  className="text-link"
                  onClick={() => navigate("outages")}
                  type="button"
                >
                  View all <ArrowRight size={15} />
                </button>
              </div>

              {recentEvents.length === 0 ? (
                <p className="data-note">
                  <Activity size={14} />
                  No activity yet — trigger or report a disruption to get
                  started.
                </p>
              ) : (
                <ul className="activity-list">
                  {recentEvents.slice(0, 3).map((event) => {
                    const Icon = event.type === "water" ? Droplets : Zap;
                    return (
                      <li key={event.id} className="activity-item">
                        <span className={`service-icon ${event.type}-icon`}>
                          <Icon size={17} />
                        </span>
                        <span className="activity-copy">
                          <strong>
                            {event.type === "water"
                              ? "Water disruption"
                              : "Electricity outage"}
                          </strong>
                          <small>
                            {formatRelativeTime(event.created_at)} ·{" "}
                            {event.status}
                          </small>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate("events")}
              >
                Report a disruption
              </button>
            </section>
          </>
        )}

        {activeTab === "outages" && (
          <section className="tab-page">
            <p className="section-eyebrow">YOUR COMMUNITY</p>
            <h1>Outage explorer</h1>
            <p className="tab-intro">
              Recent outages and what they're costing against your budget.
            </p>

            <div className="budget-compare">
              {serviceCategories.map((category) => {
                const Icon = category.category === "water" ? Droplets : Zap;
                const impact = impactByCategory.get(category.category);
                const spent = impact?.spent_amount ?? category.spent_amount;
                const limit = category.limit_amount;
                const pct =
                  limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
                const over = limit > 0 && spent > limit;
                return (
                  <div key={category.category} className="budget-compare-row">
                    <span className={`service-icon ${category.category}-icon`}>
                      <Icon size={17} />
                    </span>
                    <div className="budget-compare-body">
                      <div className="budget-compare-labels">
                        <strong>
                          {category.category === "water"
                            ? "Water"
                            : "Electricity"}
                        </strong>
                        <span className={over ? "danger-text" : ""}>
                          R {spent.toLocaleString("en-ZA")} / R{" "}
                          {limit.toLocaleString("en-ZA")}
                        </span>
                      </div>
                      <div className="budget-bar-track">
                        <div
                          className={`budget-bar-fill ${over ? "over" : ""}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {impact && (
                        <span
                          className={`severity-tag severity-${impact.severity}`}
                        >
                          {SEVERITY_LABEL[impact.severity]}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="section-heading">
              <div>
                <h2>Outage log</h2>
                <p>Most recent first.</p>
              </div>
            </div>

            {recentEvents.length === 0 ? (
              <div className="empty-state">
                <Map size={30} />
                <h2>No outages logged yet</h2>
                <p>
                  Trigger or report a disruption to start building your log.
                </p>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => navigate("events")}
                >
                  Report a disruption
                </button>
              </div>
            ) : (
              <EventFeed events={recentEvents} />
            )}
          </section>
        )}

        {activeTab === "events" && (
          <section className="tab-page">
            <p className="section-eyebrow">TAKE ACTION</p>
            <h1>Report a disruption</h1>
            <p className="tab-intro">
              Trigger an event and we'll work out what it means for your budget.
            </p>

            <EventTrigger
              onTrigger={handleTriggerAndNavigate}
              disabled={loading}
            />

            <div className="section-heading">
              <div>
                <h2>Events feed</h2>
                <p>Live log of everything triggered or reported.</p>
              </div>
            </div>
            <EventFeed events={recentEvents} />
          </section>
        )}

        {activeTab === "impact" && (
          <section className="tab-page">
            <p className="section-eyebrow">EVIDENCE & ACCOUNTABILITY</p>
            <h1>Your impact</h1>
            <p className="tab-intro">
              What the latest disruption cost you, and what to do next.
            </p>

            <div className="metric-grid">
              <article className="metric-card">
                <span className="metric-icon green-metric">
                  <Wallet size={19} />
                </span>
                <strong className="metric-value">
                  {insight
                    ? `R ${totalExtraSpend.toLocaleString("en-ZA")}`
                    : "R —"}
                </strong>
                <span className="metric-label">Projected extra spend</span>
              </article>
              <article className="metric-card">
                <span className="metric-icon amber-metric">
                  <AlertTriangle size={19} />
                </span>
                <strong className="metric-value">
                  {highestSeverity ? SEVERITY_LABEL[highestSeverity] : "—"}
                </strong>
                <span className="metric-label">Highest severity</span>
              </article>
            </div>

            {insight ? (
              <InsightPanel insight={insight} />
            ) : (
              <div className="empty-state">
                <TrendingUp size={30} />
                <h2>Your impact story starts here</h2>
                <p>
                  Trigger a disruption from the Events tab to generate an
                  insight.
                </p>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => navigate("events")}
                >
                  Go to Events
                </button>
              </div>
            )}

            <div className="accountability-card">
              <CheckCircle2 size={23} className="accountability-icon" />
              <div className="accountability-copy">
                <h2>Accountability matters</h2>
                <p>
                  Track actions taken and distinguish submitted reports from
                  acknowledged or resolved cases.
                </p>
              </div>
            </div>
          </section>
        )}

        {activeTab === "profile" && (
          <section className="tab-page">
            <p className="section-eyebrow">YOUR ACCOUNT</p>
            <h1>Household profile</h1>
            <p className="tab-intro">
              Manage your budget, area and account settings.
            </p>

            <div className="section-heading">
              <div>
                <h2>Budget management</h2>
                <p>Monthly allocation per category.</p>
              </div>
            </div>
            {categories.length === 0 ? (
              <p className="data-note">
                <Wallet size={14} />
                No budget categories set up yet.
              </p>
            ) : (
              <ul className="budget-list">
                {categories.map((category) => (
                  <li key={category.category} className="profile-setting">
                    <Wallet size={21} />
                    <div>
                      <strong style={{ textTransform: "capitalize" }}>
                        {category.category}
                      </strong>
                      <p>
                        R {category.spent_amount.toLocaleString("en-ZA")} / R{" "}
                        {category.limit_amount.toLocaleString("en-ZA")} spent
                      </p>
                    </div>
                    <ChevronRight size={19} />
                  </li>
                ))}
              </ul>
            )}

            <div className="profile-setting">
              <MapPin size={21} />
              <div>
                <strong>Household area</strong>
                <p>{area ?? "No area configured"}</p>
              </div>
              <ChevronRight size={19} />
            </div>

            <div className="profile-setting">
              <Bell size={21} />
              <div>
                <strong>Notifications</strong>
                <p>Manage outage and report updates</p>
              </div>
              <ChevronRight size={19} />
            </div>

            <div className="profile-setting">
              <ShieldCheck size={21} />
              <div>
                <strong>Account & privacy</strong>
                <p>Manage your account and data</p>
              </div>
              <ChevronRight size={19} />
            </div>

            <div className="profile-setting">
              <Settings2 size={21} />
              <div>
                <strong>Settings</strong>
                <p>App preferences</p>
              </div>
              <ChevronRight size={19} />
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {navigation.map(({ id, label, icon: Icon }) => {
          const selected = activeTab === id;
          const isReport = id === "events";
          return (
            <button
              key={id}
              type="button"
              className={[
                "nav-item",
                selected ? "nav-item-active" : "",
                isReport ? "nav-item-report" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => navigate(id)}
              aria-current={selected ? "page" : undefined}
              aria-label={label}
            >
              <span className="nav-icon-wrap">
                <Icon
                  size={isReport ? 23 : 21}
                  strokeWidth={selected ? 2.3 : 1.8}
                />
                {id === "outages" && outageCount > 0 && (
                  <span className="nav-badge">{outageCount}</span>
                )}
              </span>
              <span className="nav-label">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
