"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Shield, Download, Trash2, Cookie, Check, RefreshCw, Info, AlertTriangle } from "lucide-react";

interface ExportRequest {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  download_url: string | null;
  expires_at: string;
  created_at: string;
}

export default function PrivacySettings() {
  const supabase = createClient() as any;
  const [exports, setExports] = useState<ExportRequest[]>([]);
  const [loadingExports, setLoadingExports] = useState(true);
  const [requestingExport, setRequestingExport] = useState(false);

  // Cookie states
  const [cookiePrefs, setCookiePrefs] = useState({
    essential: true,
    analytics: false,
    telemetry: false,
  });

  // Erasure modal states
  const [showErasureModal, setShowErasureModal] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");
  const [erasingAccount, setErasingAccount] = useState(false);



  const getCookie = (name: string) => {
    if (typeof document === "undefined") return null;
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  const setCookie = (name: string, value: string, days: number) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict;Secure`;
  };

  const fetchExportHistory = async () => {
    setLoadingExports(true);
    try {
      const res = await fetch("/api/support/export");
      if (!res.ok) throw new Error("Failed to load exports history");
      const data = await res.json();
      setExports(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingExports(false);
    }
  };

  // Read cookies on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const consentStr = getCookie("cookie_consent");
      if (consentStr) {
        try {
          const parsed = JSON.parse(consentStr);
          setCookiePrefs({
            essential: true,
            analytics: !!parsed.analytics,
            telemetry: !!parsed.telemetry,
          });
        } catch (_) {}
      }
    }
    fetchExportHistory();
  }, []);

  const handleSaveCookies = () => {
    setCookie("cookie_consent", JSON.stringify(cookiePrefs), 365);
    toast.success("Cookie preferences saved successfully!");
  };

  const handleRequestExport = async () => {
    setRequestingExport(true);
    try {
      const res = await fetch("/api/support/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to request data export");
      
      const newRequest = await res.json();
      toast.success("PII Data export compiled successfully!");
      setExports((prev) => [newRequest, ...prev]);
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate data export.");
    } finally {
      setRequestingExport(false);
    }
  };

  const handleErasureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmDeleteText !== "DELETE") {
      toast.error("Confirmation text must match DELETE exactly.");
      return;
    }

    setErasingAccount(true);
    try {
      const res = await fetch("/api/support/erasure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Deactivation request failed");
      }

      toast.success("Account deactivated. Queued for permanent erasure.");
      window.location.href = "/auth/suspended";
    } catch (err: any) {
      toast.error(err.message || "Failed to process account erasure.");
    } finally {
      setErasingAccount(false);
      setShowErasureModal(false);
    }
  };

  const dataMap = [
    { category: "Profile Details", data: "Display name, website, bio, company/niche tags, avatar", purpose: "Platform profile display", basis: "Contract fulfillment", retention: "Deleted immediately on erasure" },
    { category: "Campaign Cards", data: "Campaign text, platform requirements, budget range, deadlines", purpose: "Public matching listing", basis: "Contract fulfillment", retention: "Soft-deleted immediately, purged after 30 days" },
    { category: "Chats & Messages", data: "Chat rooms metadata, message texts, file attachments", purpose: "Peer communication feed", basis: "Contract fulfillment", retention: "Soft-deleted immediately, purged after 30 days" },
    { category: "Support Tickets", data: "Email address, category, subject description, admin replies", purpose: "Customer support delivery", basis: "Contract fulfillment", retention: "1 year for legal compliance" },
    { category: "Login History", data: "IP address, country/city, browser user agent, login times", purpose: "Security auditing & fraud prevent", basis: "Legitimate Interest", retention: "90 days sliding retention" },
  ];

  return (
    <div className="space-y-8 text-[var(--color-text-primary)]">
      {/* Title */}
      <div className="border-b border-[var(--color-border)] pb-4">
        <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
          GDPR Privacy Control Panel
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          Manage analytical cookies, request secure PII data exports, and exercise your Right to Erasure.
        </p>
      </div>

      {/* Grid panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cookie preferences card */}
        <div className="p-6 bg-[#0d0d0d] border border-[var(--color-border)] rounded-2xl space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
            <Cookie size={16} className="text-amber-500" /> Cookie Preferences
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            Customize which cookies we load on your client browser. Essential cookies are mandatory for login.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 bg-black rounded-lg border border-[var(--color-border)] text-xs">
              <div>
                <p className="font-bold">Essential Authentication</p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Provides security cookies & sessions.</p>
              </div>
              <span className="text-[10px] font-bold text-green-400 uppercase bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded">Always Active</span>
            </div>

            <label className="flex items-center justify-between p-3 bg-black hover:bg-[#141414]/30 rounded-lg border border-[var(--color-border)] cursor-pointer text-xs transition-colors">
              <div>
                <p className="font-bold">Analytical Tracking</p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Helps us monitor performance and views.</p>
              </div>
              <input
                type="checkbox"
                checked={cookiePrefs.analytics}
                onChange={(e) => setCookiePrefs((prev) => ({ ...prev, analytics: e.target.checked }))}
                className="w-4 h-4 accent-[var(--color-accent)]"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-black hover:bg-[#141414]/30 rounded-lg border border-[var(--color-border)] cursor-pointer text-xs transition-colors">
              <div>
                <p className="font-bold">Telemetry Logging</p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Captures exceptions and loading speeds.</p>
              </div>
              <input
                type="checkbox"
                checked={cookiePrefs.telemetry}
                onChange={(e) => setCookiePrefs((prev) => ({ ...prev, telemetry: e.target.checked }))}
                className="w-4 h-4 accent-[var(--color-accent)]"
              />
            </label>
          </div>

          <button
            onClick={handleSaveCookies}
            className="w-full bg-[var(--color-accent)] text-[var(--color-invert-text)] font-semibold text-xs py-2.5 rounded-full hover:opacity-90 transition-all scale-active cursor-pointer mt-2"
          >
            Save Cookie Preferences
          </button>
        </div>

        {/* Data export card */}
        <div className="p-6 bg-[#0d0d0d] border border-[var(--color-border)] rounded-2xl flex flex-col space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
            <Download size={16} className="text-blue-500" /> Export My Data (Article 15)
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            Download a secure JSON compilation containing all profile listings, card applications, chat logs, and ticket threads linked to your account.
          </p>

          <button
            onClick={handleRequestExport}
            disabled={requestingExport}
            className="w-full bg-[#141414] hover:bg-[#1c1c1c] text-[var(--color-text-primary)] border border-[var(--color-border)] font-semibold text-xs py-2.5 rounded-full transition-all scale-active cursor-pointer flex items-center justify-center gap-2"
          >
            {requestingExport ? (
              <>
                <RefreshCw size={14} className="animate-spin text-[var(--color-text-secondary)]" />
                Compiling Export File...
              </>
            ) : (
              <>
                <Download size={14} />
                Request JSON Export Link
              </>
            )}
          </button>

          {/* Export request history */}
          <div className="flex-1 flex flex-col justify-end pt-3">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-2">Export History (Expires in 24h)</span>
            <div className="max-h-[140px] overflow-y-auto space-y-2 pr-1 text-xs">
              {loadingExports ? (
                <p className="text-[10px] text-[var(--color-text-muted)] italic">Loading export list...</p>
              ) : exports.length === 0 ? (
                <p className="text-[10px] text-[var(--color-text-muted)] italic">No export requests submitted yet.</p>
              ) : (
                exports.map((exp) => (
                  <div key={exp.id} className="flex justify-between items-center p-2.5 bg-black border border-[var(--color-border)] rounded-lg">
                    <div>
                      <p className="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase">Export: {exp.id.substring(0, 8)}</p>
                      <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">Created: {new Date(exp.created_at).toLocaleDateString()}</p>
                    </div>
                    {exp.status === "completed" && exp.download_url ? (
                      <a
                        href={exp.download_url}
                        download
                        className="px-3 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded font-bold text-[10px] transition-all flex items-center gap-1"
                      >
                        <Download size={10} /> Download
                      </a>
                    ) : (
                      <span className="text-[9px] text-amber-500/80 font-bold uppercase">{exp.status}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* GDPR Data Map Documentation Table */}
      <div className="p-6 bg-[#0d0d0d] border border-[var(--color-border)] rounded-2xl space-y-4">
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-2 pb-2 border-b border-[var(--color-border)]">
          <Info size={16} className="text-blue-400" /> Platform PII Data Map
        </h3>
        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
          The table below maps the categories of Personal Identifiable Information (PII) processed on our servers, their business purpose, and the maximum retention limits under our GDPR policy.
        </p>

        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full border-collapse text-xs text-left bg-black">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[#0d0d0d] font-bold text-[var(--color-text-secondary)]">
                <th className="p-3">Data Category</th>
                <th className="p-3">Specific Fields</th>
                <th className="p-3">Purpose</th>
                <th className="p-3">Legal Basis</th>
                <th className="p-3">Retention Period</th>
              </tr>
            </thead>
            <tbody>
              {dataMap.map((item, index) => (
                <tr key={index} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[#0d0d0d]/40">
                  <td className="p-3 font-bold">{item.category}</td>
                  <td className="p-3 text-[var(--color-text-secondary)] leading-normal">{item.data}</td>
                  <td className="p-3 text-[var(--color-text-secondary)]">{item.purpose}</td>
                  <td className="p-3 text-neutral-400 font-mono text-[10px]">{item.basis}</td>
                  <td className="p-3 text-green-400 font-medium">{item.retention}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Erasure card */}
      <div className="p-6 border border-red-500/20 bg-red-950/5 rounded-2xl space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-red-500 size-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-red-400 uppercase tracking-wider">
              Right to Erasure (Article 17)
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Permanently delete your account display details, campaign history, portfolio items, and attachments. This deactivates your profile and initiates an irreversible 30-day soft-delete purge process.
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-start">
          <button
            onClick={() => setShowErasureModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 rounded-full transition-all scale-active cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 size={14} />
            Erase Account & Personal Data
          </button>
        </div>
      </div>

      {/* Erasure confirmation Modal */}
      {showErasureModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d0d0d] border border-red-500/30 p-6 rounded-2xl space-y-5 shadow-2xl text-left">
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={18} /> Confirm Account Erasure
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                This action is irreversible. All of your campaign listings, cards, applications, and chat messages will be soft-deleted and permanently removed from our databases.
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] font-bold">
                Please type <span className="font-mono text-red-400 underline">DELETE</span> below to confirm deactivation:
              </p>
            </div>

            <form onSubmit={handleErasureSubmit} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Type DELETE..."
                className="w-full bg-black border border-red-500/20 rounded-full px-4 py-2.5 text-xs outline-none text-red-400 uppercase tracking-widest text-center"
                value={confirmDeleteText}
                onChange={(e) => setConfirmDeleteText(e.target.value)}
                disabled={erasingAccount}
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowErasureModal(false);
                    setConfirmDeleteText("");
                  }}
                  disabled={erasingAccount}
                  className="flex-1 bg-[#141414] hover:bg-[#1c1c1c] text-[var(--color-text-secondary)] font-bold text-xs py-2.5 rounded-full border border-[var(--color-border)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={erasingAccount || confirmDeleteText !== "DELETE"}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-full cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {erasingAccount ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      Erasing...
                    </>
                  ) : (
                    <>
                      <Trash2 size={12} />
                      Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
