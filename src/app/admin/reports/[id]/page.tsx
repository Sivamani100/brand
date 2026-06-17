"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, User, AlertOctagon, CheckCircle2, ShieldAlert, X, Save } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminReportDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  async function loadReportData() {
    if (!id) return;
    setLoading(true);
    const reportId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";

    const { data, error } = await supabase
      .from("reports")
      .select(`
        *,
        reporter:profiles!reports_reporter_id_fkey(display_name, avatar_url, role),
        reported:profiles!reports_reported_user_id_fkey(display_name, avatar_url, role, is_active)
      `)
      .eq("id", reportId)
      .single();

    if (error || !data) {
      toast.error("Report case not found.");
      router.push("/admin/reports");
      return;
    }

    setReport(data);
    setAdminNote(data.admin_note || "");
    setLoading(false);
  }

  useEffect(() => {
    loadReportData();
  }, [id]);

  const handleSaveNote = async () => {
    if (!report) return;
    setActionLoading(true);

    const { error } = await supabase
      .from("reports")
      .update({ admin_note: adminNote, status: "reviewed" })
      .eq("id", report.id);

    if (error) {
      toast.error("Failed to save admin note.");
    } else {
      toast.success("Admin notes saved. Report marked as Reviewed.");
      loadReportData();
    }
    setActionLoading(false);
  };

  const handleResolve = async (newStatus: "resolved" | "dismissed") => {
    if (!report) return;
    setActionLoading(true);

    const { error } = await supabase
      .from("reports")
      .update({ admin_note: adminNote, status: newStatus })
      .eq("id", report.id);

    if (error) {
      toast.error(`Failed to mark report as ${newStatus}.`);
    } else {
      toast.success(`Report case marked as ${newStatus}.`);
      loadReportData();
    }
    setActionLoading(false);
  };

  const handleSuspendUser = async () => {
    if (!report || !report.reported) return;
    const confirm = window.confirm(`Are you sure you want to suspend user ${report.reported.display_name}?`);
    if (!confirm) return;

    setActionLoading(true);

    // 1. Suspend User Profile
    const { error: userError } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", report.reported_user_id);

    if (userError) {
      toast.error("Failed to suspend user.");
      setActionLoading(false);
      return;
    }

    // 2. Resolve Report
    const { error: reportError } = await supabase
      .from("reports")
      .update({ admin_note: adminNote + "\n[Action taken: User suspended]", status: "resolved" })
      .eq("id", report.id);

    if (reportError) {
      toast.error("User suspended, but failed to close report status.");
    } else {
      toast.success("User suspended and report case resolved.");
      loadReportData();
    }

    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center bg-black text-[#fbfbef]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[rgba(251,251,239,0.2)] border-t-[#fbfbef]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Back link */}
      <div>
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[rgba(251,251,239,0.6)] hover:text-[#fbfbef] transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Reports List</span>
        </Link>
      </div>

      {/* Case Header */}
      <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <AlertOctagon className="size-10 text-[#f87171]" />
          <div>
            <h1 className="text-xl font-bold font-sans">Report Case Details</h1>
            <p className="text-xs text-[rgba(251,251,239,0.6)] mt-1">
              Case Reference: {report.id} • Reason: <span className="font-semibold text-[#fbfbef]">{report.reason}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
            report.status === "resolved"
              ? "bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30"
              : report.status === "dismissed"
              ? "bg-[rgba(251,251,239,0.1)] text-[rgba(251,251,239,0.6)]"
              : "bg-[#f87171]/20 text-[#f87171] border border-[#f87171]/30"
          }`}>
            {report.status}
          </span>
        </div>
      </div>

      {/* Main Grid Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Context Card */}
          <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-6 space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[rgba(251,251,239,0.4)]">
                Complaint Description
              </h3>
              <p className="text-sm text-[rgba(251,251,239,0.8)] leading-relaxed mt-2 whitespace-pre-wrap">
                {report.description || "No description provided."}
              </p>
            </div>

            {report.card_id && (
              <div className="border-t border-[rgba(251,251,239,0.05)] pt-4">
                <span className="text-[10px] uppercase font-bold text-[rgba(251,251,239,0.4)] block mb-1">
                  Reported Campaign Card ID
                </span>
                <Link
                  href={`/admin/cards/${report.card_id}`}
                  className="text-xs text-[#fbfbef] font-semibold underline"
                >
                  Inspect Campaign Card Details
                </Link>
              </div>
            )}
          </div>

          {/* Admin Note Section */}
          <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[rgba(251,251,239,0.4)] flex items-center gap-1.5">
              <Save className="size-4" /> Admin Action Logs & Notes
            </h3>
            <p className="text-xs text-[rgba(251,251,239,0.6)]">
              Document internal investigation steps, audit remarks, and actions taken before closing the ticket.
            </p>
            <textarea
              rows={4}
              className="w-full rounded-xl bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-xs text-[#fbfbef] placeholder-e.g. Verified reported cards contain spam. Notified user... outline-none"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
            <div className="flex justify-end pt-2">
              <button
                disabled={actionLoading}
                onClick={handleSaveNote}
                className="rounded-full bg-[#1c1c1c] border border-[rgba(251,251,239,0.2)] hover:bg-[#262626] text-[#fbfbef] px-5 py-2 text-xs font-semibold scale-active transition-all"
              >
                Save Action Log Note
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Parties involved & Case resolution */}
        <div className="space-y-6">
          {/* Parties Card */}
          <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[rgba(251,251,239,0.4)]">
              Involved Parties
            </h3>

            {/* Reporter */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-bold text-[rgba(251,251,239,0.4)] block">Reporter</span>
              <div className="flex items-center gap-2 text-xs">
                <div className="size-6 rounded-full border border-[rgba(251,251,239,0.1)] bg-black overflow-hidden flex items-center justify-center flex-shrink-0">
                  {report.reporter?.avatar_url ? (
                    <img src={report.reporter.avatar_url} alt="Reporter" className="h-full w-full object-cover" />
                  ) : (
                    <User className="size-3.5" />
                  )}
                </div>
                <div>
                  <Link href={`/admin/users/${report.reporter_id}`} className="font-bold text-[#fbfbef] hover:underline">
                    {report.reporter?.display_name || "Unknown"}
                  </Link>
                  <span className="text-[9px] text-[rgba(251,251,239,0.4)] block uppercase">
                    {report.reporter?.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Reported */}
            <div className="space-y-2 pt-3 border-t border-[rgba(251,251,239,0.05)]">
              <span className="text-[9px] uppercase font-bold text-[rgba(251,251,239,0.4)] block">Reported Account</span>
              <div className="flex items-center gap-2 text-xs">
                <div className="size-6 rounded-full border border-[rgba(251,251,239,0.1)] bg-black overflow-hidden flex items-center justify-center flex-shrink-0">
                  {report.reported?.avatar_url ? (
                    <img src={report.reported.avatar_url} alt="Reported" className="h-full w-full object-cover" />
                  ) : (
                    <User className="size-3.5" />
                  )}
                </div>
                <div>
                  <Link href={`/admin/users/${report.reported_user_id}`} className="font-bold text-[#fbfbef] hover:underline">
                    {report.reported?.display_name || "Unknown"}
                  </Link>
                  <span className="text-[9px] text-[rgba(251,251,239,0.4)] block uppercase">
                    {report.reported?.role} • {report.reported?.is_active ? "Active" : "Suspended"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Panel */}
          {report.status !== "resolved" && report.status !== "dismissed" && (
            <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-6 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[rgba(251,251,239,0.4)]">
                Case Resolutions
              </h3>

              <div className="flex flex-col gap-2.5">
                <button
                  disabled={actionLoading}
                  onClick={() => handleResolve("resolved")}
                  className="w-full rounded-full bg-[#fbfbef] text-black font-bold py-2.5 text-xs flex items-center justify-center gap-1.5 scale-active hover:opacity-90 transition-opacity"
                >
                  <CheckCircle2 className="size-4" />
                  <span>Mark Case Resolved</span>
                </button>
                {report.reported?.is_active && (
                  <button
                    disabled={actionLoading}
                    onClick={handleSuspendUser}
                    className="w-full rounded-full bg-[#f87171] text-black font-bold py-2.5 text-xs flex items-center justify-center gap-1.5 scale-active hover:opacity-90 transition-opacity"
                  >
                    <ShieldAlert className="size-4" />
                    <span>Suspend Reported User</span>
                  </button>
                )}
                <button
                  disabled={actionLoading}
                  onClick={() => handleResolve("dismissed")}
                  className="w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] hover:bg-[#1c1c1c] text-[#fbfbef] font-bold py-2.5 text-xs flex items-center justify-center gap-1.5 scale-active transition-colors"
                >
                  <X className="size-4" />
                  <span>Dismiss Complaint</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
