"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeChannel, ConnectionState } from "@/lib/hooks/useRealtimeChannel";
import { useNetworkState } from "@/lib/hooks/useNetworkState";
import { withTimeout, TIMEOUT_TIERS } from "@/lib/utils/with-timeout";
import { withRetry } from "@/lib/utils/retry";
import {
  ArrowLeft,
  Image as ImageIcon,
  File,
  Send,
  AlertTriangle,
  Paperclip,
  MoreVertical,
  ShieldAlert,
  CheckSquare,
  Lock,
  PlusCircle,
  X,
  Star,
  Check,
  Calendar,
  AlertOctagon,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { format, isToday, isYesterday } from "date-fns";
import confetti from "canvas-confetti";

interface Milestone {
  id: string;
  title: string;
  due_date: string | null;
  status: "pending" | "in_progress" | "done";
  created_by: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  tags: string[] | null;
  reply: string | null;
  reviewer_id: string;
  reviewed_id: string;
}

export default function ChatRoom({
  roomId,
  userId,
  role,
}: {
  roomId: string;
  userId: string;
  role: "brand" | "influencer";
}) {
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [room, setRoom] = useState<any>(null);
  const [counterpart, setCounterpart] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  // Connection & Network states
  const { online } = useNetworkState();

  // Real-time Presence & Typing states
  const [isCounterpartOnline, setIsCounterpartOnline] = useState(false);
  const [isCounterpartTyping, setIsCounterpartTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const broadcastTimeoutRef = useRef<any>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    
    if (sendTypingStatus) {
      if (!broadcastTimeoutRef.current) {
        sendTypingStatus(true);
      }
      
      if (broadcastTimeoutRef.current) clearTimeout(broadcastTimeoutRef.current);
      broadcastTimeoutRef.current = setTimeout(() => {
        sendTypingStatus(false);
        broadcastTimeoutRef.current = null;
      }, 2000);
    }
  };

  // Milestone panel states
  const [isMilestonesOpen, setIsMilestonesOpen] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDate, setNewMilestoneDate] = useState("");

  // Review states
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [existingReviews, setExistingReviews] = useState<Review[]>([]);

  // Dispute states
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("Late delivery");
  const [disputeDesc, setDisputeDesc] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  // Load room details, messages, milestones & reviews
  async function loadChatDetails() {
    setLoading(true);
    try {
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select(`
          *,
          card:cards(*),
          brand:profiles!rooms_brand_id_fkey(*),
          influencer:profiles!rooms_influencer_id_fkey(*)
        `)
        .eq("id", roomId)
        .single();

      if (roomError) {
        toast.error("Failed to load conversation details.");
        setLoading(false);
        return;
      }

      setRoom(roomData);
      setCounterpart(role === "brand" ? roomData.influencer : roomData.brand);

      // Fetch messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      setMessages(msgs || []);

      // Fetch milestones
      const { data: miles } = await supabase
        .from("milestones")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      setMilestones((miles as unknown as Milestone[]) || []);

      // Fetch reviews left in this room
      const { data: revs } = await supabase
        .from("reviews")
        .select("*")
        .eq("room_id", roomId);
      setExistingReviews((revs as unknown as Review[]) || []);

      // Mark counterpart messages as read
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("room_id", roomId)
        .neq("sender_id", userId)
        .eq("is_read", false);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadChatDetails();
  }, [roomId, userId]);

  // Realtime hook integration
  const { connectionState, sendTypingStatus, manualReconnect } = useRealtimeChannel({
    channelName: `room-chat-all-${roomId}`,
    userId,
    onInsertMessage: async (payload) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.new.id)) return prev;
        return [...prev, payload.new];
      });

      // Mark as read if received from counterpart
      if (payload.new.sender_id !== userId) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("id", payload.new.id);
      }
    },
    onUpdateRoom: (payload) => {
      setRoom((prev: any) => ({ ...prev, ...payload.new }));
    },
    onMilestoneChange: async () => {
      const { data: miles } = await supabase
        .from("milestones")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      setMilestones((miles as unknown as Milestone[]) || []);
    },
    onPresenceSync: (presenceState) => {
      if (counterpart) {
        const onlineUserIds = Object.keys(presenceState);
        setIsCounterpartOnline(onlineUserIds.includes(counterpart.id));
      }
    },
    onPresenceJoin: (key) => {
      if (counterpart && key === counterpart.id) {
        setIsCounterpartOnline(true);
      }
    },
    onPresenceLeave: (key) => {
      if (counterpart && key === counterpart.id) {
        setIsCounterpartOnline(false);
      }
    },
    onTypingBroadcast: (payload) => {
      if (counterpart && payload.userId === counterpart.id) {
        setIsCounterpartTyping(payload.isTyping);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (payload.isTyping) {
          typingTimeoutRef.current = setTimeout(() => {
            setIsCounterpartTyping(false);
          }, 4000);
        }
      }
    },
  });

  // Gap detection / Backfill on reconnect
  useEffect(() => {
    if (connectionState === "connected" && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.created_at) {
        const backfillMessages = async () => {
          const { data } = await supabase
            .from("messages")
            .select("*")
            .eq("room_id", roomId)
            .gt("created_at", lastMsg.created_at)
            .order("created_at", { ascending: true });
          
          if (data && data.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map(m => m.id));
              const newMsgs = data.filter(m => !existingIds.has(m.id));
              if (newMsgs.length === 0) return prev;
              toast.success(`Loaded ${newMsgs.length} missed messages`);
              return [...prev, ...newMsgs];
            });
          }
        };
        backfillMessages();
      }
    }
  }, [connectionState]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Attachment size limit is 20MB.");
      return;
    }

    setAttachmentFile(file);
    if (file.type.startsWith("image/")) {
      setAttachmentPreview(URL.createObjectURL(file));
    } else {
      setAttachmentPreview("");
    }
  };

  const handleSendMessage = async (e: React.FormEvent, customText?: string, retryTempId?: string) => {
    if (e) e.preventDefault();
    const messageContent = customText !== undefined ? customText : text;
    if (!messageContent.trim() && !attachmentFile) return;

    const tempId = retryTempId || `temp-${Date.now()}`;

    if (!retryTempId) {
      const tempMsg = {
        id: tempId,
        room_id: roomId,
        sender_id: userId,
        content: messageContent.trim() || null,
        attachment_url: attachmentFile ? attachmentPreview : null,
        attachment_type: attachmentFile ? (attachmentFile.type.startsWith("image/") ? "image" : "file") : null,
        is_read: false,
        created_at: new Date().toISOString(),
        status: "sending" as const,
      };

      if (customText === undefined) {
        setMessages((prev) => [...prev, tempMsg]);
        setText("");
        setAttachmentFile(null);
        setAttachmentPreview("");
      }
    } else {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "sending" as const } : m))
      );
    }

    setSending(true);
    let attachmentUrl = "";
    let attachmentType: "image" | "file" | null = null;

    try {
      if (attachmentFile) {
        const fileName = `${roomId}/${Date.now()}-${attachmentFile.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from("message-attachments")
          .upload(fileName, attachmentFile);

        if (uploadError) throw uploadError;

        attachmentUrl = data.path;
        attachmentType = attachmentFile.type.startsWith("image/") ? "image" : "file";
      }

      const insertFn = async () => {
        const { data, error } = await supabase
          .from("messages")
          .insert({
            room_id: roomId,
            sender_id: userId,
            content: messageContent.trim() || null,
            attachment_url: attachmentUrl || null,
            attachment_type: attachmentType,
            is_read: false,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      };

      const result = await withTimeout(
        withRetry(insertFn, { maxAttempts: 2 }),
        TIMEOUT_TIERS.dbReadSimple
      );

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...result, status: "sent" as const } : m))
      );
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" as const } : m))
      );
      toast.error("Failed to send message. Tap to retry.");
    } finally {
      setSending(false);
    }
  };

  // 1. MILESTONES ACTIONS
  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;

    try {
      const { error } = await supabase.from("milestones").insert({
        room_id: roomId,
        title: newMilestoneTitle.trim(),
        due_date: newMilestoneDate || null,
        status: "pending",
        created_by: userId,
      });

      if (error) throw error;

      // Send chat message log
      const systemText = `📌 Milestone "${newMilestoneTitle.trim()}" added by ${role === "brand" ? room.brand.display_name : room.influencer.display_name}`;
      await handleSendMessage(null as any, systemText);

      setNewMilestoneTitle("");
      setNewMilestoneDate("");
      toast.success("Milestone created");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to create milestone");
    }
  };

  const handleToggleMilestone = async (mile: Milestone) => {
    let nextStatus: "pending" | "in_progress" | "done" = "pending";
    if (mile.status === "pending") nextStatus = "in_progress";
    else if (mile.status === "in_progress") nextStatus = "done";

    try {
      const { error } = await supabase
        .from("milestones")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", mile.id);

      if (error) throw error;

      // Status labels for chat system logs
      const labels = {
        pending: "Pending",
        in_progress: "In Progress ⚙️",
        done: "Done ✅",
      };

      const systemText = `${mile.status === "in_progress" ? "✅" : "⚙️"} "${mile.title}" marked as ${labels[nextStatus]} by ${role === "brand" ? room.brand.display_name : room.influencer.display_name}`;
      await handleSendMessage(null as any, systemText);

      // Trigger Confetti if marked Done
      if (nextStatus === "done") {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.65 },
          colors: ["#fbfbef", "#ffffff", "#fbbf24"],
        });
      }
      toast.success(`Milestone set to ${labels[nextStatus]}`);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to update milestone status");
    }
  };

  const handleDeleteMilestone = async (mile: Milestone) => {
    if (!confirm(`Remove milestone "${mile.title}"?`)) return;
    try {
      const { error } = await supabase.from("milestones").delete().eq("id", mile.id);
      if (error) throw error;

      const systemText = `❌ Milestone "${mile.title}" deleted by ${role === "brand" ? room.brand.display_name : room.influencer.display_name}`;
      await handleSendMessage(null as any, systemText);
      toast.success("Milestone removed");
    } catch (e: any) {
      console.error(e);
    }
  };

  // 2. DISPUTE FLOWS
  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    if (evidenceFiles.length + files.length > 3) {
      toast.error("Maximum of 3 evidence images.");
      return;
    }
    setUploadingEvidence(true);

    try {
      const urls: string[] = [];
      for (const file of files) {
        const fileExt = file.name.split(".").pop();
        const filePath = `${roomId}/disp_${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("card-covers") // Use public bucket card-covers for admin access
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from("card-covers").getPublicUrl(filePath);
        urls.push(urlData.publicUrl);
      }

      setEvidenceFiles((prev) => [...prev, ...files]);
      setEvidenceUrls((prev) => [...prev, ...urls]);
      toast.success("Evidence images uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to upload evidence.");
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleRaiseDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeDesc.trim()) return;

    try {
      // 1. Create dispute
      const { error: dispError } = await supabase.from("disputes").insert({
        room_id: roomId,
        raised_by: userId,
        reason: disputeReason,
        description: disputeDesc.trim(),
        evidence_urls: evidenceUrls,
        status: "open",
      });

      if (dispError) throw dispError;

      // 2. Lock Room status
      await supabase.from("rooms").update({ status: "disputed" }).eq("id", roomId);

      // 3. System message
      const systemText = `⚠️ Dispute raised by ${role === "brand" ? room.brand.display_name : room.influencer.display_name} [Reason: ${disputeReason}]. Chat is locked for admin mediation.`;
      await handleSendMessage(null as any, systemText);

      setIsDisputeOpen(false);
      setDisputeDesc("");
      setEvidenceFiles([]);
      setEvidenceUrls([]);
      toast.success("Dispute raised. Platform admin will review shortly.");
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to raise dispute");
    }
  };

  // 3. COMPLETE ROOM & LEAVE REVIEW
  const handleMarkAsCompleted = async () => {
    if (!confirm("Are you sure you want to mark this collaboration as completed?")) return;

    try {
      // 1. Update room status to completed
      const { error: roomError } = await supabase
        .from("rooms")
        .update({ status: "completed" })
        .eq("id", roomId);

      if (roomError) throw roomError;

      // 2. Send completed system log
      const systemText = `🏁 Collaboration marked as COMPLETED by ${role === "brand" ? room.brand.display_name : room.influencer.display_name}. Leave a rating & review!`;
      await handleSendMessage(null as any, systemText);

      toast.success("Collaboration Completed!");
      setIsReviewOpen(true);
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to complete room");
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from("reviews").insert({
        room_id: roomId,
        reviewer_id: userId,
        reviewed_id: counterpart.id,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
        tags: reviewTags,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("You have already submitted a review for this room.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Thank you for your rating & review!");
      setIsReviewOpen(false);
      setReviewComment("");
      setReviewTags([]);

      // Reload chat details
      loadChatDetails();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to save review");
    }
  };

  const handleReportUser = async () => {
    const reason = window.prompt("State your reason for reporting this user:");
    if (!reason) return;

    const { error } = await supabase.from("reports").insert({
      reporter_id: userId,
      reported_user_id: counterpart.id,
      card_id: room.card_id,
      reason,
      description: `Reported from chat room ${roomId}`,
      status: "open",
    });

    if (error) {
      toast.error("Failed to submit report.");
    } else {
      toast.success("User reported to platform administrator.");
    }
  };

  const formatMessageDate = (dateString: string) => {
    const d = new Date(dateString);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMMM d, yyyy");
  };

  const renderMessageGroups = () => {
    const groups: Record<string, any[]> = {};
    messages.forEach((msg) => {
      const day = format(new Date(msg.created_at), "yyyy-MM-dd");
      if (!groups[day]) groups[day] = [];
      groups[day].push(msg);
    });

    return Object.entries(groups).map(([day, msgs]) => (
      <div key={day} className="space-y-4">
        <div className="flex justify-center my-4">
          <span className="rounded-full bg-surface-2 border border-border px-3 py-1 text-[10px] text-text-muted font-semibold uppercase tracking-wider">
            {formatMessageDate(msgs[0].created_at)}
          </span>
        </div>

        {msgs.map((msg) => {
          const isOwn = msg.sender_id === userId;
          const isSystem = msg.content?.startsWith("🏁") || msg.content?.startsWith("📌") || msg.content?.startsWith("✅") || msg.content?.startsWith("❌") || msg.content?.startsWith("⚠️") || msg.content?.startsWith("⚙️");

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2 text-center max-w-[85%] mx-auto">
                <span className="rounded-2xl bg-surface-2 border border-border-strong px-4 py-2 text-xs text-text-primary/85 font-semibold">
                  {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[75%] ${isOwn ? "ml-auto items-end" : "mr-auto items-start"}`}
            >
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isOwn
                    ? "bg-accent text-black rounded-tr-none"
                    : "bg-surface-2 border border-border-strong text-text-primary rounded-tl-none"
                } ${msg.status === "sending" ? "opacity-70" : ""}`}
              >
                {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                {msg.attachment_url && (
                  <div className={msg.content ? "mt-2" : ""}>
                    {msg.attachment_type === "image" ? (
                      <img
                        src={
                          msg.attachment_url.startsWith("blob:") || msg.attachment_url.startsWith("data:")
                            ? msg.attachment_url
                            : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/message-attachments/${msg.attachment_url}`
                        }
                        alt="Attachment"
                        className="rounded-xl max-w-full max-h-60 object-contain"
                      />
                    ) : (
                      <a
                        href={
                          msg.attachment_url.startsWith("blob:") || msg.attachment_url.startsWith("data:")
                            ? msg.attachment_url
                            : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/message-attachments/${msg.attachment_url}`
                        }
                        download
                        className="rounded-lg bg-bg/40 border border-border px-3 py-2 text-xs flex items-center gap-2 hover:bg-bg/60"
                      >
                        <File className="size-4" />
                        <span className="underline truncate">Download Attachment</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              <span className="text-[10px] text-text-muted mt-1 px-1 flex items-center gap-1.5">
                {format(new Date(msg.created_at), "h:mm a")}
                {isOwn && (
                  <span>
                    {msg.status === "sending" ? (
                      <span className="animate-spin inline-block size-2 rounded-full border border-[rgba(251,251,239,0.4)] border-t-transparent" style={{ borderTopColor: "transparent" }} />
                    ) : msg.status === "failed" ? (
                      <button
                        onClick={() => handleSendMessage(null as any, msg.content || "", msg.id)}
                        className="text-red-400 underline hover:text-red-300 font-bold"
                      >
                        Failed to send · Tap to retry
                      </button>
                    ) : msg.is_read ? (
                      "• Read"
                    ) : (
                      "• Sent"
                    )}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center bg-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border-strong border-t-accent" />
      </div>
    );
  }

  // Tags options depending on user role
  const tagsOptions =
    role === "brand"
      ? ["Delivered on time", "High quality content", "Professional", "Responsive"]
      : ["Clear brief", "Paid on time", "Great communication", "Flexible"];

  const userHasReviewed = existingReviews.some((r) => r.reviewer_id === userId);
  const isRoomCompleted = room?.status === "completed";
  const isRoomDisputed = room?.status === "disputed";

  return (
    <div className="flex h-[80vh] bg-surface-2 border border-border-strong rounded-2xl overflow-hidden relative">
      {/* Primary chat room column */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-border">
        {/* Header bar */}
        <div className="bg-surface-2 border-b border-border p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/${role}/chats`}
              className="flex items-center justify-center size-8 rounded-full hover:bg-bg/40 transition-colors"
            >
              <ArrowLeft className="size-4" />
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="size-9 rounded-full bg-black overflow-hidden flex items-center justify-center border border-border">
                  {counterpart?.avatar_url ? (
                    <img src={counterpart.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-black bg-accent size-full flex items-center justify-center">
                      {counterpart?.display_name ? counterpart.display_name[0].toUpperCase() : "U"}
                    </span>
                  )}
                </div>
                {isCounterpartOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-green-500 border border-[#141414] shadow" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                  {counterpart?.display_name}
                  {counterpart?.is_verified && (
                    <span className="inline-flex size-3.5 items-center justify-center rounded-full bg-accent text-black text-[9px] font-bold">
                      ✓
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-text-muted block leading-none">
                    Campaign: {room?.card?.title}
                  </span>
                  <span className="text-[10px] text-text-muted">•</span>
                  <div className="flex items-center gap-1">
                    {connectionState === "connected" ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        <span className="text-[9px] text-green-400 font-medium">Connected</span>
                      </>
                    ) : connectionState === "reconnecting" ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[9px] text-amber-400 font-medium">Reconnecting...</span>
                      </>
                    ) : (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        <span className="text-[9px] text-red-400 font-medium">Disconnected</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Milestone toggle button */}
            <button
              onClick={() => setIsMilestonesOpen(!isMilestonesOpen)}
              className={`p-2 rounded-full border transition-colors flex items-center gap-1 text-xs font-bold ${
                isMilestonesOpen
                  ? "bg-accent text-black border-[#fbfbef]"
                  : "bg-bg/40 border-border-strong text-text-secondary hover:text-text-primary"
              }`}
              title="Milestone Panel"
            >
              <CheckSquare className="size-4" />
              <span className="hidden sm:inline">Milestones</span>
            </button>

            {/* Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                className="p-2 rounded-full hover:bg-bg/40 text-text-secondary hover:text-white"
              >
                <MoreVertical className="size-5" />
              </button>

              {showHeaderMenu && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-surface border border-border-strong py-1.5 shadow-lg z-20 animate-in fade-in slide-in-from-top-1 duration-150">
                  <Link
                    href={
                      role === "brand"
                        ? `/dashboard/brand/cards/${room?.card_id}`
                        : `/dashboard/influencer/discover/${room?.card_id}`
                    }
                    className="block px-4 py-2 text-xs text-[rgba(251,251,239,0.8)] hover:bg-surface-2 hover:text-text-primary"
                  >
                    View Campaign Card
                  </Link>

                  {!isRoomCompleted && !isRoomDisputed && (
                    <>
                      <button
                        onClick={() => {
                          setShowHeaderMenu(false);
                          handleMarkAsCompleted();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-[#4ade80] hover:bg-[#142614]"
                      >
                        Mark as Completed 🏁
                      </button>
                      <button
                        onClick={() => {
                          setShowHeaderMenu(false);
                          setIsDisputeOpen(true);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-[#fb923c] hover:bg-[#261c14]"
                      >
                        Raise Dispute ⚠️
                      </button>
                    </>
                  )}

                  {isRoomCompleted && !userHasReviewed && (
                    <button
                      onClick={() => {
                        setShowHeaderMenu(false);
                        setIsReviewOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-text-primary hover:bg-surface-3"
                    >
                      Write Rating & Review ⭐
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowHeaderMenu(false);
                      handleReportUser();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-[#f87171] hover:bg-[#261414]"
                  >
                    Report User
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Connection lost warning banner */}
        {connectionState === "error" && (
          <div className="bg-red-950/20 border-b border-red-500/20 px-6 py-3 flex justify-between items-center text-red-400 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              <span>Live updates paused. We lost connection to the server. Messages won't appear until reconnected.</span>
            </div>
            <button
              onClick={manualReconnect}
              className="underline hover:text-white font-bold cursor-pointer"
            >
              Reconnect now
            </button>
          </div>
        )}

        {/* Locked warning banner */}
        {isRoomDisputed && (
          <div className="bg-[#261414] border-b border-red-500/20 px-6 py-3 flex items-center gap-3 text-red-300 text-xs">
            <AlertOctagon className="size-4 shrink-0" />
            <span>This collaboration is locked in dispute. Platform administrators are auditing the transaction history.</span>
          </div>
        )}

        {/* Completed notification banner */}
        {isRoomCompleted && (
          <div className="bg-[#142614] border-b border-[#4ade80]/20 px-6 py-3 flex justify-between items-center text-[#4ade80] text-xs">
            <div className="flex items-center gap-2">
              <Check className="size-4" />
              <span>Collaboration marked completed successfully.</span>
            </div>
            {!userHasReviewed && (
              <button
                onClick={() => setIsReviewOpen(true)}
                className="underline hover:text-white font-bold"
              >
                Write Review ⭐
              </button>
            )}
          </div>
        )}

        {/* Messages Feed panel */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-black/20 scrollbar-thin relative">
          {renderMessageGroups()}
          {isCounterpartTyping && (
            <div className="flex items-center gap-2 text-xs text-text-muted italic pl-2 py-1.5 bg-black/10 rounded-lg max-w-[200px] animate-pulse">
              <span className="flex gap-1 items-center justify-center">
                <span className="size-1.5 rounded-full bg-[rgba(251,251,239,0.5)] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="size-1.5 rounded-full bg-[rgba(251,251,239,0.5)] animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="size-1.5 rounded-full bg-[rgba(251,251,239,0.5)] animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              <span>{counterpart?.display_name || "Partner"} is typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar (Locked if disputed) */}
        {!isRoomDisputed ? (
          <form onSubmit={handleSendMessage} className="bg-surface-2 border-t border-border p-4 space-y-3">
            {attachmentFile && (
              <div className="flex items-center justify-between rounded-xl bg-bg/40 border border-border p-2">
                <div className="flex items-center gap-2">
                  {attachmentPreview ? (
                    <img src={attachmentPreview} alt="Preview" className="size-10 rounded object-cover" />
                  ) : (
                    <File className="size-10 text-text-muted" />
                  )}
                  <span className="text-xs text-[rgba(251,251,239,0.8)] truncate max-w-[200px]">
                    {attachmentFile.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentFile(null);
                    setAttachmentPreview("");
                  }}
                  className="text-[#f87171] hover:underline text-xs"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="flex items-center justify-center size-10 rounded-full bg-bg/40 border border-border hover:bg-bg/60 text-text-secondary hover:text-white cursor-pointer transition-colors flex-shrink-0">
                <Paperclip className="size-4" />
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>

              <input
                type="text"
                disabled={!online || connectionState === "error"}
                className={`flex-1 rounded-full bg-bg/60 border border-border-strong px-4 py-3.5 text-xs text-text-primary placeholder-text-muted outline-none ${
                  (!online || connectionState === "error") ? "opacity-50 cursor-not-allowed" : ""
                }`}
                placeholder={!online ? "You're offline. Reconnect to send messages." : "Type a message..."}
                value={text}
                onChange={handleInputChange}
                title={!online ? "You're offline. Reconnect to send messages." : undefined}
              />

              <button
                type="submit"
                disabled={sending || (!text.trim() && !attachmentFile) || !online || connectionState === "error"}
                className="flex items-center justify-center size-10 rounded-full bg-accent hover:opacity-90 disabled:opacity-50 text-black flex-shrink-0 scale-active transition-opacity"
              >
                <Send className="size-4" />
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-surface-2 border-t border-border/30 p-5 text-center text-xs text-[rgba(251,251,239,0.45)] font-semibold flex items-center justify-center gap-2">
            <Lock className="size-4 text-neutral-600" />
            <span>Chat channel locked in read-only mediation state.</span>
          </div>
        )}
      </div>

      {/* 4. COLLAPSIBLE MILESTONE TRACKER PANEL */}
      <AnimatePresence>
        {isMilestonesOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-80 bg-surface h-full flex flex-col justify-between overflow-hidden relative shrink-0 z-10 border-l border-border"
          >
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="p-4 border-b border-border flex justify-between items-center bg-surface-2">
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-text-secondary flex items-center gap-1.5">
                  <CheckSquare className="size-4" />
                  <span>Milestone Tracker</span>
                </h4>
                <button
                  onClick={() => setIsMilestonesOpen(false)}
                  className="text-text-muted hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Milestones scroll list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {milestones.length === 0 ? (
                  <p className="text-[11px] text-text-muted text-center py-10">
                    No milestones defined yet. Use the form below to create campaign milestones.
                  </p>
                ) : (
                  milestones.map((mile) => {
                    const isDone = mile.status === "done";
                    const isProgress = mile.status === "in_progress";

                    return (
                      <div
                        key={mile.id}
                        className={`rounded-xl border p-3.5 space-y-2.5 transition-all ${
                          isDone
                            ? "bg-green-500/10 border-green-500/20"
                            : isProgress
                            ? "bg-amber-500/10 border-amber-500/20"
                            : "bg-bg/40 border-border"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 justify-between">
                          <button
                            onClick={() => !isRoomDisputed && handleToggleMilestone(mile)}
                            disabled={isRoomDisputed}
                            className={`size-4.5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                              isDone
                                ? "bg-[#4ade80] border-[#4ade80] text-black"
                                : isProgress
                                ? "border-[#fb923c] text-[#fb923c]"
                                : "border-[rgba(251,251,239,0.35)] text-transparent"
                            }`}
                          >
                            {isDone ? (
                              <Check className="size-3 stroke-[3.5]" />
                            ) : isProgress ? (
                              <span className="size-1.5 bg-[#fb923c] rounded-full animate-ping" />
                            ) : null}
                          </button>

                          <div className="flex-1 min-w-0">
                            <span
                              className={`text-xs font-bold block truncate leading-tight ${
                                isDone ? "line-through text-text-muted" : "text-text-primary"
                              }`}
                            >
                              {mile.title}
                            </span>
                            {mile.due_date && (
                              <span className="text-[10px] text-text-muted flex items-center gap-1 mt-1 font-semibold">
                                <Calendar className="size-3" />
                                <span>Due: {new Date(mile.due_date).toLocaleDateString()}</span>
                              </span>
                            )}
                          </div>

                          {!isRoomDisputed && (
                            <button
                              onClick={() => handleDeleteMilestone(mile)}
                              className="text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ opacity: 1 }} // Force visibility for hover-free touch targets
                            >
                              <X className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add milestone form */}
              {!isRoomDisputed && (
                <form
                  onSubmit={handleAddMilestone}
                  className="p-4 border-t border-border bg-surface-2 space-y-3"
                >
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted block">
                    Add Milestone
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Milestone name..."
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    className="w-full bg-surface-2 border border-border-strong rounded-lg px-3 py-2 text-xs text-text-primary outline-none"
                  />
                  <input
                    type="date"
                    value={newMilestoneDate}
                    onChange={(e) => setNewMilestoneDate(e.target.value)}
                    className="w-full bg-surface-2 border border-border-strong rounded-lg px-3 py-2 text-xs text-text-primary outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full bg-accent text-black hover:bg-[#eaeaea] py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <PlusCircle className="size-3.5" />
                    <span>Create Milestone</span>
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. RATING & REVIEW MODAL */}
      {isReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface border border-border-strong rounded-3xl p-6 shadow-glow space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-border/30">
              <h3 className="text-base font-extrabold text-text-primary flex items-center gap-1.5">
                <Star className="size-5 text-[#fbbf24] fill-[#fbbf24]" />
                <span>Leave a Review for {counterpart?.display_name}</span>
              </h3>
              <button
                onClick={() => setIsReviewOpen(false)}
                className="text-text-muted hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-5">
              {/* Star selector */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">
                  Star Rating
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isSelected = star <= reviewRating;
                    return (
                      <motion.button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 12 }}
                        className="p-1 focus:outline-none"
                      >
                        <Star
                          className={`size-8 transition-colors ${
                            isSelected ? "text-[#fbbf24] fill-[#fbbf24]" : "text-neutral-700"
                          }`}
                        />
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Tag selector chips */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted block">
                  Select feedback badges
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tagsOptions.map((tag) => {
                    const isSelected = reviewTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setReviewTags((prev) =>
                            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                          )
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                          isSelected
                            ? "bg-accent text-black font-bold"
                            : "bg-surface-2 text-text-secondary border border-border hover:border-[rgba(251,251,239,0.3)]"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comments text area */}
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-muted block mb-1.5">
                  Written Feedback (max 500 chars)
                </label>
                <textarea
                  rows={4}
                  maxLength={500}
                  placeholder="Share details about your collaboration experience..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full bg-surface-2 border border-border-strong rounded-2xl px-4 py-2.5 text-xs text-text-primary placeholder-text-muted outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(false)}
                  className="rounded-full bg-surface-2 border border-border text-text-secondary px-5 py-2 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-accent text-black hover:opacity-90 px-6 py-2 text-xs font-bold transition-opacity"
                >
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DISPUTE MODAL */}
      {isDisputeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface border border-border-strong rounded-3xl p-6 shadow-glow space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-border/30">
              <h3 className="text-base font-extrabold text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="size-5" />
                <span>Raise Campaign Dispute</span>
              </h3>
              <button
                onClick={() => setIsDisputeOpen(false)}
                className="text-text-muted hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleRaiseDisputeSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-muted block mb-1.5">
                  Reason for Dispute
                </label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="block w-full rounded-full bg-surface-2 border border-border-strong px-4 py-2.5 text-xs text-text-primary outline-none"
                >
                  <option value="Late delivery">Late delivery / Missed deadline</option>
                  <option value="Poor communication">Poor communication / Ghosting</option>
                  <option value="Quality issue">Quality issue / Brief not followed</option>
                  <option value="Unprofessional behavior">Unprofessional behavior</option>
                  <option value="Other">Other / Payment dispute</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-muted block mb-1.5">
                  Provide Detailed Description
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe the issue in detail. Be clear and objective. This will be audited by platform administrators."
                  value={disputeDesc}
                  onChange={(e) => setDisputeDesc(e.target.value)}
                  className="w-full bg-surface-2 border border-border-strong rounded-2xl px-4 py-2.5 text-xs text-text-primary placeholder-text-muted outline-none"
                />
              </div>

              {/* Upload evidence images (max 3) */}
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-text-muted block mb-1.5">
                  Upload Evidence Images (max 3)
                </label>
                <div className="flex gap-2 items-center">
                  <label className="flex items-center gap-1.5 bg-surface-2 border border-border-strong hover:bg-surface-3 text-text-primary px-3.5 py-2 rounded-full text-xs font-bold cursor-pointer transition-colors">
                    <ImageIcon className="size-4 animate-pulse" />
                    <span>{uploadingEvidence ? "Uploading..." : "Add Image"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploadingEvidence || evidenceFiles.length >= 3}
                      onChange={handleEvidenceUpload}
                    />
                  </label>
                  <span className="text-[9px] text-text-muted">
                    {evidenceFiles.length}/3 images uploaded
                  </span>
                </div>

                {/* Evidence thumbnails */}
                {evidenceUrls.length > 0 && (
                  <div className="flex gap-2 mt-2.5">
                    {evidenceUrls.map((url, index) => (
                      <div key={index} className="size-12 rounded-lg border border-border-strong overflow-hidden relative group shrink-0">
                        <img src={url} alt="Evidence" className="size-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setEvidenceUrls(evidenceUrls.filter((_, i) => i !== index));
                            setEvidenceFiles(evidenceFiles.filter((_, i) => i !== index));
                          }}
                          className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XCircle className="size-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-border/30">
                <button
                  type="button"
                  onClick={() => setIsDisputeOpen(false)}
                  className="rounded-full bg-surface-2 border border-border text-text-secondary px-5 py-2 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingEvidence || !disputeDesc.trim()}
                  className="rounded-full bg-red-600 hover:bg-red-700 text-white px-6 py-2 text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Raise Dispute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
