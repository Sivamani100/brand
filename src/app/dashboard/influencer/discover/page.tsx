"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { calculateMatchScore, getDistance, parsePoint } from "@/lib/utils/matching";
import { Search, Compass, Award, SlidersHorizontal, AlertCircle, Heart, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import LocationPicker, { LocationValue } from "@/components/shared/LocationPicker";

const CATEGORIES = ["Fashion", "Tech", "Food", "Fitness", "Beauty", "Travel", "Gaming", "Lifestyle"];
const PLATFORMS = ["Instagram", "YouTube", "TikTok", "Twitter/X", "LinkedIn"];

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

export default function DiscoverPage() {
  const { profile, user } = useUser();
  const supabase = createClient();

  const [cards, setCards] = useState<any[]>([]);
  const [savedCardIds, setSavedCardIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "best_match" | "deadline">("newest");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Location filter states
  const [selectedLocation, setSelectedLocation] = useState<LocationValue | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(50);
  const [locationRequirementFilter, setLocationRequirementFilter] = useState<"all" | "none" | "preferred" | "required">("all");

  useEffect(() => {
    async function loadDiscoverCards() {
      setLoading(true);

      // Fetch all active cards
      const { data: activeCards, error } = await supabase
        .from("cards")
        .select(`
          *,
          brand:profiles!cards_brand_id_fkey(*)
        `)
        .eq("status", "active");

      if (error) {
        console.error("Failed to load discover cards", error);
        setLoading(false);
        return;
      }

      setCards(activeCards || []);

      if (user) {
        const { data: saved } = await supabase
          .from("saved_cards")
          .select("card_id")
          .eq("influencer_id", user.id);
        setSavedCardIds((saved?.map((s) => s.card_id).filter((id): id is string => !!id)) || []);
      }

      setLoading(false);
    }

    loadDiscoverCards();
  }, [user]);

  const toggleSaveCard = async (cardId: string) => {
    if (!user) {
      toast.error("Please sign in to save cards.");
      return;
    }
    const isSaved = savedCardIds.includes(cardId);
    try {
      if (isSaved) {
        const { error } = await supabase
          .from("saved_cards")
          .delete()
          .eq("influencer_id", user.id)
          .eq("card_id", cardId);
        if (error) throw error;
        setSavedCardIds((prev) => prev.filter((id) => id !== cardId));
        toast.success("Card removed from wishlist");
      } else {
        const { error } = await supabase
          .from("saved_cards")
          .insert({
            influencer_id: user.id,
            card_id: cardId,
          });
        if (error) throw error;
        setSavedCardIds((prev) => [...prev, cardId]);
        toast.success("Card saved to wishlist");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Action failed");
    }
  };

  // Client side filtering & sorting
  const getFilteredAndSortedCards = () => {
    let result = [...cards];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((c) => c.category === categoryFilter);
    }

    // Platform filter
    if (platformFilter !== "all") {
      result = result.filter((c) => c.platform_requirements?.includes(platformFilter));
    }

    // Location requirement filter
    if (locationRequirementFilter !== "all") {
      result = result.filter((c) => c.location_requirement === locationRequirementFilter);
    }

    // Selected location filter
    if (selectedLocation) {
      const selectedCoords = selectedLocation.coordinates;
      const selectedCity = selectedLocation.city;
      const selectedState = selectedLocation.state;
      const selectedCountry = selectedLocation.country;

      result = result.filter((c) => {
        const cardLocationReq = c.location_requirement || "none";
        if (cardLocationReq === "none") {
          return true;
        }

        const cardCountries = c.location_countries || [];
        const cardStates = c.location_states || [];
        const cardCities = c.location_cities || [];
        const cardRadiusKm = c.location_radius_km;
        const cardCoords = c.location_coordinates;

        // Radius match
        if (cardRadiusKm && cardCoords && selectedCoords) {
          const center = parsePoint(cardCoords);
          if (center) {
            const dist = getDistance(center.lat, center.lng, selectedCoords.lat, selectedCoords.lng);
            return dist <= cardRadiusKm + radiusKm;
          }
        }

        // Region name matching
        const matchesCountry = selectedCountry && cardCountries.some((co: string) => co.toLowerCase() === selectedCountry.toLowerCase());
        const matchesState = selectedState && cardStates.some((st: string) => st.toLowerCase() === selectedState.toLowerCase());
        const matchesCity = selectedCity && cardCities.some((ci: string) => ci.toLowerCase() === selectedCity.toLowerCase());

        return !!(matchesCountry || matchesState || matchesCity);
      });
    }

    // Map matching scores
    const scoredResult = result.map((c) => ({
      ...c,
      matchScore: profile ? calculateMatchScore(c, profile) : 0,
    }));

    // Sorting logic
    scoredResult.sort((a, b) => {
      if (sortBy === "newest") {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      } else if (sortBy === "best_match") {
        return b.matchScore - a.matchScore;
      } else {
        const dateA = a.application_deadline ? new Date(a.application_deadline).getTime() : 0;
        const dateB = b.application_deadline ? new Date(b.application_deadline).getTime() : 0;
        return dateA - dateB;
      }
    });

    return scoredResult;
  };

  const finalCards = getFilteredAndSortedCards();

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[#0d0d0d] rounded-lg" />
        <div className="h-12 w-full bg-[#0d0d0d] rounded-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-[#0d0d0d] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef] font-sans">
          Discover Collaboration Campaigns
        </h1>
        <p className="text-xs text-[rgba(251,251,239,0.6)]">
          Explore and apply to active brand partnerships
        </p>
      </div>

      {/* Search Bar & Primary filters */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[rgba(251,251,239,0.4)]" />
            <input
              type="text"
              placeholder="Search campaigns, brands or keywords..."
              className="w-full rounded-full bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] pl-11 pr-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`rounded-full border border-[rgba(251,251,239,0.2)] bg-[#0d0d0d] p-3 text-[#fbfbef] hover:bg-[#141414] scale-active flex items-center gap-2 text-xs font-semibold`}
          >
            <SlidersHorizontal className="size-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Dynamic Category Chips Row */}
        <div className="flex flex-wrap gap-2 pb-2">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all scale-active ${
              categoryFilter === "all"
                ? "bg-[#fbfbef] text-black font-bold"
                : "bg-[#0d0d0d] text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)] hover:border-[rgba(251,251,239,0.3)]"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all scale-active ${
                categoryFilter === cat
                  ? "bg-[#fbfbef] text-black font-bold"
                  : "bg-[#0d0d0d] text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)] hover:border-[rgba(251,251,239,0.3)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Expanded Filters Drawer/Panel */}
        {showFiltersPanel && (
          <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Target platform filter */}
            <div>
              <label className="text-[10px] uppercase font-bold text-[rgba(251,251,239,0.4)] tracking-wider">
                Platforms
              </label>
              <select
                className="mt-2 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-2 text-xs text-[#fbfbef] input-focus-animate"
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
              >
                <option value="all">All Platforms</option>
                {PLATFORMS.map((plat) => (
                  <option key={plat} value={plat}>
                    {plat}
                  </option>
                ))}
              </select>
            </div>

            {/* Sorting */}
            <div>
              <label className="text-[10px] uppercase font-bold text-[rgba(251,251,239,0.4)] tracking-wider">
                Sort By
              </label>
              <select
                className="mt-2 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-2 text-xs text-[#fbfbef] input-focus-animate"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="newest">Newest Campaigns</option>
                <option value="best_match">Best Match Score</option>
                <option value="deadline">Deadline (Soonest)</option>
              </select>
            </div>

            {/* Location Type Requirement */}
            <div>
              <label className="text-[10px] uppercase font-bold text-[rgba(251,251,239,0.4)] tracking-wider">
                Location Requirement
              </label>
              <select
                className="mt-2 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-2 text-xs text-[#fbfbef] input-focus-animate"
                value={locationRequirementFilter}
                onChange={(e) => setLocationRequirementFilter(e.target.value as any)}
              >
                <option value="all">All (Remote + Local)</option>
                <option value="none">Remote Only (None)</option>
                <option value="preferred">Location Preferred</option>
                <option value="required">Strictly Required</option>
              </select>
            </div>

            {/* Search Location Picker */}
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-[rgba(251,251,239,0.4)] tracking-wider mb-2">
                Filter by Location Proximity
              </label>
              <LocationPicker
                value={selectedLocation}
                onChange={(val) => setSelectedLocation(val)}
                placeholder="Search target city..."
                allowAreaInput={false}
              />
              {selectedLocation && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-[rgba(251,251,239,0.5)]">
                    <span>Proximity Radius:</span>
                    <span className="font-bold text-[#fbfbef]">{radiusKm} km</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full accent-[#fbfbef] bg-[#141414] h-1 rounded-lg cursor-pointer"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Catalog Cards Grid */}
      {finalCards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[rgba(251,251,239,0.2)] p-12 text-center max-w-lg mx-auto">
          <AlertCircle className="size-8 text-[rgba(251,251,239,0.4)] mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-[#fbfbef]">No Campaigns Matched</h3>
          <p className="text-xs text-[rgba(251,251,239,0.6)] mt-1">
            Try adjusting your search criteria or categories to find matching partnerships.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {finalCards.map((card) => (
            <div
              key={card.id}
              className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] overflow-hidden lift-hover flex flex-col justify-between"
            >
              <div>
                {/* Cover Preview */}
                <div className="aspect-video w-full bg-[#141414] relative">
                  {card.cover_image_url ? (
                    <img src={card.cover_image_url} alt={card.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[rgba(251,251,239,0.1)]">
                      <Award className="size-12" />
                    </div>
                  )}
                  <span
                    className={`absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                      CATEGORY_COLORS[card.category] || "bg-white text-black"
                    }`}
                  >
                    {card.category}
                  </span>
                  {card.matchScore > 0 && (
                    <span className="absolute top-3 right-11 rounded-full bg-[#4ade80]/90 text-black text-[9px] font-bold px-2 py-0.5">
                      Match: +{card.matchScore}
                    </span>
                  )}
                  
                  {/* Bookmark Button */}
                  <button
                    onClick={() => toggleSaveCard(card.id)}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 border border-[rgba(251,251,239,0.1)] text-[#fb7185] hover:text-white transition-all scale-active"
                    title={savedCardIds.includes(card.id) ? "Unsave Card" : "Save Card"}
                  >
                    <Heart
                      className={`size-3.5 transition-all ${
                        savedCardIds.includes(card.id) ? "fill-[#fb7185] stroke-[#fb7185]" : "text-[rgba(251,251,239,0.6)]"
                      }`}
                    />
                  </button>
                </div>

                {/* Campaign and Brand Info */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="size-5 rounded-full border border-[rgba(251,251,239,0.2)] bg-black overflow-hidden flex items-center justify-center">
                      {card.brand?.avatar_url ? (
                        <img src={card.brand.avatar_url} alt="Brand" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[9px] font-bold text-black bg-[#fbfbef] size-full flex items-center justify-center">
                          {card.brand?.display_name[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[rgba(251,251,239,0.6)] font-semibold">
                      {card.brand?.display_name || "Partner"}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#fbfbef] line-clamp-1">{card.title}</h3>
                  <p className="text-xs text-[rgba(251,251,239,0.6)] line-clamp-2 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>

              {/* Specs & Apply button */}
              <div className="p-5 pt-0 border-t border-[rgba(251,251,239,0.05)] mt-3 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] text-[rgba(251,251,239,0.4)] uppercase">Budget</span>
                  <span className="text-xs font-bold text-[#fbfbef]">{card.budget_range}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {card.platform_requirements?.map((p: string) => (
                      <span key={p} title={p} className="text-xs">
                        {PLATFORM_ICONS[p] || "🌐"}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/dashboard/influencer/discover/${card.id}`}
                    className="rounded-full bg-[#fbfbef] text-black font-bold px-3 py-1.5 text-xs hover:opacity-90 scale-active"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
