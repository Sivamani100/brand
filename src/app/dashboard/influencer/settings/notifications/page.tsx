"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { Bell, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function InfluencerNotificationSettingsPage() {
  const { user, profile } = useUser();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);

  // Notification Preferences toggles
  const [prefs, setPrefs] = useState({
    email_notifications: true,
    pitch_updates: true,
    chat_messages: true,
    brand_invites: true,
    milestone_changes: true
  });

  useEffect(() => {
    if (profile?.notification_prefs) {
      const dbPrefs = profile.notification_prefs as any;
      setPrefs({
        email_notifications: dbPrefs.email_notifications !== false,
        pitch_updates: dbPrefs.pitch_updates !== false,
        chat_messages: dbPrefs.chat_messages !== false,
        brand_invites: dbPrefs.brand_invites !== false,
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
          href="/dashboard/influencer/profile"
          className="text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Profile Settings</span>
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary font-sans flex items-center gap-2">
          <Bell className="size-6 text-text-primary" />
          <span>Notification Preferences</span>
        </h1>
        <p className="text-xs text-text-secondary">
          Manage how and when you want to receive alerts and email updates from the platform
        </p>
      </div>

      {/* Preferences Card */}
      <div className="rounded-2xl border border-border-strong bg-surface p-6 space-y-6">
        <div className="space-y-4">
          {/* Email Notifications Toggle */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Email Digest & Alerts</h3>
              <p className="text-[10px] text-text-muted mt-0.5">
                Receive platform summaries and critical notifications directly in your inbox
              </p>
            </div>
            <button
              onClick={() => handleToggle("email_notifications")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                prefs.email_notifications ? "bg-accent" : "bg-surface-2 border border-border-strong"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ${
                  prefs.email_notifications ? "translate-x-6 bg-invert-text" : "translate-x-1 bg-text-muted"
                }`}
              />
            </button>
          </div>

          {/* Pitch Updates Toggle */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Pitch & Application Updates</h3>
              <p className="text-[10px] text-text-muted mt-0.5">
                Alert me when brands accept, reject, or comment on my sent collaboration applications
              </p>
            </div>
            <button
              onClick={() => handleToggle("pitch_updates")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                prefs.pitch_updates ? "bg-accent" : "bg-surface-2 border border-border-strong"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ${
                  prefs.pitch_updates ? "translate-x-6 bg-invert-text" : "translate-x-1 bg-text-muted"
                }`}
              />
            </button>
          </div>

          {/* Chat Messages Toggle */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Direct Chat Messages</h3>
              <p className="text-[10px] text-text-muted mt-0.5">
                Receive instant notifications when you receive a message in active collaboration chats
              </p>
            </div>
            <button
              onClick={() => handleToggle("chat_messages")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                prefs.chat_messages ? "bg-accent" : "bg-surface-2 border border-border-strong"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ${
                  prefs.chat_messages ? "translate-x-6 bg-invert-text" : "translate-x-1 bg-text-muted"
                }`}
              />
            </button>
          </div>

          {/* Brand Invites Toggle */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Direct Brand Invitations</h3>
              <p className="text-[10px] text-text-muted mt-0.5">
                Notify me when partner brands send direct collaboration offers to my inbox
              </p>
            </div>
            <button
              onClick={() => handleToggle("brand_invites")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                prefs.brand_invites ? "bg-accent" : "bg-surface-2 border border-border-strong"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ${
                  prefs.brand_invites ? "translate-x-6 bg-invert-text" : "translate-x-1 bg-text-muted"
                }`}
              />
            </button>
          </div>

          {/* Milestone Changes Toggle */}
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Milestones Tracking</h3>
              <p className="text-[10px] text-text-muted mt-0.5">
                Notify me immediately when milestone stages (Pending, In Progress, Done) are updated
              </p>
            </div>
            <button
              onClick={() => handleToggle("milestone_changes")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                prefs.milestone_changes ? "bg-accent" : "bg-surface-2 border border-border-strong"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ${
                  prefs.milestone_changes ? "translate-x-6 bg-invert-text" : "translate-x-1 bg-text-muted"
                }`}
              />
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-accent text-invert-text hover:opacity-90 px-6 py-3 text-xs font-extrabold transition-all w-full flex items-center justify-center gap-2 scale-active"
        >
          <Save className="size-4" />
          <span>{saving ? "Saving Preferences..." : "Save Notification Preferences"}</span>
        </button>
      </div>
    </div>
  );
}
