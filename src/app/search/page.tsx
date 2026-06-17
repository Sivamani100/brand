"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import {
  Search as SearchIcon,
  Compass,
  ArrowLeft,
  X,
  History,
  TrendingUp,
  Award,
  Star,
  MapPin,
  ShieldCheck,
  Building2,
  User,
  Globe,
  Bookmark,
  Trash2,
} from "lucide-react";
import { InstagramIcon, YoutubeIcon, TwitterIcon, LinkedinIcon } from "@/components/shared/SocialIcons";
import Link from "next/link";
import toast from "react-hot-toast";

// Card categories mapping
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

const SUGGESTED_SEARCHES = [
  "Fashion",
  "Fitness Collab",
  "Tech Review",
  "Instagram Reel",
  "YouTube Sponsor",
];

export default function GlobalSearchPage() {
  const router = useRouter();
  const supabase = createClient() as any;
  const { user } = useUser();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "cards" | "brands" | "influencers" >("all");

  const [cards, setCards] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [influencers, setInfluencers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);

  const fetchSavedSearches = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setSavedSearches(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // LocalStorage Search History & Saved Searches loading
  useEffect(() => {
    const saved = localStorage.getItem("brand_recent_searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchSavedSearches();
    }
  }, [user]);

  // Debounce query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Dynamic Full-Text search query execution
  useEffect(() => {
    async function searchDatabase() {
      setLoading(true);
      try {
        const term = debouncedQuery.trim();
        if (!term) {
          // If empty, load latest 10 featured items for feed recommendation
          const { data: cData } = await supabase
            .from("cards")
            .select("*, brand:profiles!cards_brand_id_fkey(*)")
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(10);

          const { data: bData } = await supabase
            .from("profiles")
            .select("*, cards:cards(id, status), rooms:rooms(id, status)")
            .eq("role", "brand")
            .order("created_at", { ascending: false })
            .limit(10);

          const { data: iData } = await supabase
            .from("profiles")
            .select(`
              *,
              applications:applications(id, status),
              rooms:rooms(id, status),
              reviews:reviews!reviews_reviewed_id_fkey(id, rating)
            `)
            .eq("role", "influencer")
            .order("created_at", { ascending: false })
            .limit(10);

          setCards(cData || []);
          setBrands(bData || []);
          setInfluencers(iData || []);
        } else {
          // Perform full-text search leveraging @@ plainto_tsquery index
          const { data: cData } = await supabase
            .from("cards")
            .select("*, brand:profiles!cards_brand_id_fkey(*)")
            .eq("status", "active")
            .textSearch("search_vector", term);

          const { data: bData } = await supabase
            .from("profiles")
            .select("*, cards:cards(id, status), rooms:rooms(id, status)")
            .eq("role", "brand")
            .textSearch("search_vector", term);

          const { data: iData } = await supabase
            .from("profiles")
            .select(`
              *,
              applications:applications(id, status),
              rooms:rooms(id, status),
              reviews:reviews!reviews_reviewed_id_fkey(id, rating)
            `)
            .eq("role", "influencer")
            .textSearch("search_vector", term);

          setCards(cData || []);
          setBrands(bData || []);
          setInfluencers(iData || []);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to retrieve search results");
      } finally {
        setLoading(false);
      }
    }

    searchDatabase();
  }, [debouncedQuery]);

  const handleSaveSearchTerm = (term: string) => {
    if (!term.trim()) return;
    const cleanTerm = term.trim();
    const updated = [cleanTerm, ...recentSearches.filter((t) => t !== cleanTerm)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("brand_recent_searches", JSON.stringify(updated));
  };

  const handleClearRecent = (term: string) => {
    const updated = recentSearches.filter((t) => t !== term);
    setRecentSearches(updated);
    localStorage.setItem("brand_recent_searches", JSON.stringify(updated));
  };

  const handleSearchTrigger = (term: string) => {
    setQuery(term);
    handleSaveSearchTerm(term);
  };

  const handleSaveSearchQuery = async () => {
    if (!debouncedQuery.trim()) return;
    if (!user) {
      toast.error("You must be logged in to save search queries");
      return;
    }

    const searchName = prompt("Name this saved search filter:", `${debouncedQuery} (${activeTab})`);
    if (!searchName) return;

    try {
      const typeMap = activeTab === "all" ? "cards" : activeTab;
      const { error } = await supabase.from("saved_searches").insert({
        user_id: user.id,
        name: searchName,
        search_type: typeMap,
        filters: { query: debouncedQuery, tab: activeTab },
      });

      if (error) throw error;
      toast.success("Search filter saved!");
      fetchSavedSearches();
    } catch (e: any) {
      toast.error(e.message || "Failed to save search filter");
    }
  };

  const handleDeleteSavedSearch = async (id: string) => {
    try {
      const { error } = await supabase.from("saved_searches").delete().eq("id", id);
      if (error) throw error;
      toast.success("Saved search deleted");
      fetchSavedSearches();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete saved search");
    }
  };

  const totalResultsCount = cards.length + brands.length + influencers.length;

  const highlightTerm = (text: string | null, highlight: string) => {
    if (!text) return "";
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-yellow-500/30 text-white font-semibold rounded px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const getPlatformIcon = (plat: string) => {
    if (plat === "Instagram") return <InstagramIcon className="size-3 text-[#f472b6]" />;
    if (plat === "YouTube") return <YoutubeIcon className="size-3 text-[#f87171]" />;
    if (plat === "Twitter/X") return <TwitterIcon className="size-3 text-[rgba(251,251,239,0.7)]" />;
    if (plat === "LinkedIn") return <LinkedinIcon className="size-3 text-[#60a5fa]" />;
    return <Globe className="size-3 text-[rgba(251,251,239,0.5)]" />;
  };

  return (
    <div className="min-h-screen bg-black text-[#fbfbef] px-6 py-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Back navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[rgba(251,251,239,0.6)] hover:text-[#fbfbef] transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Global Search Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-[rgba(251,251,239,0.4)]" />
            <input
              type="text"
              placeholder="Search campaign cards, brands, or creator niches..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveSearchTerm(query)}
              className="w-full pl-12 pr-10 py-3.5 bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] rounded-full text-base text-[#fbfbef] placeholder-[rgba(251,251,239,0.4)] focus:outline-none focus:border-[#fbfbef] transition-all"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[rgba(251,251,239,0.5)] hover:text-white"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          {query.trim().length > 0 && (
            <button
              onClick={handleSaveSearchQuery}
              className="flex items-center gap-2 bg-[#141414] hover:bg-[#1c1c1c] border border-[rgba(251,251,239,0.15)] rounded-full px-5 py-3.5 text-xs font-bold transition-all shrink-0"
              title="Save search filter settings"
            >
              <Bookmark className="size-4" />
              <span className="hidden sm:inline">Save Filter</span>
            </button>
          )}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[rgba(251,251,239,0.2)] border-t-[#fbfbef]" />
          </div>
        ) : !debouncedQuery ? (
          /* Suggestion Page */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
            {/* Recent Searches */}
            <div className="space-y-4 md:col-span-1">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-[rgba(251,251,239,0.4)] flex items-center gap-1.5">
                <History className="size-3.5" />
                <span>Recent Searches</span>
              </h3>

              {recentSearches.length === 0 ? (
                <p className="text-xs text-[rgba(251,251,239,0.5)]">No recent searches saved.</p>
              ) : (
                <div className="space-y-1">
                  {recentSearches.map((term) => (
                    <div
                      key={term}
                      className="flex items-center justify-between hover:bg-[#0d0d0d] rounded-xl px-3 py-2 text-xs font-semibold text-[rgba(251,251,239,0.75)] hover:text-[#fbfbef] group"
                    >
                      <button
                        onClick={() => handleSearchTrigger(term)}
                        className="flex-1 text-left"
                      >
                        {term}
                      </button>
                      <button
                        onClick={() => handleClearRecent(term)}
                        className="text-[rgba(251,251,239,0.4)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Saved Searches */}
            <div className="space-y-4 md:col-span-1">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-[rgba(251,251,239,0.4)] flex items-center gap-1.5">
                <Bookmark className="size-3.5" />
                <span>Saved Searches</span>
              </h3>

              {savedSearches.length === 0 ? (
                <p className="text-xs text-[rgba(251,251,239,0.5)]">No saved searches yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {savedSearches.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between bg-[#0d0d0d] hover:bg-[#141414] border border-[rgba(251,251,239,0.06)] rounded-xl px-4 py-2.5 text-xs text-[rgba(251,251,239,0.85)] group transition-all"
                    >
                      <button
                        onClick={() => {
                          setQuery(s.filters.query);
                          if (s.filters.tab) setActiveTab(s.filters.tab);
                          handleSaveSearchTerm(s.filters.query);
                        }}
                        className="flex-1 text-left font-bold text-[#fbfbef] hover:underline"
                      >
                        {s.name}
                      </button>
                      <button
                        onClick={() => handleDeleteSavedSearch(s.id)}
                        className="text-[rgba(251,251,239,0.4)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Popular Topics */}
            <div className="space-y-4 md:col-span-1">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-[rgba(251,251,239,0.4)] flex items-center gap-1.5">
                <TrendingUp className="size-3.5" />
                <span>Suggested Keywords</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_SEARCHES.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSearchTrigger(term)}
                    className="px-4 py-2 bg-[#0d0d0d] hover:bg-[#141414] border border-[rgba(251,251,239,0.1)] hover:border-[rgba(251,251,239,0.3)] text-xs font-bold rounded-full transition-all"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : totalResultsCount === 0 ? (
          /* Empty results state */
          <div className="text-center py-20 border border-dashed border-[rgba(251,251,239,0.15)] rounded-3xl max-w-md mx-auto">
            <X className="size-10 text-[rgba(251,251,239,0.2)] mx-auto mb-4" />
            <h3 className="text-base font-bold text-[#fbfbef]">No matching results</h3>
            <p className="text-xs text-[rgba(251,251,239,0.6)] mt-1.5 leading-relaxed">
              We couldn't find matches for "{debouncedQuery}" in database index. Try another query or check spelling.
            </p>
          </div>
        ) : (
          /* Results Tabbed view */
          <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-[rgba(251,251,239,0.1)] flex gap-6 pb-0.5 overflow-x-auto">
              <button
                onClick={() => setActiveTab("all")}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === "all"
                    ? "border-[#fbfbef] text-[#fbfbef]"
                    : "border-transparent text-[rgba(251,251,239,0.5)] hover:text-[#fbfbef]"
                }`}
              >
                All Results ({totalResultsCount})
              </button>

              <button
                onClick={() => setActiveTab("cards")}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === "cards"
                    ? "border-[#fbfbef] text-[#fbfbef]"
                    : "border-transparent text-[rgba(251,251,239,0.5)] hover:text-[#fbfbef]"
                }`}
              >
                Cards ({cards.length})
              </button>

              <button
                onClick={() => setActiveTab("brands")}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === "brands"
                    ? "border-[#fbfbef] text-[#fbfbef]"
                    : "border-transparent text-[rgba(251,251,239,0.5)] hover:text-[#fbfbef]"
                }`}
              >
                Brands ({brands.length})
              </button>

              <button
                onClick={() => setActiveTab("influencers")}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === "influencers"
                    ? "border-[#fbfbef] text-[#fbfbef]"
                    : "border-transparent text-[rgba(251,251,239,0.5)] hover:text-[#fbfbef]"
                }`}
              >
                Creators ({influencers.length})
              </button>
            </div>

            {/* Results Grid / List */}
            <div className="space-y-10">
              {/* 1. CARDS LISTING */}
              {(activeTab === "all" || activeTab === "cards") && cards.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-[rgba(251,251,239,0.4)]">
                    Campaign Cards ({cards.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {cards.map((card) => (
                      <div
                        key={card.id}
                        className="group flex flex-col justify-between bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] rounded-2xl overflow-hidden hover:border-[rgba(251,251,239,0.35)] transition-all duration-300 lift-hover"
                      >
                        <div className="aspect-video w-full bg-[#141414] relative overflow-hidden">
                          {card.cover_image_url ? (
                            <img src={card.cover_image_url} alt={card.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[rgba(251,251,239,0.05)]">
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
                        </div>
                        <div className="p-5 space-y-3">
                          <h4 className="font-extrabold text-sm text-[#fbfbef] truncate">
                            {highlightTerm(card.title, debouncedQuery)}
                          </h4>
                          <p className="text-xs text-[rgba(251,251,239,0.6)] line-clamp-2 leading-relaxed">
                            {highlightTerm(card.description, debouncedQuery)}
                          </p>
                        </div>
                        <div className="px-5 pb-5 pt-2 border-t border-[rgba(251,251,239,0.05)] grid grid-cols-2 gap-2 text-center text-[10px] font-bold">
                          <span className="bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-full py-1.5 text-[rgba(251,251,239,0.6)]">
                            {card.budget_range || "Open budget"}
                          </span>
                          <Link
                            href={`/dashboard/influencer/discover/${card.id}`}
                            className="bg-[#fbfbef] text-black hover:opacity-90 rounded-full py-1.5 font-bold transition-opacity"
                          >
                            Details
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. BRANDS LISTING */}
              {(activeTab === "all" || activeTab === "brands") && brands.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-[rgba(251,251,239,0.4)]">
                    Brands ({brands.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {brands.map((brand) => {
                      const activeCards = brand.cards?.filter((c: any) => c.status === "active").length || 0;

                      return (
                        <div
                          key={brand.id}
                          className="group bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] hover:border-[rgba(251,251,239,0.35)] rounded-2xl p-5 flex flex-col justify-between transition-all lift-hover"
                        >
                          <div className="space-y-3">
                            <div className="flex gap-3 items-center">
                              <div className="size-10 rounded-xl border border-[rgba(251,251,239,0.15)] bg-black overflow-hidden flex items-center justify-center shrink-0">
                                {brand.avatar_url ? (
                                  <img src={brand.avatar_url} alt={brand.display_name} className="size-full object-cover" />
                                ) : (
                                  <Building2 className="size-5 text-[rgba(251,251,239,0.2)]" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <h4 className="font-extrabold text-sm text-[#fbfbef] truncate">
                                    {highlightTerm(brand.display_name, debouncedQuery)}
                                  </h4>
                                  {brand.is_verified && (
                                    <ShieldCheck className="size-4 text-[#fbfbef] fill-black stroke-[2]" />
                                  )}
                                </div>
                                <span className="text-[10px] text-[rgba(251,251,239,0.5)] font-semibold truncate block">
                                  {brand.industry || "General"} · {brand.location || "Global"}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-[rgba(251,251,239,0.6)] line-clamp-2 leading-relaxed">
                              {highlightTerm(brand.bio, debouncedQuery)}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-[rgba(251,251,239,0.05)] mt-4 text-center text-[10px] font-bold text-[rgba(251,251,239,0.5)]">
                            <div className="bg-[#141414] rounded-xl py-2">
                              {activeCards} Open Cards
                            </div>
                            <Link
                              href={`/p/brand/${brand.id}`}
                              className="bg-[#fbfbef] text-black hover:opacity-95 rounded-xl py-2 font-bold transition-opacity flex items-center justify-center"
                            >
                              Profile →
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3. CREATORS LISTING */}
              {(activeTab === "all" || activeTab === "influencers") && influencers.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs uppercase font-extrabold tracking-wider text-[rgba(251,251,239,0.4)]">
                    Creators ({influencers.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {influencers.map((inf) => {
                      const avgRating =
                        inf.reviews && inf.reviews.length > 0
                          ? (inf.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / inf.reviews.length).toFixed(1)
                          : "N/A";

                      return (
                        <div
                          key={inf.id}
                          className="group bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] hover:border-[rgba(251,251,239,0.35)] rounded-2xl p-4 flex flex-col justify-between transition-all lift-hover space-y-4"
                        >
                          <div className="space-y-3">
                            <div className="size-11 rounded-xl border border-[rgba(251,251,239,0.15)] bg-black overflow-hidden flex items-center justify-center">
                              {inf.avatar_url ? (
                                <img src={inf.avatar_url} alt={inf.display_name} className="size-full object-cover" />
                              ) : (
                                <User className="size-5 text-[rgba(251,251,239,0.2)]" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1">
                                <h4 className="font-extrabold text-xs text-[#fbfbef] truncate">
                                  {highlightTerm(inf.display_name, debouncedQuery)}
                                </h4>
                                {inf.is_verified && (
                                  <ShieldCheck className="size-3.5 text-[#fbfbef] fill-black stroke-[2] shrink-0" />
                                )}
                              </div>
                              <span className="text-[9px] text-[rgba(251,251,239,0.5)] font-semibold truncate block">
                                {(inf.niche || []).slice(0, 2).join(" · ")}
                              </span>
                            </div>
                            <p className="text-[10px] text-[rgba(251,251,239,0.6)] line-clamp-2 leading-relaxed">
                              {highlightTerm(inf.bio, debouncedQuery)}
                            </p>
                          </div>
                          <div className="space-y-2 pt-2 border-t border-[rgba(251,251,239,0.05)] text-[9px] font-bold text-[rgba(251,251,239,0.5)]">
                            <div className="flex justify-between items-center">
                              <span>Rating: {avgRating} ★</span>
                              <span>{inf.follower_count ? `${(inf.follower_count / 1000).toFixed(0)}K` : "10K"} Reach</span>
                            </div>
                            <Link
                              href={`/p/influencer/${inf.id}`}
                              className="block text-center bg-[#fbfbef] text-black hover:opacity-90 rounded-full py-1.5 font-bold transition-opacity text-xs"
                            >
                              Profile
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
