"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { ArrowLeft, Briefcase, Calendar, Users, Star, Link2, MessageSquare, Check, X, ShieldAlert, Loader2, Info } from "lucide-react";
import toast from "react-hot-toast";
import InfluencerProfileView from "@/components/shared/InfluencerProfileView";

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: "📸",
  YouTube: "🎥",
  TikTok: "🎵",
  "Twitter/X": "🐦",
  LinkedIn: "💼",
};

export default function CardDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const supabase = createClient();

  const [card, setCard] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"preview" | "applicants">("preview");

  // Rejection modal state
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Expanded pitch messages
  const [expandedPitchIds, setExpandedPitchIds] = useState<string[]>([]);

  // Drawer / Side Sheet states
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<{ profile: any; portfolio: any[]; reviews: any[]; stats: any } | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const openApplicantDrawer = async (influencerId: string) => {
    setSelectedInfluencerId(influencerId);
    setDrawerLoading(true);
    try {
      // 1. Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", influencerId)
        .single();

      // 2. Fetch portfolio_items
      const { data: portfolio } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("owner_id", influencerId)
        .order("sort_order", { ascending: true });

      // 3. Fetch reviews
      const { data: reviews } = await supabase
        .from("reviews")
        .select(`
          *,
          reviewer:profiles!reviews_reviewer_id_fkey(display_name, avatar_url)
        `)
        .eq("reviewed_id", influencerId);

      // 4. Fetch stats: count completed rooms, accept rates
      const { count: collabsCount } = await supabase
        .from("rooms")
        .select("*", { count: "exact", head: true })
        .eq("influencer_id", influencerId)
        .eq("status", "completed");

      const { data: apps } = await supabase
        .from("applications")
        .select("status")
        .eq("influencer_id", influencerId);
      
      let acceptanceRate = 100;
      if (apps && apps.length > 0) {
        const accepted = apps.filter(a => a.status === "accepted").length;
        acceptanceRate = Math.round((accepted / apps.length) * 100);
      }

      setDrawerData({
        profile,
        portfolio: portfolio || [],
        reviews: reviews || [],
        stats: {
          collabsCompleted: collabsCount || 0,
          acceptanceRate: acceptanceRate || 100
        }
      });
    } catch (err) {
      console.error("Failed to load influencer drawer data", err);
      toast.error("Could not load creator profile detail");
    } finally {
      setDrawerLoading(false);
    }
  };

  const getMatchScoreBreakdown = (cardVal: any, influencerVal: any) => {
    let nichePoints = 0;
    let platformPoints = 0;
    let followerPoints = 0;
    let categoryPoints = 0;
    let locationPoints = 0;
    let locationMatched = true;

    if (!cardVal || !influencerVal) {
      return { nichePoints, platformPoints, followerPoints, categoryPoints, locationPoints, locationMatched, total: 0 };
    }

    // 1. Niches
    const cardNiches = cardVal.niche_tags || [];
    const influencerNiches = influencerVal.niche || [];
    cardNiches.forEach((n: string) => {
      if (influencerNiches.includes(n)) nichePoints += 3;
    });

    // 2. Platforms
    const cardPlatforms = cardVal.platform_requirements || [];
    const influencerPlatforms = influencerVal.platforms || [];
    cardPlatforms.forEach((p: string) => {
      if (influencerPlatforms.includes(p)) platformPoints += 2;
    });

    // 3. Followers
    if ((influencerVal.follower_count || 0) >= (cardVal.min_followers || 0)) {
      followerPoints += 2;
    }

    // 4. Category
    if (influencerNiches.includes(cardVal.category)) {
      categoryPoints += 1;
    }

    // 5. Location
    const locationReq = cardVal.location_requirement || "none";
    if (locationReq !== "none") {
      const locCountries = cardVal.location_countries || [];
      const locStates = cardVal.location_states || [];
      const locCities = cardVal.location_cities || [];
      const locRadiusKm = cardVal.location_radius_km;
      const locCoords = cardVal.location_coordinates;

      const infCountry = influencerVal.location_country;
      const infState = influencerVal.location_state;
      const infCity = influencerVal.location_city;
      const infCoordsRaw = influencerVal.location_coordinates;

      let matched = false;

      const parsePointLocal = (coords: any) => {
        if (!coords) return null;
        if (typeof coords === "object" && "x" in coords && "y" in coords) {
          return { lat: coords.y, lng: coords.x };
        }
        if (typeof coords === "string") {
          const clean = coords.replace(/[()]/g, "");
          const parts = clean.split(",");
          if (parts.length === 2) return { lat: parseFloat(parts[1]), lng: parseFloat(parts[0]) };
        }
        return null;
      };

      const getDistanceLocal = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      if (locRadiusKm && locCoords) {
        const center = parsePointLocal(locCoords);
        const creatorLoc = parsePointLocal(infCoordsRaw);
        if (center && creatorLoc) {
          const dist = getDistanceLocal(center.lat, center.lng, creatorLoc.lat, creatorLoc.lng);
          if (dist <= locRadiusKm) {
            matched = true;
            locationPoints = dist <= 25 ? 5 : dist <= 100 ? 3 : 1;
          }
        }
      } else {
        const matchesCountry = infCountry && locCountries.some((c: string) => c.toLowerCase() === infCountry.toLowerCase());
        const matchesState = infState && locStates.some((s: string) => s.toLowerCase() === infState.toLowerCase());
        const matchesCity = infCity && locCities.some((c: string) => c.toLowerCase() === infCity.toLowerCase());

        if (matchesCountry || matchesState || matchesCity) {
          matched = true;
          locationPoints = matchesCity ? 5 : matchesState ? 3 : 1;
        }
      }

      if (locationReq === "required" && !matched) {
        locationMatched = false;
      }
    }

    const total = locationMatched ? (nichePoints + platformPoints + followerPoints + categoryPoints + locationPoints) : 0;

    return {
      nichePoints,
      platformPoints,
      followerPoints,
      categoryPoints,
      locationPoints,
      locationMatched,
      total
    };
  };

  async function fetchData() {
    if (!id || !user) return;
    setLoading(true);

    const cardId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";

    const { data: cardData, error: cardError } = await supabase
      .from("cards")
      .select("*")
      .eq("id", cardId)
      .single();

    if (cardError) {
      toast.error("Failed to load campaign.");
      router.push("/dashboard/brand/cards");
      return;
    }

    const { data: apps, error: appsError } = await supabase
      .from("applications")
      .select(`
        *,
        influencer:profiles!applications_influencer_id_fkey(*)
      `)
      .eq("card_id", cardId);

    setCard(cardData);
    setApplications(apps || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, [id, user]);

  const togglePitchExpand = (appId: string) => {
    setExpandedPitchIds((prev) =>
      prev.includes(appId) ? prev.filter((i) => i !== appId) : [...prev, appId]
    );
  };

  const handleAccept = async (app: any) => {
    const confirm = window.confirm(`Accept ${app.influencer.display_name} for this collaboration? A private chat room will be created.`);
    if (!confirm) return;

    setActionLoading(true);

    // 1. Update application status
    const { error: appError } = await supabase
      .from("applications")
      .update({ status: "accepted" })
      .eq("id", app.id);

    if (appError) {
      toast.error("Failed to accept application.");
      setActionLoading(false);
      return;
    }

    // 2. Create chat room
    const { data: roomData, error: roomError } = await supabase
      .from("rooms")
      .insert({
        application_id: app.id,
        brand_id: user.id,
        influencer_id: app.influencer_id,
        card_id: card.id,
      })
      .select()
      .single();

    if (roomError) {
      toast.error("Application accepted, but failed to create chat room.");
      setActionLoading(false);
      return;
    }

    // 3. Send notification to influencer
    await supabase.from("notifications").insert({
      user_id: app.influencer_id,
      type: "application_accepted",
      title: "Your application was accepted! 🎉",
      body: `${profileName()} accepted your application for '${card.title}'. Chat room is open.`,
      reference_id: roomData.id,
      reference_type: "room",
    });

    toast.success("Application accepted! Chat room opened.");
    setActionLoading(false);
    fetchData();
  };

  const handleRejectInit = (appId: string) => {
    setRejectingAppId(appId);
    setRejectNote("");
  };

  const handleRejectSubmit = async () => {
    if (!rejectingAppId) return;

    setActionLoading(true);

    // 1. Find the application to get the influencer ID
    const app = applications.find((a) => a.id === rejectingAppId);
    if (!app) return;

    // 2. Update status
    const { error: appError } = await supabase
      .from("applications")
      .update({ status: "rejected", brand_note: rejectNote })
      .eq("id", rejectingAppId);

    if (appError) {
      toast.error("Failed to reject application.");
      setActionLoading(false);
      return;
    }

    // 3. Send notification
    await supabase.from("notifications").insert({
      user_id: app.influencer_id,
      type: "application_rejected",
      title: "Application update",
      body: `${profileName()} reviewed your application for '${card.title}'.`,
      reference_id: card.id,
      reference_type: "card",
    });

    toast.success("Application rejected.");
    setRejectingAppId(null);
    setActionLoading(false);
    fetchData();
  };

  const profileName = () => card?.title || "A Brand";

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-36 bg-[#0d0d0d] rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-[#0d0d0d] rounded-2xl" />
          <div className="h-96 bg-[#0d0d0d] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/brand/cards"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[rgba(251,251,239,0.6)] hover:text-[#fbfbef] transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Campaigns</span>
        </Link>
      </div>

      {/* Title block */}
      <div className="flex justify-between items-start border-b border-[rgba(251,251,239,0.1)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#fbfbef] px-2.5 py-0.5 text-[9px] font-bold text-black uppercase">
              {card.category}
            </span>
            <Link
              href={`/dashboard/brand/cards/${card.id}/edit`}
              className="rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-3 py-1 text-[10px] font-bold text-[rgba(251,251,239,0.8)] hover:text-white transition-colors"
            >
              Edit Campaign
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef] mt-2 font-sans">
            {card.title}
          </h1>
        </div>
        <div className="text-right">
          <span className="text-xs text-[rgba(251,251,239,0.4)] block uppercase">Budget</span>
          <span className="text-lg font-bold text-[#fbfbef]">{card.budget_range}</span>
        </div>
      </div>

      {/* Tabs for mobile */}
      <div className="flex md:hidden border-b border-[rgba(251,251,239,0.1)]">
        <button
          onClick={() => setActiveTab("preview")}
          className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider ${
            activeTab === "preview"
              ? "text-[#fbfbef] border-b-2 border-[#fbfbef]"
              : "text-[rgba(251,251,239,0.6)]"
          }`}
        >
          Preview
        </button>
        <button
          onClick={() => setActiveTab("applicants")}
          className={`flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${
            activeTab === "applicants"
              ? "text-[#fbfbef] border-b-2 border-[#fbfbef]"
              : "text-[rgba(251,251,239,0.6)]"
          }`}
        >
          Applicants ({applications.length})
        </button>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Panel: Campaign details */}
        <div className={`md:col-span-2 space-y-6 ${activeTab !== "preview" ? "hidden md:block" : ""}`}>
          <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] overflow-hidden">
            {card.cover_image_url && (
              <div className="aspect-video w-full relative">
                <img src={card.cover_image_url} alt="Cover" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[rgba(251,251,239,0.4)]">
                  Description
                </h3>
                <p className="text-sm text-[rgba(251,251,239,0.6)] leading-relaxed mt-2 whitespace-pre-wrap">
                  {card.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[rgba(251,251,239,0.05)]">
                <div>
                  <h4 className="text-xs uppercase text-[rgba(251,251,239,0.4)] font-semibold">Timeline</h4>
                  <span className="text-sm text-[#fbfbef] font-semibold block mt-1">{card.timeline}</span>
                </div>
                <div>
                  <h4 className="text-xs uppercase text-[rgba(251,251,239,0.4)] font-semibold">Deadline</h4>
                  <span className="text-sm text-[#fbfbef] font-semibold block mt-1">
                    {new Date(card.application_deadline).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs uppercase text-[rgba(251,251,239,0.4)] font-semibold">Follower Min</h4>
                  <span className="text-sm text-[#fbfbef] font-semibold block mt-1">
                    {card.min_followers?.toLocaleString() || "0"}
                  </span>
                </div>
                <div>
                  <h4 className="text-xs uppercase text-[rgba(251,251,239,0.4)] font-semibold">Status</h4>
                  <span className="text-sm text-[#fbfbef] font-semibold block mt-1 capitalize">{card.status}</span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-[rgba(251,251,239,0.05)]">
                <h4 className="text-xs uppercase text-[rgba(251,251,239,0.4)] font-semibold">Platform Requirements</h4>
                <div className="flex gap-2">
                  {card.platform_requirements?.map((plat: string) => (
                    <span key={plat} className="rounded-full bg-[#141414] border border-[rgba(251,251,239,0.1)] px-3 py-1.5 text-xs text-[#fbfbef] flex items-center gap-1.5">
                      <span>{PLATFORM_ICONS[plat] || "🌐"}</span>
                      <span>{plat}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs uppercase text-[rgba(251,251,239,0.4)] font-semibold">Deliverables</h4>
                <div className="flex flex-wrap gap-2">
                  {card.deliverables?.map((del: string, idx: number) => (
                    <span key={idx} className="rounded-md bg-[#141414] px-3 py-1.5 text-xs text-[#fbfbef]">
                      • {del}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Applicants list */}
        <div className={`space-y-6 ${activeTab !== "applicants" ? "hidden md:block" : ""}`}>
          <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-6">
            <h3 className="text-lg font-bold text-[#fbfbef] mb-4 flex items-center gap-2">
              <Users className="size-5" /> Applicants ({applications.length})
            </h3>

            {applications.length === 0 ? (
              <div className="text-center py-12 text-[rgba(251,251,239,0.6)]">
                <p className="text-sm">No applicants yet.</p>
                <p className="text-xs text-[rgba(251,251,239,0.4)] mt-1">
                  When influencers apply, they will show up here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => {
                  const isExpanded = expandedPitchIds.includes(app.id);
                  return (
                    <div
                      key={app.id}
                      className="rounded-xl border border-[rgba(251,251,239,0.1)] bg-[#141414] p-4 space-y-4"
                    >
                      {/* Influencer Profile Card info */}
                      <div className="flex items-center justify-between gap-3 border-b border-[rgba(251,251,239,0.05)] pb-3">
                        <div 
                          className="flex items-center gap-3 cursor-pointer group/avatar"
                          onClick={() => openApplicantDrawer(app.influencer_id)}
                        >
                          <div className="size-10 rounded-full border border-[rgba(251,251,239,0.2)] bg-black overflow-hidden flex items-center justify-center group-hover/avatar:border-white transition-colors">
                            {app.influencer.avatar_url ? (
                              <img src={app.influencer.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-black bg-[#fbfbef] size-full flex items-center justify-center">
                                {app.influencer.display_name[0].toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#fbfbef] flex items-center gap-1 group-hover/avatar:text-white group-hover/avatar:underline transition-colors">
                              {app.influencer.display_name}
                              {app.influencer.is_verified && (
                                <span className="text-[10px] text-black bg-[#fbfbef] rounded-full size-3.5 flex items-center justify-center font-bold">
                                  ✓
                                </span>
                              )}
                            </h4>
                            <span className="text-[10px] text-[rgba(251,251,239,0.4)]">
                              {app.influencer.follower_count?.toLocaleString()} followers • {app.influencer.location_city || app.influencer.location}
                            </span>
                          </div>
                        </div>

                        {/* Match Score Badge */}
                        {(() => {
                          const breakdown = getMatchScoreBreakdown(card, app.influencer);
                          return (
                            <div className="relative group/tooltip shrink-0">
                              <div className={`cursor-help rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition-colors flex items-center gap-1 ${
                                !breakdown.locationMatched
                                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                                  : breakdown.total >= 8
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-[#1c1c1c] border-[rgba(251,251,239,0.2)] text-[rgba(251,251,239,0.8)]"
                              }`}>
                                <span>{breakdown.locationMatched ? `${breakdown.total} Match` : "Location Locked"}</span>
                                <Info className="size-3 text-current opacity-70" />
                              </div>

                              {/* Hover Tooltip Popup */}
                              <div className="absolute right-0 top-full mt-1.5 w-60 p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400 shadow-2xl opacity-0 scale-95 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 transition-all z-20 space-y-2">
                                <div className="font-bold text-xs text-[#fbfbef] border-b border-zinc-800 pb-1.5 flex justify-between">
                                  <span>Match Strength Breakdown</span>
                                  <span className="text-emerald-400">{breakdown.total} pts</span>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span>Niche Relevance (+3/niche)</span>
                                    <span className="text-[#fbfbef] font-semibold">+{breakdown.nichePoints}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Platform Match (+2/platform)</span>
                                    <span className="text-[#fbfbef] font-semibold">+{breakdown.platformPoints}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Follower Reach (+2)</span>
                                    <span className="text-[#fbfbef] font-semibold">+{breakdown.followerPoints}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Category Preference (+1)</span>
                                    <span className="text-[#fbfbef] font-semibold">+{breakdown.categoryPoints}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Location Matching (+1/3/5)</span>
                                    <span className={`${breakdown.locationMatched ? "text-emerald-400" : "text-red-400"} font-semibold`}>
                                      {breakdown.locationMatched ? `+${breakdown.locationPoints}` : "Locked Out"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Pitch Message */}
                      <div>
                        <p className={`text-xs text-[rgba(251,251,239,0.6)] leading-relaxed ${!isExpanded ? "line-clamp-3" : ""}`}>
                          {app.pitch_message}
                        </p>
                        {app.pitch_message.length > 120 && (
                          <button
                            onClick={() => togglePitchExpand(app.id)}
                            className="text-[10px] text-white underline mt-1 block hover:text-[rgba(251,251,239,0.8)]"
                          >
                            {isExpanded ? "Read Less" : "Read More"}
                          </button>
                        )}
                      </div>

                      {/* Portfolio Links */}
                      {app.portfolio_links && app.portfolio_links.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-[rgba(251,251,239,0.4)]">Portfolio Links</span>
                          <div className="flex flex-col gap-1">
                            {app.portfolio_links.map((link: string, i: number) => (
                              <a
                                key={i}
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-[#fbfbef] hover:underline flex items-center gap-1.5"
                              >
                                <Link2 className="size-3 text-[rgba(251,251,239,0.4)]" />
                                <span className="line-clamp-1">{link}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Proposed rate */}
                      {app.proposed_rate && (
                        <div className="text-xs text-[rgba(251,251,239,0.6)]">
                          Proposed Rate: <span className="text-[#fbfbef] font-bold">{app.proposed_rate}</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="border-t border-[rgba(251,251,239,0.05)] pt-3 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-semibold text-[rgba(251,251,239,0.4)]">
                          Status: <span className={`font-bold ${app.status === "accepted" ? "text-[#4ade80]" : app.status === "rejected" ? "text-[#f87171]" : "text-[#facc15]"}`}>{app.status}</span>
                        </span>

                        {app.status === "pending" && (
                          <div className="flex gap-2">
                            <button
                              disabled={actionLoading}
                              onClick={() => handleRejectInit(app.id)}
                              className="p-1.5 rounded-full bg-[#141414] border border-[rgba(251,251,239,0.1)] text-[#f87171] hover:bg-[#261414] scale-active"
                            >
                              <X className="size-3.5" />
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleAccept(app)}
                              className="p-1.5 rounded-full bg-[#fbfbef] text-black hover:opacity-90 scale-active"
                            >
                              <Check className="size-3.5" />
                            </button>
                          </div>
                        )}

                        {app.status === "accepted" && (
                          <Link
                            href="/dashboard/brand/chats"
                            className="text-[11px] font-bold text-black bg-[#fbfbef] rounded-full px-3 py-1 flex items-center gap-1.5 scale-active"
                          >
                            <MessageSquare className="size-3" />
                            <span>Go to Chat</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Reason Modal */}
      {rejectingAppId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d0d0d] p-6 border border-[rgba(251,251,239,0.2)] shadow-glow space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#fbfbef]">Add Rejection Feedback</h3>
              <button onClick={() => setRejectingAppId(null)} className="text-[rgba(251,251,239,0.6)] hover:text-white">
                &times;
              </button>
            </div>
            <div>
              <p className="text-xs text-[rgba(251,251,239,0.6)] leading-normal">
                Leave a polite note explaining why this influencer was not chosen for this specific campaign (optional).
              </p>
              <textarea
                rows={3}
                className="mt-3 block w-full rounded-xl bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-2.5 text-xs text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                placeholder="e.g. Budget limitations or follower count alignment."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingAppId(null)}
                className="rounded-full bg-[#141414] px-4 py-2 text-xs font-semibold text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)]"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={actionLoading}
                className="rounded-full bg-[#f87171] px-4 py-2 text-xs font-bold text-black"
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Side Sheet / Drawer */}
      {selectedInfluencerId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          {/* Backdrop click to close */}
          <div className="flex-1" onClick={() => { setSelectedInfluencerId(null); setDrawerData(null); }} />
          
          <div className="w-full max-w-4xl bg-black border-l border-[rgba(251,251,239,0.1)] h-full overflow-y-auto flex flex-col relative animate-in slide-in-from-right duration-300">
            {/* Close button */}
            <button
              onClick={() => { setSelectedInfluencerId(null); setDrawerData(null); }}
              className="absolute top-4 right-4 z-50 size-8 rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] text-[#fbfbef] hover:bg-[#1c1c1c] flex items-center justify-center transition-colors"
            >
              <X className="size-4" />
            </button>

            {drawerLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="size-8 animate-spin text-[#fbfbef]" />
              </div>
            ) : drawerData ? (
              <div className="p-8">
                <InfluencerProfileView
                  profile={drawerData.profile}
                  portfolio={drawerData.portfolio}
                  reviews={drawerData.reviews}
                  stats={drawerData.stats}
                  isOwner={false}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[rgba(251,251,239,0.4)]">
                Failed to load profile.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
