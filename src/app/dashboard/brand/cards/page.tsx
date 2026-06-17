"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { PlusCircle, FileText, Users, Calendar, Trash2, Pause, Play, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

type CardWithApps = any;

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

export default function MyCardsPage() {
  const { user } = useUser();
  const supabase = createClient();
  const [cards, setCards] = useState<CardWithApps[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "closed" | "draft">("all");

  async function fetchCards() {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("cards")
      .select(`
        *,
        applications(id)
      `)
      .eq("brand_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load cards.");
    } else {
      setCards(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchCards();
  }, [user]);

  const handleStatusChange = async (cardId: string, newStatus: string) => {
    const { error } = await supabase
      .from("cards")
      .update({ status: newStatus })
      .eq("id", cardId);

    if (error) {
      toast.error("Failed to update status.");
      return;
    }

    toast.success(`Campaign marked as ${newStatus}!`);
    fetchCards();
  };

  const handleDeleteCard = async (cardId: string) => {
    const confirm = window.confirm("Are you sure you want to delete this campaign? This action is permanent.");
    if (!confirm) return;

    const { error } = await supabase
      .from("cards")
      .delete()
      .eq("id", cardId);

    if (error) {
      toast.error("Failed to delete campaign.");
      return;
    }

    toast.success("Campaign deleted.");
    fetchCards();
  };

  const filteredCards = cards.filter((card) => {
    if (filter === "all") return true;
    return card.status === filter;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-[#0d0d0d] animate-pulse rounded-lg" />
          <div className="h-10 w-36 bg-[#0d0d0d] animate-pulse rounded-full" />
        </div>
        <div className="h-10 w-full bg-[#0d0d0d] animate-pulse rounded-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-[#0d0d0d] animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const filters: ("all" | "active" | "paused" | "closed" | "draft")[] = [
    "all",
    "active",
    "paused",
    "closed",
    "draft",
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[rgba(251,251,239,0.1)] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef] font-sans">
            Campaign Cards
          </h1>
          <p className="text-xs text-[rgba(251,251,239,0.6)]">
            Manage your posted collaboration campaigns and applications
          </p>
        </div>
        <Link
          href="/dashboard/brand/cards/new"
          className="flex items-center gap-2 rounded-full bg-[#fbfbef] px-4 py-2.5 text-xs font-bold text-black scale-active hover:opacity-90 transition-opacity"
        >
          <PlusCircle className="size-4" />
          <span>Post Campaign</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pb-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all scale-active ${
              filter === f
                ? "bg-[#fbfbef] text-black font-bold"
                : "bg-[#0d0d0d] text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)] hover:border-[rgba(251,251,239,0.3)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      {filteredCards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[rgba(251,251,239,0.2)] p-12 text-center max-w-lg mx-auto">
          <AlertCircle className="size-8 text-[rgba(251,251,239,0.4)] mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-[#fbfbef]">No Campaigns Found</h3>
          <p className="text-xs text-[rgba(251,251,239,0.6)] mt-1 mb-6">
            You don&apos;t have any campaigns in this category yet.
          </p>
          <Link
            href="/dashboard/brand/cards/new"
            className="inline-flex items-center gap-2 rounded-full bg-[#fbfbef] px-5 py-2.5 text-xs font-bold text-black"
          >
            Post Your First Card
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((card) => {
            const hasCover = !!card.cover_image_url;
            return (
              <div
                key={card.id}
                className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] overflow-hidden lift-hover flex flex-col justify-between"
              >
                <div>
                  {/* Card Cover */}
                  <div className="aspect-video w-full bg-[#141414] relative overflow-hidden">
                    {hasCover ? (
                      <img
                        src={card.cover_image_url}
                        alt={card.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[rgba(251,251,239,0.2)]">
                        <FileText className="size-12" />
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
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-[rgba(251,251,239,0.6)] font-semibold">
                        {card.budget_range}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-[rgba(251,251,239,0.6)]">
                        <Users className="size-3.5" />
                        <span>{card.applications?.length || 0} applicants</span>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#fbfbef] line-clamp-1">
                      {card.title}
                    </h3>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-[rgba(251,251,239,0.05)] mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        card.status === "active"
                          ? "bg-[#4ade80]"
                          : card.status === "paused"
                          ? "bg-[#facc15]"
                          : card.status === "draft"
                          ? "bg-[rgba(251,251,239,0.4)]"
                          : "bg-[#f87171]"
                      }`}
                    />
                    <span className="text-xs font-semibold uppercase text-[rgba(251,251,239,0.6)] tracking-wide">
                      {card.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {card.status === "active" ? (
                      <button
                        title="Pause Campaign"
                        onClick={() => handleStatusChange(card.id, "paused")}
                        className="p-1.5 rounded-full bg-[#141414] border border-[rgba(251,251,239,0.1)] text-[rgba(251,251,239,0.6)] hover:text-white"
                      >
                        <Pause className="size-3.5" />
                      </button>
                    ) : (
                      card.status === "paused" && (
                        <button
                          title="Activate Campaign"
                          onClick={() => handleStatusChange(card.id, "active")}
                          className="p-1.5 rounded-full bg-[#141414] border border-[rgba(251,251,239,0.1)] text-[rgba(251,251,239,0.6)] hover:text-white"
                        >
                          <Play className="size-3.5" />
                        </button>
                      )
                    )}

                    <Link
                      href={`/dashboard/brand/cards/${card.id}`}
                      className="text-xs font-bold bg-[#141414] hover:bg-[#1c1c1c] border border-[rgba(251,251,239,0.2)] text-[#fbfbef] rounded-full px-3 py-1.5 ml-1"
                    >
                      View
                    </Link>

                    <button
                      title="Delete Campaign"
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-1.5 rounded-full bg-[#141414] border border-[rgba(251,251,239,0.1)] text-[rgba(251,251,239,0.6)] hover:text-[#f87171] ml-1"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
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
