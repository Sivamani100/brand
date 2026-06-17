"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { Search, SlidersHorizontal, Check, ShieldCheck, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";

interface BrandProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  cover_banner_url: string | null;
  bio: string | null;
  industry: string | null;
  location: string | null;
  is_verified: boolean;
  company_name: string | null;
  // Join data
  cards: { id: string; status: string }[];
  rooms: { id: string; status: string }[];
}

const INDUSTRIES = [
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

const COMPANY_SIZES = [
  { label: "All Sizes", value: "" },
  { label: "Small (<50)", value: "Small" },
  { label: "Mid (50-250)", value: "Mid" },
  { label: "Enterprise (250+)", value: "Enterprise" },
];

export default function BrandDirectoryPage() {
  const { user } = useUser();
  const supabase = createClient();

  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedSize, setSelectedSize] = useState("");
  const [onlyOpenCards, setOnlyOpenCards] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [sortBy, setSortBy] = useState("newest"); // newest, most_active, most_cards, alphabetical

  useEffect(() => {
    async function loadBrands() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(`
            *,
            cards:cards!brand_id(id, status),
            rooms:rooms!brand_id(id, status)
          `)
          .eq("role", "brand");

        if (error) throw error;
        setBrands((data as unknown as BrandProfile[]) || []);
      } catch (err: any) {
        console.error("Failed to load brands directory", err);
        toast.error("Could not load brands directory");
      } finally {
        setLoading(false);
      }
    }

    loadBrands();
  }, []);

  // Filter operations
  const filteredBrands = brands.filter((brand) => {
    // 1. Search Query (name or bio or location)
    const matchesSearch =
      brand.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (brand.bio && brand.bio.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (brand.location && brand.location.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // 2. Industry Multi-select
    if (selectedIndustries.length > 0) {
      if (!brand.industry) return false;
      const matchesIndustry = selectedIndustries.includes(brand.industry);
      if (!matchesIndustry) return false;
    }

    // 3. Company Size
    if (selectedSize) {
      const bioText = (brand.bio || "").toLowerCase();
      const matchesSize = bioText.includes(selectedSize.toLowerCase());
      const dbSize = (brand as any).company_size;
      if (dbSize && dbSize !== selectedSize) return false;
      if (!dbSize && !matchesSize) return false;
    }

    // 4. Open Cards Toggle
    if (onlyOpenCards) {
      const hasOpenCards = brand.cards.some((c) => c.status === "active");
      if (!hasOpenCards) return false;
    }

    // 5. Verified Only
    if (onlyVerified && !brand.is_verified) return false;

    return true;
  });

  // Sort operations
  const sortedBrands = [...filteredBrands].sort((a, b) => {
    if (sortBy === "alphabetical") {
      return a.display_name.localeCompare(b.display_name);
    }
    if (sortBy === "most_cards") {
      return b.cards.length - a.cards.length;
    }
    if (sortBy === "most_active") {
      const scoreA = a.cards.length + a.rooms.length;
      const scoreB = b.cards.length + b.rooms.length;
      return scoreB - scoreA;
    }
    const dateA = new Date((a as any).created_at || 0).getTime();
    const dateB = new Date((b as any).created_at || 0).getTime();
    return dateB - dateA;
  });

  const toggleIndustry = (industry: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(industry) ? prev.filter((i) => i !== industry) : [...prev, industry]
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Brand Directory</h1>
        <p className="text-sm text-text-secondary mt-1">
          Browse and connect with brands offering active campaigns.
        </p>
      </div>

      {/* Sticky Filter & Search Panel */}
      <div className="sticky top-14 z-10 bg-bg/95 backdrop-blur-md border border-border-strong rounded-2xl p-4 space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search brands by name, bio, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-full text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Sort dropdown */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-surface border border-border rounded-full px-4 py-2.5 text-xs font-semibold text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="newest">Sort: Newest</option>
              <option value="most_active">Sort: Most Active</option>
              <option value="most_cards">Sort: Most Cards Posted</option>
              <option value="alphabetical">Sort: Alphabetical</option>
            </select>

            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="bg-surface border border-border rounded-full px-4 py-2.5 text-xs font-semibold text-text-primary focus:outline-none focus:border-accent"
            >
              {COMPANY_SIZES.map((size) => (
                <option key={size.label} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Industry Chips Row */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-text-muted font-bold">
            Filter by Industry
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-thin">
            {INDUSTRIES.map((ind) => {
              const isSelected = selectedIndustries.includes(ind);
              return (
                <button
                  key={ind}
                  onClick={() => toggleIndustry(ind)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-1 ${
                    isSelected
                      ? "bg-accent text-invert-text"
                      : "bg-surface text-text-secondary border border-border hover:border-text-muted"
                  }`}
                >
                  {isSelected && <Check className="size-3 stroke-[3]" />}
                  <span>{ind}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggles Row */}
        <div className="flex flex-wrap gap-6 pt-2 border-t border-border items-center">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-text-secondary">
            <input
              type="checkbox"
              checked={onlyOpenCards}
              onChange={(e) => setOnlyOpenCards(e.target.checked)}
              className="rounded bg-surface border-border-strong text-invert-text focus:ring-0 focus:ring-offset-0 size-4 cursor-pointer accent-accent"
            />
            <span>Only brands with open cards</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-text-secondary">
            <input
              type="checkbox"
              checked={onlyVerified}
              onChange={(e) => setOnlyVerified(e.target.checked)}
              className="rounded bg-surface border-border-strong text-invert-text focus:ring-0 focus:ring-offset-0 size-4 cursor-pointer accent-accent"
            />
            <span>Verified Only</span>
          </label>
        </div>
      </div>

      {/* Grid Section */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-2xl bg-surface border border-border animate-pulse" />
          ))}
        </div>
      ) : sortedBrands.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border-strong rounded-2xl max-w-md mx-auto">
          <HelpCircle className="size-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-bold text-text-primary">No Brands Found</h3>
          <p className="text-sm text-text-secondary mt-1">
            Try adjusting your search query or filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sortedBrands.map((brand) => {
            const activeCardsCount = brand.cards.filter((c) => c.status === "active").length;
            const completedCollabs = brand.rooms.filter((r) => r.status === "completed").length;

            return (
              <div
                key={brand.id}
                className="group flex flex-col justify-between bg-surface border border-border-strong rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-text-muted transition-all duration-300 lift-hover"
              >
                <div>
                  {/* Cover Banner 16:9 */}
                  <div className="aspect-[16/9] w-full bg-surface-2 relative overflow-hidden">
                    {brand.cover_banner_url ? (
                      <img
                        src={brand.cover_banner_url}
                        alt={`${brand.display_name} cover`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-surface-2 to-surface-3 flex items-center justify-center text-text-muted/5 text-5xl font-extrabold uppercase">
                        {brand.display_name.substring(0, 2)}
                      </div>
                    )}

                    {/* Logo/Avatar overlaying the cover */}
                    <div className="absolute -bottom-6 left-6 size-14 rounded-xl bg-bg border border-border-strong overflow-hidden shadow-md flex items-center justify-center">
                      {brand.avatar_url ? (
                        <img src={brand.avatar_url} alt={brand.display_name} className="size-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-invert-text bg-accent size-full flex items-center justify-center">
                          {brand.display_name[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Brand Content */}
                  <div className="pt-8 px-6 pb-6 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-lg font-bold text-text-primary group-hover:text-text-primary transition-colors truncate">
                        {brand.display_name}
                      </h3>
                      {brand.is_verified && (
                        <ShieldCheck className="size-4 text-text-primary fill-bg stroke-[2] shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-text-muted font-medium">
                      {brand.industry || "General"} · {brand.location || "Worldwide"}
                    </p>

                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed min-h-[32px]">
                      {brand.bio || "No description provided."}
                    </p>
                  </div>
                </div>

                {/* Footer stats and links */}
                <div className="px-6 pb-6 pt-2 border-t border-border space-y-4">
                  <div className="flex items-center justify-between text-xs text-text-secondary font-semibold">
                    <span>{activeCardsCount} Active Cards</span>
                    <span>{completedCollabs} Collabs Done</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      href={`/p/brand/${brand.id}`}
                      className="text-center rounded-full bg-surface-2 border border-border-strong text-text-primary hover:bg-surface-3 py-2 text-xs font-bold transition-colors"
                    >
                      View Profile
                    </Link>
                    <Link
                      href={`/p/brand/${brand.id}?tab=cards`}
                      className="text-center rounded-full bg-accent text-invert-text hover:opacity-90 py-2 text-xs font-bold transition-colors"
                    >
                      See Cards →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
