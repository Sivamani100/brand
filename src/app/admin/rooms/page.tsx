"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Search, MessageSquare, Trash2, X, User, ShieldAlert, FileText, Ban } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminRoomsPage() {
  const supabase = createClient();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Selected room messages modal state
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  async function fetchRooms() {
    setLoading(true);
    const { data, error } = await supabase
      .from("rooms")
      .select(`
        *,
        card:cards(id, title),
        brand:profiles!rooms_brand_id_fkey(display_name, avatar_url),
        influencer:profiles!rooms_influencer_id_fkey(display_name, avatar_url),
        messages(id)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load platform chat rooms.");
    } else {
      setRooms(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleToggleRoomActive = async (roomId: string, currentStatus: boolean) => {
    setActionLoading(true);
    const { error } = await supabase
      .from("rooms")
      .update({ is_active: !currentStatus })
      .eq("id", roomId);

    if (error) {
      toast.error("Failed to update chat room status.");
    } else {
      toast.success(currentStatus ? "Chat room closed." : "Chat room activated.");
      fetchRooms();
    }
    setActionLoading(false);
  };

  const handleDeleteRoom = async (roomId: string) => {
    const confirm = window.confirm("Are you sure you want to delete this chat room? This will delete all message history.");
    if (!confirm) return;

    setActionLoading(true);
    const { error } = await supabase
      .from("rooms")
      .delete()
      .eq("id", roomId);

    if (error) {
      toast.error("Failed to delete chat room.");
    } else {
      toast.success("Chat room deleted.");
      fetchRooms();
    }
    setActionLoading(false);
  };

  const handleOpenMessages = async (room: any) => {
    setSelectedRoom(room);
    setMessagesLoading(true);
    setMessages([]);

    const { data, error } = await supabase
      .from("messages")
      .select(`
        *,
        sender:profiles(display_name, avatar_url)
      `)
      .eq("room_id", room.id)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to load message history.");
      setSelectedRoom(null);
    } else {
      setMessages(data || []);
    }
    setMessagesLoading(false);
  };

  const filteredRooms = rooms.filter((r) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCard = r.card?.title?.toLowerCase().includes(q);
      const matchBrand = r.brand?.display_name?.toLowerCase().includes(q);
      const matchInfluencer = r.influencer?.display_name?.toLowerCase().includes(q);
      if (!matchCard && !matchBrand && !matchInfluencer) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[#0d0d0d] rounded-lg" />
        <div className="h-12 w-full bg-[#0d0d0d] rounded-full" />
        <div className="h-96 bg-[#0d0d0d] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef] font-sans">
          Chat Rooms Moderation
        </h1>
        <p className="text-xs text-[rgba(251,251,239,0.6)]">
          Oversee active negotiations, read historical conversations, and close chat rooms
        </p>
      </div>

      {/* Search Bar */}
      <div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[rgba(251,251,239,0.4)]" />
          <input
            type="text"
            placeholder="Search by card title, brand name, or influencer name..."
            className="w-full rounded-full bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] pl-11 pr-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Rooms Table */}
      <div className="rounded-2xl border border-[rgba(251,251,239,0.2)] bg-[#0d0d0d] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[rgba(251,251,239,0.1)] text-[rgba(251,251,239,0.4)] uppercase font-semibold">
              <th className="p-4">Campaign Card</th>
              <th className="p-4">Brand</th>
              <th className="p-4">Influencer</th>
              <th className="p-4">Messages</th>
              <th className="p-4">Created At</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(251,251,239,0.05)]">
            {filteredRooms.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-[rgba(251,251,239,0.4)]">
                  No chat rooms active.
                </td>
              </tr>
            ) : (
              filteredRooms.map((room) => (
                <tr key={room.id} className="hover:bg-[#141414]/30 transition-colors">
                  {/* Card link */}
                  <td className="p-4">
                    {room.card ? (
                      <Link href={`/admin/cards/${room.card.id}`} className="font-bold text-[#fbfbef] hover:underline">
                        {room.card.title}
                      </Link>
                    ) : (
                      <span className="text-[rgba(251,251,239,0.4)]">Deleted Campaign</span>
                    )}
                  </td>

                  {/* Brand Profile link */}
                  <td className="p-4 flex items-center gap-2">
                    <div className="size-6 rounded-full border border-[rgba(251,251,239,0.1)] bg-black overflow-hidden flex items-center justify-center flex-shrink-0">
                      {room.brand?.avatar_url ? (
                        <img src={room.brand.avatar_url} alt="Brand" className="h-full w-full object-cover" />
                      ) : (
                        <User className="size-3" />
                      )}
                    </div>
                    <Link href={`/admin/users/${room.brand_id}`} className="font-semibold text-[#fbfbef] hover:underline">
                      {room.brand?.display_name || "Unknown"}
                    </Link>
                  </td>

                  {/* Influencer Profile link */}
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full border border-[rgba(251,251,239,0.1)] bg-black overflow-hidden flex items-center justify-center flex-shrink-0">
                        {room.influencer?.avatar_url ? (
                          <img src={room.influencer.avatar_url} alt="Influencer" className="h-full w-full object-cover" />
                        ) : (
                          <User className="size-3" />
                        )}
                      </div>
                      <Link href={`/admin/users/${room.influencer_id}`} className="font-semibold text-[#fbfbef] hover:underline">
                        {room.influencer?.display_name || "Unknown"}
                      </Link>
                    </div>
                  </td>

                  {/* Messages Count */}
                  <td className="p-4 font-semibold text-[#fbfbef]">
                    {room.messages?.length || 0} msgs
                  </td>

                  {/* Room creation date */}
                  <td className="p-4 text-[rgba(251,251,239,0.6)]">
                    {new Date(room.created_at).toLocaleDateString()}
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      room.is_active ? "text-[#4ade80]" : "text-[#f87171]"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${room.is_active ? "bg-[#4ade80]" : "bg-[#f87171]"}`} />
                      {room.is_active ? "Active" : "Closed"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right flex justify-end gap-1.5">
                    {/* View messages */}
                    <button
                      onClick={() => handleOpenMessages(room)}
                      className="p-1.5 rounded-full border border-[rgba(251,251,239,0.1)] text-[#fbfbef] hover:bg-[#1c1c1c] scale-active"
                      title="View Message History"
                    >
                      <MessageSquare className="size-3.5" />
                    </button>

                    {/* Toggle Room Active */}
                    <button
                      disabled={actionLoading}
                      onClick={() => handleToggleRoomActive(room.id, !!room.is_active)}
                      className={`p-1.5 rounded-full border border-[rgba(251,251,239,0.1)] scale-active ${
                        room.is_active
                          ? "text-[#facc15] hover:bg-[#262614]"
                          : "text-[#4ade80] hover:bg-[#142614]"
                      }`}
                      title={room.is_active ? "Close Chat Room" : "Activate Chat Room"}
                    >
                      <Ban className="size-3.5" />
                    </button>

                    {/* Delete Room */}
                    <button
                      disabled={actionLoading}
                      onClick={() => handleDeleteRoom(room.id)}
                      className="p-1.5 rounded-full border border-[rgba(251,251,239,0.1)] text-[#f87171] hover:bg-[#261414] scale-active"
                      title="Delete Chat Room"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Messages Viewer Modal (Read-Only history audit) */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-2xl h-[80vh] rounded-2xl bg-[#0d0d0d] p-6 border border-[rgba(251,251,239,0.2)] shadow-glow space-y-4 flex flex-col justify-between">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-[rgba(251,251,239,0.1)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#fbfbef] flex items-center gap-2">
                  <MessageSquare className="size-4" /> Message History Audit
                </h3>
                <span className="text-[10px] text-[rgba(251,251,239,0.4)] uppercase mt-1 block">
                  {selectedRoom.brand?.display_name} & {selectedRoom.influencer?.display_name} • {selectedRoom.card?.title}
                </span>
              </div>
              <button
                onClick={() => setSelectedRoom(null)}
                className="text-[rgba(251,251,239,0.6)] hover:text-white text-xl"
              >
                &times;
              </button>
            </div>

            {/* Scrollable messages log */}
            <div className="flex-1 overflow-y-auto space-y-4 p-2 custom-scrollbar">
              {messagesLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[rgba(251,251,239,0.2)] border-t-[#fbfbef]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-[rgba(251,251,239,0.4)] text-xs">
                  No messages exchanged in this chat room yet.
                </div>
              ) : (
                messages.map((msg) => {
                  const isBrand = msg.sender_id === selectedRoom.brand_id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 max-w-[80%] ${isBrand ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                    >
                      {/* Avatar */}
                      <div className="size-7 rounded-full border border-[rgba(251,251,239,0.1)] bg-black overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {isBrand ? (
                          selectedRoom.brand?.avatar_url ? (
                            <img src={selectedRoom.brand.avatar_url} alt="Brand" className="h-full w-full object-cover" />
                          ) : (
                            <User className="size-3" />
                          )
                        ) : (
                          selectedRoom.influencer?.avatar_url ? (
                            <img src={selectedRoom.influencer.avatar_url} alt="Influencer" className="h-full w-full object-cover" />
                          ) : (
                            <User className="size-3" />
                          )
                        )}
                      </div>

                      {/* Bubble */}
                      <div className="space-y-1">
                        <div className="text-[9px] text-[rgba(251,251,239,0.4)] uppercase">
                          {msg.sender?.display_name || "User"}
                        </div>
                        <div
                          className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                            isBrand
                              ? "bg-[#fbfbef] text-black rounded-tr-none"
                              : "bg-[#141414] border border-[rgba(251,251,239,0.1)] text-[#fbfbef] rounded-tl-none"
                          }`}
                        >
                          {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                          {msg.attachment_url && (
                            <div className="mt-2 pt-2 border-t border-black/10">
                              {msg.attachment_type === "image" ? (
                                <img src={msg.attachment_url} alt="Attachment" className="max-w-[200px] rounded-lg border border-[rgba(251,251,239,0.2)]" />
                              ) : (
                                <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="underline font-bold text-[10px] flex items-center gap-1">
                                  <span>📎 Download Attachment</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="text-[8px] text-[rgba(251,251,239,0.4)] block text-right">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Actions */}
            <div className="border-t border-[rgba(251,251,239,0.1)] pt-3 flex justify-end">
              <button
                onClick={() => setSelectedRoom(null)}
                className="rounded-full bg-[#141414] px-5 py-2 text-xs font-semibold text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)]"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
