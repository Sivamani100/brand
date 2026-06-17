"use client";

import { useUser } from "@/lib/hooks/useUser";
import ChatsList from "@/components/chat/ChatsList";

export default function InfluencerChatsPage() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary font-sans">
          Campaign Chats
        </h1>
        <p className="text-xs text-text-secondary">
          Manage your private collaboration conversations with brand partners
        </p>
      </div>
      <ChatsList userId={user.id} role="influencer" />
    </div>
  );
}
