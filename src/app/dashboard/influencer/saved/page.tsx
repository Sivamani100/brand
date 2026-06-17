"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { Heart, Compass, Calendar, Award } from "lucide-react";
import toast from "react-hot-toast";

interface SavedCard {
  id: string;
  card: {
    id: string;
    title: string;
    description: string;
    category: string;
    budget_range: string | null;
    timeline: string | null;
    cover_image_url: string | null;
    brand: {
      display_name: string;
      avatar_url: string | null;
    };
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  Fashion: "bg-[#c084fc]/10 text-[#7c3aed] border border-[#c084fc]/20",
  Tech: "bg-[#38bdf8]/10 text-[#0284c7] border border-[#38bdf8]/20",
  Food: "bg-[#fb923c]/10 text-[#c2410c] border border-[#fb923c]/20",
  Fitness: "bg-[#4ade80]/10 text-[#15803d] border border-[#4ade80]/20",
  Beauty: "bg-[#f472b6]/10 text-[#be185d] border border-[#f472b6]/20",
  Travel: "bg-[#fbbf24]/10 text-[#a16207] border border-[#fbbf24]/20",
  Gaming: "bg-[#a78bfa]/10 text-[#6d28d9] border border-[#a78bfa]/20",
  Lifestyle: "bg-[#1f1f1f]/5 text-[#1f1f1f] border border-[#1f1f1f]/10",
};

export default function SavedCardsWishlistPage() {
  const { user } = useUser();
  const supabase = createClient();

  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);



  async function loadSavedCards() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("saved_cards")
        .select(`
          id,
          card:cards(
            id,
            title,
            description,
            category,
            budget_range,
            timeline,
            cover_image_url,
            brand:profiles(
              display_name,
              avatar_url
            )
          )
        `)
        .eq("influencer_id", user?.id);

      if (error) throw error;

      // Filter out any entries where the card was deleted in cascades
      const filtered = ((data as unknown as SavedCard[]) || []).filter((item) => item.card !== null);
      setSavedCards(filtered);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load saved cards");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    loadSavedCards();
  }, [user]);

  const handleUnsaveCard = async (cardId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("saved_cards")
        .delete()
        .eq("influencer_id", user.id)
        .eq("card_id", cardId);

      if (error) throw error;

      setSavedCards((prev) => prev.filter((item) => item.card.id !== cardId));
      toast.success("Card removed from wishlist");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to remove card");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Saved Wishlist</h1>
        <p className="text-sm text-text-secondary mt-1">
          Review and apply to collaboration cards you saved for later.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="aspect-[4/5] bg-surface border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : savedCards.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border-strong rounded-3xl max-w-md mx-auto">
          <Heart className="size-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-bold text-text-primary">No Saved Cards</h3>
          <p className="text-sm text-text-secondary mt-1 mb-6">
            Bookmark interesting cards from the discover page to view them here.
          </p>
          <Link
            href="/dashboard/influencer/discover"
            className="rounded-full bg-accent text-invert-text px-6 py-2.5 text-xs font-bold"
          >
            Explore Campaigns
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {savedCards.map((item) => {
            const card = item.card;
            return (
              <div
                key={card.id}
                className="group flex flex-col justify-between bg-surface border border-border-strong rounded-2xl overflow-hidden hover:border-[rgba(251,251,239,0.35)] transition-all duration-300 lift-hover"
              >
                <div>
                  {/* Cover */}
                  <div className="aspect-video w-full bg-surface-2 relative overflow-hidden">
                    {card.cover_image_url ? (
                      <img src={card.cover_image_url} alt={card.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-surface-2 flex items-center justify-center text-text-muted">
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

                    {/* Unsave Heart Button */}
                    <button
                      onClick={() => handleUnsaveCard(card.id)}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 border border-border text-[#fb7185] hover:text-white transition-colors"
                      title="Unsave Card"
                    >
                      <Heart className="size-4 fill-[#fb7185] stroke-[2]" />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="size-5 rounded-full border border-border bg-bg overflow-hidden flex items-center justify-center">
                        {card.brand?.avatar_url ? (
                          <img src={card.brand.avatar_url} alt="Brand" className="size-full object-cover" />
                        ) : (
                          <span className="text-[8px] font-bold text-invert-text bg-accent size-full flex items-center justify-center">
                            {card.brand?.display_name[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-text-muted font-semibold truncate">
                        {card.brand?.display_name}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-text-primary truncate">{card.title}</h4>
                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed min-h-[32px]">
                      {card.description}
                    </p>
                  </div>
                </div>

                {/* Footer and apply */}
                <div className="px-5 pb-5 pt-2 border-t border-border space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-bold text-text-muted">
                    <span>Budget: {card.budget_range || "Open"}</span>
                    <span>Timeline: {card.timeline || "Not set"}</span>
                  </div>

                  <Link
                    href={`/dashboard/influencer/discover/${card.id}`}
                    className="block text-center rounded-full bg-accent text-invert-text hover:opacity-90 py-2 text-xs font-bold transition-colors"
                  >
                    View & Apply
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
