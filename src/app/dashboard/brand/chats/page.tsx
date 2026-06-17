"use client";

import { useUser } from "@/lib/hooks/useUser";
import ChatsList from "@/components/chat/ChatsList";

export default function BrandChatsPage() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef] font-sans">
          Campaign Chats
        </h1>
        <p className="text-xs text-[rgba(251,251,239,0.6)]">
          Manage your private collaboration conversations with influencers
        </p>
      </div>
      <ChatsList userId={user.id} role="brand" />
    </div>
  );
}
