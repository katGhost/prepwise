import { useState, useEffect } from "react";
import {
    AlertTriangle,
    ArrowLeft,
    Bell,
    CheckCircle2,
    ChevronRight,
    Droplets,
    FileText,
    House,
    Map,
    MapPin,
    ShieldCheck,
    TrendingUp,
    UserRound,
    Wallet,
    Zap,
    Clock,
    XCircle,
} from "lucide-react";
import { EventFeed } from "../components/EventFeed";
import { EventTrigger } from "../components/EventTrigger";
import { InsightPanel } from "../components/InsightPanel";
import type {
    Category,
    CategoryImpact,
    DisruptionEvent,
    InsightResponse,
    Notification,
} from "../api";
import { api, type AreaOption } from "../api";
import "./Dashboard.css";

/* ─── Types ──── */
type Tab = "home" | "outages" | "events" | "impact" | "profile";

type DashboardProps = {
    categories: Category[];
    impactByCategory: Map<string, CategoryImpact>;
    events: DisruptionEvent[];
    insight: InsightResponse | null;
    notifications: Notification[];
    unreadCount: number;
    onMarkNotificationsRead: () => Promise<void>;
    loading: boolean;
    onTrigger: (eventType: "electricity" | "water") => Promise<void>;
    onResolve: (eventId: string) => Promise<void>;
};

const NAV: { id: Tab; label: string; icon: typeof House }[] = [
    { id: "home", label: "Overview", icon: House },
    { id: "outages", label: "Outages", icon: Map },
    { id: "events", label: "Report", icon: FileText },
    { id: "impact", label: "Impact", icon: TrendingUp },
    { id: "profile", label: "Profile", icon: UserRound },
];

