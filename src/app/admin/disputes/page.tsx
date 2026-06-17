"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { AlertTriangle, CheckSquare, MessageSquare, ShieldCheck, Scale, ExternalLink, ShieldAlert, ChevronRight, X } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminDisputesPage() {
  const { user } = useUser();
  const supabase = createClient();

  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "under_review" | "resolved" | "closed">("open");

  // Audit details
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [chatLogs, setChatLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Resolution modal / form state
  const [resolutionType, setResolutionType] = useState<"brand" | "influencer" | "mutual" | "close" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchDisputes() {
    setLoading(true);
    const { data, error } = await supabase
      .from("disputes")
      .select(`
        *,
        room:rooms!inner(
          *,
          brand:profiles!rooms_brand_id_fkey(*),
          influencer:profiles!rooms_influencer_id_fkey(*),
          card:cards(*)
        ),
        reporter:profiles!disputes_raised_by_fkey(*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load disputes queue.");
    } else {
      setDisputes(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleSelectDispute = async (disp: any) => {
    setSelectedDispute(disp);
    setResolutionType(null);
    setAdminNote("");
    
    // Fetch chat logs
    setLogsLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles(*)
      `)
      .eq("room_id", disp.room_id)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to fetch chat logs for audit.");
    } else {
      setChatLogs(data || []);
      
      // Mark as under review if status is open
      if (disp.status === "open") {
        await supabase
          .from("disputes")
          .update({ status: "under_review" })
          .eq("id", disp.id);
        fetchDisputes();
      }
    }
    setLogsLoading(false);
  };

  const handleResolveSubmit = async () => {
    if (!selectedDispute || !resolutionType || !adminNote.trim()) {
      toast.error("Please select a resolution and add audit notes.");
      return;
    }

    setActionLoading(true);

    const resolutionText = 
      resolutionType === "brand" ? "Resolved in favor of Brand" :
      resolutionType === "influencer" ? "Resolved in favor of Influencer" :
      resolutionType === "mutual" ? "Mutual resolution" : "Closed room without favor";

    // 1. Update dispute
    const { error: dispError } = await supabase
      .from("disputes")
      .update({
        status: "resolved",
        resolution: resolutionText,
        admin_note: adminNote,
        resolved_by: user.id
      })
      .eq("id", selectedDispute.id);

    if (dispError) {
      toast.error("Failed to update dispute status.");
      setActionLoading(false);
      return;
    }

    // 2. Update room status to closed
    const { error: roomError } = await supabase
      .from("rooms")
      .update({ status: "closed" })
      .eq("id", selectedDispute.room_id);

    if (roomError) {
      toast.error("Dispute updated, but failed to close room.");
      setActionLoading(false);
      return;
    }

    // 3. Notify participants
    const room = selectedDispute.room;
    const participants = [room.brand_id, room.influencer_id];

    for (const pId of participants) {
      await supabase.from("notifications").insert({
        user_id: pId,
        type: "dispute_resolved",
        title: "Dispute Resolved ⚖️",
        body: `The administrator has resolved the dispute for '${room.card.title}': "${resolutionText}". Feedback: "${adminNote}"`,
        reference_id: selectedDispute.room_id,
        reference_type: "room"
      });
    }

    toast.success("Dispute resolved and room closed successfully.");
    setSelectedDispute(null);
    setResolutionType(null);
    setAdminNote("");
    setActionLoading(false);
    fetchDisputes();
  };

  const filteredDisputes = disputes.filter((d) => {
    if (filter === "all") return true;
    return d.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef]">
          Admin Disputes Queue
        </h1>
        <p className="text-xs text-[rgba(251,251,239,0.6)]">
          Audit chat histories, inspect file evidences, and resolve contract disputes between brands and influencers
        </p>
      </div>

      {/* Grid: Lists on left, Auditor details on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left column: Disputes List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex border-b border-[rgba(251,251,239,0.1)] gap-2 pb-2 overflow-x-auto">
            {(["open", "under_review", "resolved", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all ${
                  filter === f
                    ? "bg-[#fbfbef] text-black font-bold"
                    : "bg-[#0d0d0d] text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)]"
                }`}
              >
                {f.replace("_", " ")}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-[#0d0d0d] rounded-2xl border border-[rgba(251,251,239,0.1)]" />
              ))}
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[rgba(251,251,239,0.2)] p-12 text-center">
              <AlertTriangle className="size-8 text-[rgba(251,251,239,0.4)] mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-[#fbfbef]">No disputes</h3>
              <p className="text-xs text-[rgba(251,251,239,0.6)] mt-1">
                No tickets found under this status.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDisputes.map((disp) => {
                const isSelected = selectedDispute?.id === disp.id;
                return (
                  <button
                    key={disp.id}
                    onClick={() => handleSelectDispute(disp)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all flex items-center justify-between group ${
                      isSelected
                        ? "bg-[#141414] border-[#fbfbef] shadow-glow"
                        : "bg-[#0d0d0d] border-[rgba(251,251,239,0.2)] hover:border-[rgba(251,251,239,0.3)]"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            disp.status === "resolved"
                              ? "bg-[#4ade80]"
                              : disp.status === "under_review"
                              ? "bg-[#facc15]"
                              : "bg-[#f87171]"
                          }`}
                        />
                        <span className="text-[10px] text-[rgba(251,251,239,0.4)] font-semibold uppercase">
                          {disp.status.replace("_", " ")}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-[#fbfbef] line-clamp-1">
                        Campaign: {disp.room?.card?.title}
                      </h4>
                      <p className="text-[10px] text-[rgba(251,251,239,0.6)] line-clamp-1">
                        Reason: {disp.reason}
                      </p>
                      <span className="text-[9px] text-[rgba(251,251,239,0.4)] block">
                        Raised by: {disp.reporter?.display_name} • {new Date(disp.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <ChevronRight className="size-4 text-[rgba(251,251,239,0.4)] group-hover:text-white transition-colors" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: Audit Workspace */}
        <div className="lg:col-span-2 space-y-6">
          {selectedDispute ? (
            <div className="rounded-2xl border border-[rgba(251,251,239,0.2)] bg-[#0d0d0d] p-6 space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-[rgba(251,251,239,0.05)] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#fbfbef]">Dispute Audit Workspace</h3>
                  <p className="text-[10px] text-[rgba(251,251,239,0.4)] mt-1 uppercase font-semibold">
                    Ticket ID: {selectedDispute.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDispute(null)}
                  className="p-1 text-[rgba(251,251,239,0.6)] hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Case Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-black/50 p-4 rounded-xl border border-[rgba(251,251,239,0.05)]">
                <div>
                  <span className="text-[10px] text-[rgba(251,251,239,0.4)] uppercase font-semibold block">Brand</span>
                  <span className="font-bold text-white block mt-0.5">{selectedDispute.room?.brand?.display_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[rgba(251,251,239,0.4)] uppercase font-semibold block">Influencer</span>
                  <span className="font-bold text-white block mt-0.5">{selectedDispute.room?.influencer?.display_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[rgba(251,251,239,0.4)] uppercase font-semibold block">Reason Category</span>
                  <span className="font-bold text-[#f87171] block mt-0.5">{selectedDispute.reason}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[rgba(251,251,239,0.4)] uppercase font-semibold block">Raised By</span>
                  <span className="font-bold text-white block mt-0.5">
                    {selectedDispute.reporter?.display_name} ({selectedDispute.reporter?.role})
                  </span>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-[rgba(251,251,239,0.05)]">
                  <span className="text-[10px] text-[rgba(251,251,239,0.4)] uppercase font-semibold block">Dispute Explanation</span>
                  <p className="text-[11px] text-[rgba(251,251,239,0.7)] leading-relaxed mt-1">
                    {selectedDispute.description || "No description provided."}
                  </p>
                </div>
              </div>

              {/* Evidence Uploads */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-[rgba(251,251,239,0.4)] block">Submitted Evidence Files</span>
                {selectedDispute.evidence_urls && selectedDispute.evidence_urls.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedDispute.evidence_urls.map((url: string, index: number) => {
                      const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)/i);
                      return (
                        <div
                          key={index}
                          className="rounded-xl border border-[rgba(251,251,239,0.1)] bg-black overflow-hidden flex flex-col justify-between group hover:border-[rgba(251,251,239,0.3)] transition-all"
                        >
                          {isImage ? (
                            <img src={url} alt="Evidence" className="h-28 w-full object-cover" />
                          ) : (
                            <div className="h-28 w-full flex items-center justify-center text-[rgba(251,251,239,0.2)]">
                              <ShieldAlert className="size-8" />
                            </div>
                          )}
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-bold text-[#fbfbef] bg-[#141414] hover:bg-black p-2 flex items-center justify-center gap-1 border-t border-[rgba(251,251,239,0.1)]"
                          >
                            <ExternalLink className="size-3" />
                            <span>View Evidence</span>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[rgba(251,251,239,0.4)]">No evidence attachments uploaded.</p>
                )}
              </div>

              {/* Chat Log Audit Panel */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-[rgba(251,251,239,0.4)] flex items-center gap-1">
                  <MessageSquare className="size-3.5" />
                  <span>Chat Conversation Logs</span>
                </span>
                <div className="h-64 rounded-xl border border-[rgba(251,251,239,0.1)] bg-black/60 p-4 overflow-y-auto space-y-3 font-sans scrollbar-thin">
                  {logsLoading ? (
                    <div className="flex h-full items-center justify-center text-xs text-[rgba(251,251,239,0.4)]">
                      Loading audit chat logs...
                    </div>
                  ) : chatLogs.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-xs text-[rgba(251,251,239,0.4)]">
                      No chat messages exchanged in this room.
                    </div>
                  ) : (
                    chatLogs.map((msg) => {
                      const isReporter = msg.sender_id === selectedDispute.raised_by;
                      return (
                        <div key={msg.id} className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[9px] font-bold">
                            <span className={isReporter ? "text-[#f87171]" : "text-[rgba(251,251,239,0.5)]"}>
                              {msg.sender?.display_name} ({msg.sender?.role})
                            </span>
                            <span className="text-[rgba(251,251,239,0.3)] font-normal">
                              {new Date(msg.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-[rgba(251,251,239,0.8)] pl-2 border-l border-[rgba(251,251,239,0.1)] leading-relaxed">
                            {msg.content}
                          </p>
                          {msg.attachment_url && (
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9px] text-white hover:underline flex items-center gap-1.5 pl-2 mt-1"
                            >
                              <ExternalLink className="size-2.5" />
                              <span>Attachment ({msg.attachment_type})</span>
                            </a>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Resolution Form */}
              {selectedDispute.status !== "resolved" ? (
                <div className="border-t border-[rgba(251,251,239,0.05)] pt-6 space-y-4">
                  <span className="text-[10px] uppercase font-bold text-[#fbfbef] block">Submit Resolution Verdict</span>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(["brand", "influencer", "mutual", "close"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setResolutionType(type)}
                        className={`rounded-xl px-3 py-3 text-xs font-bold text-center border uppercase transition-all scale-active ${
                          resolutionType === type
                            ? "bg-[#fbfbef] text-black border-white"
                            : "bg-[#141414] text-[rgba(251,251,239,0.6)] border-[rgba(251,251,239,0.1)] hover:border-[rgba(251,251,239,0.3)]"
                        }`}
                      >
                        {type === "brand" ? "Favor Brand" :
                         type === "influencer" ? "Favor Influencer" :
                         type === "mutual" ? "Mutual Resolve" : "Close Room"}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-[rgba(251,251,239,0.4)] uppercase">Auditor Statement / Action Note</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Add specific details of the resolution verdict. This will be shared in notifications to both parties..."
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      className="block w-full rounded-xl bg-black border border-[rgba(251,251,239,0.2)] px-4 py-2.5 text-xs text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                    />
                  </div>

                  <button
                    onClick={handleResolveSubmit}
                    disabled={actionLoading}
                    className="rounded-full bg-red-600 text-white hover:opacity-90 px-6 py-3 text-xs font-extrabold transition-all w-full flex items-center justify-center gap-2 scale-active"
                  >
                    <Scale className="size-4" />
                    <span>{actionLoading ? "Processing Resolution..." : "Apply dispute resolution & Close room"}</span>
                  </button>
                </div>
              ) : (
                <div className="border-t border-[rgba(251,251,239,0.05)] pt-4 space-y-2">
                  <div className="rounded-xl border border-[rgba(74,222,128,0.2)] bg-[#051c0e] p-4 text-xs space-y-1">
                    <span className="font-bold text-[#4ade80] uppercase block">Ticket Resolved</span>
                    <p className="text-[rgba(251,251,239,0.8)] font-semibold">
                      Verdict: {selectedDispute.resolution}
                    </p>
                    {selectedDispute.admin_note && (
                      <p className="text-[rgba(251,251,239,0.6)] italic mt-1.5 bg-black/30 p-2.5 rounded-lg border border-[rgba(251,251,239,0.05)]">
                        &ldquo;{selectedDispute.admin_note}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-[rgba(251,251,239,0.1)] bg-[#0d0d0d] p-12 text-center text-xs text-[rgba(251,251,239,0.4)]">
              Select a dispute ticket from the list to initiate conversation logs audit, check evidences, and issue verdicts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
