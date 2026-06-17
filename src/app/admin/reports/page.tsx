"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, Check, X, ShieldAlert, FileText, Search } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminReportsPage() {
  const supabase = createClient();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "resolved" | "dismissed">("all");

  async function fetchReports() {
    setLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select(`
        *,
        reporter:profiles!reports_reporter_id_fkey(*),
        reported:profiles!reports_reported_user_id_fkey(*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load reports.");
    } else {
      setReports(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    setActionLoading(true);
    const { error } = await supabase
      .from("reports")
      .update({ status: newStatus })
      .eq("id", reportId);

    if (error) {
      toast.error("Failed to update status.");
    } else {
      toast.success(`Report status marked as ${newStatus}.`);
      fetchReports();
    }
    setActionLoading(false);
  };

  const handleSuspendUser = async (userId: string, reportId: string) => {
    const confirm = window.confirm("Suspend this reported user account?");
    if (!confirm) return;

    setActionLoading(true);
    const { error: suspendError } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", userId);

    if (suspendError) {
      toast.error("Failed to suspend user.");
      setActionLoading(false);
      return;
    }

    const { error: reportError } = await supabase
      .from("reports")
      .update({ status: "resolved", admin_note: "User suspended by administrator" })
      .eq("id", reportId);

    if (reportError) {
      toast.error("User suspended, but report status update failed.");
    } else {
      toast.success("User suspended and report marked as resolved.");
      fetchReports();
    }
    setActionLoading(false);
  };

  const filteredReports = reports.filter((r) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[#0d0d0d] rounded-lg" />
        <div className="h-96 bg-[#0d0d0d] rounded-2xl" />
      </div>
    );
  }

  const filters: ("all" | "open" | "resolved" | "dismissed")[] = ["all", "open", "resolved", "dismissed"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef] font-sans">
          Platform Reports
        </h1>
        <p className="text-xs text-[rgba(251,251,239,0.6)]">
          Moderate reported collaboration campaigns or user behavioral complaints
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 pb-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all scale-active ${
              filter === f
                ? "bg-[#fbfbef] text-black font-bold"
                : "bg-[#0d0d0d] text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)] hover:border-[rgba(251,251,239,0.3)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Reports Table */}
      <div className="rounded-2xl border border-[rgba(251,251,239,0.2)] bg-[#0d0d0d] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[rgba(251,251,239,0.1)] text-[rgba(251,251,239,0.4)] uppercase font-semibold">
              <th className="p-4">Reporter</th>
              <th className="p-4">Reported Account</th>
              <th className="p-4">Reason</th>
              <th className="p-4">Created Date</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(251,251,239,0.05)]">
            {filteredReports.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-[rgba(251,251,239,0.4)]">
                  No reports logged under the selected state.
                </td>
              </tr>
            ) : (
              filteredReports.map((rep) => (
                <tr key={rep.id} className="hover:bg-[#141414]/30 transition-colors">
                  {/* Reporter */}
                  <td className="p-4 font-bold text-[#fbfbef]">
                    {rep.reporter?.display_name || "Unknown"}
                    <span className="text-[10px] text-[rgba(251,251,239,0.4)] block font-normal uppercase mt-0.5">
                      {rep.reporter?.role}
                    </span>
                  </td>

                  {/* Reported User */}
                  <td className="p-4 font-semibold text-[#fbfbef]">
                    {rep.reported?.display_name || "Campaign owner"}
                    <span className="text-[10px] text-[rgba(251,251,239,0.4)] block font-normal uppercase mt-0.5">
                      {rep.reported?.role}
                    </span>
                  </td>

                  {/* Reason */}
                  <td className="p-4 max-w-xs">
                    <div className="font-semibold text-[#fbfbef]">{rep.reason}</div>
                    {rep.description && (
                      <p className="text-[10px] text-[rgba(251,251,239,0.6)] mt-0.5 line-clamp-2">
                        {rep.description}
                      </p>
                    )}
                  </td>

                  {/* Date */}
                  <td className="p-4 text-[rgba(251,251,239,0.6)]">
                    {new Date(rep.created_at).toLocaleDateString()}
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                      rep.status === "open"
                        ? "bg-[#facc15] text-black"
                        : rep.status === "resolved"
                        ? "bg-[#4ade80] text-black"
                        : "bg-[rgba(251,251,239,0.2)] text-[rgba(251,251,239,0.8)]"
                    }`}>
                      {rep.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right flex justify-end gap-1.5">
                    <Link
                      href={`/admin/reports/${rep.id}`}
                      className="p-1.5 rounded-full border border-[rgba(251,251,239,0.1)] text-[#fbfbef] hover:bg-[#1c1c1c] scale-active"
                      title="Inspect Report Case"
                    >
                      <FileText className="size-3.5" />
                    </Link>

                    {rep.status === "open" && (
                      <>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(rep.id, "resolved")}
                          className="p-1.5 rounded-full border border-[rgba(251,251,239,0.1)] text-[#4ade80] hover:bg-[#142614] scale-active"
                          title="Mark Resolved"
                        >
                          <Check className="size-3.5" />
                        </button>
                        <button
                          disabled={actionLoading}
                          onClick={() => handleUpdateStatus(rep.id, "dismissed")}
                          className="p-1.5 rounded-full border border-[rgba(251,251,239,0.1)] text-[rgba(251,251,239,0.6)] hover:bg-[#1c1c1c] scale-active"
                          title="Dismiss Report"
                        >
                          <X className="size-3.5" />
                        </button>
                        {rep.reported_user_id && (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleSuspendUser(rep.reported_user_id, rep.id)}
                            className="p-1.5 rounded-full border border-[rgba(251,251,239,0.1)] text-[#f87171] hover:bg-[#261414] scale-active"
                            title="Suspend User Account"
                          >
                            <ShieldAlert className="size-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
