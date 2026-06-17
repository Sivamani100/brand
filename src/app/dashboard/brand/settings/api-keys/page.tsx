"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { Key, Plus, Copy, Check, Trash2, Shield, Clock, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

/**
 * ApiKeysPage — User-facing API key management.
 * Allows users to create, view (prefix only), and revoke API keys.
 */

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  rate_limit_per_minute: number;
}

const BRAND_SCOPES = [
  { id: "cards:read", label: "Read cards", description: "List and view your cards" },
  { id: "cards:write", label: "Write cards", description: "Create, edit, delete cards" },
  { id: "applications:read", label: "Read applications", description: "View applications on your cards" },
  { id: "profile:read", label: "Read profile", description: "Read your profile data" },
  { id: "profile:write", label: "Write profile", description: "Update your profile" },
];

const INFLUENCER_SCOPES = [
  { id: "cards:read", label: "Read cards", description: "View active cards" },
  { id: "applications:read", label: "Read applications", description: "View your applications" },
  { id: "applications:write", label: "Write applications", description: "Submit/withdraw applications" },
  { id: "profile:read", label: "Read profile", description: "Read your profile data" },
  { id: "profile:write", label: "Write profile", description: "Update your profile" },
];

export default function ApiKeysPage() {
  const { profile } = useUser();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);
  const [newKeyExpiry, setNewKeyExpiry] = useState("");
  const [creating, setCreating] = useState(false);

  // One-time key display
  const [generatedKey, setGeneratedKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmedCopy, setConfirmedCopy] = useState(false);

  const role = profile?.role || "brand";
  const availableScopes = role === "brand" ? BRAND_SCOPES : INFLUENCER_SCOPES;

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setKeys(data.keys || []);
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please give your key a name.");
      return;
    }
    if (newKeyScopes.length === 0) {
      toast.error("Please select at least one scope.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: newKeyScopes,
          expires_at: newKeyExpiry || null,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setGeneratedKey(data.rawKey);
      loadKeys();
      toast.success("API key created!");
    } catch {
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string, keyName: string) => {
    if (!confirm(`Revoke "${keyName}"? Any integrations using this key will stop working.`)) return;

    try {
      const res = await fetch(`/api/keys?id=${keyId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }
      toast.success("API key revoked");
      loadKeys();
    } catch {
      toast.error("Failed to revoke API key");
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDismissKeyModal = () => {
    setGeneratedKey("");
    setCopied(false);
    setConfirmedCopy(false);
    setShowCreate(false);
    setNewKeyName("");
    setNewKeyScopes([]);
    setNewKeyExpiry("");
  };

  const toggleScope = (scope: string) => {
    setNewKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const activeKeys = keys.filter((k) => k.is_active);
  const revokedKeys = keys.filter((k) => !k.is_active);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">API Keys</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Manage API keys for external integrations
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-full bg-[var(--color-cream)] text-black font-semibold text-xs px-5 py-2.5 hover:opacity-90 transition-opacity cursor-pointer"
        >
          <Plus className="size-3.5" />
          New Key
        </button>
      </div>

      {/* Active keys list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
      ) : activeKeys.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
          <Key className="size-8 text-[var(--color-text-muted)] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">No API keys yet</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Create your first key to start building integrations.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeKeys.map((key) => (
            <div
              key={key.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="size-3.5 text-[var(--color-success)]" />
                  <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                    {key.name}
                  </span>
                </div>
                <code className="text-[11px] font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-2)] px-2 py-0.5 rounded">
                  {key.key_prefix}...
                </code>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {key.scopes.map((s) => (
                    <span
                      key={s}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-2 text-[10px] text-[var(--color-text-muted)]">
                  <span>
                    Created{" "}
                    {new Date(key.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {key.last_used_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-2.5" />
                      Last used{" "}
                      {new Date(key.last_used_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                  {key.expires_at && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="size-2.5" />
                      Expires{" "}
                      {new Date(key.expires_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRevoke(key.id, key.name)}
                className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--color-error)] hover:bg-[var(--color-surface-2)] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="size-3" />
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Revoked keys (collapsed) */}
      {revokedKeys.length > 0 && (
        <details className="text-xs text-[var(--color-text-muted)]">
          <summary className="cursor-pointer hover:text-[var(--color-text-secondary)] py-2">
            {revokedKeys.length} revoked key{revokedKeys.length > 1 ? "s" : ""}
          </summary>
          <div className="mt-2 space-y-2">
            {revokedKeys.map((key) => (
              <div
                key={key.id}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 opacity-50"
              >
                <span className="font-semibold">{key.name}</span>
                <code className="ml-2 text-[10px] font-mono">{key.key_prefix}...</code>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ═══ Create Key Modal ═══ */}
      {showCreate && !generatedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 space-y-5">
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Create API Key</h2>

            {/* Name */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-text-muted)] block mb-1.5">
                Key Name
              </label>
              <input
                type="text"
                placeholder="e.g. My Zapier Integration"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="w-full rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] input-focus-animate"
              />
            </div>

            {/* Scopes */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-text-muted)] block mb-2">
                Permissions
              </label>
              <div className="space-y-2">
                {availableScopes.map((scope) => (
                  <label
                    key={scope.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={newKeyScopes.includes(scope.id)}
                      onChange={() => toggleScope(scope.id)}
                      className="mt-0.5 accent-[var(--color-cream)]"
                    />
                    <div>
                      <div className="text-xs font-semibold text-[var(--color-text-primary)]">
                        {scope.label}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-muted)]">
                        {scope.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Expiry */}
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-text-muted)] block mb-1.5">
                Expiration (optional)
              </label>
              <input
                type="date"
                value={newKeyExpiry}
                onChange={(e) => setNewKeyExpiry(e.target.value)}
                className="w-full rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] input-focus-animate"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setNewKeyName("");
                  setNewKeyScopes([]);
                  setNewKeyExpiry("");
                }}
                className="flex-1 rounded-full border border-[var(--color-border)] text-[var(--color-text-primary)] font-semibold text-xs py-2.5 hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 rounded-full bg-[var(--color-cream)] text-black font-semibold text-xs py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {creating ? "Creating..." : "Generate Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ One-Time Key Display Modal ═══ */}
      {generatedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 space-y-5">
            <div className="flex items-center gap-2 text-[var(--color-warning)]">
              <AlertTriangle className="size-5" />
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                Copy Your API Key
              </h2>
            </div>

            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Copy this key now. We don&apos;t store it — you won&apos;t see it again.
            </p>

            <div className="relative">
              <code className="block w-full text-[11px] font-mono bg-[var(--color-surface-2)] border border-[var(--color-border)] p-4 rounded-lg break-all text-[var(--color-text-primary)]">
                {generatedKey}
              </code>
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-[var(--color-surface-3)] transition-colors cursor-pointer"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="size-4 text-[var(--color-success)]" />
                ) : (
                  <Copy className="size-4 text-[var(--color-text-muted)]" />
                )}
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedCopy}
                onChange={(e) => setConfirmedCopy(e.target.checked)}
                className="accent-[var(--color-cream)]"
              />
              <span className="text-xs text-[var(--color-text-secondary)]">
                I&apos;ve copied the key to a safe place
              </span>
            </label>

            <button
              onClick={handleDismissKeyModal}
              disabled={!confirmedCopy}
              className="w-full rounded-full bg-[var(--color-cream)] text-black font-semibold text-xs py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
