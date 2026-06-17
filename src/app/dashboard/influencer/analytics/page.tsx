"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  Mail,
  Eye,
  Percent,
} from "lucide-react";
import toast from "react-hot-toast";

const COLORS = ["#fbfbef", "#4ade80", "#fb923c", "#38bdf8", "#c084fc", "#f472b6"];

interface EarningItem {
  id: string;
  title: string;
  brand: string;
  rate: string;
  rateVal: number;
  status: string;
}

export default function InfluencerAnalyticsPage() {
  const { profile, user } = useUser();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Stats KPIs
  const [successRate, setSuccessRate] = useState(0);
  const [totalViewsCount, setTotalViewsCount] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [invitesCount, setInvitesCount] = useState(0);

  // Chart data sets
  const [successRingData, setSuccessRingData] = useState<any[]>([]);
  const [viewsTimelineData, setViewsTimelineData] = useState<any[]>([]);
  const [nicheMatchData, setNicheMatchData] = useState<any[]>([]);
  const [collabDonutData, setCollabDonutData] = useState<any[]>([]);
  const [earningsList, setEarningsList] = useState<EarningItem[]>([]);
  const [inviteRatioData, setInviteRatioData] = useState<any[]>([]);



  async function loadAnalytics() {
    setLoading(true);
    try {
      // 1. Fetch applications
      const { data: apps, error: appError } = await supabase
        .from("applications")
        .select(`
          id,
          status,
          proposed_rate,
          card:cards(
            id,
            title,
            category,
            brand:profiles(display_name)
          )
        `)
        .eq("influencer_id", user?.id);

      if (appError) throw appError;

      const appList = apps || [];
      const totalApplied = appList.length;
      const accepted = appList.filter((a) => a.status === "accepted");
      const acceptedCount = accepted.length;

      // Calculate success rate
      const rate = totalApplied > 0 ? Math.round((acceptedCount / totalApplied) * 100) : 0;
      setSuccessRate(rate);

      // Success rate Ring chart data
      setSuccessRingData([
        { name: "Accepted", value: acceptedCount },
        { name: "Rejected/Pending", value: totalApplied - acceptedCount },
      ]);

      // 2. Fetch profile views
      const { data: views, error: viewError } = await supabase
        .from("profile_views")
        .select("viewed_at")
        .eq("profile_id", user?.id)
        .order("viewed_at", { ascending: true });

      if (viewError) throw viewError;

      const viewsList = views || [];
      setTotalViewsCount(viewsList.length);

      // Group views by date
      const viewsTimelineMap: Record<string, number> = {};
      viewsList.forEach((v) => {
        const dStr = new Date(v.viewed_at || "").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        viewsTimelineMap[dStr] = (viewsTimelineMap[dStr] || 0) + 1;
      });

      const processedTimeline = Object.entries(viewsTimelineMap).map(([date, views]) => ({
        date,
        views,
      })).slice(-10); // last 10 days
      setViewsTimelineData(processedTimeline);

      // 3. Earnings tracking from accepted pitches
      let sumEarnings = 0;
      const parsedEarnings: EarningItem[] = accepted.map((a: any) => {
        let val = 0;
        if (a.proposed_rate) {
          val = parseInt(a.proposed_rate.replace(/[^0-9]/g, ""), 10);
          if (isNaN(val)) val = 0;
          sumEarnings += val;
        }

        return {
          id: a.id,
          title: a.card?.title || "Campaign",
          brand: a.card?.brand?.display_name || "Brand Partner",
          rate: a.proposed_rate || "₹0",
          rateVal: val,
          status: "Accepted",
        };
      });

      setTotalEarnings(sumEarnings);
      setEarningsList(parsedEarnings);

      // 4. Fetch invites to check Invite Rate
      const { data: invites, error: inviteError } = await supabase
        .from("invites")
        .select("id")
        .eq("influencer_id", user?.id);

      if (inviteError) throw inviteError;
      const directInvitesCount = invites?.length || 0;
      setInvitesCount(directInvitesCount);

      // Direct invite vs organic applications ratio
      setInviteRatioData([
        { name: "Direct Invites", value: directInvitesCount },
        { name: "Organic Applied", value: Math.max(0, totalApplied - directInvitesCount) },
      ]);

      // 5. Active vs Completed Collabs
      const { data: rooms } = await supabase
        .from("rooms")
        .select("id, status")
        .eq("influencer_id", user?.id);

      const roomList = rooms || [];
      const activeRooms = roomList.filter((r) => r.status === "active" || r.status === "disputed").length;
      const completedRooms = roomList.filter((r) => r.status === "completed").length;

      setCollabDonutData([
        { name: "Active", value: activeRooms },
        { name: "Completed", value: completedRooms },
      ]);

      // 6. Niche demand match: count how many campaign categories exist in marketplace vs influencer profile niche
      const { data: allActiveCards } = await supabase
        .from("cards")
        .select("category")
        .eq("status", "active");

      const categoryDemand: Record<string, number> = {};
      (allActiveCards || []).forEach((c) => {
        categoryDemand[c.category] = (categoryDemand[c.category] || 0) + 1;
      });

      const profileNiches = profile?.niche || [];
      const demandData = Object.entries(categoryDemand).map(([category, count]) => {
        const matchesProfile = profileNiches.some(
          (n: string) => n.toLowerCase() === category.toLowerCase()
        );
        return {
          name: category,
          "Market Demand": count,
          "My Niche Match": matchesProfile ? count : 0,
        };
      }).slice(0, 6);

      setNicheMatchData(demandData);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load influencer analytics data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user || !profile) return;
    loadAnalytics();
  }, [user, profile]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">My Analytics</h1>
        <p className="text-sm text-text-secondary mt-1">
          Track your profile views, pitches conversion rates, and earnings.
        </p>
      </div>

      {/* KPI stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="bg-surface border border-border-strong rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Application Success
            </span>
            <h3 className="text-2xl font-black font-sans">{successRate}%</h3>
            <span className="text-[10px] text-green-400 font-bold">Pitches accepted ratio</span>
          </div>
          <div className="p-3 bg-surface-2 border border-border rounded-xl text-text-secondary">
            <Percent className="size-6" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-surface border border-border-strong rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Profile Views
            </span>
            <h3 className="text-2xl font-black font-sans">{totalViewsCount}</h3>
            <span className="text-[10px] text-text-muted">Total profile clicks</span>
          </div>
          <div className="p-3 bg-surface-2 border border-border rounded-xl text-text-secondary">
            <Eye className="size-6" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-surface border border-border-strong rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Total Earnings
            </span>
            <h3 className="text-2xl font-black font-sans">₹{totalEarnings.toLocaleString()}</h3>
            <span className="text-[10px] text-green-400 font-bold">From accepted contracts</span>
          </div>
          <div className="p-3 bg-surface-2 border border-border rounded-xl text-text-secondary">
            <DollarSign className="size-6" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-surface border border-border-strong rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Direct Invites
            </span>
            <h3 className="text-2xl font-black font-sans">{invitesCount}</h3>
            <span className="text-[10px] text-text-muted">Invited directly by brands</span>
          </div>
          <div className="p-3 bg-surface-2 border border-border rounded-xl text-text-secondary">
            <Mail className="size-6" />
          </div>
        </div>
      </div>

      {/* Visual Reports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Views Timeline Line Chart */}
        <div className="bg-surface border border-border-strong rounded-2xl p-5 md:col-span-2 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <TrendingUp className="size-4 text-green-400" />
            <span>Profile Views Over Time</span>
          </h3>
          <div className="h-64">
            {mounted && viewsTimelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={viewsTimelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={10} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  />
                  <Line type="monotone" dataKey="views" name="Clicks/Views" stroke="var(--color-text-primary)" strokeWidth={2.5} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-text-muted">
                No profile views logged yet. Share your profile link with brands!
              </div>
            )}
          </div>
        </div>

        {/* Invite vs Organic application ratio */}
        <div className="bg-surface border border-border-strong rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Organic vs Invite Ratio
          </h3>
          <div className="h-64 flex items-center justify-center">
            {mounted && invitesCount + successRingData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inviteRatioData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {inviteRatioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-text-muted">
                No application data.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Niche Demand Match (Col 1-2) */}
        <div className="bg-surface border border-border-strong rounded-2xl p-5 md:col-span-2 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Market Niche Demand Match
          </h3>
          <div className="h-64">
            {mounted && nicheMatchData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nicheMatchData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={10} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Market Demand" fill="var(--color-surface-2)" stroke="var(--color-border-strong)" />
                  <Bar dataKey="My Niche Match" fill="#fb923c" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-text-muted">
                No market cards to index.
              </div>
            )}
          </div>
        </div>

        {/* Collabs Donut (Active vs Completed) (Col 3) */}
        <div className="bg-surface border border-border-strong rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Collabs status
          </h3>
          <div className="h-64 flex items-center justify-center">
            {mounted && collabDonutData.some((c) => c.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={collabDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {collabDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-text-muted text-center px-4">
                No established chat room deals to show. Accept an invite to start.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Earnings Tracker table */}
      <div className="bg-surface border border-border-strong rounded-3xl p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted">
            Earnings Tracker
          </h3>
          <span className="text-xs font-bold text-text-primary">
            Total Accumulated: ₹{totalEarnings.toLocaleString()}
          </span>
        </div>

        {earningsList.length === 0 ? (
          <p className="text-xs text-text-muted py-6 text-center">No earnings recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium">
              <thead>
                <tr className="border-b border-border text-text-muted uppercase">
                  <th className="py-3 px-4">Campaign Title</th>
                  <th className="py-3 px-4">Brand Partner</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Earned Rate</th>
                </tr>
              </thead>
              <tbody>
                {earningsList.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-surface-2/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-text-primary truncate max-w-[200px]">
                      {item.title}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{item.brand}</td>
                    <td className="py-3 px-4">
                      <span className="rounded-full bg-green-500/10 text-green-400 border border-green-500/25 px-2.5 py-0.5 text-[9px] font-bold">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black font-mono text-right text-text-primary">{item.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
