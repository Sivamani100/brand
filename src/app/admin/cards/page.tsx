"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Search, Pause, Play, Trash2, ShieldAlert, FileText, Users, Eye } from "lucide-react";
import toast from "react-hot-toast";

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

export default function AdminCardsPage() {
  const supabase = createClient();

  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "paused" | "closed" | "draft">("all");
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchCards() {
    setLoading(true);
    const { data, error } = await supabase
      .from("cards")
      .select(`
        *,
        brand:profiles!cards_brand_id_fkey(display_name, avatar_url),
        applications(id)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load platform cards.");
    } else {
      setCards(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchCards();
  }, []);

  const handleStatusChange = async (cardId: string, newStatus: string) => {
    setActionLoading(true);
    const { error } = await supabase
      .from("cards")
      .update({ status: newStatus })
      .eq("id", cardId);

    if (error) {
      toast.error("Failed to update card status.");
    } else {
      toast.success(`Card marked as ${newStatus}!`);
      fetchCards();
    }
    setActionLoading(false);
  };

  const handleDeleteCard = async (cardId: string) => {
    const confirm = window.confirm("Are you sure you want to delete this campaign? This action is permanent.");
    if (!confirm) return;

    setActionLoading(true);
    const { error } = await supabase
      .from("cards")
      .delete()
      .eq("id", cardId);

    if (error) {
      toast.error("Failed to delete card.");
    } else {
      toast.success("Card deleted.");
      fetchCards();
    }
    setActionLoading(false);
  };

  const filteredCards = cards.filter((c) => {
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = c.title?.toLowerCase().includes(q);
      const matchBrandName = c.brand?.display_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchBrandName) return false;
    }

    // Filter status
    if (filter === "all") return true;
    return c.status === filter;
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[#0d0d0d] rounded-lg" />
        <div className="h-12 w-full bg-[#0d0d0d] rounded-full" />
        <div className="h-96 bg-[#0d0d0d] rounded-2xl" />
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef] font-sans">
          Campaign Cards Moderation
        </h1>
        <p className="text-xs text-[rgba(251,251,239,0.6)]">
          Monitor all posted collaboration cards and adjust visibility statuses
        </p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[rgba(251,251,239,0.4)]" />
          <input
            type="text"
            placeholder="Search by card title or brand name..."
            className="w-full rounded-full bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] pl-11 pr-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

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
      </div>

      {/* Cards Table */}
      <div className="rounded-2xl border border-[rgba(251,251,239,0.2)] bg-[#0d0d0d] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[rgba(251,251,239,0.1)] text-[rgba(251,251,239,0.4)] uppercase font-semibold">
              <th className="p-4">Card / Campaign</th>
              <th className="p-4">Brand</th>
              <th className="p-4">Category</th>
              <th className="p-4">Budget</th>
              <th className="p-4">Apps</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(251,251,239,0.05)]">
            {filteredCards.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-[rgba(251,251,239,0.4)]">
                  No campaign cards found matching the criteria.
                </td>
              </tr>
            ) : (
              filteredCards.map((card) => (
                <tr key={card.id} className="hover:bg-[#141414]/30 transition-colors">
                  {/* Card cover + title */}
                  <td className="p-4 flex items-center gap-3">
                    <div className="size-10 rounded-md bg-[#141414] overflow-hidden flex-shrink-0 relative">
                      {card.cover_image_url ? (
                        <img src={card.cover_image_url} alt="Cover" className="h-full w-full object-cover" />
                      ) : (
                        <div className="size-full flex items-center justify-center text-[rgba(251,251,239,0.2)]">
                          <FileText className="size-5" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-[#fbfbef] line-clamp-1 max-w-[200px]">
                        {card.title}
                      </h4>
                      <span className="text-[10px] text-[rgba(251,251,239,0.4)] block mt-0.5">
                        Created {new Date(card.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </td>

                  {/* Brand */}
                  <td className="p-4">
                    <Link href={`/admin/users/${card.brand_id}`} className="hover:underline font-semibold text-[#fbfbef]">
                      {card.brand?.display_name || "Unknown Brand"}
                    </Link>
                  </td>

                  {/* Category */}
                  <td className="p-4">
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                      CATEGORY_COLORS[card.category] || "bg-white text-black"
                    }`}>
                      {card.category}
                    </span>
                  </td>

                  {/* Budget */}
                  <td className="p-4 font-semibold text-[#fbfbef]">
                    {card.budget_range}
                  </td>

                  {/* Applications count */}
                  <td className="p-4 font-semibold text-[rgba(251,251,239,0.8)]">
                    <div className="flex items-center gap-1">
                      <Users className="size-3.5 text-[rgba(251,251,239,0.4)]" />
                      <span>{card.applications?.length || 0}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      card.status === "active"
                        ? "text-[#4ade80]"
                        : card.status === "paused"
                        ? "text-[#facc15]"
                        : card.status === "draft"
                        ? "text-[rgba(251,251,239,0.4)]"
                        : "text-[#f87171]"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        card.status === "active"
                          ? "bg-[#4ade80]"
                          : card.status === "paused"
                          ? "bg-[#facc15]"
                          : card.status === "draft"
                          ? "bg-[rgba(251,251,239,0.4)]"
                          : "bg-[#f87171]"
                      }`} />
                      {card.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right flex justify-end gap-1.5">
                    {/* View Details */}
                    <Link
                      href={`/admin/cards/${card.id}`}
                      className="p-1.5 rounded-full border border-[rgba(251,251,239,0.1)] text-[#fbfbef] hover:bg-[#1c1c1c] scale-active"
                      title="View Details"
                    >
                      <Eye className="size-3.5" />
                    </Link>

                    {/* Pause/Play toggle */}
                    {card.status === "active" ? (
                      <button
                        disabled={actionLoading}
                        onClick={() => handleStatusChange(card.id, "paused")}
                        className="p-1.5 rounded-full border border-[rgba(251,251,239,0.1)] text-[#facc15] hover:bg-[#262614] scale-active"
                        title="Pause Card"
                      >
                        <Pause className="size-3.5" />
                      </button>
                    ) : (
                      card.status === "paused" && (
                        <button
                          disabled={actionLoading}
                          onClick={() => handleStatusChange(card.id, "active")}
                          className="p-1.5 rounded-full border border-[rgba(251,251,239,0.1)] text-[#4ade80] hover:bg-[#142614] scale-active"
                          title="Activate Card"
                        >
                          <Play className="size-3.5" />
                        </button>
                      )
                    )}

                    {/* Delete Card */}
                    <button
                      disabled={actionLoading}
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-1.5 rounded-full border border-[rgba(251,251,239,0.1)] text-[#f87171] hover:bg-[#261414] scale-active"
                      title="Delete Card"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
