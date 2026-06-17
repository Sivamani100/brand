"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import {
  Search,
  Check,
  ShieldCheck,
  HelpCircle,
  Globe,
  MapPin,
  Star,
  Sparkles,
  Send,
  Bookmark,
  Plus,
} from "lucide-react";
import { InstagramIcon, YoutubeIcon, TwitterIcon, LinkedinIcon } from "@/components/shared/SocialIcons";
import toast from "react-hot-toast";
import LocationPicker, { LocationValue } from "@/components/shared/LocationPicker";
import { countryCodeToFlag } from "@/lib/utils/location";

interface InfluencerProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  niche: string[] | null;
  platforms: string[] | null;
  follower_count: number | null;
  location: string | null;
  location_country: string | null;
  location_state: string | null;
  location_city: string | null;
  location_coordinates: any;
  availability_status: string | null;
  trending_score: number | null;
  is_verified: boolean;
  created_at: string;
  // Join data
  applications: { id: string; status: string }[];
  rooms: { id: string; status: string; brand_id: string }[];
  reviews: { id: string; rating: number }[];
}

interface SavedList {
  id: string;
  name: string;
  items: { influencer_id: string }[];
}

const NICHES = [
  "Fashion",
  "Tech",
  "Food",
  "Fitness",
  "Beauty",
  "Travel",
  "Gaming",
  "Lifestyle",
  "Health",
  "Finance",
  "Education",
  "Entertainment",
];

const PLATFORMS = ["Instagram", "YouTube", "TikTok", "Twitter/X", "LinkedIn"];

