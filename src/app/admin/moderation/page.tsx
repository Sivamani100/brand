"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { Shield, Check, Trash2, AlertTriangle, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";

interface ModerationItem {
  id: string;
  content_type: string;
  content_id: string;
  author_id: string;
  flag_reason: string;
  flag_source: string;
  status: "pending" | "approved" | "removed" | "warned";
  created_at: string;
  author?: {
    id: string;
    display_name: string;
    role: string;
  };
  resolved_content?: any;
}

export default function ModerationPage() {
  const supabase = createClient() as any;
  const { profile } = useUser();
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [filterType, setFilterType] = useState<string>("all");

  const fetchModerationQueue = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("moderation_queue")
        .select(`
          *,
          author:profiles!author_id (
            id,
            display_name,
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }
      if (filterType !== "all") {
        query = query.eq("content_type", filterType);
      }

      const { data, error } = await query;
      if (error) throw error;

      const queueData = (data || []) as ModerationItem[];

      // Resolve content details for each item
      const resolvedItems = await Promise.all(
        queueData.map(async (item) => {
          let resolvedContent = null;
          try {
            if (item.content_type === "card") {
              const { data } = await supabase
                .from("cards")
                .select("title, description")
                .eq("id", item.content_id)
                .single();
              resolvedContent = data ? { title: data.title, text: data.description } : null;
            } else if (item.content_type === "message") {
              const { data } = await supabase
                .from("messages")
                .select("content, sender_id")
                .eq("id", item.content_id)
                .single();
              resolvedContent = data ? { text: data.content } : null;
            } else if (item.content_type === "bio") {
              const { data } = await supabase
                .from("profiles")
                .select("display_name, bio")
                .eq("id", item.content_id)
                .single();
              resolvedContent = data ? { title: data.display_name, text: data.bio } : null;
            } else if (item.content_type === "portfolio") {
              const { data } = await supabase
                .from("portfolio_items")
                .select("title, description, project_url")
                .eq("id", item.content_id)
                .single();
              resolvedContent = data ? { title: data.title, text: data.description, url: data.project_url } : null;
            } else if (item.content_type === "review") {
              const { data } = await supabase
                .from("reviews")
                .select("rating, comment")
                .eq("id", item.content_id)
                .single();
              resolvedContent = data ? { title: `Rating: ${data.rating}/5`, text: data.comment } : null;
            }
          } catch (e) {
            console.error("Failed to resolve moderation content", e);
          }
          return { ...item, resolved_content: resolvedContent };
        })
      );

      setItems(resolvedItems);
    } catch (error: any) {
      toast.error(error.message || "Failed to load moderation queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationQueue();
  }, [filterStatus, filterType]);

  const handleAction = async (itemId: string, action: "approved" | "removed" | "warned", item: ModerationItem) => {
    try {
      // 1. Update moderation status in DB
      const { error } = await supabase
        .from("moderation_queue")
        .update({
          status: action,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", itemId);

      if (error) throw error;

      // 2. Perform target actions based on action type
      if (action === "removed") {
        if (item.content_type === "card") {
          await supabase.from("cards").update({ status: "archived" }).eq("id", item.content_id);
        } else if (item.content_type === "message") {
          await supabase.from("messages").update({ content: "[This message has been removed by a moderator]" }).eq("id", item.content_id);
        } else if (item.content_type === "bio") {
          await supabase.from("profiles").update({ bio: "[Bio removed by moderator due to guidelines violation]" }).eq("id", item.content_id);
        } else if (item.content_type === "portfolio") {
          await supabase.from("portfolio_items").delete().eq("id", item.content_id);
        }
      }

      // 3. Log Audit Trail
      await supabase.from("audit_logs").insert({
        actor_id: profile?.id,
        actor_role: "admin",
        action: `moderation_${action}`,
        target_type: "moderation_queue",
        target_id: itemId,
        metadata: {
          content_type: item.content_type,
          content_id: item.content_id,
          author_id: item.author_id,
          flag_reason: item.flag_reason,
        },
      });

      // 4. Send notification warning to user if warned or removed
      if (action === "warned" || action === "removed") {
        await supabase.from("notifications").insert({
          user_id: item.author_id,
          title: `Content Moderation Alert`,
          content: `Your ${item.content_type} was reviewed by moderation and flagged as ${action}. Reason: ${item.flag_reason}. Please adhere to community guidelines.`,
          is_read: false,
        });
      }

      toast.success(`Content successfully marked as ${action}`);
      fetchModerationQueue();
    } catch (error: any) {
      toast.error(error.message || "Failed to update moderation status");
    }
  };

  return (
    <div className="space-y-8 text-[#fbfbef]">
      <div className="flex items-center justify-between border-b border-[rgba(251,251,239,0.1)] pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Moderation</h1>
          <p className="text-sm text-[rgba(251,251,239,0.6)]">
            Review and action flagged user content on the platform.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#0d0d0d] border border-[rgba(251,251,239,0.15)] rounded-full px-4 py-2 text-xs font-semibold text-yellow-500">
          <ShieldAlert className="size-4 animate-pulse" />
          <span>Admin Moderation Gate Active</span>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-4 bg-[#0d0d0d] p-4 rounded-xl border border-[rgba(251,251,239,0.1)]">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wider text-[rgba(251,251,239,0.5)] font-bold">Status</label>
          <div className="flex items-center gap-2">
            {["pending", "approved", "removed", "warned", "all"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border transition-all ${
                  filterStatus === status
                    ? "bg-[#fbfbef] text-black border-[#fbfbef]"
                    : "bg-[#141414] text-[rgba(251,251,239,0.6)] border-[rgba(251,251,239,0.1)] hover:bg-[#1c1c1c]"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="h-10 w-px bg-[rgba(251,251,239,0.1)] hidden md:block" />

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wider text-[rgba(251,251,239,0.5)] font-bold">Content Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-lg px-3 py-1.5 text-xs text-[#fbfbef] outline-none focus:border-[#fbfbef]"
          >
            <option value="all">All Content</option>
            <option value="card">Cards / Jobs</option>
            <option value="message">Messages</option>
            <option value="bio">User Bios</option>
            <option value="portfolio">Portfolio Items</option>
            <option value="review">Reviews</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[rgba(251,251,239,0.2)] border-t-[#fbfbef]" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center border border-dashed border-[rgba(251,251,239,0.15)] rounded-2xl p-6 text-center">
          <Shield className="size-12 text-[rgba(251,251,239,0.3)] mb-4" />
          <h3 className="font-bold text-lg text-[rgba(251,251,239,0.8)]">All clean!</h3>
          <p className="text-xs text-[rgba(251,251,239,0.5)] max-w-sm mt-1">
            No items in the moderation queue match your active filters.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-[#0d0d0d] border rounded-2xl p-6 transition-all duration-200 hover:border-[rgba(251,251,239,0.3)] ${
                item.status === "pending"
                  ? "border-[rgba(251,251,239,0.15)]"
                  : item.status === "approved"
                  ? "border-green-500/30 bg-green-500/5"
                  : item.status === "removed"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-yellow-500/30 bg-yellow-500/5"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-[#1c1c1c] text-[#fbfbef] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-[rgba(251,251,239,0.1)]">
                      {item.content_type}
                    </span>
                    <span className="text-[11px] text-[rgba(251,251,239,0.5)]">
                      Reported {new Date(item.created_at).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-[rgba(251,251,239,0.4)]">
                      via {item.flag_source}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-[rgba(251,251,239,0.5)] uppercase tracking-wider">Reason Flagged</h3>
                    <p className="text-sm font-medium text-yellow-500 mt-1">{item.flag_reason}</p>
                  </div>

                  {/* Flagged Content Preview */}
                  <div className="bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl p-4 mt-2">
                    <h4 className="text-[11px] font-bold text-[rgba(251,251,239,0.4)] uppercase tracking-wider mb-2">Content Payload</h4>
                    {item.resolved_content ? (
                      <div className="space-y-2">
                        {item.resolved_content.title && (
                          <div className="font-bold text-sm text-[#fbfbef]">{item.resolved_content.title}</div>
                        )}
                        {item.resolved_content.text ? (
                          <p className="text-xs text-[rgba(251,251,239,0.8)] leading-relaxed whitespace-pre-wrap font-mono bg-black/40 p-3 rounded-lg border border-[rgba(251,251,239,0.05)]">
                            {item.resolved_content.text}
                          </p>
                        ) : (
                          <span className="text-xs text-[rgba(251,251,239,0.4)] italic">No text content available</span>
                        )}
                        {item.resolved_content.url && (
                          <a
                            href={item.resolved_content.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 underline hover:text-blue-300 block"
                          >
                            Link: {item.resolved_content.url}
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-red-400 italic">
                        Original content could not be loaded (it may have been deleted, or ID is invalid).
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[rgba(251,251,239,0.6)]">
                    <span>Author:</span>
                    <span className="font-bold text-[#fbfbef]">
                      {item.author?.display_name || "Unknown User"}
                    </span>
                    <span className="text-[rgba(251,251,239,0.45)]">({item.author?.role || "user"})</span>
                  </div>
                </div>

                {/* Action Buttons */}
                {item.status === "pending" && (
                  <div className="flex md:flex-col items-stretch gap-2.5 min-w-[150px]">
                    <button
                      onClick={() => handleAction(item.id, "approved", item)}
                      className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-full py-2 px-4 text-xs font-bold transition-all shadow-md"
                    >
                      <Check className="size-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleAction(item.id, "removed", item)}
                      className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-full py-2 px-4 text-xs font-bold transition-all shadow-md"
                    >
                      <Trash2 className="size-4" />
                      <span>Remove</span>
                    </button>
                    <button
                      onClick={() => handleAction(item.id, "warned", item)}
                      className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-full py-2 px-4 text-xs font-bold transition-all shadow-md"
                    >
                      <AlertTriangle className="size-4" />
                      <span>Warn User</span>
                    </button>
                  </div>
                )}

                {item.status !== "pending" && (
                  <div className="bg-[#1c1c1c] border border-[rgba(251,251,239,0.15)] rounded-full px-4 py-2 text-xs font-semibold text-[rgba(251,251,239,0.5)] self-start uppercase tracking-wider">
                    Resolved: {item.status}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
