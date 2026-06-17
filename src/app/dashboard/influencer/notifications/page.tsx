"use client";

import { useUser } from "@/lib/hooks/useUser";
import NotificationsList from "@/components/shared/NotificationsList";

export default function InfluencerNotificationsPage() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary font-sans">
          Notifications
        </h1>
        <p className="text-xs text-text-secondary">
          Stay updated on your sent applications and brand messages
        </p>
      </div>
      <NotificationsList userId={user.id} role="influencer" />
    </div>
  );
}
