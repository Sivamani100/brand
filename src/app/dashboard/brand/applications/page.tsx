"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { ArrowLeft, Inbox, Link2, MessageSquare, Check, X, Users, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function BrandAllApplicationsPage() {
  const { user } = useUser();
  const supabase = createClient();

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");

  // Rejection modal state
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Expanded pitch list
  const [expandedPitchIds, setExpandedPitchIds] = useState<string[]>([]);

  async function fetchApplications() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("applications")
      .select(`
        *,
        card:cards!inner(*),
        influencer:profiles!applications_influencer_id_fkey(*)
      `)
      .eq("cards.brand_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load applications.");
    } else {
      setApplications(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const togglePitchExpand = (appId: string) => {
    setExpandedPitchIds((prev) =>
      prev.includes(appId) ? prev.filter((i) => i !== appId) : [...prev, appId]
    );
  };

  const handleAccept = async (app: any) => {
    const confirm = window.confirm(`Accept ${app.influencer.display_name} for this collaboration? A private chat room will be opened.`);
    if (!confirm) return;

    setActionLoading(true);

    const { error: appError } = await supabase
      .from("applications")
      .update({ status: "accepted" })
      .eq("id", app.id);

    if (appError) {
      toast.error("Failed to accept application.");
      setActionLoading(false);
      return;
    }

    const { data: roomData, error: roomError } = await supabase
      .from("rooms")
      .insert({
        application_id: app.id,
        brand_id: user.id,
        influencer_id: app.influencer_id,
        card_id: app.card_id,
      })
      .select()
      .single();

    if (roomError) {
      toast.error("Application accepted, but failed to create chat room.");
      setActionLoading(false);
      return;
    }

    await supabase.from("notifications").insert({
      user_id: app.influencer_id,
      type: "application_accepted",
      title: "Your application was accepted! 🎉",
      body: `${app.card.title} accepted your application. Chat room is open.`,
      reference_id: roomData.id,
      reference_type: "room",
    });

    toast.success("Application accepted! Chat room opened.");
    setActionLoading(false);
    fetchApplications();
  };

  const handleRejectInit = (appId: string) => {
    setRejectingAppId(appId);
    setRejectNote("");
  };

  const handleRejectSubmit = async () => {
    if (!rejectingAppId) return;
    setActionLoading(true);

    const app = applications.find((a) => a.id === rejectingAppId);
    if (!app) return;

    const { error: appError } = await supabase
      .from("applications")
      .update({ status: "rejected", brand_note: rejectNote })
      .eq("id", rejectingAppId);

    if (appError) {
      toast.error("Failed to reject application.");
      setActionLoading(false);
      return;
    }

    await supabase.from("notifications").insert({
      user_id: app.influencer_id,
      type: "application_rejected",
      title: "Application update",
      body: `Your application for '${app.card.title}' was reviewed.`,
      reference_id: app.card_id,
      reference_type: "card",
    });

    toast.success("Application rejected.");
    setRejectingAppId(null);
    setActionLoading(false);
    fetchApplications();
  };

  const filteredApps = applications.filter((app) => {
    if (filter === "all") return true;
    return app.status === filter;
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[#0d0d0d] rounded-lg" />
        <div className="h-10 w-full bg-[#0d0d0d] rounded-full" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-[#0d0d0d] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const filters: ("all" | "pending" | "accepted" | "rejected")[] = ["all", "pending", "accepted", "rejected"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[rgba(251,251,239,0.1)] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef] font-sans">
            Incoming Applications
          </h1>
          <p className="text-xs text-[rgba(251,251,239,0.6)]">
            Review collaboration pitches sent by influencers
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pb-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all scale-active ${
              filter === f
                ? "bg-[#fbfbef] text-black font-bold"
                : "bg-[#0d0d0d] text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)] hover:border-[rgba(251,251,239,0.3)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Applications list */}
      {filteredApps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[rgba(251,251,239,0.2)] p-12 text-center max-w-lg mx-auto">
          <AlertCircle className="size-8 text-[rgba(251,251,239,0.4)] mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-[#fbfbef]">No Applications</h3>
          <p className="text-xs text-[rgba(251,251,239,0.6)] mt-1">
            You don&apos;t have any applications under the selected filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApps.map((app) => {
            const isExpanded = expandedPitchIds.includes(app.id);
            return (
              <div
                key={app.id}
                className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-6 space-y-4 hover:border-[rgba(251,251,239,0.3)] transition-colors"
              >
                {/* Header: Card Title & Influencer details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(251,251,239,0.05)] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full border border-[rgba(251,251,239,0.2)] bg-black overflow-hidden flex items-center justify-center">
                      {app.influencer.avatar_url ? (
                        <img src={app.influencer.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-black bg-[#fbfbef] size-full flex items-center justify-center">
                          {app.influencer.display_name[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#fbfbef]">
                        {app.influencer.display_name}
                      </h4>
                      <span className="text-[10px] text-[rgba(251,251,239,0.4)]">
                        {app.influencer.follower_count?.toLocaleString()} followers • {app.influencer.location}
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-[rgba(251,251,239,0.4)] block uppercase">Campaign</span>
                    <Link
                      href={`/dashboard/brand/cards/${app.card_id}`}
                      className="text-xs font-bold text-[#fbfbef] hover:underline"
                    >
                      {app.card.title}
                    </Link>
                  </div>
                </div>

                {/* Pitch Message */}
                <div>
                  <h5 className="text-[10px] uppercase font-bold text-[rgba(251,251,239,0.4)] mb-1">Pitch Message</h5>
                  <p className={`text-xs text-[rgba(251,251,239,0.6)] leading-relaxed ${!isExpanded ? "line-clamp-2" : ""}`}>
                    {app.pitch_message}
                  </p>
                  {app.pitch_message.length > 150 && (
                    <button
                      onClick={() => togglePitchExpand(app.id)}
                      className="text-[10px] text-white underline mt-1 block"
                    >
                      {isExpanded ? "Read Less" : "Read More"}
                    </button>
                  )}
                </div>

                {/* Portfolio Links & proposed rate */}
                <div className="flex flex-col sm:flex-row justify-between gap-4 pt-2">
                  {app.portfolio_links && app.portfolio_links.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[rgba(251,251,239,0.4)] block">Portfolio</span>
                      <div className="flex flex-wrap gap-2">
                        {app.portfolio_links.map((link: string, i: number) => (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-[#fbfbef] hover:underline flex items-center gap-1 bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-full px-2.5 py-1"
                          >
                            <Link2 className="size-3" />
                            <span className="max-w-[120px] truncate">{link}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {app.proposed_rate && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-[rgba(251,251,239,0.4)] block">Proposed Rate</span>
                      <span className="text-sm font-bold text-[#fbfbef]">{app.proposed_rate}</span>
                    </div>
                  )}
                </div>

                {/* Actions bar */}
                <div className="border-t border-[rgba(251,251,239,0.05)] pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        app.status === "accepted"
                          ? "bg-[#4ade80]"
                          : app.status === "rejected"
                          ? "bg-[#f87171]"
                          : "bg-[#facc15]"
                      }`}
                    />
                    <span className="text-xs font-semibold uppercase text-[rgba(251,251,239,0.6)] tracking-wide">
                      {app.status}
                    </span>
                  </div>

                  {app.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        disabled={actionLoading}
                        onClick={() => handleRejectInit(app.id)}
                        className="rounded-full border border-[rgba(251,251,239,0.2)] bg-[#141414] hover:bg-[#261414] text-[#f87171] px-4 py-2 text-xs font-semibold scale-active"
                      >
                        Reject
                      </button>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleAccept(app)}
                        className="rounded-full bg-[#fbfbef] text-black hover:opacity-90 px-4 py-2 text-xs font-bold scale-active"
                      >
                        Accept
                      </button>
                    </div>
                  )}

                  {app.status === "accepted" && (
                    <Link
                      href="/dashboard/brand/chats"
                      className="text-xs font-bold text-black bg-[#fbfbef] rounded-full px-4 py-2 flex items-center gap-1.5 scale-active"
                    >
                      <MessageSquare className="size-3.5" />
                      <span>Open Chat</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d0d0d] p-6 border border-[rgba(251,251,239,0.2)] shadow-glow space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#fbfbef]">Add Rejection Feedback</h3>
              <button onClick={() => setRejectingAppId(null)} className="text-[rgba(251,251,239,0.6)] hover:text-white">
                &times;
              </button>
            </div>
            <div>
              <p className="text-xs text-[rgba(251,251,239,0.6)] leading-normal">
                Leave a polite note explaining why this influencer was not chosen for this specific campaign (optional).
              </p>
              <textarea
                rows={3}
                className="mt-3 block w-full rounded-xl bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-2.5 text-xs text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                placeholder="e.g. Budget limitations or follower count alignment."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingAppId(null)}
                className="rounded-full bg-[#141414] px-4 py-2 text-xs font-semibold text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)]"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={actionLoading}
                className="rounded-full bg-[#f87171] px-4 py-2 text-xs font-bold text-black"
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
