"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, Search, Shield, Filter, Calendar } from "lucide-react";
import toast from "react-hot-toast";

interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  actor?: {
    display_name: string;
    role: string;
  } | null;
}

export default function AuditLogsPage() {
  const supabase = createClient() as any;
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select(`
          *,
          actor:profiles!actor_id (
            display_name,
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (filterAction !== "all") {
        query = query.eq("action", filterAction);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data || [];
      if (search.trim()) {
        const queryLower = search.toLowerCase();
        filtered = filtered.filter((log: any) => {
          return (
            log.action.toLowerCase().includes(queryLower) ||
            log.actor?.display_name.toLowerCase().includes(queryLower) ||
            (log.target_type && log.target_type.toLowerCase().includes(queryLower))
          );
        });
      }

      setLogs(filtered);
    } catch (error: any) {
      toast.error(error.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [filterAction, search]);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  // Extract unique actions to build filter options
  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));

  return (
    <div className="space-y-8 text-[#fbfbef]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(251,251,239,0.1)] pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Audit Logs</h1>
          <p className="text-sm text-[rgba(251,251,239,0.6)]">
            Trace administrative actions, user permissions changes, and critical security events.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#0d0d0d] border border-[rgba(251,251,239,0.15)] rounded-full px-4 py-2 text-xs font-semibold text-green-500">
          <Shield className="size-4" />
          <span>Write-Once Audit Gate</span>
        </div>
      </div>

      {/* Filters and search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0d0d0d] p-4 rounded-xl border border-[rgba(251,251,239,0.1)]">
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 size-4 text-[rgba(251,251,239,0.4)]" />
          <input
            type="text"
            placeholder="Search by action, user display name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl pl-10 pr-4 py-3 text-xs text-[#fbfbef] outline-none focus:border-[#fbfbef] transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="size-4 text-[rgba(251,251,239,0.4)]" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl px-4 py-3 text-xs text-[#fbfbef] outline-none focus:border-[#fbfbef]"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="flex items-center justify-center gap-2 bg-[#141414] border border-[rgba(251,251,239,0.15)] hover:bg-[#1c1c1c] rounded-xl px-4 py-3 text-xs font-bold transition-all"
        >
          <Calendar className="size-4 text-[rgba(251,251,239,0.5)]" />
          <span>Reload History</span>
        </button>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[rgba(251,251,239,0.2)] border-t-[#fbfbef]" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center border border-dashed border-[rgba(251,251,239,0.15)] rounded-2xl p-6 text-center">
          <FileText className="size-12 text-[rgba(251,251,239,0.3)] mb-4" />
          <h3 className="font-bold text-lg text-[rgba(251,251,239,0.8)]">No audit entries</h3>
          <p className="text-xs text-[rgba(251,251,239,0.5)] max-w-sm mt-1">
            There are no logs in the audit trail matching your active filters.
          </p>
        </div>
      ) : (
        <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.1)] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[rgba(251,251,239,0.08)] bg-black/40 text-[11px] font-bold uppercase tracking-wider text-[rgba(251,251,239,0.5)]">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">Actor</th>
                  <th className="py-4 px-6">Action</th>
                  <th className="py-4 px-6">Target</th>
                  <th className="py-4 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(251,251,239,0.05)]">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-white/[0.02] transition-colors text-xs text-[rgba(251,251,239,0.8)]">
                        <td className="py-4 px-6 whitespace-nowrap text-[rgba(251,251,239,0.55)] font-mono">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-0.5">
                            <span className="font-bold text-[#fbfbef]">
                              {log.actor?.display_name || "System"}
                            </span>
                            <span className="text-[10px] text-[rgba(251,251,239,0.45)] block uppercase tracking-wider">
                              {log.actor_role || "automated"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="bg-[#141414] text-yellow-500 font-mono text-[11px] px-2.5 py-1 rounded-full border border-yellow-500/10">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {log.target_type ? (
                            <span className="text-[rgba(251,251,239,0.6)] font-semibold">
                              {log.target_type}
                            </span>
                          ) : (
                            <span className="text-[rgba(251,251,239,0.3)] italic">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => toggleExpand(log.id)}
                            className="text-[11px] text-[rgba(251,251,239,0.6)] hover:text-[#fbfbef] hover:underline font-bold transition-all"
                          >
                            {isExpanded ? "Hide Payloads" : "Inspect"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-black/60">
                          <td colSpan={5} className="py-5 px-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs border border-[rgba(251,251,239,0.08)] rounded-xl p-4 bg-[#080808]">
                              <div className="space-y-2">
                                <h4 className="font-bold text-[rgba(251,251,239,0.5)] uppercase tracking-wider text-[10px]">Client Metadata</h4>
                                <ul className="space-y-1 font-mono text-[11px] text-[rgba(251,251,239,0.7)]">
                                  <li>IP Address: {log.ip_address || "Unknown"}</li>
                                  <li className="break-all">User Agent: {log.user_agent || "Unknown"}</li>
                                  <li>Target ID: {log.target_id || "None"}</li>
                                </ul>
                              </div>
                              <div className="space-y-2">
                                <h4 className="font-bold text-[rgba(251,251,239,0.5)] uppercase tracking-wider text-[10px]">Payload Parameters</h4>
                                <pre className="bg-black border border-[rgba(251,251,239,0.06)] rounded-lg p-3 text-[10px] text-green-400 font-mono overflow-x-auto max-w-full">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import React from "react";
