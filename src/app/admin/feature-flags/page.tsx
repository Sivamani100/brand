"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { Flag, Save, ToggleLeft, ToggleRight, Plus, RefreshCw, X } from "lucide-react";
import toast from "react-hot-toast";

interface FeatureFlag {
  key: string;
  enabled: boolean;
  enabled_for_roles: string[] | null;
  enabled_for_user_ids: string[] | null;
  description: string | null;
  updated_at: string;
}

export default function FeatureFlagsPage() {
  const supabase = createClient() as any;
  const { profile } = useUser();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  // Form / Edit states
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [key, setKey] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [description, setDescription] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [userIdsInput, setUserIdsInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSelectFlag = (flag: FeatureFlag) => {
    setSelectedFlag(flag);
    setKey(flag.key);
    setEnabled(flag.enabled);
    setDescription(flag.description || "");
    setRoles(flag.enabled_for_roles || []);
    setUserIdsInput(flag.enabled_for_user_ids?.join(", ") || "");
    setIsCreating(false);
  };

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("key", { ascending: true });

      if (error) throw error;
      setFlags(data || []);

      if (data && data.length > 0 && !selectedFlag) {
        handleSelectFlag(data[0]);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load feature flags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const handleCreateNewClick = () => {
    setSelectedFlag(null);
    setKey("");
    setEnabled(false);
    setDescription("");
    setRoles([]);
    setUserIdsInput("");
    setIsCreating(true);
  };

  const handleToggleRoles = (role: string) => {
    if (roles.includes(role)) {
      setRoles(roles.filter((r) => r !== role));
    } else {
      setRoles([...roles, role]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      toast.error("Flag key is required");
      return;
    }

    const parsedUserIds = userIdsInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length === 36); // basic UUID length check

    const flagKey = key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");

    try {
      if (isCreating) {
        const { error } = await supabase.from("feature_flags").insert({
          key: flagKey,
          enabled,
          description: description.trim(),
          enabled_for_roles: roles.length > 0 ? roles : null,
          enabled_for_user_ids: parsedUserIds.length > 0 ? parsedUserIds : null,
          updated_by: profile?.id,
          updated_at: new Date().toISOString(),
        });

        if (error) throw error;

        // Log audit
        await supabase.from("audit_logs").insert({
          actor_id: profile?.id,
          actor_role: "admin",
          action: "feature_flag_create",
          target_type: "feature_flags",
          metadata: { key: flagKey, enabled },
        });

        toast.success("Feature flag created");
      } else {
        if (!selectedFlag) return;

        const { error } = await supabase
          .from("feature_flags")
          .update({
            enabled,
            description: description.trim(),
            enabled_for_roles: roles.length > 0 ? roles : null,
            enabled_for_user_ids: parsedUserIds.length > 0 ? parsedUserIds : null,
            updated_by: profile?.id,
            updated_at: new Date().toISOString(),
          })
          .eq("key", selectedFlag.key);

        if (error) throw error;

        // Log audit
        await supabase.from("audit_logs").insert({
          actor_id: profile?.id,
          actor_role: "admin",
          action: "feature_flag_update",
          target_type: "feature_flags",
          metadata: { key: selectedFlag.key, enabled },
        });

        toast.success("Feature flag saved");
      }

      fetchFlags();
    } catch (error: any) {
      toast.error(error.message || "Failed to save feature flag");
    }
  };

  const handleQuickToggle = async (flag: FeatureFlag, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("feature_flags")
        .update({
          enabled: !currentStatus,
          updated_by: profile?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("key", flag.key);

      if (error) throw error;

      await supabase.from("audit_logs").insert({
        actor_id: profile?.id,
        actor_role: "admin",
        action: `feature_flag_toggle_${!currentStatus}`,
        target_type: "feature_flags",
        metadata: { key: flag.key },
      });

      toast.success(`${flag.key} set to ${!currentStatus}`);
      fetchFlags();
    } catch (error: any) {
      toast.error(error.message || "Failed to toggle feature flag");
    }
  };

  return (
    <div className="space-y-8 text-[#fbfbef]">
      <div className="flex items-center justify-between border-b border-[rgba(251,251,239,0.1)] pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Feature Flags</h1>
          <p className="text-sm text-[rgba(251,251,239,0.6)]">
            Toggle functional modules dynamically or test them with user whitelists.
          </p>
        </div>
        <button
          onClick={handleCreateNewClick}
          className="flex items-center gap-2 bg-[#fbfbef] hover:bg-[rgba(251,251,239,0.9)] text-black rounded-full px-5 py-2.5 text-xs font-bold transition-all"
        >
          <Plus className="size-4" />
          <span>Add Feature Flag</span>
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[rgba(251,251,239,0.2)] border-t-[#fbfbef]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List of Flags */}
          <div className="lg:col-span-1 bg-[#0d0d0d] p-5 rounded-2xl border border-[rgba(251,251,239,0.1)] space-y-4 h-fit">
            <h2 className="text-xs font-bold text-[rgba(251,251,239,0.5)] uppercase tracking-wider flex items-center justify-between">
              <span>Active Flags</span>
              <button onClick={fetchFlags} className="hover:text-white transition-colors">
                <RefreshCw className="size-3.5" />
              </button>
            </h2>

            <div className="space-y-2.5">
              {flags.map((flag) => (
                <div
                  key={flag.key}
                  onClick={() => handleSelectFlag(flag)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedFlag?.key === flag.key && !isCreating
                      ? "bg-[#1c1c1c] border-[#fbfbef] text-[#fbfbef]"
                      : "bg-[#141414] border-[rgba(251,251,239,0.06)] text-[rgba(251,251,239,0.7)] hover:bg-[#1a1a1a]"
                  }`}
                >
                  <div className="space-y-1 pr-4">
                    <span className="font-mono text-xs font-bold block truncate max-w-[150px]">{flag.key}</span>
                    <span className="text-[10px] text-[rgba(251,251,239,0.4)] line-clamp-1">
                      {flag.description || "No description"}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickToggle(flag, flag.enabled);
                    }}
                    className="focus:outline-none transition-colors"
                  >
                    {flag.enabled ? (
                      <ToggleRight className="size-8 text-green-500" />
                    ) : (
                      <ToggleLeft className="size-8 text-[rgba(251,251,239,0.3)]" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Flag Panel */}
          <div className="lg:col-span-2 bg-[#0d0d0d] p-6 rounded-2xl border border-[rgba(251,251,239,0.1)]">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex items-center gap-2 text-xs font-bold text-[rgba(251,251,239,0.5)] uppercase tracking-wider border-b border-[rgba(251,251,239,0.08)] pb-3">
                <Flag className="size-4" />
                <span>{isCreating ? "Add Feature Flag" : `Configure Flag: ${selectedFlag?.key}`}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[rgba(251,251,239,0.7)]">Flag Identifier (Key)</label>
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    disabled={!isCreating}
                    placeholder="e.g. beta_portal"
                    required
                    className="w-full bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl px-4 py-2.5 text-xs text-[#fbfbef] focus:border-[#fbfbef] outline-none disabled:opacity-50 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[rgba(251,251,239,0.7)] block">Global State</label>
                  <button
                    type="button"
                    onClick={() => setEnabled(!enabled)}
                    className="flex items-center gap-2 text-xs font-bold py-2 focus:outline-none"
                  >
                    {enabled ? (
                      <>
                        <ToggleRight className="size-8 text-green-500" />
                        <span className="text-green-400">ENABLED BY DEFAULT</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="size-8 text-[rgba(251,251,239,0.3)]" />
                        <span className="text-[rgba(251,251,239,0.5)]">DISABLED BY DEFAULT (Selective roll-out)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.7)]">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Summarise what features this flag gates..."
                  className="w-full bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl p-3 text-xs text-[#fbfbef] focus:border-[#fbfbef] outline-none"
                />
              </div>

              {/* Roles selective roll-out */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.7)] block">Roll-out to Roles</label>
                <div className="flex gap-3">
                  {["brand", "influencer", "admin"].map((r) => {
                    const isSelected = roles.includes(r);
                    return (
                      <button
                        type="button"
                        key={r}
                        onClick={() => handleToggleRoles(r)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                          isSelected
                            ? "bg-[#1c1c1c] text-[#fbfbef] border-[#fbfbef]"
                            : "bg-[#141414] text-[rgba(251,251,239,0.5)] border-[rgba(251,251,239,0.08)] hover:bg-[#1c1c1c]"
                        }`}
                      >
                        {r}s
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[rgba(251,251,239,0.4)]">
                  If selected, users with these roles will have the feature enabled even if the global state is disabled.
                </p>
              </div>

              {/* User ID whitelist */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.7)]">Whitelisted User IDs (comma-separated UUIDs)</label>
                <textarea
                  value={userIdsInput}
                  onChange={(e) => setUserIdsInput(e.target.value)}
                  rows={3}
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000, 3e251131-..."
                  className="w-full bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl p-3 text-xs font-mono text-[#fbfbef] focus:border-[#fbfbef] outline-none"
                />
                <p className="text-[10px] text-[rgba(251,251,239,0.4)]">
                  Specific user profiles that will have access. Handy for beta tests.
                </p>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#fbfbef] hover:bg-[rgba(251,251,239,0.9)] text-black rounded-xl py-3 text-xs font-bold transition-all shadow-md"
              >
                <Save className="size-4" />
                <span>Save Feature Flag Settings</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
