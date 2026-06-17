"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, Calendar, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ChatsList({ userId, role }: { userId: string; role: "brand" | "influencer" }) {
  const supabase = createClient();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRooms() {
    setLoading(true);
    
    // Fetch all active rooms for user
    const { data, error } = await supabase
      .from("rooms")
      .select(`
        *,
        card:cards(*),
        brand:profiles!rooms_brand_id_fkey(*),
        influencer:profiles!rooms_influencer_id_fkey(*)
      `)
      .or(`brand_id.eq.${userId},influencer_id.eq.${userId}`)
      .eq("is_active", true);

    if (error) {
      console.error("Failed to load rooms", error);
      setLoading(false);
      return;
    }

    // For each room, load the latest message
    const roomsWithMessages = await Promise.all(
      (data || []).map(async (room) => {
        const { data: msgs } = await supabase
          .from("messages")
          .select("*")
          .eq("room_id", room.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastMsg = msgs?.[0] || null;

        // Count unread messages (from counterpart)
        const { count: unreadCount } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id)
          .neq("sender_id", userId)
          .eq("is_read", false);

        return {
          ...room,
          lastMessage: lastMsg,
          unreadCount: unreadCount || 0,
        };
      })
    );

    // Sort by latest message date or room creation date
    roomsWithMessages.sort((a, b) => {
      const timeA = (a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0) || (a.created_at ? new Date(a.created_at).getTime() : 0);
      const timeB = (b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0) || (b.created_at ? new Date(b.created_at).getTime() : 0);
      return timeB - timeA;
    });

    setRooms(roomsWithMessages);
    setLoading(false);
  }

  useEffect(() => {
    loadRooms();

    // Subscribe to messages changes to refresh
    const channel = supabase
      .channel("rooms-update")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => loadRooms()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-[#0d0d0d] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[rgba(251,251,239,0.2)] p-12 text-center max-w-lg mx-auto">
          <MessageSquare className="size-8 text-[rgba(251,251,239,0.4)] mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-[#fbfbef]">No Chats Available</h3>
          <p className="text-xs text-[rgba(251,251,239,0.6)] mt-1">
            Accept or submit campaign pitches to open collaboration chats.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => {
            const counterpart = role === "brand" ? room.influencer : room.brand;
            const linkHref = `/dashboard/${role}/chats/${room.id}`;
            const unread = room.unreadCount > 0;

            return (
              <Link
                key={room.id}
                href={linkHref}
                className="block rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-4 hover:border-[rgba(251,251,239,0.3)] transition-colors lift-hover"
              >
                <div className="flex justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="size-11 rounded-full border border-[rgba(251,251,239,0.2)] bg-black overflow-hidden flex items-center justify-center relative flex-shrink-0">
                      {counterpart?.avatar_url ? (
                        <img src={counterpart.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-black bg-[#fbfbef] size-full flex items-center justify-center">
                          {counterpart?.display_name[0].toUpperCase()}
                        </span>
                      )}
                      {unread && (
                        <span className="absolute top-0 right-0 size-2.5 rounded-full bg-[#fbfbef] ring-2 ring-black" />
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[#fbfbef] flex items-center gap-1.5">
                        {counterpart?.display_name}
                        {counterpart?.is_verified && (
                          <span className="text-[10px] text-black bg-[#fbfbef] rounded-full size-3.5 flex items-center justify-center font-bold">
                            ✓
                          </span>
                        )}
                      </h4>
                      <span className="text-[11px] text-[rgba(251,251,239,0.4)] block">
                        Campaign: {room.card?.title}
                      </span>
                      {room.lastMessage ? (
                        <p className={`text-xs text-[rgba(251,251,239,0.6)] line-clamp-1 mt-1 ${unread ? "text-[#fbfbef] font-semibold" : ""}`}>
                          {room.lastMessage.content || "Attachment sent"}
                        </p>
                      ) : (
                        <p className="text-xs text-[rgba(251,251,239,0.4)] italic mt-1">Chat room created</p>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    {room.lastMessage && (
                      <span className="text-[9px] text-[rgba(251,251,239,0.4)] block">
                        {formatDistanceToNow(new Date(room.lastMessage.created_at), { addSuffix: true })}
                      </span>
                    )}
                    {room.unreadCount > 0 && (
                      <span className="rounded-full bg-[#fbfbef] px-2 py-0.5 text-[10px] font-bold text-black mt-1 inline-block">
                        {room.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
