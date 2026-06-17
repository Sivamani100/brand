"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { ArrowLeft, Send, CheckCircle, Clock, Tag, MessageSquare, AlertCircle } from "lucide-react";

interface Ticket {
  id: string;
  ticket_number: string;
  user_id: string;
  email: string;
  category: string;
  subject: string;
  description: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "in_review" | "waiting_user" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_type: "user" | "admin" | "system";
  content: string;
  created_at: string;
}

export default function TicketThreadPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const supabase = createClient() as any;
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchTicketDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Fetch ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("id", ticketId)
        .single();

      if (ticketError) throw ticketError;
      setTicket(ticketData);

      // Fetch messages
      const { data: messageData, error: messageError } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (messageError) throw messageError;
      setMessages(messageData || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load ticket details.");
      router.push("/support?tab=tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails();
    }
  }, [ticketId]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket-messages:${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload: any) => {
          const newMsg = payload.new as TicketMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_tickets",
          filter: `id=eq.${ticketId}`,
        },
        (payload: any) => {
          const newTicket = payload.new as Ticket;
          setTicket(newTicket);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !ticket) return;

    setSubmittingReply(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to reply.");

      // Insert message
      const { error: insertError } = await supabase.from("ticket_messages").insert({
        ticket_id: ticketId,
        sender_id: user.id,
        sender_type: "user",
        content: replyText.trim(),
      });

      if (insertError) throw insertError;

      // Update ticket status to open when user replies, unless it was resolved/closed
      if (ticket.status !== "resolved" && ticket.status !== "closed") {
        await supabase
          .from("support_tickets")
          .update({ status: "open", updated_at: new Date().toISOString() })
          .eq("id", ticketId);
      }

      setReplyText("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send message.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!ticket) return;
    const confirmResolve = window.confirm("Are you sure you want to mark this ticket as resolved?");
    if (!confirmResolve) return;

    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticketId);

      if (error) throw error;

      // Insert system message about closure
      await supabase.from("ticket_messages").insert({
        ticket_id: ticketId,
        sender_id: currentUser?.id || null,
        sender_type: "system",
        content: "Ticket has been resolved by the user.",
      });

      toast.success("Ticket marked as resolved.");
      fetchTicketDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve ticket.");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12 space-y-6 min-h-screen bg-black text-[var(--color-text-primary)]">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-[#0d0d0d] rounded" />
          <div className="h-10 w-full bg-[#0d0d0d] rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-64 bg-[#0d0d0d] rounded-xl md:col-span-1" />
            <div className="h-96 bg-[#0d0d0d] rounded-xl md:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12 text-center min-h-screen bg-black text-[var(--color-text-primary)] space-y-4">
        <p className="text-xs text-[var(--color-text-muted)] italic">Ticket not found or permission denied.</p>
        <Link href="/support?tab=tickets" className="text-xs text-[var(--color-accent)] hover:underline inline-flex items-center gap-1">
          <ArrowLeft size={12} /> Back to Support
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 space-y-6 min-h-screen bg-black text-[var(--color-text-primary)]">
      {/* Back Link */}
      <div>
        <Link
          href="/support?tab=tickets"
          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] inline-flex items-center gap-1.5 transition-colors font-medium"
        >
          <ArrowLeft size={14} /> Back to My Tickets
        </Link>
      </div>

      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[var(--color-accent-bg)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)]">
              {ticket.ticket_number}
            </span>
            <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full capitalize ${
              ticket.status === "open"
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : ticket.status === "in_review"
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : ticket.status === "waiting_user"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
            }`}>
              {ticket.status.replace("_", " ")}
            </span>
            <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full capitalize ${
              ticket.priority === "urgent"
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : ticket.priority === "high"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : ticket.priority === "normal"
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-neutral-500/10 text-neutral-400 border-neutral-500/20"
            }`}>
              {ticket.priority} priority
            </span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-[var(--color-text-primary)] mt-1">
            {ticket.subject}
          </h1>
        </div>

        {ticket.status !== "resolved" && ticket.status !== "closed" && (
          <button
            onClick={handleResolveTicket}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#141414] hover:bg-[#1c1c1c] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-full text-xs font-semibold cursor-pointer transition-all scale-active"
          >
            <CheckCircle size={14} className="text-green-500" />
            Mark as Resolved
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Sidebar Info Panel */}
        <div className="bg-[#0d0d0d] border border-[var(--color-border)] rounded-2xl p-6 space-y-6 md:col-span-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-[var(--color-border)] pb-2 flex items-center gap-1.5">
            <Tag size={12} /> Ticket Details
          </h3>

          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <span className="text-[var(--color-text-muted)] font-semibold uppercase tracking-wider text-[9px]">Category</span>
              <p className="font-bold capitalize">{ticket.category}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[var(--color-text-muted)] font-semibold uppercase tracking-wider text-[9px]">Contact Email</span>
              <p className="font-medium text-[var(--color-text-secondary)]">{ticket.email}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[var(--color-text-muted)] font-semibold uppercase tracking-wider text-[9px]">Last Updated</span>
              <p className="font-medium flex items-center gap-1 text-[var(--color-text-secondary)]">
                <Clock size={10} /> {new Date(ticket.updated_at).toLocaleString()}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[var(--color-text-muted)] font-semibold uppercase tracking-wider text-[9px]">Opened On</span>
              <p className="font-medium text-[var(--color-text-secondary)]">
                {new Date(ticket.created_at).toLocaleDateString()}
              </p>
            </div>

            {ticket.resolution_note && (
              <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-xl space-y-1 mt-4">
                <span className="text-green-400 font-bold uppercase tracking-wider text-[9px] flex items-center gap-1">
                  <CheckCircle size={10} /> Resolution Note
                </span>
                <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed italic">
                  &ldquo;{ticket.resolution_note}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Main Conversation Thread */}
        <div className="md:col-span-2 flex flex-col h-[600px] bg-[#0d0d0d] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          {/* Thread Header */}
          <div className="px-5 py-4 border-b border-[var(--color-border)] bg-[#141414]/30 flex items-center gap-2">
            <MessageSquare size={14} className="text-[var(--color-text-secondary)]" />
            <span className="text-xs font-bold text-[var(--color-text-secondary)]">Conversation History</span>
          </div>

          {/* Message Feed */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Ticket Description as the initial post */}
            <div className="flex items-start gap-3 border-b border-[var(--color-border)] pb-4">
              <div className="w-7 h-7 rounded-full bg-[var(--color-accent-bg)] border border-[var(--color-border)] flex items-center justify-center font-bold text-[10px]">
                U
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">{ticket.email}</span>
                  <span className="text-[9px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider bg-[var(--color-border)] px-1.5 py-0.5 rounded">
                    Author
                  </span>
                  <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
                    {new Date(ticket.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="bg-[#141414] p-4 rounded-2xl rounded-tl-none border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                  {ticket.description}
                </div>
              </div>
            </div>

            {/* Replies */}
            {messages.map((msg) => {
              if (msg.sender_type === "system") {
                return (
                  <div key={msg.id} className="flex justify-center my-3">
                    <div className="text-[10px] text-[var(--color-text-muted)] bg-[#141414] border border-[var(--color-border)] px-3 py-1 rounded-full flex items-center gap-1.5 italic font-medium">
                      <AlertCircle size={10} />
                      {msg.content}
                    </div>
                  </div>
                );
              }

              const isAdmin = msg.sender_type === "admin";

              return (
                <div key={msg.id} className={`flex items-start gap-3 ${isAdmin ? "" : "flex-row-reverse"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] border ${
                    isAdmin
                      ? "bg-[var(--color-accent)] text-[var(--color-invert-text)] border-[var(--color-accent)]"
                      : "bg-[var(--color-accent-bg)] border-[var(--color-border)]"
                  }`}>
                    {isAdmin ? "A" : "U"}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className={`flex items-center gap-2 ${isAdmin ? "" : "flex-row-reverse"}`}>
                      <span className="text-xs font-bold">{isAdmin ? "Support Agent" : "You"}</span>
                      {isAdmin && (
                        <span className="text-[9px] text-green-400 font-extrabold uppercase tracking-wider bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded">
                          Staff
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
                      <div className={`p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap border max-w-[85%] ${
                        isAdmin
                          ? "bg-blue-500/5 border-blue-500/10 text-[var(--color-text-primary)] rounded-tl-none"
                          : "bg-[var(--color-accent-bg)] border-[var(--color-border)] text-[var(--color-text-primary)] rounded-tr-none"
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

          {/* Thread Form Input */}
          <div className="p-4 border-t border-[var(--color-border)] bg-[#141414]/30">
            {ticket.status === "resolved" || ticket.status === "closed" ? (
              <div className="text-center py-2 text-xs text-[var(--color-text-muted)] font-medium flex items-center justify-center gap-1.5 bg-neutral-900/30 rounded-xl border border-[var(--color-border)]">
                <CheckCircle size={14} className="text-neutral-500" />
                This ticket is resolved and closed. If you have more questions, please create a new ticket.
              </div>
            ) : (
              <form onSubmit={handleSendReply} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Type a reply..."
                  className="flex-1 bg-black border border-[var(--color-border)] rounded-full px-5 py-3 text-xs outline-none input-focus-animate text-[var(--color-text-primary)]"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={submittingReply}
                />
                <button
                  type="submit"
                  disabled={submittingReply || !replyText.trim()}
                  className="w-10 h-10 bg-[var(--color-accent)] text-[var(--color-invert-text)] rounded-full flex items-center justify-center hover:opacity-90 transition-all scale-active cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={14} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
