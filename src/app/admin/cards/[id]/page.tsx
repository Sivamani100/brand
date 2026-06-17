"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, User, Calendar, Layers, Users, Trash2, Pause, Play, Eye } from "lucide-react";
import toast from "react-hot-toast";

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: "📸",
  YouTube: "🎥",
  TikTok: "🎵",
  "Twitter/X": "🐦",
  LinkedIn: "💼",
};

export default function AdminCardDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [card, setCard] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadCardData() {
    if (!id) return;
    setLoading(true);
    const cardId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";

    const { data: cardData, error } = await supabase
      .from("cards")
      .select(`
        *,
        brand:profiles!cards_brand_id_fkey(*)
      `)
      .eq("id", cardId)
      .single();

    if (error || !cardData) {
      toast.error("Failed to load campaign details.");
      router.push("/admin/cards");
      return;
    }

    const { data: apps } = await supabase
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
    loadCardData();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!card) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("cards")
      .update({ status: newStatus })
      .eq("id", card.id);

    if (error) {
      toast.error("Failed to update status.");
    } else {
      toast.success(`Card marked as ${newStatus}!`);
      loadCardData();
    }
    setActionLoading(false);
  };

  const handleDeleteCard = async () => {
    if (!card) return;
    const confirm = window.confirm("Are you sure you want to delete this campaign? This action is permanent.");
    if (!confirm) return;

    setActionLoading(true);
    const { error } = await supabase
      .from("cards")
      .delete()
      .eq("id", card.id);

    if (error) {
      toast.error("Failed to delete campaign card.");
    } else {
      toast.success("Campaign card deleted.");
      router.push("/admin/cards");
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center bg-black text-[#fbfbef]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[rgba(251,251,239,0.2)] border-t-[#fbfbef]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Back button */}
      <div>
        <Link
          href="/admin/cards"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[rgba(251,251,239,0.6)] hover:text-[#fbfbef] transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Moderation List</span>
        </Link>
      </div>

      {/* Title & Status Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(251,251,239,0.1)] pb-6">
        <div>
          <span className="rounded-full bg-[#fbfbef] px-2.5 py-0.5 text-[9px] font-bold text-black uppercase">
            {card.category}
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef] mt-2 font-sans">
            {card.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {card.status === "active" ? (
            <button
              disabled={actionLoading}
              onClick={() => handleStatusChange("paused")}
              className="rounded-full bg-[#141414] border border-[#facc15]/30 text-[#facc15] hover:bg-[#262614] px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 transition-colors scale-active"
            >
              <Pause className="size-4" />
              <span>Pause Campaign</span>
            </button>
          ) : (
            card.status === "paused" && (
              <button
                disabled={actionLoading}
                onClick={() => handleStatusChange("active")}
                className="rounded-full bg-[#141414] border border-[#4ade80]/30 text-[#4ade80] hover:bg-[#142614] px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 transition-colors scale-active"
              >
                <Play className="size-4" />
                <span>Activate Campaign</span>
              </button>
            )
          )}
          <button
            disabled={actionLoading}
            onClick={handleDeleteCard}
            className="rounded-full border border-[rgba(251,251,239,0.2)] text-[#f87171] hover:bg-[#261414] px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 scale-active transition-all"
          >
            <Trash2 className="size-4" />
            <span>Delete Card</span>
          </button>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Cover image & description */}
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

              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-[rgba(251,251,239,0.05)] text-xs">
                <div>
                  <h4 className="uppercase text-[rgba(251,251,239,0.4)] font-semibold">Timeline</h4>
                  <span className="text-sm text-[#fbfbef] font-semibold block mt-1">{card.timeline}</span>
                </div>
                <div>
                  <h4 className="uppercase text-[rgba(251,251,239,0.4)] font-semibold">Deadline</h4>
                  <span className="text-sm text-[#fbfbef] font-semibold block mt-1">
                    {new Date(card.application_deadline).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <h4 className="uppercase text-[rgba(251,251,239,0.4)] font-semibold">Follower Min</h4>
                  <span className="text-sm text-[#fbfbef] font-semibold block mt-1">
                    {card.min_followers?.toLocaleString() || "0"}
                  </span>
                </div>
                <div>
                  <h4 className="uppercase text-[rgba(251,251,239,0.4)] font-semibold">Status</h4>
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

        {/* Right column: Creator brand info & Applicants summary */}
        <div className="space-y-6">
          {/* Brand Owner info */}
          <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[rgba(251,251,239,0.4)]">
              Posted By Brand
            </h3>
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full border border-[rgba(251,251,239,0.2)] bg-black overflow-hidden flex items-center justify-center">
                {card.brand?.avatar_url ? (
                  <img src={card.brand.avatar_url} alt="Brand" className="h-full w-full object-cover" />
                ) : (
                  <User className="size-5" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#fbfbef]">{card.brand?.display_name}</h4>
                <Link href={`/admin/users/${card.brand_id}`} className="text-[10px] text-[#fbfbef] underline">
                  View Brand Profile
                </Link>
              </div>
            </div>
          </div>

          {/* Applications Moderation */}
          <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-6 space-y-4">
            <h3 className="text-sm font-bold text-[#fbfbef] flex items-center gap-2">
              <Users className="size-5" /> Applicants ({applications.length})
            </h3>

            {applications.length === 0 ? (
              <div className="text-center py-6 text-[rgba(251,251,239,0.6)]">
                <p className="text-xs">No applications yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="rounded-xl border border-[rgba(251,251,239,0.1)] bg-[#141414] p-3 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full border border-[rgba(251,251,239,0.2)] bg-black overflow-hidden flex items-center justify-center">
                        {app.influencer?.avatar_url ? (
                          <img src={app.influencer.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <User className="size-3" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#fbfbef] line-clamp-1 max-w-[120px]">
                          {app.influencer?.display_name}
                        </h4>
                        <span className="text-[9px] text-[rgba(251,251,239,0.4)] block capitalize">
                          Status: {app.status}
                        </span>
                      </div>
                    </div>
                    <Link
                      href="/admin/applications"
                      className="rounded-full bg-black px-2.5 py-1 text-[9px] font-bold text-[#fbfbef] border border-[rgba(251,251,239,0.2)] hover:border-white"
                    >
                      View All
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
