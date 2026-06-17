"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { Check, X, ShieldAlert, ShieldCheck, Clock, ExternalLink, MessageSquare, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminVerificationsPage() {
  const { user } = useUser();
  const supabase = createClient();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  // Rejection modal
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchRequests() {
    setLoading(true);
    const { data, error } = await supabase
      .from("verification_requests")
      .select(`
        *,
        user:profiles!verification_requests_user_id_fkey(*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load verification requests.");
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (req: any) => {
    const confirm = window.confirm(`Approve verification for ${req.user.display_name}?`);
    if (!confirm) return;

    setActionLoading(true);

    // 1. Update verification_requests table
    const { error: requestError } = await supabase
      .from("verification_requests")
      .update({
        status: "approved",
        reviewed_by: user.id
      })
      .eq("id", req.id);

    if (requestError) {
      toast.error("Failed to approve request: " + requestError.message);
      setActionLoading(false);
      return;
    }

    // 2. Update profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ is_verified: true })
      .eq("id", req.user_id);

    if (profileError) {
      toast.error("Request updated, but failed to mark profile as verified.");
      setActionLoading(false);
      return;
    }

    // 3. Create notification for user
    await supabase.from("notifications").insert({
      user_id: req.user_id,
      type: "verification_update",
      title: "Verification approved! 🎉",
      body: "Your profile has been verified by our administration team. A verification badge is now active on your account.",
      reference_id: req.user_id,
      reference_type: "card" // Fallback reference type since we don't have a specific verification type
    });

    toast.success("Verification approved!");
    setActionLoading(false);
    fetchRequests();
  };

  const handleRejectInit = (id: string) => {
    setRejectingId(id);
    setRejectNote("");
  };

  const handleRejectSubmit = async () => {
    if (!rejectingId) return;
    if (!rejectNote.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    setActionLoading(true);
    const req = requests.find((r) => r.id === rejectingId);
    if (!req) return;

    // 1. Update verification_requests table
    const { error: requestError } = await supabase
      .from("verification_requests")
      .update({
        status: "rejected",
        admin_note: rejectNote,
        reviewed_by: user.id
      })
      .eq("id", req.id);

    if (requestError) {
      toast.error("Failed to reject request: " + requestError.message);
      setActionLoading(false);
      return;
    }

    // 2. Make sure profile remains unverified
    await supabase
      .from("profiles")
      .update({ is_verified: false })
      .eq("id", req.user_id);

    // 3. Create notification for user
    await supabase.from("notifications").insert({
      user_id: req.user_id,
      type: "verification_update",
      title: "Verification rejected",
      body: `Your verification request was audited and rejected. Feedback: "${rejectNote}"`,
      reference_id: req.user_id,
      reference_type: "card"
    });

    toast.success("Verification request rejected.");
    setRejectingId(null);
    setActionLoading(false);
    fetchRequests();
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef]">
          Verification Requests Queue
        </h1>
        <p className="text-xs text-[rgba(251,251,239,0.6)]">
          Audit and manage credentials submitted by brand partners and influencers
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[rgba(251,251,239,0.1)] pb-4">
        {(["pending", "approved", "rejected", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all scale-active ${
              filter === t
                ? "bg-[#fbfbef] text-black font-bold"
                : "bg-[#0d0d0d] text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)] hover:border-[rgba(251,251,239,0.3)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Requests list */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-[#0d0d0d] rounded-2xl border border-[rgba(251,251,239,0.1)]" />
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[rgba(251,251,239,0.2)] p-12 text-center max-w-lg mx-auto">
          <AlertCircle className="size-8 text-[rgba(251,251,239,0.4)] mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-[#fbfbef]">No verification requests</h3>
          <p className="text-xs text-[rgba(251,251,239,0.6)] mt-1">
            There are no requests matching this status filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isPending = req.status === "pending";
            return (
              <div
                key={req.id}
                className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-6 space-y-4 hover:border-[rgba(251,251,239,0.3)] transition-colors"
              >
                {/* User Info Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(251,251,239,0.05)] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full border border-[rgba(251,251,239,0.2)] bg-black overflow-hidden flex items-center justify-center">
                      {req.user?.avatar_url ? (
                        <img src={req.user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-black bg-[#fbfbef] size-full flex items-center justify-center">
                          {req.user?.display_name?.[0]?.toUpperCase() || "U"}
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#fbfbef] flex items-center gap-1.5">
                        <span>{req.user?.display_name}</span>
                        {req.user?.is_verified && (
                          <ShieldCheck className="size-4 text-[#4ade80]" />
                        )}
                      </h4>
                      <span className="text-[10px] text-[rgba(251,251,239,0.4)] uppercase font-semibold">
                        Role: {req.role} • Location: {req.user?.location || "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-[rgba(251,251,239,0.4)] block uppercase">Submitted Date</span>
                    <span className="text-xs text-[#fbfbef]">
                      {new Date(req.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Submitted Notes */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[rgba(251,251,239,0.4)] block">Notes / Reason</span>
                  <p className="text-xs text-[rgba(251,251,239,0.7)] leading-relaxed bg-black/45 p-3 rounded-xl border border-[rgba(251,251,239,0.05)] whitespace-pre-wrap">
                    {req.notes || "No notes provided."}
                  </p>
                </div>

                {/* Links */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[rgba(251,251,239,0.4)] block">Verification Links</span>
                  <div className="flex flex-wrap gap-2">
                    {req.submitted_links?.map((link: string, i: number) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-white hover:underline flex items-center gap-1 bg-black border border-[rgba(251,251,239,0.1)] rounded-full px-3 py-1.5 transition-colors"
                      >
                        <ExternalLink className="size-3" />
                        <span>{link}</span>
                      </a>
                    )) || <span className="text-xs text-[rgba(251,251,239,0.4)]">No links submitted.</span>}
                  </div>
                </div>

                {/* Status and Action Buttons */}
                <div className="border-t border-[rgba(251,251,239,0.05)] pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        req.status === "approved"
                          ? "bg-[#4ade80]"
                          : req.status === "rejected"
                          ? "bg-[#f87171]"
                          : "bg-[#facc15]"
                      }`}
                    />
                    <span className="text-xs font-bold uppercase text-[rgba(251,251,239,0.6)]">
                      {req.status}
                    </span>
                    {req.admin_note && (
                      <span className="text-[10px] text-[rgba(251,251,239,0.4)] italic ml-2">
                        &ldquo;{req.admin_note}&rdquo;
                      </span>
                    )}
                  </div>

                  {isPending && (
                    <div className="flex gap-2">
                      <button
                        disabled={actionLoading}
                        onClick={() => handleRejectInit(req.id)}
                        className="rounded-full border border-[rgba(251,251,239,0.2)] bg-[#141414] hover:bg-[#261414] text-[#f87171] px-4 py-2 text-xs font-semibold scale-active"
                      >
                        Reject Request
                      </button>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleApprove(req)}
                        className="rounded-full bg-[#fbfbef] text-black hover:opacity-90 px-4 py-2 text-xs font-bold scale-active"
                      >
                        Approve Request
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d0d0d] p-6 border border-[rgba(251,251,239,0.2)] shadow-glow space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#fbfbef]">Audit Rejection Feedback</h3>
              <button onClick={() => setRejectingId(null)} className="text-[rgba(251,251,239,0.6)] hover:text-white">
                &times;
              </button>
            </div>
            <div>
              <p className="text-xs text-[rgba(251,251,239,0.6)] leading-normal">
                Leave detailed feedback explaining why the credentials submitted did not meet verification criteria.
              </p>
              <textarea
                rows={3}
                className="mt-3 block w-full rounded-xl bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-2.5 text-xs text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                placeholder="e.g. Instagram link does not list the brand email, or cannot confirm business registration."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingId(null)}
                className="rounded-full bg-[#141414] px-4 py-2 text-xs font-semibold text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)]"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={actionLoading}
                className="rounded-full bg-[#f87171] px-4 py-2 text-xs font-bold text-black"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
