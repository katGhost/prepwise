import { useEffect, useState, type ComponentType } from "react";
import { supabase } from "./lib/supabase";
import { api, type Category, type DisruptionEvent, type InsightResponse } from "./api";
import { LoginScreen } from "./pages/LoginScreen";
import { Dashboard } from "./pages/Dashboard";
import type { Session } from "@supabase/supabase-js";

export default function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [householdName, setHouseholdName] = useState("");
    const [categories, setCategories] = useState<Category[]>([]);
    const [events, setEvents] = useState<DisruptionEvent[]>([]);
    const [insight, setInsight] = useState<InsightResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // auth state listener
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => setSession(data.session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        });
        return () => subscription.unsubscribe();
    }, []);

    // load household data once logged in ->
    // pull notifications
    useEffect(() => {
        if (!session) return;
        api.getHousehold().then((h) => setHouseholdName(h.name));
        api.getBudget().then((b) => setCategories(b.categories));
        api.listEvents().then((e) => setEvents(e.events));

        // session notifications
        api.getNotifications().then((n) => {
            setNotifications(n.notifications);
            setUnreadCount(n.unread);
        });
    }, [session]);

    // auth gate
    if (!session) return <LoginScreen />;

    async function handleTrigger(eventType: "electricity" | "water") {
        setLoading(true);
        try {
            const event = await api.triggerEvent(eventType);
            setEvents((prev) => [event, ...prev]);
            const result = await api.getInsight(eventType);
            setInsight(result);
        } finally {
            setLoading(false);
        }
    }

    // handle marking notifications done
    async function handleMarkNotificationsRead() {
        await api.markNotificationsRead();
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }

    // signout
    async function handleSignOut() {
        await supabase.auth.signOut();
        setInsight(null);
        setCategories([]);
        setEvents([]);
    }

    const impactByCategory = new Map(insight?.impacts.map((i) => [i.category, i]) ?? []);
    const DashboardWithProps = Dashboard as unknown as ComponentType<{
        categories: Category[];
        impactByCategory: typeof impactByCategory;
        events: DisruptionEvent[];
        insight: InsightResponse | null;
        notifications: Notification[];
        unreadCount: number;
        onMarkNotificationsRead: () => Promise<void>;
        loading: boolean;
        onTrigger: (eventType: "electricity" | "water") => Promise<void>;
    }>;

    return (
        <>
            <header className="dashboard-header">
                <a
                href="/"
                className="dashboard-brand"
                aria-label="prepWise home"
                >
                <span>prep</span>
                <span className="dashboard-brand-green">Wise</span>
                <span className="dashboard-brand-dot" />
                </a>

                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <span className={`status-chip ${insight ? "alert" : ""}`}>
                    {insight ? `${insight.event_type.toUpperCase()} ACTIVE` : "ALL NORMAL"}
                </span>
                <button
                type="button"
                className="icon-button notification-button"
                aria-label="Notifications"
                onClick={() => console.log('notifications')}
                >
                    <i className="ti ti-bell"></i>
                </button>

                <button onClick={handleSignOut} className="icon-button signout-btn">
                    <i className="ti ti-logout"></i>
                </button>
                </div>
            </header>

            <DashboardWithProps
                categories={categories}
                impactByCategory={impactByCategory}
                events={events}
                insight={insight}
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkNotificationsRead={handleMarkNotificationsRead}
                loading={loading}
                onTrigger={handleTrigger}
            />
        </>
    );
}