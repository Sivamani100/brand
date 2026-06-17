"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { FileText, Calendar, MessageSquare, Trash, AlertCircle, Check, X, Mail } from "lucide-react";
import toast from "react-hot-toast";

export default function MyApplicationsPage() {
  const { user, profile } = useUser();
  const supabase = createClient();
  const router = useRouter();

  // Navigation states
  const [activeTab, setActiveTab] = useState<"applications" | "invites">("applications");

  // Applications states
  const [applications, setApplications] = useState<any[]>([]);
  const [appLoading, setAppLoading] = useState(true);
  const [appFilter, setAppFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // Invites states
  const [invites, setInvites] = useState<any[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [inviteFilter, setInviteFilter] = useState<"all" | "pending" | "accepted" | "declined">("all");
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchApplications() {
    if (!user) return;
    setAppLoading(true);

    const { data, error } = await supabase
      .from("applications")
      .select(`
        *,
        card:cards!inner(*, brand:profiles!cards_brand_id_fkey(*))
      `)
      .eq("influencer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load applications.");
    } else {
      setApplications(data || []);
    }
    setAppLoading(false);
  }

  async function fetchInvites() {
    if (!user) return;
    setInvitesLoading(true);

    const { data, error } = await supabase
      .from("invites")
      .select(`
        *,
        brand:profiles!invites_brand_id_fkey(*),
        card:cards!invites_card_id_fkey(*)
      `)
      .eq("influencer_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load invites.");
    } else {
      setInvites(data || []);
    }
    setInvitesLoading(false);
  }

  useEffect(() => {
    if (user) {
      fetchApplications();
      fetchInvites();
    }
  }, [user]);

  const handleWithdraw = async (appId: string) => {
    const confirm = window.confirm("Are you sure you want to withdraw this application? This action is permanent.");
    if (!confirm) return;

    setWithdrawLoading(true);
    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", appId);

    if (error) {
      toast.error("Failed to withdraw application.");
      setWithdrawLoading(false);
      return;
    }

    toast.success("Application withdrawn.");
    setWithdrawLoading(false);
    fetchApplications();
  };

  const handleAcceptInvite = async (invite: any) => {
    const confirm = window.confirm(`Accept invite from ${invite.brand.display_name} for this collaboration?`);
    if (!confirm) return;

    setActionLoading(true);

    // 1. Create the application
    const { data: appData, error: appError } = await supabase
      .from("applications")
      .insert({
        card_id: invite.card_id,
        influencer_id: user.id,
        pitch_message: "Accepted via direct invite",
        proposed_rate: null,
        status: "accepted"
      })
      .select()
      .single();

    if (appError) {
      toast.error("Failed to create application: " + appError.message);
      setActionLoading(false);
      return;
    }

    // 2. Create the room
    const { data: roomData, error: roomError } = await supabase
      .from("rooms")
      .insert({
        application_id: appData.id,
        brand_id: invite.brand_id,
        influencer_id: user.id,
        card_id: invite.card_id
      })
      .select()
      .single();

    if (roomError) {
      toast.error("Application created but failed to open chat room.");
      setActionLoading(false);
      return;
    }

    // 3. Update the invite status
    const { error: inviteError } = await supabase
      .from("invites")
      .update({ status: "accepted" })
      .eq("id", invite.id);

    if (inviteError) {
      toast.error("Failed to update invite status.");
    }

    // 4. Create brand notification
    await supabase.from("notifications").insert({
      user_id: invite.brand_id,
      type: "application_accepted",
      title: "Invite accepted! 🎉",
      body: `${profile?.display_name || "Influencer"} accepted your direct invite for '${invite.card.title}'.`,
      reference_id: roomData.id,
      reference_type: "room"
    });

    toast.success("Invite accepted! Opening chat...");
    setActionLoading(false);
    router.push(`/dashboard/influencer/chats/${roomData.id}`);
  };

  const handleDeclineInvite = async (inviteId: string) => {
    const confirm = window.confirm("Are you sure you want to decline this invite?");
    if (!confirm) return;

    setActionLoading(true);
    const { error } = await supabase
      .from("invites")
      .update({ status: "declined" })
      .eq("id", inviteId);

    if (error) {
      toast.error("Failed to decline invite.");
    } else {
      toast.success("Invite declined.");
      fetchInvites();
    }
    setActionLoading(false);
  };

  const filteredApps = applications.filter((app) => {
    if (appFilter === "all") return true;
    return app.status === appFilter;
  });

  const filteredInvites = invites.filter((invite) => {
    if (inviteFilter === "all") return true;
    return invite.status === inviteFilter;
  });

  const pendingInvitesCount = invites.filter((i) => i.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary font-sans">
            My Applications & Invites
          </h1>
          <p className="text-xs text-text-secondary">
            Manage your collaboration pitches and direct offers from brands
          </p>
        </div>
      </div>

      {/* Main Tab Selector */}
      <div className="flex border-b border-border gap-6">
        <button
          onClick={() => setActiveTab("applications")}
          className={`pb-3 text-sm font-bold tracking-wider uppercase transition-all relative ${
            activeTab === "applications"
              ? "text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Pitches Sent ({applications.length})
          {activeTab === "applications" && (
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-accent" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("invites")}
          className={`pb-3 text-sm font-bold tracking-wider uppercase transition-all relative flex items-center gap-2 ${
            activeTab === "invites"
              ? "text-text-primary"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          Direct Invites ({invites.length})
          {pendingInvitesCount > 0 && (
            <span className="bg-[#facc15] text-black text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
              {pendingInvitesCount}
            </span>
          )}
          {activeTab === "invites" && (
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-accent" />
          )}
        </button>
      </div>

      {activeTab === "applications" ? (
        <div className="space-y-6">
          {/* Applications Filters */}
          <div className="flex flex-wrap gap-2 pb-2">
            {(["all", "pending", "accepted", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setAppFilter(f)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all scale-active ${
                  appFilter === f
                    ? "bg-accent text-invert-text font-bold"
                    : "bg-surface text-text-secondary border border-border hover:border-border-strong"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Applications list */}
          {appLoading ? (
            <div className="space-y-4 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 bg-surface rounded-2xl border border-border" />
              ))}
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-strong p-12 text-center max-w-lg mx-auto">
              <AlertCircle className="size-8 text-text-muted mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-text-primary">No pitches found</h3>
              <p className="text-xs text-text-secondary mt-1">
                You haven&apos;t sent any pitches matching this status.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredApps.map((app) => {
                const hasCover = !!app.card?.cover_image_url;
                return (
                  <div
                    key={app.id}
                    className="rounded-2xl bg-surface border border-border-strong p-5 space-y-4 hover:border-text-muted transition-colors flex flex-col justify-between"
                  >
                    <div className="flex gap-4">
                      {/* Thumbnail cover */}
                      <div className="size-16 rounded-xl bg-surface-2 overflow-hidden flex-shrink-0 border border-border">
                        {hasCover ? (
                          <img src={app.card.cover_image_url} alt="Cover" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-text-muted">
                            <FileText className="size-6" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-text-muted block font-semibold uppercase">
                          {app.card?.brand?.display_name || "Partner Brand"}
                        </span>
                        <Link
                          href={`/dashboard/influencer/discover/${app.card_id}`}
                          className="text-sm font-bold text-text-primary hover:underline line-clamp-1"
                        >
                          {app.card?.title}
                        </Link>
                        <span className="text-[10px] text-text-secondary flex items-center gap-1">
                          <Calendar className="size-3" />
                          <span>Applied {new Date(app.created_at).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-border pt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            app.status === "accepted"
                              ? "bg-[#4ade80]"
                              : app.status === "rejected"
                              ? "bg-[#f87171]"
                              : "bg-[#facc15]"
                          }`}
                        />
                        <span className="text-xs font-semibold uppercase text-text-secondary tracking-wide">
                          {app.status}
                        </span>
                      </div>

                      {app.status === "pending" ? (
                        <button
                          disabled={withdrawLoading}
                          onClick={() => handleWithdraw(app.id)}
                          className="text-xs font-bold text-[#f87171] bg-surface-2 hover:bg-[#f87171]/10 border border-border rounded-full px-3 py-1.5 flex items-center gap-1 scale-active"
                        >
                          <Trash className="size-3" />
                          <span>Withdraw</span>
                        </button>
                      ) : app.status === "accepted" ? (
                        <Link
                          href="/dashboard/influencer/chats"
                          className="text-xs font-bold text-invert-text bg-accent rounded-full px-4 py-1.5 flex items-center gap-1 scale-active"
                        >
                          <MessageSquare className="size-3" />
                          <span>Open Chat</span>
                        </Link>
                      ) : (
                        app.brand_note && (
                          <span className="text-[10px] text-text-muted italic line-clamp-1 max-w-[200px]" title={app.brand_note}>
                            &ldquo;{app.brand_note}&rdquo;
                          </span>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Invites Filters */}
          <div className="flex flex-wrap gap-2 pb-2">
            {(["all", "pending", "accepted", "declined"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setInviteFilter(f)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all scale-active ${
                  inviteFilter === f
                    ? "bg-accent text-invert-text font-bold"
                    : "bg-surface text-text-secondary border border-border hover:border-border-strong"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Invites list */}
          {invitesLoading ? (
            <div className="space-y-4 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 bg-surface rounded-2xl border border-border" />
              ))}
            </div>
          ) : filteredInvites.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-strong p-12 text-center max-w-lg mx-auto">
              <Mail className="size-8 text-text-muted mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-text-primary">No invites found</h3>
              <p className="text-xs text-text-secondary mt-1">
                You haven&apos;t received any direct invites matching this status.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvites.map((invite) => {
                const isPending = invite.status === "pending";
                return (
                  <div
                    key={invite.id}
                    className="rounded-2xl bg-surface border border-border-strong p-5 space-y-4 hover:border-text-muted transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      {/* Brand Avatar */}
                      <div className="size-12 rounded-full border border-border-strong bg-bg overflow-hidden flex items-center justify-center flex-shrink-0">
                        {invite.brand?.avatar_url ? (
                          <img src={invite.brand.avatar_url} alt="Brand Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-invert-text bg-accent size-full flex items-center justify-center">
                            {invite.brand?.display_name?.[0]?.toUpperCase() || "B"}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/p/brand/${invite.brand_id}`}
                            className="text-xs font-bold text-text-secondary hover:underline"
                          >
                            {invite.brand?.display_name || "Partner Brand"}
                          </Link>
                          {invite.brand?.is_verified && (
                            <span className="text-[10px] bg-accent text-invert-text px-1.5 py-0.2 rounded font-sans font-bold">
                              VERIFIED
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-extrabold text-text-primary">
                          Invited you to:{" "}
                          <Link
                            href={`/dashboard/influencer/discover/${invite.card_id}`}
                            className="hover:underline text-text-primary font-black"
                          >
                            {invite.card?.title || "Campaign Card"}
                          </Link>
                        </h3>
                        {invite.message && (
                          <p className="text-xs text-text-secondary italic border-l border-border-strong pl-3 py-1 my-1">
                            &ldquo;{invite.message}&rdquo;
                          </p>
                        )}
                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                          <Calendar className="size-3" />
                          <span>Invited {new Date(invite.created_at).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 justify-center flex-shrink-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            invite.status === "accepted"
                              ? "bg-[#4ade80]"
                              : invite.status === "declined"
                              ? "bg-[#f87171]"
                              : "bg-[#facc15]"
                          }`}
                        />
                        <span className="text-xs font-bold uppercase text-text-secondary">
                          {invite.status}
                        </span>
                      </div>

                      {isPending ? (
                        <div className="flex gap-2">
                          <button
                            disabled={actionLoading}
                            onClick={() => handleDeclineInvite(invite.id)}
                            className="rounded-full border border-border-strong bg-surface-2 hover:bg-[#f87171]/10 text-[#f87171] px-4 py-2 text-xs font-semibold scale-active flex items-center gap-1"
                          >
                            <X className="size-3" />
                            <span>Decline</span>
                          </button>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleAcceptInvite(invite)}
                            className="rounded-full bg-accent text-invert-text hover:opacity-90 px-4 py-2 text-xs font-bold scale-active flex items-center gap-1"
                          >
                            <Check className="size-3" />
                            <span>Accept</span>
                          </button>
                        </div>
                      ) : invite.status === "accepted" ? (
                        <Link
                          href="/dashboard/influencer/chats"
                          className="text-xs font-bold text-invert-text bg-accent rounded-full px-4 py-2 flex items-center gap-1.5 scale-active"
                        >
                          <MessageSquare className="size-3.5" />
                          <span>Open Chat</span>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
