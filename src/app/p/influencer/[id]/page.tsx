"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import {
  ArrowLeft,
  User,
  Globe,
  MapPin,
  CheckCircle2,
  Award,
  Sparkles,
  Send,
  Star,
  Check,
  Plus,
  Bookmark,
  FileText,
  Upload,
} from "lucide-react";
import { InstagramIcon, YoutubeIcon, TwitterIcon, LinkedinIcon } from "@/components/shared/SocialIcons";
import toast from "react-hot-toast";
import InfluencerProfileView from "@/components/shared/InfluencerProfileView";

interface PortfolioItem {
  id: string;
  title: string | null;
  caption: string | null;
  media_url: string | null;
  media_type: "image" | "video_url" | "embed" | null;
  platform: string | null;
  post_url: string | null;
  views: number;
  likes: number;
  comments: number;
}

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

interface SavedList {
  id: string;
  name: string;
  items: { influencer_id: string }[];
}

export default function PublicInfluencerProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { profile: currentUserProfile, user: currentUser } = useUser();

  const influencerId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";

  const [profile, setProfile] = useState<any | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [brandLists, setBrandLists] = useState<SavedList[]>([]);
  const [stats, setStats] = useState({
    collabsCompleted: 0,
    acceptanceRate: 100,
  });
  const [loading, setLoading] = useState(true);

  // Tabs: portfolio, campaigns, reviews, about
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "portfolio");

  // Follower details per platform (mocked/split from profile metadata or input details)
  const [platformsInfo, setPlatformsInfo] = useState<any[]>([]);

  // Invitation Modal
  const [brandCards, setBrandCards] = useState<any[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviting, setInviting] = useState(false);

  // Save to list states
  const [isListsDropdownOpen, setIsListsDropdownOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  useEffect(() => {
    if (!influencerId) return;

    async function loadPublicData() {
      setLoading(true);
      try {
        // 1. Fetch influencer profile
        const { data: prof, error: profError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", influencerId)
          .single();

        if (profError || !prof || prof.role !== "influencer") {
          toast.error("Influencer profile not found.");
          router.push("/dashboard");
          return;
        }
        setProfile(prof);

        // Parse platforms info from profile tags
        const parsedPlatforms = (prof.platforms || []).map((p: string) => {
          let followersVal = "10K+";
          if (p === "Instagram") followersVal = prof.follower_count ? `${(prof.follower_count / 1000).toFixed(0)}K` : "15K";
          if (p === "YouTube") followersVal = "45K";
          if (p === "TikTok") followersVal = "200K";
          return { name: p, followers: followersVal };
        });
        setPlatformsInfo(parsedPlatforms);

        // 2. Fetch portfolio items
        const { data: portData } = await supabase
          .from("portfolio_items")
          .select("*")
          .eq("owner_id", influencerId)
          .order("sort_order", { ascending: true });
        setPortfolio((portData as unknown as PortfolioItem[]) || []);

        // 3. Fetch reviews left by brands
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
          .eq("reviewed_id", influencerId);
        setReviews((revs as unknown as Review[]) || []);

        // 4. Fetch collaboration statistics
        const { data: apps } = await supabase
          .from("applications")
          .select("id, status")
          .eq("influencer_id", influencerId);

        const totalApps = apps?.length || 0;
        const acceptedApps = apps?.filter((a) => a.status === "accepted").length || 0;
        const rate = totalApps > 0 ? Math.round((acceptedApps / totalApps) * 100) : 100;

        setStats({
          collabsCompleted: acceptedApps,
          acceptanceRate: rate,
        });

        // 5. Track Profile View
        if (currentUser && currentUser.id !== influencerId) {
          await supabase.from("profile_views").insert({
            profile_id: influencerId,
            viewer_id: currentUser.id,
          });
        }
      } catch (err: any) {
        console.error("Error loading influencer profile", err);
      } finally {
        setLoading(false);
      }
    }

    loadPublicData();
  }, [influencerId, currentUser]);

  // Load brand cards and brand lists if viewer is a brand
  useEffect(() => {
    if (currentUserProfile?.role === "brand" && currentUser?.id) {
      async function loadBrandWorkspaceData() {
        // Fetch active cards
        const { data: cards } = await supabase
          .from("cards")
          .select("*")
          .eq("brand_id", currentUser.id)
          .eq("status", "active");
        setBrandCards(cards || []);

        // Fetch saved lists
        const { data: lists } = await supabase
          .from("influencer_lists")
          .select(`
            *,
            items:influencer_list_items(influencer_id)
          `)
          .eq("brand_id", currentUser.id);
        setBrandLists((lists as unknown as SavedList[]) || []);
      }
      loadBrandWorkspaceData();
    }
  }, [currentUserProfile, currentUser]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardId) {
      toast.error("Please select a campaign card.");
      return;
    }
    if (!currentUser?.id || !currentUserProfile) return;

    setInviting(true);

    try {
      // Create record in database table `invites`
      const { data: inviteData, error: inviteError } = await supabase
        .from("invites")
        .insert({
          card_id: selectedCardId,
          brand_id: currentUser.id,
          influencer_id: influencerId,
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

      // Create notification for influencer
      const selectedCampaign = brandCards.find((c) => c.id === selectedCardId);
      await supabase.from("notifications").insert({
        user_id: influencerId,
        type: "direct_invite",
        title: "New Collaboration Invite! 🌟",
        body: `Brand "${currentUserProfile.display_name}" has invited you to apply for campaign "${selectedCampaign?.title}".`,
        reference_id: inviteData.id,
        reference_type: "card",
      });

      toast.success("Direct invite sent successfully!");
      setIsInviteModalOpen(false);
      setInviteMessage("");
      setSelectedCardId("");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to send invite.");
    } finally {
      setInviting(false);
    }
  };

  const toggleInfluencerInList = async (listId: string, isAdded: boolean) => {
    if (!currentUser) return;
    try {
      if (isAdded) {
        const { error } = await supabase
          .from("influencer_list_items")
          .delete()
          .eq("list_id", listId)
          .eq("influencer_id", influencerId);
        if (error) throw error;
        toast.success("Removed from saved list");
      } else {
        const { error } = await supabase
          .from("influencer_list_items")
          .insert({
            list_id: listId,
            influencer_id: influencerId,
          });
        if (error) throw error;
        toast.success("Added to saved list");
      }

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
      toast.error("Action failed.");
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
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

      // Add influencer to this new list immediately
      const { error: addError } = await supabase
        .from("influencer_list_items")
        .insert({
          list_id: newList.id,
          influencer_id: influencerId,
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

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploadingBanner(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${influencerId}/cover_${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("card-covers")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("card-covers").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ cover_banner_url: urlData.publicUrl })
        .eq("id", influencerId);

      if (updateError) throw updateError;

      setProfile((prev: any) => ({ ...prev, cover_banner_url: urlData.publicUrl }));
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

  const isOwner = currentUser?.id === influencerId;
  const isBrand = currentUserProfile?.role === "brand";

  const PLATFORM_ICONS: Record<string, any> = {
    Instagram: InstagramIcon,
    YouTube: YoutubeIcon,
    "Twitter/X": TwitterIcon,
    LinkedIn: LinkedinIcon,
  };

  return (
    <div className="min-h-screen bg-black text-[#fbfbef] font-sans pb-16">
      {/* Cover Banner */}
      <div className="aspect-[21/9] md:aspect-[32/9] w-full bg-[#0d0d0d] relative overflow-hidden group">
        {profile.cover_banner_url ? (
          <img src={profile.cover_banner_url} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-neutral-900 to-neutral-950 flex items-center justify-center text-neutral-800 text-3xl font-bold uppercase">
            {profile.display_name}
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
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="Logo" className="size-full object-cover" />
              ) : (
                <User className="size-12 text-[rgba(251,251,239,0.2)]" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold">{profile.display_name}</h1>
                {profile.is_verified && (
                  <span title="Verified Creator">
                    <CheckCircle2 className="size-6 text-[#fbfbef] fill-black stroke-[2]" />
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-[rgba(251,251,239,0.6)]">
                {(profile.niche || []).join(" · ")}
              </p>
              {profile.location && (
                <span className="text-xs text-[rgba(251,251,239,0.5)] flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  <span>{profile.location}</span>
                </span>
              )}
            </div>
          </div>

          {/* Social Platforms pill lists */}
          <div className="flex flex-wrap gap-2 pt-2">
            {platformsInfo.map((plat) => {
              const Icon = PLATFORM_ICONS[plat.name] || Globe;
              return (
                <div
                  key={plat.name}
                  className="rounded-full bg-[#141414] border border-[rgba(251,251,239,0.15)] px-3 py-1 flex items-center gap-1.5 text-xs text-[#fbfbef]"
                >
                  <Icon className="size-3.5" />
                  <span className="font-bold">{plat.followers}</span>
                </div>
              );
            })}
          </div>

          {/* Action buttons for brands */}
          {isBrand && (
            <div className="flex gap-2.5 w-full md:w-auto relative">
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="flex-1 md:flex-none px-6 py-2.5 rounded-full text-xs font-bold bg-[#fbfbef] text-black hover:bg-[#eaeaea] transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="size-4" />
                <span>Invite to Collab</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setIsListsDropdownOpen(!isListsDropdownOpen)}
                  className="px-4 py-2.5 rounded-full border border-[rgba(251,251,239,0.2)] bg-[#141414] text-[#fbfbef] hover:bg-[#1c1c1c] text-xs font-bold flex items-center gap-1"
                >
                  <Bookmark className="size-4" />
                  <span>Save to List</span>
                </button>

                {/* Dropdown list */}
                {isListsDropdownOpen && (
                  <div className="absolute right-0 bottom-full mb-2 w-64 rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-4 shadow-xl space-y-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <h5 className="text-[10px] uppercase tracking-wider text-[rgba(251,251,239,0.4)] font-bold">
                      Add to Saved List
                    </h5>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-thin">
                      {brandLists.length === 0 ? (
                        <p className="text-xs text-[rgba(251,251,239,0.4)]">No lists created yet.</p>
                      ) : (
                        brandLists.map((list) => {
                          const isAdded = list.items.some((i) => i.influencer_id === influencerId);
                          return (
                            <button
                              key={list.id}
                              onClick={() => toggleInfluencerInList(list.id, isAdded)}
                              className="w-full text-left rounded-xl px-3 py-2 text-xs font-semibold hover:bg-[#141414] flex items-center justify-between"
                            >
                              <span>{list.name}</span>
                              {isAdded && <Check className="size-4 text-[#fbfbef]" />}
                            </button>
                          );
                        })
                      )}
                    </div>

                    <form onSubmit={handleCreateList} className="pt-2 border-t border-[rgba(251,251,239,0.1)] flex gap-2">
                      <input
                        type="text"
                        placeholder="Create new list..."
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        className="flex-1 bg-[#141414] border border-[rgba(251,251,239,0.1)] rounded-full px-3 py-1.5 text-xs text-[#fbfbef] outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isCreatingList || !newListName.trim()}
                        className="size-7 rounded-full bg-[#fbfbef] text-black hover:opacity-95 flex items-center justify-center disabled:opacity-50 shrink-0"
                      >
                        <Plus className="size-4" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <InfluencerProfileView
          profile={profile}
          portfolio={portfolio}
          reviews={reviews}
          stats={stats}
          isOwner={isOwner}
        />
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0d0d0d] p-6 border border-[rgba(251,251,239,0.2)] shadow-glow space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#fbfbef]">Invite to Campaign</h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
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
                  onClick={() => setIsInviteModalOpen(false)}
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
    </div>
  );
}
