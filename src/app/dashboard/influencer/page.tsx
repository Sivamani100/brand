"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { sortCardsByMatch } from "@/lib/utils/matching";
import { Sparkles, Calendar, Heart, ShieldAlert, Award, Compass } from "lucide-react";
import { format } from "date-fns";
import ChecklistWidget from "@/components/shared/ChecklistWidget";

type MatchCard = any;

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: "📸",
  YouTube: "🎥",
  TikTok: "🎵",
  "Twitter/X": "🐦",
  LinkedIn: "💼",
};

const CATEGORY_COLORS: Record<string, string> = {
  Fashion: "bg-[#c084fc] text-black",
  Tech: "bg-[#38bdf8] text-black",
  Food: "bg-[#fb923c] text-black",
  Fitness: "bg-[#4ade80] text-black",
  Beauty: "bg-[#f472b6] text-black",
  Travel: "bg-[#fbbf24] text-black",
  Gaming: "bg-[#a78bfa] text-black",
  Lifestyle: "bg-[#fbfbef] text-black",
};

export default function InfluencerHomePage() {
  const { profile, user } = useUser();
  const supabase = createClient();

  const [matchedCards, setMatchedCards] = useState<MatchCard[]>([]);
  const [unmatchedCards, setUnmatchedCards] = useState<MatchCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile Completeness states
  const [completenessPct, setCompletenessPct] = useState<number | null>(null);
  const [portfolioCount, setPortfolioCount] = useState<number>(0);

  const calculateCompletenessClientSide = (p: any) => {
    let score = 0;
    if (!p) return 0;
    if (p.avatar_url) score += 10;
    if (p.bio && p.bio.length > 10) score += 10;
    if (p.location_city) score += 15;
    if (p.platform_data && Object.keys(p.platform_data).length > 0) score += 20;
    const hasAudience =
      p.platform_data?.instagram?.audience ||
      p.platform_data?.youtube?.audience ||
      p.platform_data?.tiktok?.audience;
    if (hasAudience) score += 15;
    if (p.niche && p.niche.length > 0) score += 10;
    if (p.typical_timeline_days) score += 5;
    return score;
  };

  useEffect(() => {
    if (!user || !profile) return;

    async function loadFeed() {
      setLoading(true);

      // Fetch profile completeness percentage
      let pctValue = 0;
      try {
        const { data: pct, error: rpcErr } = await (supabase as any).rpc("profile_completeness_pct", {
          profile_id: user.id
        });
        if (!rpcErr && pct !== null) {
          pctValue = Number(pct);
        } else {
          pctValue = calculateCompletenessClientSide(profile as any);
        }
      } catch (err) {
        pctValue = calculateCompletenessClientSide(profile as any);
      }
      setCompletenessPct(pctValue);

      // Fetch portfolio items count
      const { count } = await supabase
        .from("portfolio_items")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id);
      setPortfolioCount(count || 0);

      // Fetch all active cards and join brand profile
      const { data: rawCards, error } = await supabase
        .from("cards")
        .select(`
          *,
          brand:profiles!cards_brand_id_fkey(*)
        `)
        .eq("status", "active");

      if (error) {
        console.error("Failed to load cards feed", error);
        setLoading(false);
        return;
      }

      // Fetch cards user has already applied to
      const { data: alreadyApplied } = await supabase
        .from("applications")
        .select("card_id")
        .eq("influencer_id", user.id);

      const appliedIds = alreadyApplied?.map((a) => a.card_id) || [];

      // Filter out already applied cards
      const availableCards = (rawCards || []).filter((c) => !appliedIds.includes(c.id));

      // Calculate matching scores
      const sorted = sortCardsByMatch(availableCards, profile!);

      // Separate matches vs other recommendations
      const highMatches = sorted.filter((c) => c.matchScore > 0);
      const lowMatches = sorted.filter((c) => c.matchScore === 0);

      setMatchedCards(highMatches);
      setUnmatchedCards(lowMatches);
      setLoading(false);
    }

    loadFeed();
  }, [user, profile]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-[#0d0d0d] rounded-lg" />
        <div className="h-40 bg-[#0d0d0d] rounded-2xl" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-[#0d0d0d] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const getMissingItems = () => {
    if (!profile) return [];
    const p = profile as any;
    const missing = [];
    if (!p.avatar_url) {
      missing.push({ label: "Upload profile photo", link: "/dashboard/influencer/profile" });
    }
    if (!p.bio || p.bio.length <= 10) {
      missing.push({ label: "Write detailed biography", link: "/dashboard/influencer/profile" });
    }
    if (!p.location_city) {
      missing.push({ label: "Set verified city location", link: "/dashboard/influencer/profile" });
    }
    if (!p.niche || p.niche.length === 0) {
      missing.push({ label: "Select niche tags", link: "/dashboard/influencer/profile" });
    }
    if (!p.platform_data || Object.keys(p.platform_data).length === 0) {
      missing.push({ label: "Connect platform statistics", link: "/dashboard/influencer/settings/platforms" });
    } else {
      const hasAudience =
        p.platform_data?.instagram?.audience ||
        p.platform_data?.youtube?.audience ||
        p.platform_data?.tiktok?.audience;
      if (!hasAudience) {
        missing.push({ label: "Add platform audience demographics", link: "/dashboard/influencer/settings/platforms" });
      }
    }
    if (portfolioCount < 3) {
      missing.push({ label: `Add portfolio items (${portfolioCount}/3)`, link: "/dashboard/influencer/portfolio" });
    }
    return missing;
  };

  return (
    <div className="space-y-8">
      {/* Greeting Banner */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#fbfbef] font-sans">
          Good day, {profile?.display_name || "Creator"}
        </h1>
        <p className="text-sm text-[rgba(251,251,239,0.6)] mt-1">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      {/* Checklist Widget */}
      <ChecklistWidget />

      {/* Profile Completeness Nudge Banner */}
      {completenessPct !== null && completenessPct < 100 && (
        <div className="rounded-2xl bg-[#0d0d0d] border border-dashed border-[rgba(251,251,239,0.3)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#fbfbef] flex items-center gap-2">
                <Award className="size-4 text-purple-400" />
                <span>Elevate Your Profile Discovery</span>
              </h3>
              <p className="text-xs text-[rgba(251,251,239,0.5)]">
                Completing your profile increases your discovery rank by up to 300%.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#fbfbef] bg-purple-500/10 border border-purple-500/30 px-3 py-1 rounded-full">
                {completenessPct}% Complete
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${completenessPct}%` }}
            />
          </div>

          {/* Checklist of missing items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {getMissingItems().map((item, index) => (
              <Link
                key={index}
                href={item.link}
                className="flex items-center justify-between p-3 rounded-xl bg-[#141414] hover:bg-[#1c1c1c] border border-[rgba(251,251,239,0.05)] hover:border-[rgba(251,251,239,0.1)] transition-all text-[11px] group"
              >
                <span className="text-[rgba(251,251,239,0.7)] group-hover:text-white font-medium">
                  {item.label}
                </span>
                <span className="text-purple-400 font-bold shrink-0 ml-2 group-hover:underline">
                  Fix →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Hero Banner matched count */}
      <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-glow">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#fbfbef] text-black text-xs font-bold px-2.5 py-0.5 animate-pulse">
              {matchedCards.length} Matches
            </span>
            <h3 className="text-lg font-bold text-[#fbfbef]">Campaigns matched for you</h3>
          </div>
          <p className="text-xs text-[rgba(251,251,239,0.6)]">
            Based on your selected niche tags, platforms, and follower range settings.
          </p>
        </div>
        <Link
          href="/dashboard/influencer/discover"
          className="rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] text-[#fbfbef] hover:bg-[#1c1c1c] px-4 py-2.5 text-xs font-bold flex items-center gap-2 scale-active transition-all"
        >
          <Compass className="size-4" />
          <span>Explore All Campaigns</span>
        </Link>
      </div>

      {/* MATCHED FEED */}
      <div className="space-y-6">
        <h3 className="text-base font-bold text-[#fbfbef] flex items-center gap-2">
          <Sparkles className="size-4 text-[#fbbf24]" /> Best Matches
        </h3>

        {matchedCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[rgba(251,251,239,0.2)] p-12 text-center text-[rgba(251,251,239,0.6)] max-w-md mx-auto">
            <p className="text-sm font-semibold">No high matches right now.</p>
            <p className="text-xs mt-1 mb-4">Try adding more platforms or niches in your profile to find better matches.</p>
            <Link href="/dashboard/influencer/profile" className="text-xs text-[#fbfbef] underline font-bold">
              Update Profile Settings
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matchedCards.map((card) => (
              <div
                key={card.id}
                className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] overflow-hidden lift-hover flex flex-col justify-between"
              >
                <div>
                  {/* Card cover image */}
                  <div className="aspect-video w-full bg-[#141414] relative">
                    {card.cover_image_url ? (
                      <img src={card.cover_image_url} alt={card.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[rgba(251,251,239,0.1)]">
                        <Award className="size-16" />
                      </div>
                    )}
                    <span
                      className={`absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                        CATEGORY_COLORS[card.category] || "bg-white text-black"
                      }`}
                    >
                      {card.category}
                    </span>
                    <span className="absolute top-3 right-3 rounded-full bg-[#4ade80]/90 text-black text-[9px] font-bold px-2 py-0.5">
                      Match Score: +{card.matchScore}
                    </span>
                  </div>

                  {/* Brand & Campaign Info */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full border border-[rgba(251,251,239,0.2)] bg-black overflow-hidden flex items-center justify-center">
                        {card.brand?.avatar_url ? (
                          <img src={card.brand.avatar_url} alt="Brand" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold text-black bg-[#fbfbef] size-full flex items-center justify-center">
                            {card.brand?.display_name[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[rgba(251,251,239,0.6)] font-semibold">
                        {card.brand?.display_name || "A Brand"}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-[#fbfbef] line-clamp-1">{card.title}</h4>
                    <p className="text-xs text-[rgba(251,251,239,0.6)] line-clamp-2 leading-relaxed">
                      {card.description}
                    </p>

                    {/* Niche tags */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {card.niche_tags?.map((tag: string) => (
                        <span key={tag} className="rounded-full bg-[#141414] border border-[rgba(251,251,239,0.1)] px-2.5 py-1 text-[10px] text-[rgba(251,251,239,0.8)]">
                          #{tag.toLowerCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer specs & Apply button */}
                <div className="p-6 pt-0 border-t border-[rgba(251,251,239,0.05)] mt-3 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[rgba(251,251,239,0.4)] uppercase">Budget</span>
                    <span className="text-sm font-bold text-[#fbfbef]">{card.budget_range}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      {card.platform_requirements?.map((p: string) => (
                        <span key={p} title={p} className="text-xs">
                          {PLATFORM_ICONS[p] || "🌐"}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={`/dashboard/influencer/discover/${card.id}`}
                      className="rounded-full bg-[#fbfbef] text-black font-bold px-4 py-2 text-xs hover:opacity-90 scale-active"
                    >
                      Apply Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EXPLORE ALL / OTHER RECOMENDATIONS */}
      {unmatchedCards.length > 0 && (
        <div className="space-y-6 pt-6 border-t border-[rgba(251,251,239,0.1)]">
          <h3 className="text-base font-bold text-[rgba(251,251,239,0.6)]">Explore Other Campaigns</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {unmatchedCards.map((card) => (
              <div
                key={card.id}
                className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.1)] overflow-hidden opacity-80 hover:opacity-100 transition-opacity flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video w-full bg-[#141414] relative">
                    {card.cover_image_url && (
                      <img src={card.cover_image_url} alt={card.title} className="h-full w-full object-cover" />
                    )}
                    <span
                      className={`absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                        CATEGORY_COLORS[card.category] || "bg-white text-black"
                      }`}
                    >
                      {card.category}
                    </span>
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[rgba(251,251,239,0.6)]">
                        By {card.brand?.display_name || "Partner"}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-[#fbfbef]">{card.title}</h4>
                  </div>
                </div>

                <div className="p-6 pt-0 flex items-center justify-between border-t border-[rgba(251,251,239,0.05)] mt-3">
                  <span className="text-xs font-bold text-[#fbfbef]">{card.budget_range}</span>
                  <Link
                    href={`/dashboard/influencer/discover/${card.id}`}
                    className="rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] text-[#fbfbef] px-4 py-2 text-xs hover:bg-[#1c1c1c] scale-active font-bold"
                  >
                    View details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
