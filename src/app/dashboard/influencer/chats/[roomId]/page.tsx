"use client";

import { useParams } from "next/navigation";
import { useUser } from "@/lib/hooks/useUser";
import ChatRoom from "@/components/chat/ChatRoom";

export default function InfluencerChatRoomPage() {
  const { roomId } = useParams();
  const { user } = useUser();

  if (!user || !roomId) return null;

  return (
    <ChatRoom
      roomId={roomId as string}
      userId={user.id}
      role="influencer"
    />
  );
}
