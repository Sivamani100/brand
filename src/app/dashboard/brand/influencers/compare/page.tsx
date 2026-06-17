"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  Check,
  Sparkles,
  MapPin,
  X,
  Send,
  Loader2,
  Trash,
  Info
} from "lucide-react";
import toast from "react-hot-toast";

interface ComparisonCreator {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  niche: string[] | null;
  platforms: string[] | null;
  follower_count: number | null;
  location: string | null;
  location_city: string | null;
  location_state: string | null;
  location_country: string | null;
  is_verified: boolean;
  Brand_score: number;
  availability_status: string;
  platform_data: any;
  avg_rating: number | null;
  review_count: number;
  avg_communication: number | null;
  avg_quality: number | null;
  avg_timeliness: number | null;
  avg_professionalism: number | null;
  avg_value: number | null;
  // Dynamic fields
  average_reply_time?: string;
  typical_rate_range?: string;
}

function ComparisonContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const { user, profile: currentUserProfile } = useUser();

  const [creators, setCreators] = useState<ComparisonCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandCards, setBrandCards] = useState<any[]>([]);

  // Invite modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [targetInfluencer, setTargetInfluencer] = useState<ComparisonCreator | null>(null);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const idsString = searchParams.get("ids");
    if (!idsString) {
      setLoading(false);
      return;
    }

    const ids = idsString.split(",").slice(0, 3); // max 3
    async function fetchCreators() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .in("id", ids)
          .eq("role", "influencer");

        if (error) throw error;
        setCreators((data as unknown as ComparisonCreator[]) || []);
      } catch (err) {
        console.error("Failed to fetch comparison creators", err);
        toast.error("Failed to load creators for comparison");
      } finally {
        setLoading(false);
      }
    }

    async function fetchBrandCards() {
      if (!user) return;
      const { data } = await supabase
        .from("cards")
        .select("*")
        .eq("brand_id", user.id)
        .eq("status", "active");
      setBrandCards(data || []);
    }

    fetchCreators();
    if (user) {
      fetchBrandCards();
    }
  }, [searchParams, user]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardId || !targetInfluencer || !user) return;
    setInviting(true);

    try {
      const { data: inviteData, error: inviteError } = await supabase
        .from("invites")
        .insert({
          card_id: selectedCardId,
          brand_id: user.id,
          influencer_id: targetInfluencer.id,
          message: inviteMessage || "Let's collaborate!",
          status: "pending",
        })
        .select()
        .single();

      if (inviteError) {
        if (inviteError.code === "23505") {
          toast.error("You have already invited this creator to this card.");
        } else {
          toast.error(inviteError.message);
        }
        setInviting(false);
        return;
      }

      // Create notification
      const selectedCampaign = brandCards.find((c) => c.id === selectedCardId);
      await supabase.from("notifications").insert({
        user_id: targetInfluencer.id,
        type: "direct_invite",
        title: "New Collaboration Invite! 🌟",
        body: `Brand "${currentUserProfile?.display_name || "A Brand"}" has invited you to apply for campaign "${selectedCampaign?.title}".`,
        reference_id: inviteData.id,
        reference_type: "card",
      });

      toast.success("Direct invite sent successfully!");
      setIsInviteModalOpen(false);
      setInviteMessage("");
      setSelectedCardId("");
      setTargetInfluencer(null);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to send invite.");
    } finally {
      setInviting(false);
    }
  };

  const getPlatformStat = (creator: ComparisonCreator, platform: string, metric: string) => {
    const data = creator.platform_data?.[platform.toLowerCase()];
    if (!data) return "—";
    
    if (metric === "followers") {
      const count = data.followers || 0;
      return count >= 1000000
        ? `${(count / 1000000).toFixed(1)}M`
        : count >= 1000
        ? `${(count / 1000).toFixed(0)}K`
        : count;
    }
    if (metric === "er") {
      return data.engagement_rate ? `${data.engagement_rate}%` : "—";
    }
    if (metric === "views") {
      const views = data.avg_views || data.avg_reel_views || 0;
      return views >= 1000000
        ? `${(views / 1000000).toFixed(1)}M`
        : views >= 1000
        ? `${(views / 1000).toFixed(0)}K`
        : views || "—";
    }
    return "—";
  };

  const removeCreator = (id: string) => {
    const newCreators = creators.filter((c) => c.id !== id);
    setCreators(newCreators);
    const newIds = newCreators.map((c) => c.id).join(",");
    if (newIds) {
      router.replace(`/dashboard/brand/influencers/compare?ids=${newIds}`);
    } else {
      router.replace("/dashboard/brand/influencers");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#fbfbef]" />
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center space-y-4">
        <p className="text-sm text-[rgba(251,251,239,0.6)]">No creators selected for comparison.</p>
        <Link
          href="/dashboard/brand/influencers"
          className="rounded-full bg-[#fbfbef] px-6 py-2.5 text-xs font-bold text-black"
        >
          Back to Discover
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/brand/influencers"
          className="flex items-center justify-center size-10 rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] text-[#fbfbef] hover:bg-[#1c1c1c] transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#fbfbef] font-sans">
            Compare Creators
          </h1>
          <p className="text-xs text-[rgba(251,251,239,0.6)]">
            Side-by-side analysis of performance, ratings, and locations
          </p>
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto rounded-2xl border border-[rgba(251,251,239,0.1)] bg-[#0d0d0d]">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[rgba(251,251,239,0.1)] bg-black/40">
              <th className="p-4 font-bold text-[rgba(251,251,239,0.6)] uppercase tracking-wider w-48 shrink-0">
                Metric
              </th>
              {creators.map((c) => (
                <th key={c.id} className="p-4 border-l border-[rgba(251,251,239,0.1)] relative min-w-[220px]">
                  <button
                    onClick={() => removeCreator(c.id)}
                    className="absolute top-4 right-4 text-[rgba(251,251,239,0.4)] hover:text-white p-1 rounded-full hover:bg-white/10"
                    title="Remove"
                  >
                    <X className="size-4" />
                  </button>
                  <div className="flex flex-col items-center text-center space-y-2 mt-4">
                    {c.avatar_url ? (
                      <img
                        src={c.avatar_url}
                        alt={c.display_name}
                        className="size-16 rounded-full object-cover border-2 border-[rgba(251,251,239,0.2)]"
                      />
                    ) : (
                      <div className="size-16 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold border-2 border-[rgba(251,251,239,0.2)]">
                        {c.display_name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-sm text-[#fbfbef] flex items-center justify-center gap-1">
                        {c.display_name}
                        {c.is_verified && <ShieldCheck className="size-4 text-[#38bdf8] fill-[#38bdf8]/10" />}
                      </h3>
                      <p className="text-[10px] text-[rgba(251,251,239,0.5)] mt-0.5 line-clamp-1 italic">
                        {c.niche?.join(" • ") || "No niches"}
                      </p>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(251,251,239,0.05)]">
            {/* Quick action button row */}
            <tr>
              <td className="p-4 font-semibold text-[rgba(251,251,239,0.5)]">Actions</td>
              {creators.map((c) => (
                <td key={c.id} className="p-4 border-l border-[rgba(251,251,239,0.1)] text-center">
                  <button
                    onClick={() => {
                      setTargetInfluencer(c);
                      setIsInviteModalOpen(true);
                    }}
                    className="w-full rounded-full bg-[#fbfbef] text-black hover:bg-[#eaeaea] py-2 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="size-3.5" />
                    Invite Creator
                  </button>
                </td>
              ))}
            </tr>

            {/* Location */}
            <tr>
              <td className="p-4 font-semibold text-[rgba(251,251,239,0.5)]">Location</td>
              {creators.map((c) => (
                <td key={c.id} className="p-4 border-l border-[rgba(251,251,239,0.1)]">
                  <div className="flex items-center justify-center gap-1 font-medium text-[#fbfbef]">
                    <MapPin className="size-3.5 text-red-400" />
                    <span>
                      {c.location_city && c.location_country
                        ? `${c.location_city}, ${c.location_country}`
                        : c.location || "Unknown"}
                    </span>
                  </div>
                </td>
              ))}
            </tr>

            {/* Followers / Reach */}
            <tr>
              <td className="p-4 font-semibold text-[rgba(251,251,239,0.5)]">Total Followers</td>
              {creators.map((c) => {
                const count = c.follower_count || 0;
                return (
                  <td key={c.id} className="p-4 border-l border-[rgba(251,251,239,0.1)] text-center font-bold text-sm text-[#fbfbef]">
                    {count >= 1000000
                      ? `${(count / 1000000).toFixed(1)}M`
                      : count >= 1000
                      ? `${(count / 1000).toFixed(0)}K`
                      : count}
                  </td>
                );
              })}
            </tr>

            {/* Platform breakdowns: Instagram */}
            <tr>
              <td className="p-4 font-semibold text-[rgba(251,251,239,0.5)] bg-black/10">Instagram Stats</td>
              {creators.map((c) => (
                <td key={c.id} className="p-4 border-l border-[rgba(251,251,239,0.1)] bg-black/10">
                  <div className="flex flex-col items-center space-y-1">
                    <div className="flex justify-between w-full max-w-[160px] text-[10px]">
                      <span className="text-[rgba(251,251,239,0.5)]">Followers</span>
                      <span className="font-semibold text-[#fbfbef]">{getPlatformStat(c, "Instagram", "followers")}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-[160px] text-[10px]">
                      <span className="text-[rgba(251,251,239,0.5)]">ER</span>
                      <span className="font-semibold text-[#fbfbef]">{getPlatformStat(c, "Instagram", "er")}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-[160px] text-[10px]">
                      <span className="text-[rgba(251,251,239,0.5)]">Avg Views</span>
                      <span className="font-semibold text-[#fbfbef]">{getPlatformStat(c, "Instagram", "views")}</span>
                    </div>
                  </div>
                </td>
              ))}
            </tr>

            {/* Platform breakdowns: YouTube */}
            <tr>
              <td className="p-4 font-semibold text-[rgba(251,251,239,0.5)]">YouTube Stats</td>
              {creators.map((c) => (
                <td key={c.id} className="p-4 border-l border-[rgba(251,251,239,0.1)]">
                  <div className="flex flex-col items-center space-y-1">
                    <div className="flex justify-between w-full max-w-[160px] text-[10px]">
                      <span className="text-[rgba(251,251,239,0.5)]">Subscribers</span>
                      <span className="font-semibold text-[#fbfbef]">{getPlatformStat(c, "YouTube", "followers")}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-[160px] text-[10px]">
                      <span className="text-[rgba(251,251,239,0.5)]">ER</span>
                      <span className="font-semibold text-[#fbfbef]">{getPlatformStat(c, "YouTube", "er")}</span>
                    </div>
                    <div className="flex justify-between w-full max-w-[160px] text-[10px]">
                      <span className="text-[rgba(251,251,239,0.5)]">Avg Views</span>
                      <span className="font-semibold text-[#fbfbef]">{getPlatformStat(c, "YouTube", "views")}</span>
                    </div>
                  </div>
                </td>
              ))}
            </tr>

            {/* Brand Trust Score */}
            <tr>
              <td className="p-4 font-semibold text-[rgba(251,251,239,0.5)] bg-black/10">Brand Trust Score</td>
              {creators.map((c) => (
                <td key={c.id} className="p-4 border-l border-[rgba(251,251,239,0.1)] bg-black/10 text-center">
                  <div className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-1 font-bold text-purple-400">
                    <Sparkles className="size-3.5 fill-purple-400/20" />
                    <span>{c.Brand_score || 72}/100</span>
                  </div>
                </td>
              ))}
            </tr>

            {/* Ratings & Reviews */}
            <tr>
              <td className="p-4 font-semibold text-[rgba(251,251,239,0.5)]">Brand Reviews</td>
              {creators.map((c) => (
                <td key={c.id} className="p-4 border-l border-[rgba(251,251,239,0.1)] text-center">
                  {c.review_count > 0 ? (
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1 font-bold text-sm text-[#fbfbef]">
                        <Star className="size-4 text-amber-400 fill-amber-400" />
                        <span>{c.avg_rating?.toFixed(1) || "0.0"}</span>
                      </div>
                      <span className="text-[10px] text-[rgba(251,251,239,0.5)] mt-0.5">({c.review_count} reviews)</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-[rgba(251,251,239,0.4)]">No reviews yet</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Rating breakdown details */}
            <tr>
              <td className="p-4 font-semibold text-[rgba(251,251,239,0.5)] text-[10px] uppercase tracking-wider pl-6">Quality of Work</td>
              {creators.map((c) => (
                <td key={c.id} className="p-4 border-l border-[rgba(251,251,239,0.1)] text-center text-[11px] text-[#fbfbef]">
                  {c.avg_quality ? `${c.avg_quality.toFixed(1)} / 5.0` : "—"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-4 font-semibold text-[rgba(251,251,239,0.5)] text-[10px] uppercase tracking-wider pl-6">Communication</td>
              {creators.map((c) => (
                <td key={c.id} className="p-4 border-l border-[rgba(251,251,239,0.1)] text-center text-[11px] text-[#fbfbef]">
                  {c.avg_communication ? `${c.avg_communication.toFixed(1)} / 5.0` : "—"}
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-4 font-semibold text-[rgba(251,251,239,0.5)] text-[10px] uppercase tracking-wider pl-6">Timeliness</td>
              {creators.map((c) => (
                <td key={c.id} className="p-4 border-l border-[rgba(251,251,239,0.1)] text-center text-[11px] text-[#fbfbef]">
                  {c.avg_timeliness ? `${c.avg_timeliness.toFixed(1)} / 5.0` : "—"}
                </td>
              ))}
            </tr>

            {/* Availability */}
            <tr>
              <td className="p-4 font-semibold text-[rgba(251,251,239,0.5)] bg-black/10">Availability</td>
              {creators.map((c) => (
                <td key={c.id} className="p-4 border-l border-[rgba(251,251,239,0.1)] bg-black/10 text-center">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      c.availability_status === "available"
                        ? "bg-[#4ade80]/15 text-[#4ade80]"
                        : c.availability_status === "busy"
                        ? "bg-[#f87171]/15 text-[#f87171]"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {c.availability_status || "Available"}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && targetInfluencer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d0d0d] p-6 border border-[rgba(251,251,239,0.2)] shadow-glow space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#fbfbef]">Invite to Campaign</h3>
              <button
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setTargetInfluencer(null);
                }}
                className="text-[rgba(251,251,239,0.6)] hover:text-white text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider block mb-2">
                  Select Campaign Card
                </label>
                {brandCards.length === 0 ? (
                  <div className="text-xs text-[rgba(251,251,239,0.6)] bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl p-4 text-center">
                    No active campaign cards found. Create a card in your dashboard first.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedCardId}
                    onChange={(e) => setSelectedCardId(e.target.value)}
                    className="block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-xs text-[#fbfbef] outline-none"
                  >
                    <option value="">-- Choose Campaign --</option>
                    {brandCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.title} ({card.budget_range || "No budget set"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider block mb-2">
                  Invitation Message (max 300 chars)
                </label>
                <textarea
                  rows={3}
                  maxLength={300}
                  className="block w-full rounded-2xl bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-xs text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] outline-none"
                  placeholder="Tell the influencer why you'd love to work with them..."
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsInviteModalOpen(false);
                    setTargetInfluencer(null);
                  }}
                  className="rounded-full bg-[#141414] px-5 py-2 text-xs font-semibold text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting || brandCards.length === 0 || !selectedCardId}
                  className="rounded-full bg-[#fbfbef] px-5 py-2 text-xs font-bold text-black disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="size-3" />
                  <span>{inviting ? "Sending..." : "Send Invitation"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#fbfbef]" />
      </div>
    }>
      <ComparisonContent />
    </Suspense>
  );
}
