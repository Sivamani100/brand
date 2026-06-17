"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { Bell, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function BrandNotificationSettingsPage() {
  const { user, profile } = useUser();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);

  // Notification Preferences toggles
  const [prefs, setPrefs] = useState({
    email_notifications: true,
    new_applications: true,
    chat_messages: true,
    campaign_updates: true,
    milestone_changes: true
  });

  useEffect(() => {
    if (profile?.notification_prefs) {
      const dbPrefs = profile.notification_prefs as any;
      setPrefs({
        email_notifications: dbPrefs.email_notifications !== false,
        new_applications: dbPrefs.new_applications !== false,
        chat_messages: dbPrefs.chat_messages !== false,
        campaign_updates: dbPrefs.campaign_updates !== false,
        milestone_changes: dbPrefs.milestone_changes !== false
      });
    }
  }, [profile]);

  const handleToggle = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        notification_prefs: prefs,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to save notification preferences.");
    } else {
      toast.success("Notification preferences updated.");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/brand/profile"
          className="text-xs font-bold text-[rgba(251,251,239,0.6)] hover:text-[#fbfbef] flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Profile Settings</span>
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef] font-sans flex items-center gap-2">
          <Bell className="size-6 text-[#fbfbef]" />
          <span>Notification Preferences</span>
        </h1>
        <p className="text-xs text-[rgba(251,251,239,0.6)]">
          Manage how and when you want to receive alerts and email updates from the platform
        </p>
      </div>

      {/* Preferences Card */}
      <div className="rounded-2xl border border-[rgba(251,251,239,0.2)] bg-[#0d0d0d] p-6 space-y-6">
        <div className="space-y-4">
          {/* Email Notifications Toggle */}
          <div className="flex items-center justify-between border-b border-[rgba(251,251,239,0.05)] pb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Email Digest & Alerts</h3>
              <p className="text-[10px] text-[rgba(251,251,239,0.4)] mt-0.5">
                Receive platform summaries and critical notifications directly in your inbox
              </p>
            </div>
            <button
              onClick={() => handleToggle("email_notifications")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                prefs.email_notifications ? "bg-[#fbfbef]" : "bg-[#141414] border border-[rgba(251,251,239,0.2)]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ${
                  prefs.email_notifications ? "translate-x-6 bg-black" : "translate-x-1 bg-[rgba(251,251,239,0.4)]"
                }`}
              />
            </button>
          </div>

          {/* New Applications Toggle */}
          <div className="flex items-center justify-between border-b border-[rgba(251,251,239,0.05)] pb-4">
            <div>
              <h3 className="text-sm font-bold text-white">New Pitch Applications</h3>
              <p className="text-[10px] text-[rgba(251,251,239,0.4)] mt-0.5">
                Alert me when influencers send pitches to my posted campaign cards
              </p>
            </div>
            <button
              onClick={() => handleToggle("new_applications")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                prefs.new_applications ? "bg-[#fbfbef]" : "bg-[#141414] border border-[rgba(251,251,239,0.2)]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ${
                  prefs.new_applications ? "translate-x-6 bg-black" : "translate-x-1 bg-[rgba(251,251,239,0.4)]"
                }`}
              />
            </button>
          </div>

          {/* Chat Messages Toggle */}
          <div className="flex items-center justify-between border-b border-[rgba(251,251,239,0.05)] pb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Direct Chat Messages</h3>
              <p className="text-[10px] text-[rgba(251,251,239,0.4)] mt-0.5">
                Receive instant notifications when you receive a message in active collaboration chats
              </p>
            </div>
            <button
              onClick={() => handleToggle("chat_messages")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                prefs.chat_messages ? "bg-[#fbfbef]" : "bg-[#141414] border border-[rgba(251,251,239,0.2)]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ${
                  prefs.chat_messages ? "translate-x-6 bg-black" : "translate-x-1 bg-[rgba(251,251,239,0.4)]"
                }`}
              />
            </button>
          </div>

          {/* Campaign Updates Toggle */}
          <div className="flex items-center justify-between border-b border-[rgba(251,251,239,0.05)] pb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Campaign Invites & Status</h3>
              <p className="text-[10px] text-[rgba(251,251,239,0.4)] mt-0.5">
                Notify me when invited influencers accept/decline offers or edit profiles
              </p>
            </div>
            <button
              onClick={() => handleToggle("campaign_updates")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                prefs.campaign_updates ? "bg-[#fbfbef]" : "bg-[#141414] border border-[rgba(251,251,239,0.2)]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ${
                  prefs.campaign_updates ? "translate-x-6 bg-black" : "translate-x-1 bg-[rgba(251,251,239,0.4)]"
                }`}
              />
            </button>
          </div>

          {/* Milestone Changes Toggle */}
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="text-sm font-bold text-white">Milestones Tracking</h3>
              <p className="text-[10px] text-[rgba(251,251,239,0.4)] mt-0.5">
                Notify me immediately when milestone stages (Pending, In Progress, Done) are updated
              </p>
            </div>
            <button
              onClick={() => handleToggle("milestone_changes")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                prefs.milestone_changes ? "bg-[#fbfbef]" : "bg-[#141414] border border-[rgba(251,251,239,0.2)]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ${
                  prefs.milestone_changes ? "translate-x-6 bg-black" : "translate-x-1 bg-[rgba(251,251,239,0.4)]"
                }`}
              />
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-[#fbfbef] text-black hover:opacity-90 px-6 py-3 text-xs font-extrabold transition-all w-full flex items-center justify-center gap-2 scale-active"
        >
          <Save className="size-4" />
          <span>{saving ? "Saving Preferences..." : "Save Notification Preferences"}</span>
        </button>
      </div>
    </div>
  );
}
