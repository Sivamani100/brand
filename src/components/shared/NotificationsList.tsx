"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, Check, Trash2, Calendar, AlertCircle, MessageSquare, Briefcase, Mail, X } from "lucide-react";
import toast from "react-hot-toast";
import { formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";

export default function NotificationsList({ userId, role }: { userId: string; role: "brand" | "influencer" }) {
  const supabase = createClient();
  const router = useRouter();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "messages" | "collaborations">("all");

  async function loadNotifications() {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load notifications.");
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel("new-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleMarkAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update notification.");
      return;
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      toast.error("Failed to update notifications.");
      return;
    }

    toast.success("All notifications marked as read.");
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleClearAll = async () => {
    const confirm = window.confirm("Are you sure you want to delete all notifications?");
    if (!confirm) return;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to clear notifications.");
      return;
    }

    toast.success("Notifications cleared.");
    setNotifications([]);
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }

    // Redirect based on reference type
    if (notif.reference_id && notif.reference_type) {
      if (notif.reference_type === "room") {
        router.push(`/dashboard/${role}/chats/${notif.reference_id}`);
      } else if (notif.reference_type === "card") {
        if (role === "brand") {
          router.push(`/dashboard/brand/cards/${notif.reference_id}`);
        } else {
          router.push(`/dashboard/influencer/discover/${notif.reference_id}`);
        }
      } else if (notif.reference_type === "application") {
        if (role === "brand") {
          router.push(`/dashboard/brand/applications`);
        } else {
          router.push(`/dashboard/influencer/my-applications`);
        }
      }
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === "unread") return !notif.is_read;
    if (filter === "messages") return notif.type === "new_message" || notif.type === "chat_message";
    if (filter === "collaborations") {
      return [
        "application_accepted",
        "application_rejected",
        "new_application",
        "dispute_resolved",
        "invite_sent",
        "verification_update"
      ].includes(notif.type);
    }
    return true;
  });

  // Group notifications by date
  const groupNotificationsByDate = (notifs: any[]) => {
    const groups: { Today: any[]; Yesterday: any[]; Older: any[] } = {
      Today: [],
      Yesterday: [],
      Older: []
    };

    notifs.forEach((n) => {
      const date = typeof n.created_at === "string" ? parseISO(n.created_at) : new Date(n.created_at);
      if (isToday(date)) {
        groups.Today.push(n);
      } else if (isYesterday(date)) {
        groups.Yesterday.push(n);
      } else {
        groups.Older.push(n);
      }
    });

    return groups;
  };

  const grouped = groupNotificationsByDate(filteredNotifications);

  const getEmojiIcon = (type: string) => {
    switch (type) {
      case "new_message":
      case "chat_message":
        return <MessageSquare className="size-4 text-blue-400" />;
      case "application_accepted":
      case "verification_update":
        return <Check className="size-4 text-[#4ade80]" />;
      case "application_rejected":
        return <X className="size-4 text-[#f87171]" />;
      case "invite_sent":
        return <Mail className="size-4 text-[#facc15]" />;
      default:
        return <Briefcase className="size-4 text-[rgba(251,251,239,0.6)]" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-[#0d0d0d] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category filters row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(251,251,239,0.1)] pb-4">
        <div className="flex gap-2">
          {(["all", "unread", "messages", "collaborations"] as const).map((f) => (
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

        {notifications.length > 0 && (
          <div className="flex gap-3">
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-xs font-semibold text-[rgba(251,251,239,0.6)] hover:text-[#fbfbef] transition-colors"
            >
              <Check className="size-4" />
              <span>Mark all read</span>
            </button>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-[rgba(251,251,239,0.6)] hover:text-[#f87171] transition-colors"
            >
              <Trash2 className="size-4" />
              <span>Clear all</span>
            </button>
          </div>
        )}
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[rgba(251,251,239,0.2)] p-12 text-center max-w-lg mx-auto">
          <Bell className="size-8 text-[rgba(251,251,239,0.4)] mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-[#fbfbef]">No Notifications</h3>
          <p className="text-xs text-[rgba(251,251,239,0.6)] mt-1">
            We will notify you here when updates or messages arrive.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(["Today", "Yesterday", "Older"] as const).map((groupName) => {
            const list = grouped[groupName];
            if (list.length === 0) return null;
            return (
              <div key={groupName} className="space-y-3">
                <h3 className="text-xs font-bold text-[rgba(251,251,239,0.4)] uppercase tracking-wider pl-1">
                  {groupName}
                </h3>
                <div className="space-y-2.5">
                  {list.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`rounded-2xl border p-4 transition-colors cursor-pointer flex items-start gap-3 hover:bg-[#141414] ${
                        notif.is_read
                          ? "bg-[#0d0d0d]/40 border-[rgba(251,251,239,0.1)] opacity-70"
                          : "bg-[#0d0d0d] border-[rgba(251,251,239,0.2)]"
                      }`}
                    >
                      <div className="size-8 rounded-full bg-[#141414] border border-[rgba(251,251,239,0.1)] flex items-center justify-center flex-shrink-0">
                        {getEmojiIcon(notif.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className={`text-xs font-bold text-[#fbfbef] truncate ${!notif.is_read ? "font-bold" : "font-normal"}`}>
                            {notif.title}
                          </h4>
                          <span className="text-[9px] text-[rgba(251,251,239,0.4)] flex-shrink-0">
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-[rgba(251,251,239,0.6)] mt-1 line-clamp-1">
                          {notif.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
