"use client";

import { useUser } from "@/lib/hooks/useUser";
import NotificationsList from "@/components/shared/NotificationsList";

export default function BrandNotificationsPage() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef] font-sans">
          Notifications
        </h1>
        <p className="text-xs text-[rgba(251,251,239,0.6)]">
          Stay updated on your posted campaigns and chats activities
        </p>
      </div>
      <NotificationsList userId={user.id} role="brand" />
    </div>
  );
}
