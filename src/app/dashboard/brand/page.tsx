"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { PlusCircle, Inbox, Bell, MessageSquare, Briefcase, Users, FileText, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import ChecklistWidget from "@/components/shared/ChecklistWidget";

export default function BrandHomePage() {
  const { profile, user } = useUser();
  const supabase = createClient();
  
  const [stats, setStats] = useState({
    activeCards: 0,
    totalApps: 0,
    activeChats: 0,
    acceptedDeals: 0,
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchDashboardData() {
      // 1. Fetch counts
      const { count: activeCardsCount } = await supabase
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("brand_id", user.id)
        .eq("status", "active");

      const { count: totalAppsCount } = await supabase
        .from("applications")
        .select("*, cards!inner(*)", { count: "exact", head: true })
        .eq("cards.brand_id", user.id);

      const { count: activeChatsCount } = await supabase
        .from("rooms")
        .select("*", { count: "exact", head: true })
        .eq("brand_id", user.id);

      const { count: acceptedDealsCount } = await supabase
        .from("applications")
        .select("*, cards!inner(*)", { count: "exact", head: true })
        .eq("cards.brand_id", user.id)
        .eq("status", "accepted");

      setStats({
        activeCards: activeCardsCount || 0,
        totalApps: totalAppsCount || 0,
        activeChats: activeChatsCount || 0,
        acceptedDeals: acceptedDealsCount || 0,
      });

      // 2. Fetch last 10 notifications for timeline
      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setActivities(notifs || []);
      setLoading(false);
    }

    fetchDashboardData();
  }, [user]);

  const greetingMessage = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 18) return "Good afternoon";
    return "Good evening";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-[#0d0d0d]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-[#0d0d0d] animate-pulse" />
          ))}
        </div>
        <div className="h-96 rounded-xl bg-[#0d0d0d] animate-pulse" />
      </div>
    );
  }

  const statItems = [
    { label: "Active Cards", value: stats.activeCards, icon: Briefcase },
    { label: "Total Applications", value: stats.totalApps, icon: Users },
    { label: "Active Chats", value: stats.activeChats, icon: MessageSquare },
    { label: "Accepted Deals", value: stats.acceptedDeals, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting Banner */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#fbfbef] font-sans">
          {greetingMessage()}, {profile?.display_name || "Partner"}
        </h1>
        <p className="text-sm text-[rgba(251,251,239,0.6)] mt-1">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Checklist Widget */}
      <ChecklistWidget />

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="rounded-xl bg-[#0d0d0d] p-6 border border-[rgba(251,251,239,0.2)] shadow-md hover:shadow-glow hover:border-[rgba(251,251,239,0.4)] transition-all duration-300 lift-hover"
            >
              <div className="flex items-center justify-between">
                <span className="text-13px text-[rgba(251,251,239,0.6)] font-medium">
                  {item.label}
                </span>
                <Icon className="size-5 text-[rgba(251,251,239,0.4)]" />
              </div>
              <div className="text-38px font-bold text-[#fbfbef] mt-4 font-sans tracking-tight">
                {item.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timeline Activities feed */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-6">
          <h2 className="text-lg font-bold text-[#fbfbef] mb-6 flex items-center gap-2">
            <Bell className="size-5" /> Recent Activity
          </h2>

          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-[rgba(251,251,239,0.6)]">
              <p className="text-sm">No recent activity found.</p>
              <p className="text-xs text-[rgba(251,251,239,0.4)] mt-1">
                New activities will show up here as actions occur.
              </p>
            </div>
          ) : (
            <div className="relative border-l border-[rgba(251,251,239,0.2)] ml-3 space-y-6">
              {activities.map((activity) => (
                <div key={activity.id} className="relative pl-6">
                  {/* Timeline dot */}
                  <span className="absolute -left-[5px] top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[#fbfbef] ring-4 ring-[#0d0d0d]" />
                  <div>
                    <h4 className="text-sm font-semibold text-[#fbfbef]">{activity.title}</h4>
                    <p className="text-xs text-[rgba(251,251,239,0.6)] mt-0.5">{activity.body}</p>
                    <span className="text-[10px] text-[rgba(251,251,239,0.4)] mt-1 block">
                      {format(new Date(activity.created_at), "PPp")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions Panel */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-6">
            <h2 className="text-lg font-bold text-[#fbfbef] mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/dashboard/brand/cards/new"
                className="flex items-center gap-3 rounded-full bg-[#fbfbef] px-4 py-3 text-sm font-semibold text-black hover:opacity-95 transition-opacity scale-active justify-center"
              >
                <PlusCircle className="size-5" />
                <span>Post a New Card</span>
              </Link>
              <Link
                href="/dashboard/brand/applications"
                className="flex items-center gap-3 rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm font-semibold text-[#fbfbef] hover:bg-[#1c1c1c] transition-all scale-active justify-center"
              >
                <Inbox className="size-5" />
                <span>View All Applications</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
