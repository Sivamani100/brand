"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import {
  ArrowLeft,
  Building2,
  Globe,
  Star,
  Plus,
  ShieldCheck,
  Calendar,
  Sparkles,
  Heart,
  Upload,
  User,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: {
    display_name: string;
    avatar_url: string | null;
  } | null;
  reply: string | null;
  reply_at: string | null;
}

interface Campaign {
  id: string;
  title: string;
  cover_url: string | null;
  description: string | null;
  outcome_blurb: string | null;
  influencer_ids: string[];
  campaign_start: string | null;
  campaign_end: string | null;
  influencerProfiles?: { id: string; avatar_url: string | null; display_name: string }[];
}

export default function PublicBrandProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { user: currentUser } = useUser();

  const brandId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";

  const [brand, setBrand] = useState<any | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [loading, setLoading] = useState(true);

  // Tabs: cards, campaigns, reviews, about
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "cards");

  useEffect(() => {
    if (!brandId) return;

    async function loadPublicData() {
      setLoading(true);
      try {
        // 1. Fetch brand profile
        const { data: prof, error: profError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", brandId)
          .single();

        if (profError || !prof || prof.role !== "brand") {
          toast.error("Brand profile not found.");
          router.push("/dashboard");
          return;
        }
        setBrand(prof);

        // 2. Fetch active cards
        const { data: campaignCards } = await supabase
          .from("cards")
          .select("*")
          .eq("brand_id", brandId)
          .eq("status", "active");
        setCards(campaignCards || []);

        // 3. Fetch past campaigns
        const { data: pastCamps } = await supabase
          .from("brand_campaigns")
          .select("*")
          .eq("brand_id", brandId);

        let resolvedCamps: Campaign[] = (pastCamps || []) as Campaign[];
        if (resolvedCamps.length > 0) {
          // Gather all unique influencer IDs across campaigns
          const allInfluencerIds = Array.from(
            new Set(resolvedCamps.flatMap((c) => c.influencer_ids || []))
          );

          if (allInfluencerIds.length > 0) {
            const { data: infs } = await supabase
              .from("profiles")
              .select("id, avatar_url, display_name")
              .in("id", allInfluencerIds);

            resolvedCamps = resolvedCamps.map((camp) => ({
              ...camp,
              influencerProfiles: infs?.filter((inf) => camp.influencer_ids?.includes(inf.id)) || [],
            }));
          }
        }
        setCampaigns(resolvedCamps);

        // 4. Fetch reviews
        const { data: revs } = await supabase
          .from("reviews")
          .select(`
            id,
            rating,
            comment,
            created_at,
            reply,
            reply_at,
            reviewer:profiles!reviews_reviewer_id_fkey(display_name, avatar_url)
          `)
          .eq("reviewed_id", brandId);
        setReviews((revs as unknown as Review[]) || []);

        // 5. Check following status
        if (currentUser) {
          const { data: follow } = await supabase
            .from("follows")
            .select("id")
            .eq("follower_id", currentUser.id)
            .eq("following_id", brandId)
            .maybeSingle();
          setIsFollowing(!!follow);
        }
      } catch (err: any) {
        console.error("Error loading brand public profile", err);
      } finally {
        setLoading(false);
      }
    }

    loadPublicData();
  }, [brandId, currentUser]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      toast.error("Please sign in to follow brands.");
      return;
    }

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", brandId);

        if (error) throw error;
        setIsFollowing(false);
        toast.success(`Unfollowed ${brand.display_name}`);
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: currentUser.id,
            following_id: brandId,
          });

        if (error) throw error;
        setIsFollowing(true);
        toast.success(`Following ${brand.display_name}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Action failed.");
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploadingBanner(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${brandId}/cover_${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("card-covers")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("card-covers").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ cover_banner_url: urlData.publicUrl })
        .eq("id", brandId);

      if (updateError) throw updateError;

      setBrand((prev: any) => ({ ...prev, cover_banner_url: urlData.publicUrl }));
      toast.success("Cover banner updated!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to upload cover banner.");
    } finally {
      setIsUploadingBanner(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[rgba(251,251,239,0.2)] border-t-[#fbfbef]" />
      </div>
    );
  }

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "N/A";

  const totalDeals = campaigns.length; // Showcase deals + count from completed contracts if needed
  const isOwner = currentUser?.id === brandId;

  return (
    <div className="min-h-screen bg-black text-[#fbfbef] font-sans pb-16">
      {/* Cover Banner (uploadable if owner) */}
      <div className="aspect-[21/9] md:aspect-[32/9] w-full bg-[#0d0d0d] relative overflow-hidden group">
        {brand.cover_banner_url ? (
          <img src={brand.cover_banner_url} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-neutral-900 to-neutral-950 flex items-center justify-center text-neutral-800 text-3xl font-bold uppercase">
            {brand.display_name}
          </div>
        )}

        {isOwner && (
          <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity duration-300">
            <div className="flex items-center gap-2 bg-[#fbfbef] text-black px-4 py-2 rounded-full text-xs font-bold shadow-md">
              <Upload className="size-4" />
              <span>{isUploadingBanner ? "Uploading..." : "Upload Cover"}</span>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isUploadingBanner}
              onChange={handleBannerUpload}
            />
          </label>
        )}

        {/* Back Link */}
        <button
          onClick={() => router.back()}
          className="absolute top-6 left-6 p-2 rounded-full bg-black/60 border border-[rgba(251,251,239,0.2)] hover:bg-black transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-10 md:-mt-16 relative z-10 space-y-8">
        {/* Profile Card Header */}
        <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 shadow-glow">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-5">
            <div className="size-20 md:size-24 rounded-2xl bg-black border-2 border-[rgba(251,251,239,0.2)] overflow-hidden shadow-lg flex items-center justify-center">
              {brand.avatar_url ? (
                <img src={brand.avatar_url} alt="Logo" className="size-full object-cover" />
              ) : (
                <Building2 className="size-12 text-[rgba(251,251,239,0.2)]" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold">{brand.display_name}</h1>
                {brand.is_verified && (
                  <span title="Verified Brand">
                    <ShieldCheck className="size-6 text-[#fbfbef] fill-black stroke-[2]" />
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-[rgba(251,251,239,0.6)]">
                {brand.industry} · {brand.location || "Location not set"}
              </p>
              {brand.website_url && (
                <a
                  href={brand.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#fbfbef] underline flex items-center gap-1.5 hover:text-white"
                >
                  <Globe className="size-3.5" />
                  <span>{brand.website_url.replace(/(^\w+:|^)\/\//, "")}</span>
                </a>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {!isOwner && (
            <div className="flex gap-2.5 w-full md:w-auto">
              <button
                onClick={handleFollowToggle}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
                  isFollowing
                    ? "bg-[#1c1c1c] text-[#fbfbef] border border-[#fbfbef]"
                    : "bg-[#fbfbef] text-black hover:bg-[#eaeaea]"
                }`}
              >
                <Heart className={`size-4 ${isFollowing ? "fill-[#fbfbef]" : ""}`} />
                <span>{isFollowing ? "Following ✓" : "Follow Brand"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.1)] rounded-2xl p-4 md:p-6 text-center space-y-1.5">
            <span className="text-2xl md:text-3xl font-black font-sans">{cards.length}</span>
            <span className="text-[10px] md:text-xs text-[rgba(251,251,239,0.5)] font-bold block uppercase tracking-wide">
              Cards Posted
            </span>
          </div>

          <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.1)] rounded-2xl p-4 md:p-6 text-center space-y-1.5">
            <span className="text-2xl md:text-3xl font-black font-sans">{totalDeals}</span>
            <span className="text-[10px] md:text-xs text-[rgba(251,251,239,0.5)] font-bold block uppercase tracking-wide">
              Deals Done
            </span>
          </div>

          <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.1)] rounded-2xl p-4 md:p-6 text-center space-y-1.5">
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl md:text-3xl font-black font-sans">{avgRating}</span>
              {avgRating !== "N/A" && <Star className="size-4 md:size-5 text-[#fbbf24] fill-[#fbbf24]" />}
            </div>
            <span className="text-[10px] md:text-xs text-[rgba(251,251,239,0.5)] font-bold block uppercase tracking-wide">
              Avg Rating
            </span>
          </div>
        </div>

        {/* Tabs Row */}
        <div className="border-b border-[rgba(251,251,239,0.1)] flex gap-6 overflow-x-auto">
          {["cards", "campaigns", "reviews", "about"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-xs md:text-sm font-bold uppercase tracking-wider transition-all duration-200 shrink-0 border-b-2 ${
                activeTab === tab
                  ? "border-[#fbfbef] text-[#fbfbef]"
                  : "border-transparent text-[rgba(251,251,239,0.5)] hover:text-[#fbfbef]"
              }`}
            >
              {tab === "cards" && "Active Cards"}
              {tab === "campaigns" && "Past Campaigns"}
              {tab === "reviews" && `Reviews (${reviews.length})`}
              {tab === "about" && "About"}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="space-y-6">
          {/* 1. ACTIVE CARDS TAB */}
          {activeTab === "cards" && (
            <div className="space-y-4">
              {cards.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[rgba(251,251,239,0.2)] p-12 text-center text-[rgba(251,251,239,0.5)]">
                  No active campaigns listed currently.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] overflow-hidden flex flex-col justify-between"
                    >
                      <div className="aspect-[16/9] bg-[#141414] relative overflow-hidden">
                        {card.cover_image_url ? (
                          <img src={card.cover_image_url} alt={card.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-800 text-5xl font-black">
                            {card.category}
                          </div>
                        )}
                        <span className="absolute top-3 left-3 bg-[#fbfbef] text-black text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {card.category}
                        </span>
                      </div>
                      <div className="p-5 space-y-4">
                        <h4 className="font-extrabold text-[#fbfbef] text-base truncate">{card.title}</h4>
                        <div className="flex items-center justify-between text-xs text-[rgba(251,251,239,0.6)]">
                          <span>Budget: {card.budget_range}</span>
                          <span>Deadline: {card.application_deadline ? new Date(card.application_deadline).toLocaleDateString() : "Open"}</span>
                        </div>
                        <Link
                          href={`/dashboard/influencer/discover/${card.id}`}
                          className="block text-center rounded-full bg-[#fbfbef] text-black hover:bg-[#eaeaea] py-2 text-xs font-bold transition-all"
                        >
                          Apply Now
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. PAST CAMPAIGNS TAB */}
          {activeTab === "campaigns" && (
            <div className="space-y-6">
              {isOwner && (
                <div className="flex justify-end">
                  <Link
                    href="/dashboard/brand/campaigns"
                    className="inline-flex items-center gap-1 bg-[#141414] border border-[rgba(251,251,239,0.2)] text-[#fbfbef] hover:bg-[#1c1c1c] px-4 py-2 rounded-full text-xs font-bold"
                  >
                    <Plus className="size-4" />
                    <span>Manage Showcase</span>
                  </Link>
                </div>
              )}

              {campaigns.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[rgba(251,251,239,0.2)] p-12 text-center text-[rgba(251,251,239,0.5)]">
                  No past campaigns showcased yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {campaigns.map((camp) => (
                    <div
                      key={camp.id}
                      className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] overflow-hidden flex flex-col justify-between"
                    >
                      <div className="aspect-[16/9] bg-[#141414] relative overflow-hidden">
                        {camp.cover_url ? (
                          <img src={camp.cover_url} alt={camp.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#141414] flex items-center justify-center text-neutral-800">
                            No Cover
                          </div>
                        )}
                      </div>
                      <div className="p-6 space-y-4">
                        <h4 className="font-extrabold text-[#fbfbef] text-base">{camp.title}</h4>
                        <p className="text-xs text-[rgba(251,251,239,0.7)] leading-relaxed">{camp.description}</p>
                        {camp.outcome_blurb && (
                          <div className="bg-[#141414] rounded-xl p-3 border border-[rgba(251,251,239,0.05)]">
                            <span className="text-[9px] uppercase tracking-wide font-extrabold text-[rgba(251,251,239,0.4)] block mb-1">
                              Outcome / Results
                            </span>
                            <p className="text-xs font-bold text-[#4ade80]">{camp.outcome_blurb}</p>
                          </div>
                        )}
                        {camp.influencerProfiles && camp.influencerProfiles.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] text-[rgba(251,251,239,0.5)] font-bold">Participating Creators:</span>
                            <div className="flex -space-x-2.5 overflow-hidden">
                              {camp.influencerProfiles.slice(0, 5).map((inf) => (
                                <Link
                                  key={inf.id}
                                  href={`/p/influencer/${inf.id}`}
                                  title={inf.display_name}
                                  className="size-7 rounded-full border border-black overflow-hidden bg-neutral-900 inline-block"
                                >
                                  {inf.avatar_url ? (
                                    <img src={inf.avatar_url} alt={inf.display_name} className="size-full object-cover" />
                                  ) : (
                                    <div className="size-full bg-[#fbfbef] text-black font-extrabold text-[10px] flex items-center justify-center">
                                      {inf.display_name[0].toUpperCase()}
                                    </div>
                                  )}
                                </Link>
                              ))}
                              {camp.influencerProfiles.length > 5 && (
                                <div className="size-7 rounded-full border border-black bg-[#141414] text-[9px] font-bold text-[rgba(251,251,239,0.6)] flex items-center justify-center">
                                  +{camp.influencerProfiles.length - 5}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. REVIEWS TAB */}
          {activeTab === "reviews" && (
            <div className="space-y-6">
              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[rgba(251,251,239,0.2)] p-12 text-center text-[rgba(251,251,239,0.5)]">
                  No reviews left for this brand yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.15)] p-5 space-y-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-neutral-950 border border-[rgba(251,251,239,0.1)] overflow-hidden flex items-center justify-center">
                            {rev.reviewer?.avatar_url ? (
                              <img src={rev.reviewer.avatar_url} alt="Reviewer" className="size-full object-cover" />
                            ) : (
                              <User className="size-4 text-[rgba(251,251,239,0.4)]" />
                            )}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-[#fbfbef]">{rev.reviewer?.display_name || "Creator"}</h5>
                            <span className="text-[10px] text-[rgba(251,251,239,0.4)]">
                              {new Date(rev.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, idx) => (
                            <Star
                              key={idx}
                              className={`size-3.5 ${
                                idx < rev.rating ? "text-[#fbbf24] fill-[#fbbf24]" : "text-neutral-700"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {rev.comment && (
                        <p className="text-xs text-[rgba(251,251,239,0.8)] leading-relaxed italic pl-12 border-l border-[rgba(251,251,239,0.1)]">
                          "{rev.comment}"
                        </p>
                      )}

                      {rev.reply && (
                        <div className="ml-12 mt-2 bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-xl p-3 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase tracking-wide font-extrabold text-[rgba(251,251,239,0.5)]">
                              Response from Brand
                            </span>
                            {rev.reply_at && (
                              <span className="text-[9px] text-[rgba(251,251,239,0.4)]">
                                {new Date(rev.reply_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[rgba(251,251,239,0.75)]">{rev.reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. ABOUT TAB */}
          {activeTab === "about" && (
            <div className="rounded-3xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[rgba(251,251,239,0.4)] mb-3">
                  Company Overview
                </h3>
                <p className="text-sm text-[rgba(251,251,239,0.7)] leading-relaxed whitespace-pre-wrap">
                  {brand.bio || "No company bio has been entered yet."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[rgba(251,251,239,0.1)] text-xs md:text-sm">
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-1 border-b border-[rgba(251,251,239,0.05)]">
                    <span className="font-semibold text-[rgba(251,251,239,0.5)]">Industry</span>
                    <span className="font-bold text-[#fbfbef]">{brand.industry || "General"}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[rgba(251,251,239,0.05)]">
                    <span className="font-semibold text-[rgba(251,251,239,0.5)]">Location</span>
                    <span className="font-bold text-[#fbfbef]">{brand.location || "Not set"}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-1 border-b border-[rgba(251,251,239,0.05)]">
                    <span className="font-semibold text-[rgba(251,251,239,0.5)]">Company Website</span>
                    {brand.website_url ? (
                      <a
                        href={brand.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-[#fbfbef] underline"
                      >
                        {brand.website_url.replace(/(^\w+:|^)\/\//, "")}
                      </a>
                    ) : (
                      <span className="font-bold text-[rgba(251,251,239,0.5)]">Not set</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-[rgba(251,251,239,0.05)]">
                    <span className="font-semibold text-[rgba(251,251,239,0.5)]">Company size</span>
                    <span className="font-bold text-[#fbfbef]">
                      {(brand as any).company_size || "Small/Medium"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
