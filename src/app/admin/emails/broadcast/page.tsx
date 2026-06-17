"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { Send, Calendar, Users, AlertCircle, ArrowLeft, Archive, CheckCircle } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface BroadcastEmail {
  id: string;
  subject: string;
  html_body: string;
  target_audience: "all" | "brands" | "influencers";
  sent_count: number;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
}

export default function EmailBroadcastPage() {
  const supabase = createClient() as any;
  const { profile } = useUser();
  const [broadcasts, setBroadcasts] = useState<BroadcastEmail[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [targetAudience, setTargetAudience] = useState<"all" | "brands" | "influencers">("all");
  const [scheduledFor, setScheduledFor] = useState("");

  const fetchBroadcasts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("broadcast_emails")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBroadcasts(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch broadcasts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const handleSendOrSchedule = async (e: React.FormEvent, status: "draft" | "scheduled" | "sent") => {
    e.preventDefault();
    if (!subject.trim() || !htmlBody.trim()) {
      toast.error("Subject and Body are required");
      return;
    }

    try {
      // 1. Determine target count based on role from profiles
      let countQuery = supabase.from("profiles").select("id", { count: "exact", head: true });
      if (targetAudience === "brands") {
        countQuery = countQuery.eq("role", "brand");
      } else if (targetAudience === "influencers") {
        countQuery = countQuery.eq("role", "influencer");
      }
      const { count } = await countQuery;
      const targetCount = count || 0;

      const schedTime = scheduledFor ? new Date(scheduledFor).toISOString() : null;

      // 2. Insert into broadcast_emails
      const { error } = await supabase.from("broadcast_emails").insert({
        subject: subject.trim(),
        html_body: htmlBody.trim(),
        target_audience: targetAudience,
        status: schedTime ? "scheduled" : "sent",
        scheduled_for: schedTime,
        sent_count: schedTime ? 0 : targetCount,
        sent_at: schedTime ? null : new Date().toISOString(),
        created_by: profile?.id,
      });

      if (error) throw error;

      // 3. Log Audit Trail
      await supabase.from("audit_logs").insert({
        actor_id: profile?.id,
        actor_role: "admin",
        action: schedTime ? "email_broadcast_scheduled" : "email_broadcast_sent",
        target_type: "broadcast_emails",
        metadata: {
          subject: subject.trim(),
          audience: targetAudience,
          scheduled_for: schedTime,
        },
      });

      toast.success(
        schedTime
          ? "Broadcast scheduled successfully!"
          : `Broadcast campaign dispatched to ${targetCount} users!`
      );

      // Reset form
      setSubject("");
      setHtmlBody("");
      setTargetAudience("all");
      setScheduledFor("");

      fetchBroadcasts();
    } catch (error: any) {
      toast.error(error.message || "Failed to launch broadcast");
    }
  };

  return (
    <div className="space-y-8 text-[#fbfbef]">
      <div className="flex items-center gap-4 border-b border-[rgba(251,251,239,0.1)] pb-5">
        <Link href="/admin/emails" className="text-[rgba(251,251,239,0.6)] hover:text-[#fbfbef] transition-colors">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Broadcast System</h1>
          <p className="text-sm text-[rgba(251,251,239,0.6)]">
            Compose and dispatch mass email campaigns to platform users.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Composer Form */}
        <div className="lg:col-span-2 bg-[#0d0d0d] p-6 rounded-2xl border border-[rgba(251,251,239,0.1)]">
          <form onSubmit={(e) => handleSendOrSchedule(e, "sent")} className="space-y-6">
            <h2 className="text-sm font-bold text-[rgba(251,251,239,0.5)] uppercase tracking-wider border-b border-[rgba(251,251,239,0.08)] pb-3">
              Compose Broadcast
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.7)] flex items-center gap-1.5">
                  <Users className="size-4" />
                  Target Audience
                </label>
                <select
                  value={targetAudience}
                  onChange={(e: any) => setTargetAudience(e.target.value)}
                  className="w-full bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl px-4 py-2.5 text-xs text-[#fbfbef] focus:border-[#fbfbef] outline-none"
                >
                  <option value="all">All Registered Users</option>
                  <option value="brands">Brands Only</option>
                  <option value="influencers">Creators Only</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.7)] flex items-center gap-1.5">
                  <Calendar className="size-4" />
                  Schedule Send (Leave blank for immediate)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                  className="w-full bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl px-4 py-2.5 text-xs text-[#fbfbef] focus:border-[#fbfbef] outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[rgba(251,251,239,0.7)]">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Important updates regarding our platform..."
                required
                className="w-full bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl px-4 py-2.5 text-xs text-[#fbfbef] focus:border-[#fbfbef] outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[rgba(251,251,239,0.7)]">HTML Contents</label>
              <textarea
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                rows={10}
                required
                placeholder="<h1>Hello,</h1><p>We are excited to share...</p>"
                className="w-full bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl p-4 text-xs font-mono text-[#fbfbef] focus:border-[#fbfbef] outline-none"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={(e) => handleSendOrSchedule(e, "draft")}
                className="flex-1 flex items-center justify-center gap-2 bg-[#141414] hover:bg-[#1c1c1c] text-[#fbfbef] border border-[rgba(251,251,239,0.15)] rounded-xl py-3 text-xs font-bold transition-all"
              >
                <Archive className="size-4" />
                <span>Save Draft</span>
              </button>
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 bg-[#fbfbef] hover:bg-[rgba(251,251,239,0.9)] text-black rounded-xl py-3 text-xs font-bold transition-all shadow-md"
              >
                <Send className="size-4" />
                <span>{scheduledFor ? "Schedule Campaign" : "Send Campaign"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* History / Status Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#0d0d0d] p-5 rounded-2xl border border-[rgba(251,251,239,0.1)]">
            <h2 className="text-xs font-bold text-[rgba(251,251,239,0.5)] uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <CheckCircle className="size-4" />
              Broadcast History
            </h2>

            {loading ? (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[rgba(251,251,239,0.2)] border-t-[#fbfbef]" />
              </div>
            ) : broadcasts.length === 0 ? (
              <p className="text-xs text-[rgba(251,251,239,0.4)] italic py-2">No past broadcasts found.</p>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                {broadcasts.map((b) => (
                  <div
                    key={b.id}
                    className="bg-[#141414] border border-[rgba(251,251,239,0.06)] rounded-xl p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                          b.status === "sent"
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : b.status === "scheduled"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                        }`}
                      >
                        {b.status}
                      </span>
                      <span className="text-[10px] text-[rgba(251,251,239,0.4)]">
                        {new Date(b.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-[#fbfbef] truncate">{b.subject}</h3>
                      <p className="text-[10px] text-[rgba(251,251,239,0.5)] mt-0.5 capitalize">
                        Audience: {b.target_audience} • Sent to {b.sent_count} users
                      </p>
                    </div>

                    {b.scheduled_for && (
                      <div className="text-[10px] text-yellow-500 flex items-center gap-1.5 font-mono">
                        <AlertCircle className="size-3" />
                        Send time: {new Date(b.scheduled_for).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
