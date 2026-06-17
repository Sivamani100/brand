"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import {
  LifeBuoy,
  Search,
  CheckCircle,
  Clock,
  User,
  MessageSquare,
  AlertTriangle,
  Send,
  Loader2,
  Lock,
  CornerDownRight,
  ShieldCheck,
  RefreshCw
} from "lucide-react";

interface Ticket {
  id: string;
  ticket_number: string;
  user_id: string | null;
  email: string;
  category: string;
  subject: string;
  description: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "in_review" | "waiting_user" | "resolved" | "closed";
  assigned_to: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_type: "user" | "admin" | "system";
  content: string;
  created_at: string;
}

interface AdminProfile {
  id: string;
  display_name: string;
}

function SLATimer({ ticket, priority, createdAt }: { ticket: Ticket; priority: string; createdAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isBreached, setIsBreached] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      // SLA target calculations: urgent (1h), high (4h), normal (24h), low (48h)
      const limit =
        priority === "urgent"
          ? 3600000
          : priority === "high"
          ? 14400000
          : priority === "normal"
          ? 86400000
          : 172800000;

      const elapsed = Date.now() - new Date(createdAt).getTime();
      const remaining = limit - elapsed;

      if (remaining <= 0) {
        setIsBreached(true);
        setTimeLeft("BREACHED");
      } else {
        setIsBreached(false);
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);

        if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else if (minutes > 0) {
          setTimeLeft(`${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${seconds}s`);
        }
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [priority, createdAt]);

  if (ticket.status === "resolved" || ticket.status === "closed") {
    return (
      <span className="text-[10px] text-[var(--color-text-muted)] font-medium">
        SLA Resolved
      </span>
    );
  }

  return (
    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
      isBreached
        ? "bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse"
        : priority === "urgent"
        ? "bg-red-500/10 text-red-400 border border-red-500/20"
        : priority === "high"
        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
        : "bg-neutral-800 text-neutral-400 border border-[var(--color-border)]"
    }`}>
      SLA: {timeLeft}
    </span>
  );
}

export default function AdminSupportDesk() {
  const supabase = createClient() as any;
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // States
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all_active");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"sla" | "created_desc" | "created_asc">("sla");

  // Selected Ticket details
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Resolution Form
  const [resolutionNote, setResolutionNote] = useState("");
  const [savingResolution, setSavingResolution] = useState(false);

  // Load admins and tickets
  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentAdmin(user);

      // Fetch admin list
      const { data: adminProfiles, error: adminErr } = await supabase
        .from("profiles")
        .select("id, display_name")
        .eq("role", "admin");

      if (adminErr) throw adminErr;
      setAdmins(adminProfiles || []);

      // Fetch all support tickets
      const { data: ticketData, error: ticketErr } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (ticketErr) throw ticketErr;
      setTickets(ticketData || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load Support Desk data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Set real-time listeners for updates
  useEffect(() => {
    const channel = supabase
      .channel("admin-support-desk")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        (payload: any) => {
          const updatedTicket = payload.new as Ticket;
          
          setTickets((prev) => {
            const index = prev.findIndex((t) => t.id === updatedTicket.id);
            if (payload.eventType === "INSERT") {
              return [updatedTicket, ...prev];
            } else if (payload.eventType === "UPDATE") {
              const copy = [...prev];
              copy[index] = updatedTicket;
              return copy;
            } else if (payload.eventType === "DELETE") {
              return prev.filter((t) => t.id !== (payload.old as any).id);
            }
            return prev;
          });

          // Sync selected ticket details if open
          setSelectedTicket((curr) => {
            if (curr && curr.id === updatedTicket.id) {
              return updatedTicket;
            }
            return curr;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch thread messages when selected ticket changes
  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      setResolutionNote("");
      return;
    }

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("ticket_messages")
          .select("*")
          .eq("ticket_id", selectedTicket.id)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setMessages(data || []);
        setResolutionNote(selectedTicket.resolution_note || "");
      } catch (err: any) {
        toast.error(err.message || "Failed to load ticket messages.");
      }
    };

    fetchMessages();

    // Subscribe to realtime messages for this specific ticket
    const channel = supabase
      .channel(`admin-ticket-messages:${selectedTicket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${selectedTicket.id}`,
        },
        (payload: any) => {
          const newMsg = payload.new as TicketMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket?.id]);

  // Scroll active conversation to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Apply filters & search
  useEffect(() => {
    let result = [...tickets];

    // Status filter
    if (selectedStatus === "all_active") {
      result = result.filter((t) => t.status !== "resolved" && t.status !== "closed");
    } else if (selectedStatus !== "all") {
      result = result.filter((t) => t.status === selectedStatus);
    }

    // Priority filter
    if (selectedPriority !== "all") {
      result = result.filter((t) => t.priority === selectedPriority);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.ticket_number.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Sort options
    if (sortBy === "created_desc") {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "created_asc") {
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "sla") {
      // SLA sorting: Priority first (urgent -> high -> normal -> low), then oldest active first
      const priorityWeights = { urgent: 4, high: 3, normal: 2, low: 1 };
      result.sort((a, b) => {
        // Closed/resolved go last
        const aClosed = a.status === "resolved" || a.status === "closed";
        const bClosed = b.status === "resolved" || b.status === "closed";
        if (aClosed && !bClosed) return 1;
        if (!aClosed && bClosed) return -1;

        // Weights comparison
        const weightDiff = (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
        if (weightDiff !== 0) return weightDiff;

        // Oldest first
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    }

    setFilteredTickets(result);
  }, [tickets, searchQuery, selectedStatus, selectedPriority, sortBy]);

  // Actions
  const handleAssignTicket = async (assigneeId: string | null) => {
    if (!selectedTicket) return;
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ assigned_to: assigneeId, updated_at: new Date().toISOString() })
        .eq("id", selectedTicket.id);

      if (error) throw error;
      toast.success(assigneeId ? "Ticket assigned." : "Ticket unassigned.");
    } catch (err: any) {
      toast.error(err.message || "Failed to assign ticket.");
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedTicket) return;
    try {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === "resolved" || status === "closed") {
        updates.resolved_at = new Date().toISOString();
      } else {
        updates.resolved_at = null;
      }

      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", selectedTicket.id);

      if (error) throw error;

      // Insert system message logging the update
      await supabase.from("ticket_messages").insert({
        ticket_id: selectedTicket.id,
        sender_id: currentAdmin?.id || null,
        sender_type: "system",
        content: `Ticket status changed to "${status.replace("_", " ")}" by Support Agent.`,
      });

      toast.success(`Ticket status updated to ${status}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticket status.");
    }
  };

  const handleSaveResolution = async () => {
    if (!selectedTicket) return;
    setSavingResolution(true);
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          resolution_note: resolutionNote.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTicket.id);

      if (error) throw error;
      toast.success("Resolution note saved.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save resolution note.");
    } finally {
      setSavingResolution(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    setSubmittingReply(true);
    try {
      // Insert reply message
      const { error: insertError } = await supabase.from("ticket_messages").insert({
        ticket_id: selectedTicket.id,
        sender_id: currentAdmin.id,
        sender_type: "admin",
        content: replyText.trim(),
      });

      if (insertError) throw insertError;

      // Automatically update status to 'waiting_user' on admin reply (or set to 'in_review')
      const targetStatus = selectedTicket.status === "open" ? "in_review" : selectedTicket.status;
      await supabase
        .from("support_tickets")
        .update({ status: targetStatus, updated_at: new Date().toISOString() })
        .eq("id", selectedTicket.id);

      setReplyText("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reply.");
    } finally {
      setSubmittingReply(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-[var(--color-text-primary)]">
        <Loader2 className="animate-spin size-8 text-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-[calc(100vh-140px)] flex flex-col text-[var(--color-text-primary)]">
      {/* Title block */}
      <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <LifeBuoy className="text-[var(--color-accent)]" /> Support SLA Desk
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Manage customer support queues, track SLA remaining timings, and update resolve states.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 hover:bg-[#141414] border border-[var(--color-border)] rounded-full cursor-pointer transition-all active:scale-95"
          title="Refresh Queue"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Control / Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-[#0d0d0d] p-4 rounded-xl border border-[var(--color-border)] text-xs">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] size-4" />
          <input
            type="text"
            className="w-full bg-black border border-[var(--color-border)] rounded-full pl-9 pr-4 py-2 outline-none text-[var(--color-text-primary)]"
            placeholder="Search tickets, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div>
          <select
            className="w-full bg-black border border-[var(--color-border)] rounded-full px-3 py-2 outline-none"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all_active">Active Tickets (Open/Review/Wait)</option>
            <option value="all">All Tickets (Including Closed)</option>
            <option value="open">Status: Open</option>
            <option value="in_review">Status: In Review</option>
            <option value="waiting_user">Status: Waiting User</option>
            <option value="resolved">Status: Resolved</option>
            <option value="closed">Status: Closed</option>
          </select>
        </div>

        <div>
          <select
            className="w-full bg-black border border-[var(--color-border)] rounded-full px-3 py-2 outline-none"
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
          >
            <option value="all">Priority: All</option>
            <option value="urgent">Urgent Priority</option>
            <option value="high">High Priority</option>
            <option value="normal">Normal Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>

        <div>
          <select
            className="w-full bg-black border border-[var(--color-border)] rounded-full px-3 py-2 outline-none"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="sla">Sort: Priority SLA Queue</option>
            <option value="created_desc">Sort: Opened (Newest First)</option>
            <option value="created_asc">Sort: Opened (Oldest First)</option>
          </select>
        </div>
      </div>

      {/* Main SLA Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
        {/* Ticket List Queue */}
        <div className="lg:col-span-1 space-y-3 max-h-[700px] overflow-y-auto pr-1">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12 border border-[var(--color-border)] bg-[#0d0d0d] rounded-2xl">
              <p className="text-xs text-[var(--color-text-muted)] italic">
                No tickets matching active filters.
              </p>
            </div>
          ) : (
            filteredTickets.map((t) => {
              const isSelected = selectedTicket?.id === t.id;
              const isAssignedToMe = t.assigned_to === currentAdmin?.id;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`p-4 border rounded-xl transition-all cursor-pointer flex flex-col gap-2 relative ${
                    isSelected
                      ? "bg-[#141414] border-[var(--color-text-primary)]"
                      : "bg-[#0d0d0d] border-[var(--color-border)] hover:bg-[#141414]/50"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[var(--color-accent-bg)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)]">
                      {t.ticket_number}
                    </span>
                    <SLATimer ticket={t} priority={t.priority} createdAt={t.created_at} />
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[var(--color-text-primary)] line-clamp-1">
                      {t.subject}
                    </h4>
                    <p className="text-[10px] text-[var(--color-text-secondary)] line-clamp-1 mt-0.5">
                      {t.email}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-1 pt-1.5 border-t border-[var(--color-border)]/50">
                    <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-full capitalize ${
                      t.status === "open"
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : t.status === "in_review"
                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        : t.status === "waiting_user"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
                    }`}>
                      {t.status.replace("_", " ")}
                    </span>

                    {t.assigned_to ? (
                      <span className={`text-[9px] font-bold inline-flex items-center gap-1 ${
                        isAssignedToMe ? "text-green-400 font-extrabold" : "text-[var(--color-text-muted)]"
                      }`}>
                        <User size={10} /> {isAssignedToMe ? "Me" : (admins.find((a) => a.id === t.assigned_to)?.display_name || "Agent")}
                      </span>
                    ) : (
                      <span className="text-[9px] text-amber-500/80 font-bold uppercase tracking-wider">
                        Unassigned
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Details & Thread Panel */}
        <div className="lg:col-span-2 bg-[#0d0d0d] border border-[var(--color-border)] rounded-2xl overflow-hidden h-[700px] flex flex-col">
          {selectedTicket ? (
            <div className="flex-1 flex flex-col h-full">
              {/* Detail Header & Action Panel */}
              <div className="p-5 border-b border-[var(--color-border)] bg-[#141414]/30 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-[var(--color-text-primary)]">
                      {selectedTicket.ticket_number}: {selectedTicket.subject}
                    </h2>
                    <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
                      User: <strong className="font-bold text-[var(--color-text-primary)]">{selectedTicket.email}</strong> • opened {new Date(selectedTicket.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Quick Assign to Me */}
                    {selectedTicket.assigned_to !== currentAdmin?.id && (
                      <button
                        onClick={() => handleAssignTicket(currentAdmin?.id)}
                        className="px-2.5 py-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded text-[10px] font-bold cursor-pointer transition-all"
                      >
                        Claim Ticket
                      </button>
                    )}
                    {selectedTicket.assigned_to && (
                      <button
                        onClick={() => handleAssignTicket(null)}
                        className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded text-[10px] font-bold cursor-pointer transition-all"
                      >
                        Unassign
                      </button>
                    )}
                  </div>
                </div>

                {/* Dropdowns Line */}
                <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-[var(--color-border)]/50 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[var(--color-text-muted)] font-semibold uppercase tracking-wider text-[9px]">Assignee:</span>
                    <select
                      className="bg-black border border-[var(--color-border)] rounded px-2 py-1 outline-none text-xs"
                      value={selectedTicket.assigned_to || ""}
                      onChange={(e) => handleAssignTicket(e.target.value || null)}
                    >
                      <option value="">-- Unassigned --</option>
                      {admins.map((adm) => (
                        <option key={adm.id} value={adm.id}>
                          {adm.display_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[var(--color-text-muted)] font-semibold uppercase tracking-wider text-[9px]">Status:</span>
                    <select
                      className="bg-black border border-[var(--color-border)] rounded px-2 py-1 outline-none text-xs"
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                    >
                      <option value="open">Open</option>
                      <option value="in_review">In Review</option>
                      <option value="waiting_user">Waiting User</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[var(--color-text-muted)] font-semibold uppercase tracking-wider text-[9px]">Category:</span>
                    <span className="font-bold capitalize bg-neutral-900 border border-[var(--color-border)] px-2.5 py-0.5 rounded">
                      {selectedTicket.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[var(--color-text-muted)] font-semibold uppercase tracking-wider text-[9px]">Priority:</span>
                    <span className={`font-bold capitalize px-2 py-0.5 rounded border ${
                      selectedTicket.priority === "urgent"
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : selectedTicket.priority === "high"
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-neutral-800 border-neutral-700 text-neutral-400"
                    }`}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                </div>
              </div>

              {/* Resolution Note Section */}
              <div className="px-5 py-3 bg-[#141414]/20 border-b border-[var(--color-border)] flex flex-col sm:flex-row gap-2 items-center">
                <input
                  type="text"
                  placeholder="Add a resolution note..."
                  className="flex-1 bg-black border border-[var(--color-border)] rounded px-3 py-1.5 text-xs outline-none text-[var(--color-text-primary)]"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                />
                <button
                  onClick={handleSaveResolution}
                  disabled={savingResolution}
                  className="px-3 py-1.5 bg-[var(--color-accent)] hover:opacity-90 text-[var(--color-invert-text)] font-semibold text-[11px] rounded transition-all scale-active cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {savingResolution ? "Saving..." : "Save Note"}
                </button>
              </div>

              {/* Chat Thread area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Description card */}
                <div className="flex gap-3 border-b border-[var(--color-border)] pb-4">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-accent-bg)] border border-[var(--color-border)] flex items-center justify-center font-bold text-xs">
                    U
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">{selectedTicket.email}</span>
                      <span className="text-[9px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider bg-[var(--color-border)] px-1.5 py-0.5 rounded">
                        Requester
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
                        {new Date(selectedTicket.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-[#141414] p-4 rounded-2xl rounded-tl-none border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                      {selectedTicket.description}
                    </div>
                  </div>
                </div>

                {/* Message feeds */}
                {messages.map((msg) => {
                  if (msg.sender_type === "system") {
                    return (
                      <div key={msg.id} className="flex justify-center my-3">
                        <div className="text-[10px] text-[var(--color-text-muted)] bg-[#141414] border border-[var(--color-border)] px-3 py-1 rounded-full flex items-center gap-1.5 italic font-medium">
                          <CornerDownRight size={10} />
                          {msg.content}
                        </div>
                      </div>
                    );
                  }

                  const isAdminReply = msg.sender_type === "admin";

                  return (
                    <div key={msg.id} className={`flex items-start gap-3 ${isAdminReply ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${
                        isAdminReply
                          ? "bg-[var(--color-accent)] text-[var(--color-invert-text)] border-[var(--color-accent)]"
                          : "bg-[var(--color-accent-bg)] border-[var(--color-border)]"
                      }`}>
                        {isAdminReply ? "A" : "U"}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className={`flex items-center gap-2 ${isAdminReply ? "flex-row-reverse" : ""}`}>
                          <span className="text-xs font-bold">
                            {isAdminReply ? "Staff (You)" : "User"}
                          </span>
                          {isAdminReply && (
                            <span className="text-[9px] text-green-400 font-extrabold uppercase tracking-wider bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <ShieldCheck size={9} /> Staff
                            </span>
                          )}
                          <span className="text-[10px] text-[var(--color-text-muted)]">
                            {new Date(msg.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className={`flex ${isAdminReply ? "justify-end" : "justify-start"}`}>
                          <div className={`p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap border max-w-[85%] ${
                            isAdminReply
                              ? "bg-[var(--color-accent-bg)] border-[var(--color-border)] text-[var(--color-text-primary)] rounded-tr-none"
                              : "bg-blue-500/5 border-blue-500/10 text-[var(--color-text-primary)] rounded-tl-none"
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input form */}
              <div className="p-4 border-t border-[var(--color-border)] bg-[#141414]/30">
                {selectedTicket.status === "closed" ? (
                  <div className="text-center py-2 text-xs text-[var(--color-text-muted)] font-medium flex items-center justify-center gap-1.5 bg-neutral-900/30 rounded-xl border border-[var(--color-border)]">
                    <Lock size={14} className="text-neutral-500" />
                    This ticket is closed. Re-open the ticket status above to post replies.
                  </div>
                ) : (
                  <form onSubmit={handleSendReply} className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Type reply to client..."
                      className="flex-1 bg-black border border-[var(--color-border)] rounded-full px-5 py-3 text-xs outline-none input-focus-animate text-[var(--color-text-primary)]"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      disabled={submittingReply}
                    />
                    <button
                      type="submit"
                      disabled={submittingReply || !replyText.trim()}
                      className="w-10 h-10 bg-[var(--color-accent)] text-[var(--color-invert-text)] rounded-full flex items-center justify-center hover:opacity-90 transition-all scale-active cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-[var(--color-accent-bg)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)]">
                <MessageSquare size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">No Ticket Selected</h3>
                <p className="text-xs text-[var(--color-text-muted)] max-w-xs mt-1 leading-relaxed">
                  Select a support ticket from the active SLA priority queue to view conversation thread and update resolve states.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
