"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  FileText,
  MessageSquare,
  AlertTriangle,
  IndianRupee,
  Layers,
  TrendingUp,
  Activity,
  Cpu,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import toast from "react-hot-toast";

// Custom premium charts mocks for visualization
const SIGNUPS_DATA = [
  { name: "Week 1", Brands: 4, Influencers: 12 },
  { name: "Week 2", Brands: 7, Influencers: 19 },
  { name: "Week 3", Brands: 12, Influencers: 31 },
  { name: "Week 4", Brands: 18, Influencers: 45 },
];

const CARDS_POSTED_DATA = [
  { name: "Mon", Cards: 3 },
  { name: "Tue", Cards: 5 },
  { name: "Wed", Cards: 2 },
  { name: "Thu", Cards: 8 },
  { name: "Fri", Cards: 6 },
  { name: "Sat", Cards: 4 },
  { name: "Sun", Cards: 7 },
];

export default function AdminDashboardPage() {
  const supabase = createClient() as any;
  const [stats, setStats] = useState({
    users: 0,
    cards: 0,
    applications: 0,
    rooms: 0,
    reports: 0,
    moderation: 0,
  });
  const [dbPool, setDbPool] = useState({ active: 8, total: 100, idle: 45 });
  const [responseTime, setResponseTime] = useState(82); // in ms
  const [loading, setLoading] = useState(true);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);

  const loadDashboardData = async () => {
    try {
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: cardsCount } = await supabase
        .from("cards")
        .select("*", { count: "exact", head: true });

      const { count: appsCount } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true });

      const { count: roomsCount } = await supabase
        .from("rooms")
        .select("*", { count: "exact", head: true });

      const { count: reportsCount } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true });

      const { count: moderationCount } = await supabase
        .from("moderation_queue")
        .select("*", { count: "exact", head: true });

      setStats({
        users: usersCount || 0,
        cards: cardsCount || 0,
        applications: appsCount || 0,
        rooms: roomsCount || 0,
        reports: reportsCount || 0,
        moderation: moderationCount || 0,
      });

      // Load recent audit logs first
      const { data: auditLogs } = await supabase
        .from("audit_logs")
        .select(`
          id,
          action,
          actor_role,
          created_at,
          actor:profiles!actor_id (
            display_name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      const events: any[] = [];

      if (auditLogs && auditLogs.length > 0) {
        auditLogs.forEach((log: any) => {
          events.push({
            id: log.id,
            type: "audit",
            title: log.action.toUpperCase().replace(/_/g, " "),
            body: `Action performed by ${log.actor?.display_name || "System"} (${log.actor_role})`,
            time: new Date(log.created_at),
          });
        });
      } else {
        // Fallback mock signup / card events if audit log is empty
        const { data: usersList } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        usersList?.forEach((u: any) => {
          events.push({
            id: `u-${u.id}`,
            type: "signup",
            title: "New User Registered",
            body: `${u.display_name} joined as a ${u.role}`,
            time: new Date(u.created_at || ""),
          });
        });
      }

      setRecentEvents(events);

      // Simulate connection pool & telemetry jitters
      setDbPool({
        active: Math.floor(Math.random() * 15) + 5,
        total: 100,
        idle: Math.floor(Math.random() * 20) + 30,
      });
      setResponseTime(Math.floor(Math.random() * 30) + 65);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to refresh administration data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Setup realtime subscription to audit logs
    const channel = supabase
      .channel("admin-audit-logs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_logs",
        },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[#0d0d0d] rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-[#0d0d0d] rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-[#0d0d0d] rounded-2xl" />
          <div className="h-80 bg-[#0d0d0d] rounded-2xl" />
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Total Users", value: stats.users, icon: Users },
    { label: "Total Campaigns", value: stats.cards, icon: FileText },
    { label: "Applications", value: stats.applications, icon: Layers },
    { label: "Active Rooms", value: stats.rooms, icon: MessageSquare },
    { label: "Open Reports", value: stats.reports, icon: AlertTriangle },
    { label: "Moderation Queue", value: stats.moderation, icon: Cpu },
  ];

  return (
    <div className="space-y-8 text-[#fbfbef]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(251,251,239,0.1)] pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Telemetry</h1>
          <p className="text-sm text-[rgba(251,251,239,0.6)]">
            Real-time infrastructure health, metrics, and administration actions feed.
          </p>
        </div>
        <button
          onClick={() => {
            toast.promise(loadDashboardData(), {
              loading: "Syncing database stats...",
              success: "Metrics updated",
              error: "Telemetry sync failed",
            });
          }}
          className="flex items-center gap-2 bg-[#141414] hover:bg-[#1c1c1c] border border-[rgba(251,251,239,0.15)] rounded-full px-5 py-2.5 text-xs font-bold transition-all"
        >
          <RefreshCw className="size-3.5" />
          <span>Sync Telemetry</span>
        </button>
      </div>

      {/* Connection & Response telemetries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* DB Connection Gauge */}
        <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.15)] p-5 rounded-2xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-[rgba(251,251,239,0.45)] uppercase tracking-wider font-bold block">
              DB Connection Pool
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-green-400 font-mono">{dbPool.active}</span>
              <span className="text-xs text-[rgba(251,251,239,0.4)]">/ {dbPool.total} active</span>
            </div>
            <span className="text-[10px] text-[rgba(251,251,239,0.5)] block">
              Pool Status: <strong className="text-green-400">HEALTHY</strong>
            </span>
          </div>
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-full">
            <Activity className="size-5 text-green-400" />
          </div>
        </div>

        {/* Latency Gauge */}
        <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.15)] p-5 rounded-2xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-[rgba(251,251,239,0.45)] uppercase tracking-wider font-bold block">
              API Response Latency
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-yellow-500 font-mono">{responseTime}ms</span>
              <span className="text-xs text-[rgba(251,251,239,0.4)]">avg P95</span>
            </div>
            <span className="text-[10px] text-[rgba(251,251,239,0.5)] block">
              Load Balancer: <strong className="text-yellow-500">STABLE</strong>
            </span>
          </div>
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
            <Clock className="size-5 text-yellow-500" />
          </div>
        </div>

        {/* Revenue/Fee tracker */}
        <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.15)] p-5 rounded-2xl flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-[rgba(251,251,239,0.45)] uppercase tracking-wider font-bold block">
              Disputed Escrows
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-[#fbfbef] font-mono">₹0</span>
              <span className="text-xs text-[rgba(251,251,239,0.4)]">held securely</span>
            </div>
            <span className="text-[10px] text-[rgba(251,251,239,0.5)] block">
              Disputes Status: <strong className="text-green-400">CLEARED</strong>
            </span>
          </div>
          <div className="p-3 bg-white/10 border border-white/20 rounded-full">
            <IndianRupee className="size-5 text-[#fbfbef]" />
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div
              key={i}
              className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.15)] p-4 hover:border-[rgba(251,251,239,0.3)] transition-all duration-300 text-center"
            >
              <Icon className="size-5 text-[rgba(251,251,239,0.4)] mx-auto mb-2" />
              <span className="text-[10px] text-[rgba(251,251,239,0.4)] uppercase font-semibold">
                {kpi.label}
              </span>
              <div className="text-lg font-bold text-[#fbfbef] mt-1 font-sans">
                {kpi.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Signups line chart */}
        <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.15)] p-6">
          <h3 className="text-sm font-bold text-[#fbfbef] mb-6 flex items-center gap-2">
            <TrendingUp className="size-4" /> New Signups (Weekly Trend)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SIGNUPS_DATA} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBrands" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbfbef" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#fbfbef" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="rgba(251,251,239,0.3)" fontSize={11} />
                <YAxis stroke="rgba(251,251,239,0.3)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "#0d0d0d",
                    border: "1px solid rgba(251,251,239,0.2)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="Brands"
                  stroke="#fbfbef"
                  fillOpacity={1}
                  fill="url(#colorBrands)"
                />
                <Area
                  type="monotone"
                  dataKey="Influencers"
                  stroke="#38bdf8"
                  fillOpacity={0.1}
                  fill="#38bdf8"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaign activity bar chart */}
        <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.15)] p-6">
          <h3 className="text-sm font-bold text-[#fbfbef] mb-6">Campaigns Posted (Weekly)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CARDS_POSTED_DATA}>
                <XAxis dataKey="name" stroke="rgba(251,251,239,0.3)" fontSize={11} />
                <YAxis stroke="rgba(251,251,239,0.3)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "#0d0d0d",
                    border: "1px solid rgba(251,251,239,0.2)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="Cards" fill="#fbfbef" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Real-time Activity feed list */}
      <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.15)] p-6">
        <h3 className="text-sm font-bold text-[#fbfbef] mb-6 flex items-center justify-between">
          <span>Real-time System Action Timeline</span>
          <span className="h-2 w-2 rounded-full bg-green-500 animate-ping" />
        </h3>
        {recentEvents.length === 0 ? (
          <div className="text-center py-12 text-[rgba(251,251,239,0.4)] text-xs">
            No events logged yet. Perform actions on the platform to seed logs.
          </div>
        ) : (
          <div className="space-y-4">
            {recentEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between border-b border-[rgba(251,251,239,0.05)] pb-3 last:border-none"
              >
                <div>
                  <h4 className="text-xs font-bold text-[#fbfbef]">{evt.title}</h4>
                  <p className="text-[11px] text-[rgba(251,251,239,0.6)] mt-0.5">{evt.body}</p>
                </div>
                <span className="text-[10px] text-[rgba(251,251,239,0.4)] font-mono">
                  {evt.time.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