export default function InfluencerDirectoryPage() {
  const { profile: currentUserProfile, user: currentUser } = useUser();
  const supabase = createClient();

  const [influencers, setInfluencers] = useState<InfluencerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Brand workspace lists/cards for saving/inviting
  const [brandCards, setBrandCards] = useState<any[]>([]);
  const [brandLists, setBrandLists] = useState<SavedList[]>([]);

  // Filter & Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [minFollowers, setMinFollowers] = useState(1000);
  const [maxFollowers, setMaxFollowers] = useState(1000000);
  const [locationSearch, setLocationSearch] = useState("");
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState("best_match"); // best_match, followers, collabs, newest, top_rated

  // New Location Filter States
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [radiusKm, setRadiusKm] = useState(50);
  const [radiusLocationVal, setRadiusLocationVal] = useState<LocationValue | null>(null);
  const [showLocationPanel, setShowLocationPanel] = useState(false);

  // Smart Invite & Active Card
  const [activeCardId, setActiveCardId] = useState("");

  // Compare Mode
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Active Invite states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [targetInfluencer, setTargetInfluencer] = useState<any | null>(null);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviting, setInviting] = useState(false);

  // Saved Lists dropdown
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");
  const [isCreatingList, setIsCreatingList] = useState(false);

  // Distance helper
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

  // Sync state from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const country = params.get("country");
    const states = params.get("states");
    const cities = params.get("cities");
    const radCity = params.get("radiusCity");
    const radCoords = params.get("radiusCoords");
    const radKm = params.get("radiusKm");
    const cardId = params.get("activeCard");

    if (country) setSelectedCountry(country);
    if (states) setSelectedStates(states.split(","));
    if (cities) setSelectedCities(cities.split(","));
    if (radCity && radCoords) {
      const parts = radCoords.split(",");
      setRadiusLocationVal({
        city: radCity.split(",")[0]?.trim() || "",
        state: "",
        country: "",
        countryCode: "",
        coordinates: { lng: parseFloat(parts[0]), lat: parseFloat(parts[1]) },
        timezone: "",
        display: radCity
      });
      if (radKm) setRadiusKm(parseInt(radKm) || 50);
    }
    if (cardId) {
      setActiveCardId(cardId);
      setSelectedCardId(cardId);
    }
  }, []);

  // Sync state to URL on change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedCountry !== "all") params.set("country", selectedCountry);
    else params.delete("country");

    if (selectedStates.length > 0) params.set("states", selectedStates.join(","));
    else params.delete("states");

    if (selectedCities.length > 0) params.set("cities", selectedCities.join(","));
    else params.delete("cities");

    if (radiusLocationVal) {
      params.set("radiusCity", radiusLocationVal.display);
      params.set("radiusCoords", `${radiusLocationVal.coordinates.lng},${radiusLocationVal.coordinates.lat}`);
      params.set("radiusKm", radiusKm.toString());
    } else {
      params.delete("radiusCity");
      params.delete("radiusCoords");
      params.delete("radiusKm");
    }

    if (activeCardId) params.set("activeCard", activeCardId);
    else params.delete("activeCard");

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [selectedCountry, selectedStates, selectedCities, radiusLocationVal, radiusKm, activeCardId]);

  useEffect(() => {
    async function loadInfluencers() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(`
            *,
            applications:applications(id, status),
            rooms:rooms(id, status),
            reviews:reviews!reviews_reviewed_id_fkey(id, rating)
          `)
          .eq("role", "influencer");

        if (error) throw error;
        setInfluencers((data as unknown as InfluencerProfile[]) || []);
      } catch (err: any) {
        console.error("Failed to load influencers directory", err);
        toast.error("Could not load creators");
      } finally {
        setLoading(false);
      }
    }

    loadInfluencers();
  }, []);

  // Fetch brand lists & cards
  useEffect(() => {
    if (currentUser?.id && currentUserProfile?.role === "brand") {
      async function fetchBrandData() {
        const { data: cards } = await supabase
          .from("cards")
          .select("*")
          .eq("brand_id", currentUser.id)
          .eq("status", "active");
        setBrandCards(cards || []);

        const { data: lists } = await supabase
          .from("influencer_lists")
          .select(`
            *,
            items:influencer_list_items(influencer_id)
          `)
          .eq("brand_id", currentUser.id);
        setBrandLists((lists as unknown as SavedList[]) || []);
      }
      fetchBrandData();
    }
  }, [currentUser, currentUserProfile]);

  // Filters calculation
  const filteredInfluencers = influencers.filter((inf) => {
    // 1. Search Query (name/bio)
    const matchesSearch =
      inf.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inf.bio && inf.bio.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // 2. Niche chips
    if (selectedNiches.length > 0) {
      if (!inf.niche) return false;
      const hasNiche = inf.niche.some((n) => selectedNiches.includes(n));
      if (!hasNiche) return false;
    }

    // 3. Platform selection
    if (selectedPlatforms.length > 0) {
      if (!inf.platforms) return false;
      const hasPlatform = inf.platforms.some((p) => selectedPlatforms.includes(p));
      if (!hasPlatform) return false;
    }

    // 4. Follower range slider
    const fCount = inf.follower_count || 0;
    if (fCount < minFollowers) return false;
    if (maxFollowers < 1000000 && fCount > maxFollowers) return false;

    // 5. Location
    if (locationSearch) {
      if (!inf.location) return false;
      const matchesLoc = inf.location.toLowerCase().includes(locationSearch.toLowerCase());
      if (!matchesLoc) return false;
    }

    // 5a. Structured Location Filter
    if (selectedCountry !== "all") {
      const matches = inf.location_country && inf.location_country.toLowerCase() === selectedCountry.toLowerCase();
      const fallback = inf.location && inf.location.toLowerCase().includes(selectedCountry.toLowerCase());
      if (!matches && !fallback) return false;
    }

    if (selectedStates.length > 0) {
      const matches = inf.location_state && selectedStates.includes(inf.location_state);
      const fallback = inf.location && selectedStates.some((s) => inf.location!.toLowerCase().includes(s.toLowerCase()));
      if (!matches && !fallback) return false;
    }

    if (selectedCities.length > 0) {
      const matches = inf.location_city && selectedCities.includes(inf.location_city);
      const fallback = inf.location && selectedCities.some((c) => inf.location!.toLowerCase().includes(c.toLowerCase()));
      if (!matches && !fallback) return false;
    }

    if (radiusLocationVal) {
      let infCoords = null;
      const rawCoords = (inf as any).location_coordinates;
      if (rawCoords) {
        if (typeof rawCoords === "object" && "x" in rawCoords && "y" in rawCoords) {
          infCoords = { lat: rawCoords.y, lng: rawCoords.x };
        } else if (typeof rawCoords === "string") {
          const clean = rawCoords.replace(/[()]/g, "");
          const parts = clean.split(",");
          if (parts.length === 2) {
            infCoords = { lat: parseFloat(parts[1]), lng: parseFloat(parts[0]) };
          }
        }
      }

      if (infCoords && radiusLocationVal.coordinates) {
        const distance = getDistance(
          infCoords.lat,
          infCoords.lng,
          radiusLocationVal.coordinates.lat,
          radiusLocationVal.coordinates.lng
        );
        if (distance > radiusKm) return false;
      } else {
        return false; // exclude if no coords
      }
    }

    // 5b. Smart Invite Locked Check (only matching creators can apply/be invited)
    const activeCard = brandCards.find((c) => c.id === activeCardId);
    if (activeCard && activeCard.location_requirement === "required") {
      const matchesCountry = activeCard.location_countries?.includes(inf.location_country);
      const matchesState = activeCard.location_states?.includes(inf.location_state);
      const matchesCity = activeCard.location_cities?.includes(inf.location_city);
      if (!matchesCountry && !matchesState && !matchesCity) {
        return false;
      }
    }

    // 6. Verified
    if (onlyVerified && !inf.is_verified) return false;

    // 7. Available: no active accepted deals (active room in chat)
    if (onlyAvailable) {
      if ((inf as any).availability_status === "busy" || (inf as any).availability_status === "on_break") {
        return false;
      }
      const hasActiveDeals = inf.rooms.some((r) => r.status === "active");
      if (hasActiveDeals) return false;
    }

    return true;
  });

  // Sorting
  const sortedInfluencers = [...filteredInfluencers].sort((a, b) => {
    const getAvgRating = (inf: InfluencerProfile) => {
      if (!inf.reviews || inf.reviews.length === 0) return 0;
      return inf.reviews.reduce((sum, r) => sum + r.rating, 0) / inf.reviews.length;
    };

    if (sortBy === "followers") {
      return (b.follower_count || 0) - (a.follower_count || 0);
    }
    if (sortBy === "collabs") {
      // number of accepted applications
      const countA = a.applications.filter((ap) => ap.status === "accepted").length;
      const countB = b.applications.filter((ap) => ap.status === "accepted").length;
      return countB - countA;
    }
    if (sortBy === "newest") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === "top_rated") {
      return getAvgRating(b) - getAvgRating(a);
    }
    // Default: Best Match
    // If brand has active cards, match by overlapping niches/platforms
    const getMatchScore = (inf: InfluencerProfile) => {
      let score = 0;
      const card = activeCardId 
        ? brandCards.find((c) => c.id === activeCardId) 
        : (brandCards && brandCards.length > 0 ? brandCards[0] : null);

      if (!card) return score;

      // Overlapping niches (max 9 pts)
      if (inf.niche && card.niche_tags) {
        const overlap = inf.niche.filter((n) => card.niche_tags.includes(n)).length;
        score += overlap * 3;
      }
      // Overlapping platforms (max 6 pts)
      if (inf.platforms && card.platform_requirements) {
        const overlap = inf.platforms.filter((p) => card.platform_requirements.includes(p)).length;
        score += overlap * 2;
      }
      // Follower count (max 2 pts)
      if ((inf.follower_count || 0) >= (card.min_followers || 0)) {
        score += 2;
      }
      // Location (max 5 pts)
      if (inf.location_city && card.location_cities?.includes(inf.location_city)) {
        score += 5;
      } else if (inf.location_state && card.location_states?.includes(inf.location_state)) {
        score += 3;
      } else if (inf.location_country && card.location_countries?.includes(inf.location_country)) {
        score += 1;
      }

      // Profile completeness bonus
      if ((inf as any).Brand_score) {
        score += Math.round((inf as any).Brand_score / 20);
      }

      return score;
    };

    return getMatchScore(b) - getMatchScore(a);
  });

  const toggleNiche = (niche: string) => {
    setSelectedNiches((prev) =>
      prev.includes(niche) ? prev.filter((n) => n !== niche) : [...prev, niche]
    );
  };

  const togglePlatform = (plat: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(plat) ? prev.filter((p) => p !== plat) : [...prev, plat]
    );
  };

  // Open direct invite modal
  const openInviteModal = (influencer: any) => {
    setTargetInfluencer(influencer);
    setIsInviteModalOpen(true);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardId || !targetInfluencer || !currentUser) return;
    setInviting(true);

    try {
      const { data: inviteData, error: inviteError } = await supabase
        .from("invites")
        .insert({
          card_id: selectedCardId,
          brand_id: currentUser.id,
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
        body: `Brand "${currentUserProfile?.display_name}" has invited you to apply for campaign "${selectedCampaign?.title}".`,
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

  const toggleInfluencerInList = async (listId: string, infId: string, isAdded: boolean) => {
    if (!currentUser) return;
    try {
      if (isAdded) {
        const { error } = await supabase
          .from("influencer_list_items")
          .delete()
          .eq("list_id", listId)
          .eq("influencer_id", infId);
        if (error) throw error;
        toast.success("Removed from list");
      } else {
        const { error } = await supabase
          .from("influencer_list_items")
          .insert({
            list_id: listId,
            influencer_id: infId,
          });
        if (error) throw error;
        toast.success("Added to list");
      }

      // Refresh list items count
      const { data: lists } = await supabase
        .from("influencer_lists")
        .select(`
          *,
          items:influencer_list_items(influencer_id)
        `)
        .eq("brand_id", currentUser.id);
      setBrandLists((lists as unknown as SavedList[]) || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Action failed.");
    }
  };

  const handleCreateList = async (e: React.FormEvent, infId: string) => {
    e.preventDefault();
    if (!newListName.trim() || !currentUser) return;
    setIsCreatingList(true);

    try {
      const { data: newList, error } = await supabase
        .from("influencer_lists")
        .insert({
          brand_id: currentUser.id,
          name: newListName.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Add influencer
      const { error: addError } = await supabase
        .from("influencer_list_items")
        .insert({
          list_id: newList.id,
          influencer_id: infId,
        });

      if (addError) throw addError;

      toast.success(`Created list "${newListName.trim()}" & saved creator`);
      setNewListName("");

      // Refresh lists
      const { data: lists } = await supabase
        .from("influencer_lists")
        .select(`
          *,
          items:influencer_list_items(influencer_id)
        `)
        .eq("brand_id", currentUser.id);
      setBrandLists((lists as unknown as SavedList[]) || []);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to create list.");
    } finally {
      setIsCreatingList(false);
    }
  };

  const getPlatformIcon = (plat: string) => {
    if (plat === "Instagram") return <InstagramIcon className="size-3 text-[#f472b6]" />;
    if (plat === "YouTube") return <YoutubeIcon className="size-3 text-[#f87171]" />;
    if (plat === "Twitter/X") return <TwitterIcon className="size-3 text-[rgba(251,251,239,0.7)]" />;
    if (plat === "LinkedIn") return <LinkedinIcon className="size-3 text-[#60a5fa]" />;
    return <Globe className="size-3 text-[rgba(251,251,239,0.5)]" />;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#fbfbef]">Discover Influencers</h1>
        <p className="text-sm text-[rgba(251,251,239,0.6)] mt-1">
          Explore and invite professional creators to your collaboration campaigns.
        </p>
      </div>

      {/* Filters & Search sticky bar */}
      <div className="sticky top-14 z-10 bg-black/90 backdrop-blur-md border border-[rgba(251,251,239,0.2)] rounded-2xl p-4 space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[rgba(251,251,239,0.4)]" />
            <input
              type="text"
              placeholder="Search creators by name or bio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0d0d0d] border border-[rgba(251,251,239,0.1)] rounded-full text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.4)] focus:outline-none focus:border-[#fbfbef] transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Active Card Selection (Smart Invite) */}
            <select
              value={activeCardId}
              onChange={(e) => {
                setActiveCardId(e.target.value);
                setSelectedCardId(e.target.value);
              }}
              className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.1)] rounded-full px-4 py-2.5 text-xs font-semibold text-[#fbfbef] focus:outline-none focus:border-[#fbfbef] max-w-[200px]"
            >
              <option value="">🎯 All Campaigns (Invite Mode)</option>
              {brandCards.map((card) => (
                <option key={card.id} value={card.id}>
                  Campaign: {card.title}
                </option>
              ))}
            </select>

            {/* Location Panel Toggler */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowLocationPanel(!showLocationPanel)}
                className={`border rounded-full px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  showLocationPanel || selectedCountry !== "all" || selectedStates.length > 0 || selectedCities.length > 0 || radiusLocationVal
                    ? "bg-[#fbfbef] text-black border-[#fbfbef]"
                    : "bg-[#0d0d0d] text-[#fbfbef] border-[rgba(251,251,239,0.1)] hover:border-[#fbfbef]"
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Location Filter</span>
                {(selectedCountry !== "all" || selectedStates.length > 0 || selectedCities.length > 0 || radiusLocationVal) && (
                  <span className="size-1.5 bg-red-500 rounded-full inline-block animate-pulse" />
                )}
              </button>

              {showLocationPanel && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-zinc-950 border border-zinc-800 p-5 shadow-2xl space-y-4 z-40 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">📍 Geo Location Filter</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCountry("all");
                        setSelectedStates([]);
                        setSelectedCities([]);
                        setRadiusLocationVal(null);
                        setShowLocationPanel(false);
                      }}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300 font-bold"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Country Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Country</label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => {
                        setSelectedCountry(e.target.value);
                        setSelectedStates([]);
                        setSelectedCities([]);
                      }}
                      className="w-full bg-black border border-zinc-900 rounded-lg p-2 text-xs text-[#fbfbef] outline-none"
                    >
                      <option value="all">All Countries</option>
                      <option value="India">🇮🇳 India</option>
                      <option value="United States">🇺🇸 United States</option>
                      <option value="United Kingdom">🇬🇧 United Kingdom</option>
                      <option value="Singapore">🇸🇬 Singapore</option>
                      <option value="United Arab Emirates">🇦🇪 UAE</option>
                    </select>
                  </div>

                  {/* States checklist */}
                  {selectedCountry === "India" && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">States</label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "West Bengal"].map((st) => (
                          <label key={st} className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                            <input
                              type="checkbox"
                              checked={selectedStates.includes(st)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedStates([...selectedStates, st]);
                                else setSelectedStates(selectedStates.filter((s) => s !== st));
                              }}
                              className="rounded bg-black border-zinc-850 size-3.5 accent-[#fbfbef]"
                            />
                            <span>{st}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cities checklist */}
                  {selectedCountry === "India" && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Popular Cities</label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {["Mumbai", "Delhi", "Bangalore", "Pune", "Kolkata", "Chennai"].map((ct) => (
                          <label key={ct} className="flex items-center gap-1.5 cursor-pointer text-zinc-300">
                            <input
                              type="checkbox"
                              checked={selectedCities.includes(ct)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedCities([...selectedCities, ct]);
                                else setSelectedCities(selectedCities.filter((c) => c !== ct));
                              }}
                              className="rounded bg-black border-zinc-850 size-3.5 accent-[#fbfbef]"
                            />
                            <span>{ct}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Radius search */}
                  <div className="border-t border-zinc-900 pt-3.5 space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Or Search by Radius</label>
                    <div className="flex gap-2 items-center text-xs">
                      <span>Within</span>
                      <select
                        value={radiusKm}
                        onChange={(e) => setRadiusKm(Number(e.target.value))}
                        className="bg-black border border-zinc-900 rounded p-1 text-[#fbfbef]"
                      >
                        <option value="25">25 km</option>
                        <option value="50">50 km</option>
                        <option value="100">100 km</option>
                        <option value="250">250 km</option>
                      </select>
                      <span>of:</span>
                    </div>
                    <LocationPicker
                      value={radiusLocationVal}
                      onChange={setRadiusLocationVal}
                      placeholder="Center city..."
                      allowAreaInput={false}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowLocationPanel(false)}
                    className="w-full bg-[#fbfbef] text-black font-bold text-xs py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Apply Filter
                  </button>
                </div>
              )}
            </div>

            <input
              type="text"
              placeholder="Search area text..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.1)] rounded-full px-4 py-2.5 text-xs text-[#fbfbef] placeholder-[rgba(251,251,239,0.4)] focus:outline-none focus:border-[#fbfbef] max-w-[140px]"
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.1)] rounded-full px-4 py-2.5 text-xs font-semibold text-[#fbfbef] focus:outline-none focus:border-[#fbfbef]"
            >
              <option value="best_match">Sort: Best Match</option>
              <option value="followers">Sort: Most Followers</option>
              <option value="collabs">Sort: Most Collabs Done</option>
              <option value="newest">Sort: Newest</option>
              <option value="top_rated">Sort: Top Rated</option>
            </select>
          </div>
        </div>

        {/* Niche Chips */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-[rgba(251,251,239,0.5)] font-bold">
            Creator Niches
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto scrollbar-thin">
            {NICHES.map((niche) => {
              const isSelected = selectedNiches.includes(niche);
              return (
                <button
                  key={niche}
                  onClick={() => toggleNiche(niche)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1 ${
                    isSelected
                      ? "bg-[#fbfbef] text-black"
                      : "bg-[#0d0d0d] text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)] hover:border-[rgba(251,251,239,0.4)]"
                  }`}
                >
                  {isSelected && <Check className="size-3 stroke-[3]" />}
                  <span>{niche}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Platform selection & slider row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-[rgba(251,251,239,0.1)] items-center">
          {/* Platforms */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-[rgba(251,251,239,0.5)] font-bold block">
              Filter by Platform
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((plat) => {
                const isSelected = selectedPlatforms.includes(plat);
                return (
                  <button
                    key={plat}
                    onClick={() => togglePlatform(plat)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                      isSelected
                        ? "bg-[#fbfbef] text-black"
                        : "bg-[#141414] text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)]"
                    }`}
                  >
                    {plat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Follower Range Slider */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-[rgba(251,251,239,0.5)]">
              <span>Follower Reach Range</span>
              <span className="text-[#fbfbef]">
                {(minFollowers / 1000).toFixed(0)}K → {maxFollowers >= 1000000 ? "1M+" : `${(maxFollowers / 1000).toFixed(0)}K`}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1000"
                max="1000000"
                step="5000"
                value={maxFollowers}
                onChange={(e) => setMaxFollowers(Number(e.target.value))}
                className="w-full h-1 bg-[#141414] rounded-lg appearance-none cursor-pointer accent-[#fbfbef]"
              />
            </div>
          </div>
        </div>

        {/* Availability & Verified Toggles */}
        <div className="flex flex-wrap gap-6 pt-2 border-t border-[rgba(251,251,239,0.05)] items-center">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-[rgba(251,251,239,0.8)]">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="rounded bg-[#0d0d0d] border-[rgba(251,251,239,0.2)] text-black focus:ring-0 focus:ring-offset-0 size-4 cursor-pointer accent-[#fbfbef]"
            />
            <span>Available (no current active campaigns)</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-[rgba(251,251,239,0.8)]">
            <input
              type="checkbox"
              checked={onlyVerified}
              onChange={(e) => setOnlyVerified(e.target.checked)}
              className="rounded bg-[#0d0d0d] border-[rgba(251,251,239,0.2)] text-black focus:ring-0 focus:ring-offset-0 size-4 cursor-pointer accent-[#fbfbef]"
            />
            <span>Verified Creators Only</span>
          </label>
        </div>
      </div>

      {/* Influencers Directory grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.1)] animate-pulse" />
          ))}
        </div>
      ) : sortedInfluencers.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[rgba(251,251,239,0.2)] rounded-2xl max-w-md mx-auto">
          <HelpCircle className="size-12 text-[rgba(251,251,239,0.2)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#fbfbef]">No Creators Found</h3>
          <p className="text-sm text-[rgba(251,251,239,0.6)] mt-1">
            Try adjusting your search filters or range.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {sortedInfluencers.map((inf) => {
            const avgRating =
              inf.reviews.length > 0
                ? (inf.reviews.reduce((sum, r) => sum + r.rating, 0) / inf.reviews.length).toFixed(1)
                : "N/A";

            const collabsCount = inf.applications.filter((a) => a.status === "accepted").length;
            const workedTogetherBefore = inf.rooms?.some((r) => r.brand_id === currentUser?.id);
            const isCompared = compareIds.includes(inf.id);

            return (
              <div
                key={inf.id}
                className="group flex flex-col justify-between bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] rounded-2xl overflow-hidden hover:border-[rgba(251,251,239,0.4)] transition-all duration-300 lift-hover p-5 space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Header Card */}
                  <div className="flex justify-between items-start">
                    {/* Avatar */}
                    <div className="size-14 rounded-2xl border border-[rgba(251,251,239,0.2)] bg-black overflow-hidden flex items-center justify-center">
                      {inf.avatar_url ? (
                        <img src={inf.avatar_url} alt={inf.display_name} className="size-full object-cover" />
                      ) : (
                        <span className="text-base font-bold text-black bg-[#fbfbef] size-full flex items-center justify-center">
                          {inf.display_name[0].toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Actions and Bookmark */}
                    <div className="flex items-center gap-2">
                      {/* Compare Checkbox */}
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isCompared}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (compareIds.length >= 3) {
                                toast.error("You can compare up to 3 creators at a time.");
                                return;
                              }
                              setCompareIds([...compareIds, inf.id]);
                            } else {
                              setCompareIds(compareIds.filter((id) => id !== inf.id));
                            }
                          }}
                          className="rounded bg-black border-zinc-800 size-3.5 accent-[#fbfbef]"
                        />
                        <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider sr-only">Compare</span>
                      </label>

                      {/* Bookmark Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveDropdownId(activeDropdownId === inf.id ? null : inf.id)
                          }
                          className="p-1.5 rounded-full hover:bg-[#141414] border border-[rgba(251,251,239,0.1)] text-[rgba(251,251,239,0.6)] hover:text-[#fbfbef]"
                        >
                          <Bookmark className="size-3.5" />
                        </button>

                        {activeDropdownId === inf.id && (
                          <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl bg-black border border-[rgba(251,251,239,0.2)] p-3 shadow-xl space-y-2 z-20">
                            <span className="text-[9px] uppercase tracking-wider text-[rgba(251,251,239,0.4)] font-bold block">
                              Save Creator
                            </span>
                            <div className="space-y-1 max-h-28 overflow-y-auto scrollbar-thin">
                              {brandLists.length === 0 ? (
                                <p className="text-[10px] text-[rgba(251,251,239,0.4)]">No lists created.</p>
                              ) : (
                                brandLists.map((list) => {
                                  const isAdded = list.items.some((i) => i.influencer_id === inf.id);
                                  return (
                                    <button
                                      key={list.id}
                                      onClick={() => toggleInfluencerInList(list.id, inf.id, isAdded)}
                                      className="w-full text-left rounded-lg px-2 py-1 text-[10px] font-semibold hover:bg-[#141414] flex items-center justify-between"
                                    >
                                      <span>{list.name}</span>
                                      {isAdded && <Check className="size-3 text-[#fbfbef]" />}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                            <form
                              onSubmit={(e) => handleCreateList(e, inf.id)}
                              className="pt-1.5 border-t border-[rgba(251,251,239,0.1)] flex gap-1.5"
                            >
                              <input
                                type="text"
                                placeholder="New list..."
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                className="flex-1 bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-full px-2 py-1 text-[10px] text-[#fbfbef] outline-none"
                              />
                              <button
                                type="submit"
                                disabled={isCreatingList || !newListName.trim()}
                                className="size-5 rounded-full bg-[#fbfbef] text-black hover:opacity-95 flex items-center justify-center disabled:opacity-50 shrink-0"
                              >
                                <Plus className="size-3" />
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Name and Niches */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1">
                      <h4 className="font-extrabold text-sm text-[#fbfbef] group-hover:text-white truncate">
                        {inf.display_name}
                      </h4>
                      {inf.is_verified && (
                        <ShieldCheck className="size-4 text-[#fbfbef] fill-black stroke-[2] shrink-0" />
                      )}
                    </div>

                    {/* Worked together before and match badges */}
                    <div className="flex flex-wrap gap-1 items-center">
                      {workedTogetherBefore && (
                        <span className="bg-green-500/10 border border-green-500/25 px-1.5 py-0.5 rounded text-[8px] font-bold text-green-400 uppercase">
                          Worked with you
                        </span>
                      )}

                      {((inf as any).trending_score > 0) && (
                        <span className="bg-orange-500/10 border border-orange-500/25 px-1.5 py-0.5 rounded text-[8px] font-bold text-orange-400 uppercase shrink-0 animate-pulse">
                          🔥 Trending
                        </span>
                      )}

                      {activeCardId && (() => {
                        const card = brandCards.find((c) => c.id === activeCardId);
                        if (!card) return null;
                        const matchesCountry = card.location_countries?.includes(inf.location_country);
                        const matchesState = card.location_states?.includes(inf.location_state);
                        const matchesCity = card.location_cities?.includes(inf.location_city);
                        const isMatch = matchesCountry || matchesState || matchesCity;
                        
                        if (isMatch) {
                          return (
                            <span className="bg-[#fbfbef] text-black px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 animate-pulse">
                              ⚡ Perfect Match
                            </span>
                          );
                        }
                        return null;
                      })()}

                      {/* Availability status dot */}
                      {((inf as any).availability_status === "busy") ? (
                        <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 rounded text-[8px] font-bold uppercase">
                          Busy
                        </span>
                      ) : ((inf as any).availability_status === "on_break") ? (
                        <span className="bg-zinc-800 text-zinc-400 px-1 rounded text-[8px] font-bold uppercase">
                          Break
                        </span>
                      ) : (
                        <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-1 rounded text-[8px] font-bold uppercase">
                          Available
                        </span>
                      )}

                      {/* Trust Score */}
                      {(inf as any).Brand_score ? (
                        <span className="bg-zinc-900 border border-zinc-850 text-zinc-300 px-1.5 py-0.5 rounded text-[8px] font-black">
                          Score: {(inf as any).Brand_score}
                        </span>
                      ) : null}
                    </div>

                    <span className="text-[10px] text-[rgba(251,251,239,0.5)] font-semibold truncate block">
                      {(inf.niche || []).slice(0, 2).join(" · ") || "Lifestyle"}
                    </span>
                    {inf.location && (
                      <span className="text-[9px] text-[rgba(251,251,239,0.4)] flex items-center gap-0.5 mt-0.5">
                        <MapPin className="size-2.5" />
                        <span>{countryCodeToFlag((inf as any).location_country_code || "IN")}</span>
                        <span>{inf.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Bio */}
                  <p className="text-[11px] text-[rgba(251,251,239,0.65)] line-clamp-2 leading-relaxed min-h-[32px]">
                    {inf.bio || "No biography details added yet."}
                  </p>

                  {/* Platform Icons and Followers */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {(inf.platforms || []).map((p) => (
                      <div
                        key={p}
                        className="rounded-full bg-[#141414] border border-[rgba(251,251,239,0.1)] px-2 py-0.5 text-[9px] font-bold flex items-center gap-1"
                      >
                        {getPlatformIcon(p)}
                        <span>{p}</span>
                      </div>
                    ))}
                    <span className="text-[10px] font-bold text-[#fbfbef] ml-auto">
                      {inf.follower_count ? `${(inf.follower_count / 1000).toFixed(0)}K` : "10K"} Reach
                    </span>
                  </div>
                </div>

                {/* Footer and invite action */}
                <div className="space-y-3 pt-2 border-t border-[rgba(251,251,239,0.05)]">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-[rgba(251,251,239,0.6)]">
                    <span>{collabsCount} Collabs Done</span>
                    <span className="flex items-center gap-0.5">
                      <Star className="size-3 text-[#fbbf24] fill-[#fbbf24]" />
                      {avgRating} Rating
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/p/influencer/${inf.id}`}
                      className="text-center rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] text-[#fbfbef] hover:bg-[#1c1c1c] py-1.5 text-xs font-bold transition-colors"
                    >
                      View Profile
                    </Link>
                    <button
                      onClick={() => openInviteModal(inf)}
                      className="text-center rounded-full bg-[#fbfbef] text-black hover:bg-[#eaeaea] py-1.5 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                    >
                      <Sparkles className="size-3" />
                      <span>Invite →</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && targetInfluencer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d0d0d] p-6 border border-[rgba(251,251,239,0.2)] shadow-glow space-y-4">
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
      {/* Sticky Compare Bar */}
      {compareIds.length >= 2 && (
        <div className="fixed bottom-6 inset-x-6 z-40 max-w-lg mx-auto bg-zinc-950 border border-zinc-800 rounded-full px-6 py-3.5 shadow-2xl flex items-center justify-between text-xs text-[#fbfbef] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2">
            <span className="font-bold">Compare Mode:</span>
            <span className="bg-[#fbfbef] text-black rounded-full px-2 py-0.5 font-bold text-[10px]">
              {compareIds.length} Selected
            </span>
            <div className="flex -space-x-2.5 ml-2">
              {compareIds.map((id) => {
                const c = influencers.find((i) => i.id === id);
                return c?.avatar_url ? (
                  <img
                    key={id}
                    src={c.avatar_url}
                    alt=""
                    className="size-6 rounded-full border border-black object-cover shrink-0"
                  />
                ) : (
                  <div key={id} className="size-6 rounded-full bg-zinc-800 border border-black flex items-center justify-center font-bold text-[10px] shrink-0">
                    {c?.display_name[0]?.toUpperCase()}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => setCompareIds([])}
              className="text-zinc-400 hover:text-zinc-200 font-bold"
            >
              Clear
            </button>
            <Link
              href={`/dashboard/brand/influencers/compare?ids=${compareIds.join(",")}`}
              className="bg-[#fbfbef] text-black hover:bg-[#eaeaea] px-4 py-2 rounded-full font-bold text-[11px] transition-all"
            >
              Compare Creators →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
