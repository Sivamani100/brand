"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { ArrowLeft, Award, Calendar, Link2, Check, Send, AlertCircle, FileText, ChevronRight, X, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: "📸",
  YouTube: "🎥",
  TikTok: "🎵",
  "Twitter/X": "🐦",
  LinkedIn: "💼",
};

export default function InfluencerCardDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const supabase = createClient();

  const [card, setCard] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Application Modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyStep, setApplyStep] = useState(1);
  const [pitch, setPitch] = useState("");
  const [portfolioLinks, setPortfolioLinks] = useState<string[]>([]);
  const [currentLink, setCurrentLink] = useState("");
  const [proposedRate, setProposedRate] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const handleImprovePitch = async () => {
    if (!pitch.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pitch_message", content: pitch })
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else if (data.text) {
        setPitch(data.text);
        toast.success("Pitch optimized with AI!");
      }
    } catch (e) {
      toast.error("AI assistant failed to communicate.");
    }
    setAiLoading(false);
  };

  async function loadData() {
    if (!id || !user) return;
    setLoading(true);

    const cardId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";

    const { data: cardData, error } = await supabase
      .from("cards")
      .select(`
        *,
        brand:profiles!cards_brand_id_fkey(*)
      `)
      .eq("id", cardId)
      .single();

    if (error) {
      toast.error("Failed to load campaign.");
      router.push("/dashboard/influencer/discover");
      return;
    }

    const { data: appData } = await supabase
      .from("applications")
      .select("*")
      .eq("card_id", cardId)
      .eq("influencer_id", user.id)
      .maybeSingle();

    setCard(cardData);
    setApplication(appData);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [id, user]);

  const handleAddLink = () => {
    if (!currentLink.trim()) return;
    if (portfolioLinks.length >= 5) {
      toast.error("Maximum 5 links allowed.");
      return;
    }
    setPortfolioLinks((prev) => [...prev, currentLink.trim()]);
    setCurrentLink("");
  };

  const handleRemoveLink = (idx: number) => {
    setPortfolioLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleApplySubmit = async () => {
    if (pitch.length < 100) {
      toast.error("Pitch message must be at least 100 characters.");
      return;
    }

    setActionLoading(true);

    const { data, error } = await supabase
      .from("applications")
      .insert({
        card_id: card.id,
        influencer_id: user.id,
        pitch_message: pitch,
        portfolio_links: portfolioLinks,
        proposed_rate: proposedRate || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message || "Failed to submit application.");
      setActionLoading(false);
      return;
    }

    // Send notification to brand
    await supabase.from("notifications").insert({
      user_id: card.brand_id,
      type: "new_application",
      title: "New application received",
      body: `${profileName()} applied to '${card.title}'`,
      reference_id: data.id,
      reference_type: "application",
    });

    toast.success("Application submitted successfully!");
    setShowApplyModal(false);
    setActionLoading(false);
    loadData();
  };

  const profileName = () => user?.email || "An Influencer";

  const handleWithdraw = async () => {
    const confirm = window.confirm("Are you sure you want to withdraw your application? This action cannot be undone.");
    if (!confirm) return;

    setActionLoading(true);
    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("id", application.id);

    if (error) {
      toast.error("Failed to withdraw application.");
      setActionLoading(false);
      return;
    }

    toast.success("Application withdrawn.");
    setApplication(null);
    setActionLoading(false);
    loadData();
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-36 bg-surface rounded-lg" />
        <div className="h-96 bg-surface rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Back link */}
      <div>
        <Link
          href="/dashboard/influencer/discover"
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Discover</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Full Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-surface border border-border-strong overflow-hidden">
            {card.cover_image_url && (
              <div className="aspect-video w-full relative">
                <img src={card.cover_image_url} alt="Cover" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="p-6 md:p-8 space-y-6">
              {/* Brand Meta */}
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full border border-border-strong bg-bg overflow-hidden flex items-center justify-center">
                  {card.brand?.avatar_url ? (
                    <img src={card.brand.avatar_url} alt="Brand avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-invert-text bg-accent size-full flex items-center justify-center">
                      {card.brand?.display_name[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                    {card.brand?.display_name}
                    {card.brand?.is_verified && (
                      <span className="text-[10px] text-invert-text bg-accent rounded-full size-4 flex items-center justify-center font-bold">
                        ✓
                      </span>
                    )}
                  </h4>
                  <span className="text-[10px] text-text-muted">
                    Posted on {new Date(card.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div>
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-[9px] font-bold text-invert-text uppercase">
                  {card.category}
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary mt-2 font-sans">
                  {card.title}
                </h1>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  Campaign Brief
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed mt-2 whitespace-pre-wrap">
                  {card.description}
                </p>
              </div>

              {/* Niche Tags */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase text-text-muted font-semibold">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {card.niche_tags?.map((tag: string) => (
                    <span key={tag} className="rounded-full bg-surface-2 border border-border px-3 py-1.5 text-xs text-text-primary">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Action Sidebar / Panel */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-surface border border-border-strong p-6 space-y-6">
            <h3 className="text-lg font-bold text-text-primary">Campaign Info</h3>

            <div className="space-y-4 text-xs">
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-text-muted">Budget Range</span>
                <span className="text-text-primary font-bold">{card.budget_range}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-text-muted">Timeline</span>
                <span className="text-text-primary font-semibold">{card.timeline}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-text-muted">Followers Req.</span>
                <span className="text-text-primary font-semibold">{card.min_followers?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-3">
                <span className="text-text-muted">Deadline</span>
                <span className="text-text-primary font-semibold">{new Date(card.application_deadline).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Platforms</span>
              <div className="flex gap-2">
                {card.platform_requirements?.map((p: string) => (
                  <span key={p} className="rounded-full bg-surface-2 border border-border px-3 py-1.5 text-xs text-text-primary flex items-center gap-1.5">
                    <span>{PLATFORM_ICONS[p]}</span>
                    <span>{p}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-text-muted block">Deliverables</span>
              <div className="flex flex-col gap-1.5">
                {card.deliverables?.map((del: string, i: number) => (
                  <span key={i} className="text-xs text-text-secondary">
                    • {del}
                  </span>
                ))}
              </div>
            </div>

            {/* Dynamic Application Action pill status */}
            <div className="pt-4 border-t border-border">
              {!application ? (
                <button
                  onClick={() => {
                    setApplyStep(1);
                    setPitch("");
                    setPortfolioLinks([]);
                    setShowApplyModal(true);
                  }}
                  className="w-full rounded-full bg-accent text-invert-text font-bold py-3 text-sm scale-active text-center block hover:opacity-90 transition-opacity"
                >
                  Apply in 2 Steps
                </button>
              ) : application.status === "pending" ? (
                <div className="space-y-3">
                  <div className="w-full rounded-full bg-[#facc15]/20 text-[#facc15] border border-[#facc15] font-semibold py-2 text-center text-xs">
                    Application Pending
                  </div>
                  <button
                    disabled={actionLoading}
                    onClick={handleWithdraw}
                    className="w-full text-center text-xs text-text-secondary hover:text-[#f87171] underline block"
                  >
                    Withdraw Application
                  </button>
                </div>
              ) : application.status === "accepted" ? (
                <Link
                  href="/dashboard/influencer/chats"
                  className="w-full rounded-full bg-[#4ade80] text-black font-bold py-3 text-sm scale-active text-center block hover:opacity-95"
                >
                  Go to Chat
                </Link>
              ) : (
                <div className="rounded-xl bg-[#f87171]/10 border border-[#f87171]/30 p-4 space-y-2">
                  <span className="text-xs font-bold text-[#f87171] block">Not Selected</span>
                  {application.brand_note && (
                    <p className="text-[11px] text-text-secondary italic">
                      &ldquo;{application.brand_note}&rdquo;
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Two Step Apply Drawer/Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface p-6 md:p-8 border border-border-strong shadow-glow space-y-6 relative">
            <button
              onClick={() => setShowApplyModal(false)}
              className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
            >
              <X className="size-5" />
            </button>

            {/* Header */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Step {applyStep} of 2
              </span>
              <h3 className="text-xl font-bold text-text-primary mt-1 font-sans">
                {applyStep === 1 ? "Pitch your collaboration" : "Portfolio & Details"}
              </h3>
            </div>

            {/* STEP 1: PITCH MESSAGE */}
            {applyStep === 1 && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] uppercase font-bold text-text-muted">
                      Pitch Message (Min 100, Max 1000 characters)
                    </label>
                    <button
                      type="button"
                      disabled={aiLoading || !pitch.trim()}
                      onClick={handleImprovePitch}
                      className="text-[9px] font-extrabold text-invert-text bg-accent rounded-full px-2 py-1 hover:opacity-90 disabled:opacity-50 flex items-center gap-1 scale-active transition-all"
                    >
                      <Sparkles className="size-2.5" />
                      <span>{aiLoading ? "Improving..." : "Improve Pitch"}</span>
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    required
                    className="w-full rounded-2xl bg-surface-2 border border-border-strong px-4 py-3 text-xs text-text-primary placeholder-text-muted input-focus-animate"
                    placeholder="Describe your audience, your content style, and why this collaboration excites you."
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value)}
                  />
                  <div className="flex justify-between text-[10px] text-text-muted mt-1">
                    <span>{pitch.length} / 1000 characters</span>
                    {pitch.length < 100 && <span className="text-[#f87171]">Needs {100 - pitch.length} more characters</span>}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    disabled={pitch.length < 100}
                    onClick={() => setApplyStep(2)}
                    className="rounded-full bg-accent text-invert-text font-bold px-6 py-2.5 text-xs hover:opacity-90 disabled:opacity-50 scale-active flex items-center gap-1.5"
                  >
                    <span>Next step</span>
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: PORTFOLIO & PROPOSED RATE */}
            {applyStep === 2 && (
              <div className="space-y-4">
                {/* Portfolio URLs list */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                    Portfolio Links (Up to 5)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      className="flex-1 rounded-full bg-surface-2 border border-border-strong px-4 py-2 text-xs text-text-primary placeholder-text-muted input-focus-animate"
                      placeholder="e.g. instagram.com/p/my-post"
                      value={currentLink}
                      onChange={(e) => setCurrentLink(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddLink())}
                    />
                    <button
                      type="button"
                      onClick={handleAddLink}
                      className="rounded-full bg-surface-3 border border-border-strong px-4 text-xs font-semibold hover:opacity-90"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {portfolioLinks.map((link, idx) => (
                      <div
                        key={idx}
                        className="rounded-full bg-surface-2 border border-border px-3 py-1.5 text-[10px] text-text-primary flex items-center gap-2"
                      >
                        <span className="max-w-[150px] truncate">{link}</span>
                        <button type="button" onClick={() => handleRemoveLink(idx)} className="text-text-secondary hover:text-[#f87171]">
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">
                    Proposed Rate (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-full bg-surface-2 border border-border-strong px-4 py-3 text-xs text-text-primary placeholder-text-muted input-focus-animate"
                    placeholder="e.g. ₹15,000 or $200"
                    value={proposedRate}
                    onChange={(e) => setProposedRate(e.target.value)}
                  />
                  <span className="text-[10px] text-text-muted mt-1 block">Leave blank to discuss/negotiate.</span>
                </div>

                <div className="flex justify-between pt-4 border-t border-border">
                  <button
                    onClick={() => setApplyStep(1)}
                    className="rounded-full bg-surface-2 text-text-secondary border border-border px-5 py-2 text-xs font-semibold"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleApplySubmit}
                    disabled={actionLoading}
                    className="rounded-full bg-accent text-invert-text font-bold px-6 py-2 text-xs hover:opacity-90 disabled:opacity-50 scale-active flex items-center gap-1.5"
                  >
                    <Send className="size-3.5" />
                    <span>Submit Pitch</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
