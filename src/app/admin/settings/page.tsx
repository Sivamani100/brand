"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { Settings, Save, AlertOctagon, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminSettingsPage() {
  const { user } = useUser();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // General Settings states
  const [platformName, setPlatformName] = useState("Brand");
  const [maxCards, setMaxCards] = useState(10);
  const [maxApps, setMaxApps] = useState(5);
  const [welcomeTemplate, setWelcomeTemplate] = useState("Welcome to Brand collaboration suite!");

  // Maintenance Mode states
  const [maintEnabled, setMaintEnabled] = useState(false);
  const [maintMessage, setMaintMessage] = useState("We're upgrading Brand. Back in 30 minutes.");
  const [maintExpectedEnd, setMaintExpectedEnd] = useState("");

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);

      const { data: configData } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("key", "config")
        .maybeSingle();

      const { data: maintData } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("key", "maintenance_mode")
        .maybeSingle();

      if (configData && configData.value) {
        const val = configData.value as any;
        setPlatformName(val.platformName || "Brand");
        setMaxCards(val.maxCards || 10);
        setMaxApps(val.maxApps || 5);
        setWelcomeTemplate(val.welcomeTemplate || "Welcome to Brand collaboration suite!");
      }

      if (maintData && maintData.value) {
        const val = maintData.value as any;
        setMaintEnabled(!!val.enabled);
        setMaintMessage(val.message || "We're upgrading Brand. Back in 30 minutes.");
        if (val.expected_end) {
          const date = new Date(val.expected_end);
          setMaintExpectedEnd(date.toISOString().slice(0, 16));
        } else {
          setMaintExpectedEnd("");
        }
      }

      setLoading(false);
    }

    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);

    // 1. Save general config
    const { error: configError } = await supabase
      .from("platform_settings")
      .upsert({
        key: "config",
        value: {
          platformName,
          maxCards,
          maxApps,
          welcomeTemplate,
        },
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      });

    // 2. Save maintenance mode
    const { error: maintError } = await supabase
      .from("platform_settings")
      .upsert({
        key: "maintenance_mode",
        value: {
          enabled: maintEnabled,
          message: maintMessage,
          expected_end: maintExpectedEnd ? new Date(maintExpectedEnd).toISOString() : null,
          allow_admin: true
        },
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      });

    if (configError || maintError) {
      toast.error("Failed to save some configurations: " + (configError?.message || maintError?.message));
    } else {
      toast.success("Platform configuration updated successfully.");
    }
    setSaving(false);
  };

  const handleToggleMaintenance = () => {
    if (!maintEnabled) {
      const confirm = window.confirm("WARNING: This will lock out all non-admin users from the application. Proceed?");
      if (!confirm) return;
    }
    setMaintEnabled(!maintEnabled);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-surface rounded-lg" />
        <div className="h-96 bg-surface rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary font-sans">
          Platform Configuration
        </h1>
        <p className="text-xs text-text-secondary">
          Manage system limitations, maintenance modes, and email templates
        </p>
      </div>

      <div className="rounded-2xl bg-surface border border-border p-8">
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Platform Brand Name
              </label>
              <input
                type="text"
                required
                className="mt-2 block w-full rounded-full bg-surface-2 border border-border px-4 py-3 text-sm text-text-primary placeholder-Brand input-focus-animate"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <span>Maintenance Mode</span>
              </label>
              <div className="flex items-center mt-3">
                <button
                  type="button"
                  onClick={handleToggleMaintenance}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    maintEnabled ? "bg-red-400" : "bg-surface-3"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-invert-text transition-transform ${
                      maintEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-xs text-text-secondary ml-3 font-semibold">
                  {maintEnabled ? "System offline for maintenance ⚠️" : "System live and operational"}
                </span>
              </div>
            </div>
          </div>

          {/* Maintenance Details */}
          {maintEnabled && (
            <div className="p-5 bg-surface-2 border border-red-500/10 rounded-2xl space-y-4 animate-fade-in">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider">Maintenance Parameters</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Holding Message</label>
                  <textarea
                    rows={2}
                    className="mt-1.5 block w-full rounded-xl bg-surface border border-border px-4 py-2.5 text-xs text-text-primary placeholder-text-muted input-focus-animate"
                    value={maintMessage}
                    onChange={(e) => setMaintMessage(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Expected End Datetime (Optional)</label>
                  <input
                    type="datetime-local"
                    className="mt-1.5 block w-full rounded-full bg-surface border border-border px-4 py-2.5 text-xs text-text-primary input-focus-animate"
                    value={maintExpectedEnd}
                    onChange={(e) => setMaintExpectedEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/10">
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Max campaigns per Brand per month
              </label>
              <input
                type="number"
                required
                className="mt-2 block w-full rounded-full bg-surface-2 border border-border px-4 py-3 text-sm text-text-primary input-focus-animate"
                value={maxCards}
                onChange={(e) => setMaxCards(parseInt(e.target.value) || 0)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Max applications per Influencer per day
              </label>
              <input
                type="number"
                required
                className="mt-2 block w-full rounded-full bg-surface-2 border border-border px-4 py-3 text-sm text-text-primary input-focus-animate"
                value={maxApps}
                onChange={(e) => setMaxApps(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border/10">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Welcome Email Body Template
            </label>
            <textarea
              rows={4}
              required
              className="mt-2 block w-full rounded-2xl bg-surface-2 border border-border px-4 py-3 text-sm text-text-primary input-focus-animate"
              value={welcomeTemplate}
              onChange={(e) => setWelcomeTemplate(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-accent text-invert-text font-bold px-8 py-3 text-sm hover:opacity-90 disabled:opacity-50 scale-active transition-opacity flex items-center gap-2 shadow-glow"
            >
              <Save className="size-4" />
              <span>{saving ? "Saving Configuration..." : "Save Settings"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