/* ─── Helpers ─── */
function relTime(iso: string): string {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function byRecent(events: DisruptionEvent[]) {
    return [...events].sort(
        (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

/* Area Selector */
function AreaSelector({
    currentAreaId,
    onSaved,
}: {
    currentAreaId: string | null;
    onSaved?: (areaId: string) => void;
}) {
    const [areas, setAreas] = useState<AreaOption[]>([]);
    const [selected, setSelected] = useState(currentAreaId ?? "");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.getAreas().then((r) => setAreas(r.areas));
    }, []);

    // Re-sync whenever the saved value arrives or changes
    useEffect(() => {
        setSelected(currentAreaId ?? "");
    }, [currentAreaId]);

    // If the stored id isn't a valid option, show the placeholder instead of a blank select
    const value = areas.some((a) => a.id === selected) ? selected : "";

    async function handleSave() {
        if (!value) return;
        setSaving(true);
        setError(null);
        try {
            await api.setArea(value);
            onSaved?.(value);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch {
            setError("Couldn't save area. Try again.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="area-selector">
            <select
                className="area-select"
                value={value}
                onChange={(e) => {
                    setSelected(e.target.value);
                    setSaved(false);
                }}
                aria-label="Select service area"
            >
                <option value="" disabled>
                    Select your area
                </option>
                {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                        {a.name}
                    </option>
                ))}
            </select>
            <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={saving || !value}
            >
                {saved ? "Saved" : saving ? "Saving…" : "Confirm"}
            </button>
            {error && <p className="area-error">{error}</p>}
        </div>
    );
}

/* ─── Budget Detail Sub-view ─────────────────────────────── */
function BudgetDetail({
    category,
    onBack,
}: {
    category: Category;
    onBack: () => void;
}) {
    const pct =
        category.limit_amount > 0
            ? Math.min(100, (category.spent_amount / category.limit_amount) * 100)
            : 0;
    const over = category.spent_amount > category.limit_amount;
    const remaining = category.limit_amount - category.spent_amount;

    return (
        <div className="sub-page">
            <button className="back-btn" onClick={onBack} type="button">
                <ArrowLeft size={16} /> Back
            </button>

            <h2 className="sub-page-title" style={{ textTransform: "capitalize" }}>
                {category.category}
            </h2>
            <p className="sub-page-sub">Monthly budget allocation</p>

            <div className="detail-stat-grid">
                <div className="detail-stat">
                    <span className="detail-stat-label">Allocated</span>
                    <strong className="detail-stat-value">
                        R {category.limit_amount.toLocaleString("en-ZA")}
                    </strong>
                </div>
                <div className="detail-stat">
                    <span className="detail-stat-label">Spent</span>
                    <strong className={`detail-stat-value ${over ? "text-danger" : ""}`}>
                        R {category.spent_amount.toLocaleString("en-ZA")}
                    </strong>
                </div>
                <div className="detail-stat">
                    <span className="detail-stat-label">
                        {over ? "Over by" : "Remaining"}
                    </span>
                    <strong
                        className={`detail-stat-value ${over ? "text-danger" : "text-green"}`}
                    >
                        R {Math.abs(remaining).toLocaleString("en-ZA")}
                    </strong>
                </div>
            </div>

            <div className="budget-bar-track" style={{ marginTop: "1.5rem" }}>
                <div
                    className={`budget-bar-fill ${over ? "over" : ""}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className="bar-legend">{pct.toFixed(0)}% of monthly budget used</p>

            <div className="info-block">
                <ShieldCheck size={15} />
                <p>
                    Budget limits help track disruption-related overspend. Contact your
                    household administrator to adjust allocations.
                </p>
            </div>
        </div>
    );
}

/* ─── Dashboard ─ */
export function Dashboard({
    categories,
    impactByCategory,
    events,
    insight,
    notifications,
    unreadCount,
    onMarkNotificationsRead,
    loading,
    onTrigger,
    onResolve,
}: DashboardProps) {
    const [activeTab, setActiveTab] = useState<Tab>("home");
    const [budgetDetail, setBudgetDetail] = useState<Category | null>(null);
    const [household, setHousehold] = useState<{
        id: string;
        name: string;
        area_id?: string | null;
    } | null>(null);

    useEffect(() => {
        api.getHousehold().then((h) => setHousehold(h));
    }, []);

    const recentEvents = byRecent(events);
    const activeEvents = recentEvents.filter((e) => e.status === "active");
    const outageCount = activeEvents.length;

    const impacts = [...impactByCategory.values()];
    const totalExtraSpend = impacts.reduce(
        (s, i) => s + (i.projected_extra_spend ?? 0),
        0,
    );
    const highestSeverity = impacts.length
        ? impacts.reduce<CategoryImpact["severity"]>((worst, i) => {
            const rank = { low: 0, moderate: 1, high: 2 } as const;
            return rank[i.severity] > rank[worst] ? i.severity : worst;
        }, "low")
        : null;

    const serviceCategories = categories.filter(
        (c) => c.category === "electricity" || c.category === "water",
    );

    function nav(tab: Tab) {
        setBudgetDetail(null);
        setActiveTab(tab);
    }

    async function handleTriggerAndNavigate(eventType: "electricity" | "water") {
        await onTrigger(eventType);
        nav("impact");
    }

    /* ── Status rail state ─ */
    const systemStatus =
        outageCount > 0
            ? {
                label: "Active disruption",
                cls: "rail-alert",
                icon: <AlertTriangle size={13} />,
            }
            : {
                label: "All services normal",
                cls: "rail-ok",
                icon: <CheckCircle2 size={13} />,
            };

    return (
        <div className="dashboard">
            {/* Status Rail — one persistent element at top of content */}
            <div className={`status-rail ${systemStatus.cls}`}>
                {systemStatus.icon}
                <span>{systemStatus.label}</span>
                {outageCount > 0 && (
                    <span className="rail-count">{outageCount} active</span>
                )}
            </div>

            <main className="dashboard-content">
                {/* HOME */}
                {activeTab === "home" && (
                    <section className="tab-page">
                        <div className="page-header">
                            <h1>Overview</h1>
                            <p>Current disruption status for your household.</p>
                        </div>

                        {/* Metric row */}
                        <div className="metric-grid">
                            <article className="metric-card">
                                <AlertTriangle size={17} className="metric-icon amber-metric" />
                                <strong className="metric-value">{outageCount}</strong>
                                <span className="metric-label">Active outages</span>
                            </article>
                            <article className="metric-card">
                                <Wallet size={17} className="metric-icon green-metric" />
                                <strong className="metric-value">
                                    {insight
                                        ? `R ${totalExtraSpend.toLocaleString("en-ZA")}`
                                        : "—"}
                                </strong>
                                <span className="metric-label">Projected extra spend</span>
                            </article>
                        </div>

                        {/* Community alerts */}
                        {notifications.length > 0 ? (
                            <div className="content-block">
                                <div className="block-header">
                                    <div>
                                        <h2>Community alerts</h2>
                                        <p>Outages reported near your area.</p>
                                    </div>
                                    {unreadCount > 0 && (
                                        <button
                                            className="text-link"
                                            onClick={onMarkNotificationsRead}
                                            type="button"
                                        >
                                            Mark read
                                        </button>
                                    )}
                                </div>
                                <ul className="alert-list">
                                    {notifications.slice(0, 5).map((n) => (
                                        <li
                                            key={n.id}
                                            className={`alert-item ${n.read ? "" : "alert-item-unread"}`}
                                        >
                                            <Bell size={14} className="alert-item-icon" />
                                            <div className="alert-item-body">
                                                <p>{n.message}</p>
                                                <span>{relTime(n.created_at)}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="content-block">
                                <div className="block-header">
                                    <div>
                                        <h2>Community alerts</h2>
                                        <p>Outages reported near your area.</p>
                                    </div>
                                </div>
                                <p className="empty-note">No community alerts at this time.</p>
                            </div>
                        )}

                        {/* Quick actions */}
                        <div className="content-block">
                            <div className="block-header">
                                <h2>Quick actions</h2>
                            </div>
                            <div className="action-list">
                                <button
                                    type="button"
                                    className="action-row"
                                    onClick={() => nav("events")}
                                >
                                    <FileText size={16} />
                                    <span>Report a disruption</span>
                                    <ChevronRight size={15} />
                                </button>
                                <button
                                    type="button"
                                    className="action-row"
                                    onClick={() => nav("outages")}
                                >
                                    <Map size={16} />
                                    <span>View outage log</span>
                                    <ChevronRight size={15} />
                                </button>
                                <button
                                    type="button"
                                    className="action-row"
                                    onClick={() => nav("profile")}
                                >
                                    <MapPin size={16} />
                                    <span>Update service area</span>
                                    <ChevronRight size={15} />
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── OUTAGES ──────────────────────────────────────── */}
                {activeTab === "outages" && (
                    <section className="tab-page">
                        <div className="page-header">
                            <h1>Outages</h1>
                            <p>Budget exposure and disruption log for your household.</p>
                        </div>

                        {/* Budget bars — service categories only */}
                        {serviceCategories.length > 0 && (
                            <div className="content-block">
                                <div className="block-header">
                                    <h2>Budget exposure</h2>
                                    <p>Spend against monthly allocation.</p>
                                </div>
                                <div className="budget-compare">
                                    {serviceCategories.map((cat) => {
                                        const Icon = cat.category === "water" ? Droplets : Zap;
                                        const impact = impactByCategory.get(cat.category);
                                        const spent = impact?.spent_amount ?? cat.spent_amount;
                                        const limit = cat.limit_amount;
                                        const pct =
                                            limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
                                        const over = limit > 0 && spent > limit;
                                        return (
                                            <div key={cat.category} className="budget-compare-row">
                                                <span className={`service-icon ${cat.category}-icon`}>
                                                    <Icon size={16} />
                                                </span>
                                                <div className="budget-compare-body">
                                                    <div className="budget-compare-labels">
                                                        <strong style={{ textTransform: "capitalize" }}>
                                                            {cat.category}
                                                        </strong>
                                                        <span className={over ? "text-danger" : ""}>
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
                                                            {
                                                                {
                                                                    low: "Low impact",
                                                                    moderate: "Moderate impact",
                                                                    high: "High impact",
                                                                }[impact.severity]
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Outage log — read-only timeline, no trigger action here */}
                        <div className="content-block">
                            <div className="block-header">
                                <h2>Disruption log</h2>
                                <p>All recorded events, newest first.</p>
                            </div>
                            {recentEvents.length === 0 ? (
                                <p className="empty-note">
                                    No disruptions recorded. Report one from the Report tab.
                                </p>
                            ) : (
                                <ul className="outage-log">
                                    {recentEvents.map((event) => {
                                        const Icon = event.type === "water" ? Droplets : Zap;
                                        const isActive = event.status === "active";
                                        return (
                                            <li key={event.id} className="outage-log-item">
                                                <span className={`service-icon ${event.type}-icon`}>
                                                    <Icon size={15} />
                                                </span>
                                                <div className="outage-log-body">
                                                    <div className="outage-log-row">
                                                        <strong style={{ textTransform: "capitalize" }}>
                                                            {event.type} disruption
                                                        </strong>
                                                        <span
                                                            className={`event-status-badge ${isActive ? "badge-active" : "badge-resolved"}`}
                                                        >
                                                            {isActive ? "Active" : "Resolved"}
                                                        </span>
                                                    </div>
                                                    <span className="outage-log-meta">
                                                        <Clock size={11} />
                                                        {relTime(event.created_at)}
                                                        {event.outage_status &&
                                                            event.outage_status !== "none" && (
                                                                <> · {event.outage_status}</>
                                                            )}
                                                        {event.stage != null && event.stage > 0 && (
                                                            <> · Stage {event.stage}</>
                                                        )}
                                                    </span>
                                                </div>
                                                {isActive && (
                                                    <button
                                                        type="button"
                                                        className="resolve-btn"
                                                        onClick={() => onResolve(event.id)}
                                                        aria-label="Mark resolved"
                                                    >
                                                        <XCircle size={15} />
                                                    </button>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </section>
                )}

                {/* ── EVENTS / REPORT ──────────────────────────────── */}
                {activeTab === "events" && (
                    <section className="tab-page">
                        <div className="page-header">
                            <h1>Report a disruption</h1>
                            <p>
                                Log an electricity or water outage to generate a budget impact
                                assessment.
                            </p>
                        </div>

                        <EventTrigger
                            onTrigger={handleTriggerAndNavigate}
                            disabled={loading}
                        />

                        {/* EventFeed lives HERE and only here */}
                        <div className="content-block">
                            <div className="block-header">
                                <h2>Recent reports</h2>
                                <p>Events you have logged this session.</p>
                            </div>
                            {recentEvents.length === 0 ? (
                                <p className="empty-note">
                                    No events logged yet. Use the trigger above to get started.
                                </p>
                            ) : (
                                <EventFeed events={recentEvents} onResolve={onResolve} />
                            )}
                        </div>
                    </section>
                )}

                {/* ── IMPACT ───────────────────────────────────────── */}
                {activeTab === "impact" && (
                    <section className="tab-page">
                        <div className="page-header">
                            <h1>Impact assessment</h1>
                            <p>Financial implications of the latest disruption.</p>
                        </div>

                        <div className="metric-grid">
                            <article className="metric-card">
                                <Wallet size={17} className="metric-icon green-metric" />
                                <strong className="metric-value">
                                    {insight
                                        ? `R ${totalExtraSpend.toLocaleString("en-ZA")}`
                                        : "—"}
                                </strong>
                                <span className="metric-label">Projected extra spend</span>
                            </article>
                            <article className="metric-card">
                                <AlertTriangle size={17} className="metric-icon amber-metric" />
                                <strong className="metric-value">
                                    {highestSeverity
                                        ? { low: "Low", moderate: "Moderate", high: "High" }[
                                        highestSeverity
                                        ]
                                        : "—"}
                                </strong>
                                <span className="metric-label">Highest severity</span>
                            </article>
                        </div>

                        {insight ? (
                            <InsightPanel
                                insight={insight}
                                impactByCategory={impactByCategory}
                            />
                        ) : (
                            <div className="content-block">
                                <div className="empty-state-block">
                                    <TrendingUp size={24} className="empty-icon" />
                                    <h3>No assessment yet</h3>
                                    <p>
                                        Report a disruption from the Report tab to generate a
                                        household impact assessment.
                                    </p>
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={() => nav("events")}
                                    >
                                        Report a disruption
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="info-block">
                            <CheckCircle2 size={15} />
                            <p>
                                Assessments are generated using your household budget data and
                                current outage status. Results are logged for audit purposes.
                            </p>
                        </div>
                    </section>
                )}

                {/* ── PROFILE ──────────────────────────────────────── */}
                {activeTab === "profile" && budgetDetail ? (
                    <BudgetDetail
                        category={budgetDetail}
                        onBack={() => setBudgetDetail(null)}
                    />
                ) : (
                    activeTab === "profile" && (
                        <section className="tab-page">
                            <div className="page-header">
                                <h1>Household profile</h1>
                                <div className="household-wrapper">
                                    <span className="household-name">
                                        {household?.name || "Unnamed Household"}
                                    </span>
                                </div>
                                <p>Manage your service area and budget allocations.</p>
                            </div>

                            {/* Area */}
                            <div className="content-block">
                                <div className="block-header">
                                    <h2>Service area</h2>
                                    <p>Used for outage monitoring and community alerts.</p>
                                </div>
                                <AreaSelector
                                    currentAreaId={household?.area_id ?? null}
                                    onSaved={(id) => setHousehold((h) => (h ? { ...h, area_id: id } : h))}
                                />
                            </div>

                            {/* Budget — each category opens BudgetDetail */}
                            <div className="content-block">
                                <div className="block-header">
                                    <h2>Budget allocations</h2>
                                    <p>Monthly limits per service category.</p>
                                </div>
                                {categories.length === 0 ? (
                                    <p className="empty-note">No budget categories configured.</p>
                                ) : (
                                    <ul className="profile-item-list">
                                        {categories.map((cat) => {
                                            const Icon =
                                                cat.category === "water"
                                                    ? Droplets
                                                    : cat.category === "electricity"
                                                        ? Zap
                                                        : Wallet;
                                            const pct =
                                                cat.limit_amount > 0
                                                    ? Math.min(
                                                        100,
                                                        (cat.spent_amount / cat.limit_amount) * 100,
                                                    )
                                                    : 0;
                                            const over = cat.spent_amount > cat.limit_amount;
                                            return (
                                                <li key={cat.category}>
                                                    <button
                                                        type="button"
                                                        className="profile-item"
                                                        onClick={() => setBudgetDetail(cat)}
                                                    >
                                                        <span
                                                            className={`service-icon ${cat.category === "water" ? "water-icon" : cat.category === "electricity" ? "electricity-icon" : ""}`}
                                                        >
                                                            <Icon size={15} />
                                                        </span>
                                                        <div className="profile-item-body">
                                                            <strong style={{ textTransform: "capitalize" }}>
                                                                {cat.category}
                                                            </strong>
                                                            <div
                                                                className="budget-bar-track"
                                                                style={{ marginTop: "4px" }}
                                                            >
                                                                <div
                                                                    className={`budget-bar-fill ${over ? "over" : ""}`}
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                            <span
                                                                className={`profile-item-sub ${over ? "text-danger" : ""}`}
                                                            >
                                                                R {cat.spent_amount.toLocaleString("en-ZA")} / R{" "}
                                                                {cat.limit_amount.toLocaleString("en-ZA")}
                                                            </span>
                                                        </div>
                                                        <ChevronRight
                                                            size={15}
                                                            className="profile-item-arrow"
                                                        />
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>

                            {/* Account settings — placeholder rows */}
                            <div className="content-block">
                                <div className="block-header">
                                    <h2>Account</h2>
                                </div>
                                <ul className="profile-item-list">
                                    <li>
                                        <button type="button" className="profile-item" disabled>
                                            <Bell size={15} />
                                            <div className="profile-item-body">
                                                <strong>Notifications</strong>
                                                <span className="profile-item-sub">
                                                    Manage alert preferences
                                                </span>
                                            </div>
                                            <ChevronRight size={15} className="profile-item-arrow" />
                                        </button>
                                    </li>
                                    <li>
                                        <button type="button" className="profile-item" disabled>
                                            <ShieldCheck size={15} />
                                            <div className="profile-item-body">
                                                <strong>Privacy & data</strong>
                                                <span className="profile-item-sub">
                                                    Manage your account data
                                                </span>
                                            </div>
                                            <ChevronRight size={15} className="profile-item-arrow" />
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </section>
                    )
                )}
            </main>

            {/* ── Bottom nav ───────────────────────────────────── */}
            <nav className="bottom-nav" aria-label="Main navigation">
                {NAV.map(({ id, label, icon: Icon }) => {
                    const active = activeTab === id;
                    const isReport = id === "events";
                    return (
                        <button
                            key={id}
                            type="button"
                            className={[
                                "nav-item",
                                active ? "nav-item-active" : "",
                                isReport ? "nav-item-report" : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            onClick={() => nav(id)}
                            aria-current={active ? "page" : undefined}
                            aria-label={label}
                        >
                            <span className="nav-icon-wrap">
                                <Icon
                                    size={isReport ? 22 : 20}
                                    strokeWidth={active ? 2.2 : 1.7}
                                />
                                {id === "outages" && outageCount > 0 && (
                                    <span className="nav-badge">{outageCount}</span>
                                )}
                                {id === "home" && unreadCount > 0 && (
                                    <span className="nav-badge">{unreadCount}</span>
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
