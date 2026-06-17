"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { Check, X, ShieldAlert, ShieldCheck, Clock, Plus, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function BrandVerificationPage() {
  const { user, profile } = useUser();
  const supabase = createClient();

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [notes, setNotes] = useState("");
  const [links, setLinks] = useState<string[]>([""]);

  async function fetchRequest() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("verification_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      toast.error("Failed to load verification status.");
    } else {
      setRequest(data);
      if (data) {
        setNotes(data.notes || "");
        setLinks(data.submitted_links && data.submitted_links.length > 0 ? data.submitted_links : [""]);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    if (user) {
      fetchRequest();
    }
  }, [user]);

  const handleAddLink = () => {
    setLinks([...links, ""]);
  };

  const handleRemoveLink = (index: number) => {
    const newLinks = [...links];
    newLinks.splice(index, 1);
    setLinks(newLinks.length === 0 ? [""] : newLinks);
  };

  const handleLinkChange = (index: number, val: string) => {
    const newLinks = [...links];
    newLinks[index] = val;
    setLinks(newLinks);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const filteredLinks = links.filter((l) => l.trim() !== "");
    if (filteredLinks.length === 0) {
      toast.error("Please provide at least one verification link (e.g. social profile or company registry).");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from("verification_requests")
      .insert({
        user_id: user.id,
        role: "brand",
        submitted_links: filteredLinks,
        notes,
        status: "pending"
      });

    if (error) {
      toast.error("Submission failed: " + error.message);
    } else {
      toast.success("Verification request submitted successfully.");
      fetchRequest();
    }
    setSubmitting(false);
  };

  // Requirements check
  const hasDisplayName = !!profile?.display_name && profile.display_name !== "";
  const hasAvatar = !!profile?.avatar_url;
  const hasCompany = !!profile?.company_name && profile.company_name !== "";
  const hasWebsite = !!profile?.website_url && profile.website_url !== "";
  const isEligible = hasDisplayName && hasAvatar && hasCompany && hasWebsite;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[#0d0d0d] rounded-lg" />
        <div className="h-64 bg-[#0d0d0d] rounded-2xl" />
      </div>
    );
  }

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
          Verification Badge
        </h1>
        <p className="text-xs text-[rgba(251,251,239,0.6)]">
          Submit proof of authenticity to get the verified checkmark badge.
        </p>
      </div>

      {/* Verified Status Card */}
      {profile?.is_verified ? (
        <div className="rounded-2xl border border-[rgba(74,222,128,0.2)] bg-[#051c0e] p-6 space-y-3 flex items-start gap-4">
          <ShieldCheck className="size-10 text-[#4ade80] flex-shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#4ade80]">Account Verified</h3>
            <p className="text-xs text-[rgba(251,251,239,0.7)] leading-relaxed">
              Your profile is verified. An official verification badge has been added to your profile. This enhances trust and visibility across the platform.
            </p>
          </div>
        </div>
      ) : request && request.status === "pending" ? (
        <div className="rounded-2xl border border-[rgba(250,204,21,0.2)] bg-[#1c1a05] p-6 space-y-3 flex items-start gap-4">
          <Clock className="size-10 text-[#facc15] flex-shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#facc15]">Verification Pending</h3>
            <p className="text-xs text-[rgba(251,251,239,0.7)] leading-relaxed">
              We have received your verification request. Our admin team is reviewing your documents and links. It typically takes 24-48 hours.
            </p>
            <div className="pt-2 text-[10px] text-[rgba(251,251,239,0.4)]">
              Submitted on {new Date(request.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      ) : request && request.status === "rejected" ? (
        <div className="rounded-2xl border border-[rgba(248,113,113,0.2)] bg-[#210505] p-6 space-y-4">
          <div className="flex items-start gap-4">
            <ShieldAlert className="size-10 text-[#f87171] flex-shrink-0" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#f87171]">Verification Rejected</h3>
              <p className="text-xs text-[rgba(251,251,239,0.7)] leading-relaxed">
                Your request was rejected during audit. See feedback from admin below.
              </p>
              {request.admin_note && (
                <div className="mt-2 p-3 bg-black border border-[rgba(251,251,239,0.1)] rounded-xl text-xs text-red-400 italic">
                  &ldquo;{request.admin_note}&rdquo;
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setRequest(null)}
            className="rounded-full bg-[#fbfbef] text-black hover:opacity-90 px-5 py-2.5 text-xs font-bold transition-all block text-center w-full"
          >
            Re-submit Application
          </button>
        </div>
      ) : (
        <>
          {/* Prerequisites Checklist */}
          <div className="rounded-2xl border border-[rgba(251,251,239,0.1)] bg-[#0d0d0d] p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#fbfbef]">Profile Prerequisites Checklist</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-[rgba(251,251,239,0.05)] pb-2">
                <span className="text-[rgba(251,251,239,0.6)]">Display Name configured</span>
                {hasDisplayName ? <Check className="size-4 text-[#4ade80]" /> : <X className="size-4 text-[#f87171]" />}
              </div>
              <div className="flex items-center justify-between text-xs border-b border-[rgba(251,251,239,0.05)] pb-2">
                <span className="text-[rgba(251,251,239,0.6)]">Avatar / Profile Picture uploaded</span>
                {hasAvatar ? <Check className="size-4 text-[#4ade80]" /> : <X className="size-4 text-[#f87171]" />}
              </div>
              <div className="flex items-center justify-between text-xs border-b border-[rgba(251,251,239,0.05)] pb-2">
                <span className="text-[rgba(251,251,239,0.6)]">Company Name configured</span>
                {hasCompany ? <Check className="size-4 text-[#4ade80]" /> : <X className="size-4 text-[#f87171]" />}
              </div>
              <div className="flex items-center justify-between text-xs pb-1">
                <span className="text-[rgba(251,251,239,0.6)]">Website URL added</span>
                {hasWebsite ? <Check className="size-4 text-[#4ade80]" /> : <X className="size-4 text-[#f87171]" />}
              </div>
            </div>
            {!isEligible && (
              <p className="text-[10px] text-[#f87171] leading-normal font-medium">
                Please complete your public profile settings first to unlock verification request submission.
              </p>
            )}
          </div>

          {/* Submission Form */}
          {isEligible && (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-[rgba(251,251,239,0.2)] bg-[#0d0d0d] p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#fbfbef] uppercase">Verification Links</label>
                <p className="text-[10px] text-[rgba(251,251,239,0.4)] leading-normal">
                  Provide links to your official website, verified social accounts (Instagram, LinkedIn), or business register documents.
                </p>
                <div className="space-y-2.5">
                  {links.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="url"
                        required
                        placeholder="https://example.com/brand-profile"
                        value={link}
                        onChange={(e) => handleLinkChange(idx, e.target.value)}
                        className="block w-full rounded-xl bg-black border border-[rgba(251,251,239,0.2)] px-4 py-2.5 text-xs text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                      />
                      {links.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLink(idx)}
                          className="p-2.5 text-[#f87171] hover:bg-[#261414] rounded-xl border border-[rgba(251,251,239,0.1)] scale-active transition-all"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="text-xs text-[#fbfbef] hover:underline flex items-center gap-1 font-bold pt-1.5"
                  >
                    <Plus className="size-3.5" />
                    <span>Add another link</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#fbfbef] uppercase">Additional Notes</label>
                <p className="text-[10px] text-[rgba(251,251,239,0.4)] leading-normal">
                  Describe your business or brand. Provide any extra context that will help our auditors approve your request.
                </p>
                <textarea
                  rows={4}
                  required
                  placeholder="Tell us about your organization or verification details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="block w-full rounded-xl bg-black border border-[rgba(251,251,239,0.2)] px-4 py-2.5 text-xs text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-[#fbfbef] text-black hover:opacity-90 px-6 py-3 text-xs font-extrabold transition-all w-full flex items-center justify-center gap-2 scale-active"
              >
                {submitting ? "Submitting..." : "Submit Verification Request"}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
