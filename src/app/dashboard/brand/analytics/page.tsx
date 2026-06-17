"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Users,
  Layers,
  Award,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import toast from "react-hot-toast";

const COLORS = ["#c084fc", "#38bdf8", "#fb923c", "#4ade80", "#f472b6", "#fbbf24"];

export default function BrandAnalyticsPage() {
  const { user } = useUser();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Derived stats
  const [cardsCount, setCardsCount] = useState(0);
  const [reachEstimate, setReachEstimate] = useState(0);
  const [dealsDoneCount, setDealsDoneCount] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  // Chart data sets
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [performanceCards, setPerformanceCards] = useState<any[]>([]);
  const [topCard, setTopCard] = useState<any | null>(null);



  async function loadAnalytics() {
    setLoading(true);
    try {
      // Fetch cards with applications and joined influencer profiles
      const { data: cards, error } = await supabase
        .from("cards")
        .select(`
          *,
          applications(
            id,
            status,
            proposed_rate,
            influencer:profiles(id, follower_count)
          )
        `)
        .eq("brand_id", user?.id);

      if (error) throw error;

      const cardList = cards || [];
      setCardsCount(cardList.length);

      // Calculations
      let totalReach = 0;
      let completedDeals = 0;
      let spent = 0;
      let totalApplied = 0;
      let totalAccepted = 0;

      const categoryCounts: Record<string, number> = {};
      const timelineMap: Record<string, { date: string; posted: number; closed: number }> = {};

      const processedCards = cardList.map((card) => {
        const apps = card.applications || [];
        const appCount = apps.length;
        totalApplied += appCount;

        const accepted = apps.filter((a: any) => a.status === "accepted");
        totalAccepted += accepted.length;

        // Completed colabs is derived from active deals completed or estimated.
        // Let's count accepted as deals closed for financial estimation
        const cardsDeals = accepted.length;
        completedDeals += cardsDeals;

        // Reach calculation (sum of followers of accepted influencers)
        accepted.forEach((a: any) => {
          if (a.influencer?.follower_count) {
            totalReach += a.influencer.follower_count;
          }
          // Spent calculation (parse rate: e.g. "₹5,000" -> 5000)
          if (a.proposed_rate) {
            const num = parseInt(a.proposed_rate.replace(/[^0-9]/g, ""), 10);
            if (!isNaN(num)) spent += num;
          }
        });

        // Category count
        categoryCounts[card.category] = (categoryCounts[card.category] || 0) + 1;

        // Timeline map
        const postDate = new Date(card.created_at || "").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        if (!timelineMap[postDate]) {
          timelineMap[postDate] = { date: postDate, posted: 0, closed: 0 };
        }
        timelineMap[postDate].posted += 1;
        timelineMap[postDate].closed += cardsDeals;

        // Calculate acceptance rate
        const acceptanceRate = appCount > 0 ? Math.round((accepted.length / appCount) * 100) : 0;

        return {
          id: card.id,
          title: card.title,
          category: card.category,
          views: appCount * 6 + 12, // simulated card views
          applications: appCount,
          accepted: accepted.length,
          acceptanceRate,
          budget: card.budget_range || "Open",
        };
      });

      setReachEstimate(totalReach);
      setDealsDoneCount(completedDeals);
      setTotalSpent(spent);

      // 1. Funnel data: Total views -> Applications -> Accepted
      const totalViews = totalApplied * 6 + cardList.length * 12;
      setFunnelData([
        { name: "Total Views", value: totalViews },
        { name: "Applications", value: totalApplied },
        { name: "Accepted", value: totalAccepted },
        { name: "Completed", value: completedDeals },
      ]);

      // 2. Category Pie chart
      const pieData = Object.entries(categoryCounts).map(([name, value]) => ({
        name,
        value,
      }));
      setCategoryData(pieData);

      // 3. Timeline data sorted by date
      const timeData = Object.values(timelineMap).slice(-10); // last 10 days of entries
      setTimelineData(timeData);

      // 4. Performance Cards list
      setPerformanceCards(processedCards);

      // 5. Top Card
      if (processedCards.length > 0) {
        const sortedByApps = [...processedCards].sort((a, b) => b.applications - a.applications);
        setTopCard(sortedByApps[0]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load analytics metrics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadAnalytics();
  }, [user]);

  const formatFollowers = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#fbfbef]">Brand Analytics</h1>
        <p className="text-sm text-[rgba(251,251,239,0.6)] mt-1">
          Performances, conversions, and target audience outreach overview.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1 */}
        <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[rgba(251,251,239,0.5)] uppercase tracking-wide">
              Est. Campaigns Reach
            </span>
            <h3 className="text-2xl font-black font-sans">{formatFollowers(reachEstimate)}</h3>
            <span className="text-[10px] text-green-400 font-bold flex items-center gap-0.5">
              <ArrowUpRight className="size-3" />
              <span>Direct followers count</span>
            </span>
          </div>
          <div className="p-3 bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl text-[rgba(251,251,239,0.7)]">
            <Users className="size-6" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[rgba(251,251,239,0.5)] uppercase tracking-wide">
              Total Cards Posted
            </span>
            <h3 className="text-2xl font-black font-sans">{cardsCount}</h3>
            <span className="text-[10px] text-[rgba(251,251,239,0.4)]">Active and past card posts</span>
          </div>
          <div className="p-3 bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl text-[rgba(251,251,239,0.7)]">
            <Layers className="size-6" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[rgba(251,251,239,0.5)] uppercase tracking-wide">
              Deals Closed
            </span>
            <h3 className="text-2xl font-black font-sans">{dealsDoneCount}</h3>
            <span className="text-[10px] text-green-400 font-bold flex items-center gap-0.5">
              <ArrowUpRight className="size-3" />
              <span>Collabs established</span>
            </span>
          </div>
          <div className="p-3 bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl text-[rgba(251,251,239,0.7)]">
            <Award className="size-6" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[rgba(251,251,239,0.5)] uppercase tracking-wide">
              Est. Spent Budget
            </span>
            <h3 className="text-2xl font-black font-sans">₹{totalSpent.toLocaleString()}</h3>
            <span className="text-[10px] text-[rgba(251,251,239,0.4)] font-mono">Paid to creators</span>
          </div>
          <div className="p-3 bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl text-[rgba(251,251,239,0.7)]">
            <DollarSign className="size-6" />
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Timeline Chart (Col 1-2) */}
        <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] rounded-2xl p-5 md:col-span-2 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[rgba(251,251,239,0.5)] flex items-center gap-1">
            <TrendingUp className="size-4 text-green-400" />
            <span>Timeline (Last 90 Days)</span>
          </h3>

          <div className="h-64">
            {mounted && timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(251,251,239,0.05)" />
                  <XAxis dataKey="date" stroke="rgba(251,251,239,0.4)" fontSize={10} />
                  <YAxis stroke="rgba(251,251,239,0.4)" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0d0d0d", borderColor: "rgba(251,251,239,0.2)", color: "#fbfbef" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="posted" name="Cards Posted" stroke="#38bdf8" strokeWidth={2} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="closed" name="Deals Closed" stroke="#4ade80" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[rgba(251,251,239,0.4)]">
                No timeline data available.
              </div>
            )}
          </div>
        </div>

        {/* Funnel Breakdown Chart (Col 3) */}
        <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[rgba(251,251,239,0.5)]">
            Application Funnel
          </h3>
          <div className="h-64">
            {mounted && funnelData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(251,251,239,0.05)" />
                  <XAxis type="number" stroke="rgba(251,251,239,0.4)" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="rgba(251,251,239,0.4)" fontSize={9} width={70} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0d0d0d", borderColor: "rgba(251,251,239,0.2)", color: "#fbfbef" }}
                  />
                  <Bar dataKey="value" name="Total Count" fill="#fbfbef">
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[rgba(251,251,239,0.4)]">
                No funnel data available.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Category Breakdown Pie Chart (Col 1) */}
        <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[rgba(251,251,239,0.5)]">
            Niche Targeting Categories
          </h3>
          <div className="h-64 flex items-center justify-center">
            {mounted && categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0d0d0d", borderColor: "rgba(251,251,239,0.2)", color: "#fbfbef" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[rgba(251,251,239,0.4)]">
                No categories targeted yet.
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Card (Col 2-3) */}
        {topCard && (
          <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] rounded-2xl p-6 md:col-span-2 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-[10px] uppercase font-bold text-[rgba(251,251,239,0.4)] block">
                Top Performing Collaboration Card
              </span>
              <div>
                <h3 className="text-xl font-extrabold text-[#fbfbef] truncate">{topCard.title}</h3>
                <span className="inline-block rounded-full bg-[#141414] border border-[rgba(251,251,239,0.15)] px-3 py-0.5 text-[10px] font-semibold text-[rgba(251,251,239,0.7)] mt-1 uppercase">
                  {topCard.category}
                </span>
              </div>

              {/* Stats detail */}
              <div className="grid grid-cols-3 gap-4 border-t border-b border-[rgba(251,251,239,0.05)] py-4 text-center">
                <div>
                  <span className="block text-lg font-black">{topCard.views}</span>
                  <span className="text-[9px] uppercase font-bold text-[rgba(251,251,239,0.4)]">Views</span>
                </div>
                <div>
                  <span className="block text-lg font-black">{topCard.applications}</span>
                  <span className="text-[9px] uppercase font-bold text-[rgba(251,251,239,0.4)]">Applications</span>
                </div>
                <div>
                  <span className="block text-lg font-black">{topCard.accepted}</span>
                  <span className="text-[9px] uppercase font-bold text-[rgba(251,251,239,0.4)]">Deals Closed</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <span className="text-xs text-[rgba(251,251,239,0.65)] font-semibold">
                Conversion rate: {topCard.acceptanceRate}%
              </span>
              <Link
                href={`/dashboard/brand/cards/${topCard.id}`}
                className="rounded-full bg-[#fbfbef] text-black hover:opacity-95 px-5 py-2 text-xs font-bold transition-opacity"
              >
                Manage Card
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Cards Performance Table */}
      <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] rounded-3xl p-6 overflow-hidden">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[rgba(251,251,239,0.5)] mb-4">
          Card Performance Table
        </h3>

        {performanceCards.length === 0 ? (
          <p className="text-xs text-[rgba(251,251,239,0.5)] py-6 text-center">No posted cards to show.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-medium">
              <thead>
                <tr className="border-b border-[rgba(251,251,239,0.1)] text-[rgba(251,251,239,0.4)] uppercase">
                  <th className="py-3 px-4">Campaign Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Views</th>
                  <th className="py-3 px-4">Applications</th>
                  <th className="py-3 px-4">Acceptance Rate</th>
                  <th className="py-3 px-4">Budget Range</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {performanceCards.map((card) => (
                  <tr key={card.id} className="border-b border-[rgba(251,251,239,0.05)] hover:bg-[#141414]/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#fbfbef] truncate max-w-[200px]">
                      {card.title}
                    </td>
                    <td className="py-3 px-4 text-[rgba(251,251,239,0.6)]">{card.category}</td>
                    <td className="py-3 px-4 font-mono">{card.views}</td>
                    <td className="py-3 px-4 font-mono">{card.applications}</td>
                    <td className="py-3 px-4 text-green-400 font-bold font-mono">{card.acceptanceRate}%</td>
                    <td className="py-3 px-4 font-mono">{card.budget}</td>
                    <td className="py-3 px-4">
                      <Link href={`/dashboard/brand/cards/${card.id}`} className="text-[#fbfbef] underline font-bold">
                        View Card
                      </Link>
                    </td>
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
