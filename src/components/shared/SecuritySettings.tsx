"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface LoginRecord {
  id: string;
  ip_address: string;
  country: string;
  city: string;
  user_agent: string;
  device_type: string;
  browser: string;
  os: string;
  is_suspicious: boolean;
  created_at: string;
}

export default function SecuritySettings() {
  const [logins, setLogins] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchLoginHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("login_history" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogins((data as any) || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load login history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoginHistory();
  }, []);

  const handleSignOutGlobal = async () => {
    if (!confirm("Are you sure you want to sign out of all devices? You will be signed out of this device too.")) {
      return;
    }

    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
      toast.success("Successfully signed out of all devices!");
      window.location.href = "/auth/signin";
    } catch (err: any) {
      toast.error(err.message || "Failed to sign out globally.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[var(--color-border)] pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Security & Active Sessions
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Manage your authenticated sessions and view your recent sign-in history.
          </p>
        </div>
        <button
          onClick={handleSignOutGlobal}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 py-2.5 rounded-md transition-all scale-active cursor-pointer"
        >
          Sign Out of All Devices
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">
          Recent Sign-in Activity
        </h3>

        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 bg-[var(--color-surface-2)] rounded-lg" />
            ))}
          </div>
        ) : logins.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)] italic">
            No sign-in records found.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface-2)] border-b border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] font-medium">
                  <th className="p-4">Device / OS</th>
                  <th className="p-4">Browser</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {logins.map((record, index) => (
                  <tr
                    key={record.id}
                    className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]/50 transition-colors"
                  >
                    <td className="p-4 flex items-center gap-2">
                      <span className="text-lg">
                        {record.device_type === "mobile" ? "📱" : record.device_type === "tablet" ? "🖳" : "💻"}
                      </span>
                      <div>
                        <p className="font-semibold text-[var(--color-text-primary)]">
                          {record.os}
                        </p>
                        {index === 0 && (
                          <span className="inline-block text-[9px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-full font-medium">
                            Current Session
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">{record.browser}</td>
                    <td className="p-4 font-mono">{record.ip_address}</td>
                    <td className="p-4">
                      {record.city}, {record.country}
                    </td>
                    <td className="p-4">
                      {new Date(record.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="p-4">
                      {record.is_suspicious ? (
                        <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-medium">
                          Suspicious
                        </span>
                      ) : (
                        <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-medium">
                          Verified
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
