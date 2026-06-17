"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import {
  Bookmark,
  Trash2,
  User,
  Users,
  MapPin,
  Star,
  ExternalLink,
  ShieldCheck,
  Building,
} from "lucide-react";
import toast from "react-hot-toast";

interface SavedInfluencer {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  niche: string[] | null;
  platforms: string[] | null;
  follower_count: number | null;
  location: string | null;
  is_verified: boolean;
}

interface SavedListItem {
  id: string;
  influencer_id: string;
  influencer: SavedInfluencer | null;
}

interface SavedList {
  id: string;
  name: string;
  created_at: string;
  items: SavedListItem[];
}

export default function SavedInfluencersPage() {
  const { profile: currentUserProfile, user: currentUser } = useUser();
  const supabase = createClient();

  const [lists, setLists] = useState<SavedList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load saved lists
  async function loadSavedLists() {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase
        .from("influencer_lists")
        .select(`
          id,
          name,
          created_at,
          items:influencer_list_items(
            id,
            influencer_id,
            influencer:profiles(
              id,
              display_name,
              avatar_url,
              bio,
              niche,
              platforms,
              follower_count,
              location,
              is_verified
            )
          )
        `)
        .eq("brand_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const resolvedLists = (data as unknown as SavedList[]) || [];
      setLists(resolvedLists);

      // Select first list by default if none selected or if previously selected list is gone
      if (resolvedLists.length > 0) {
        if (!activeListId || !resolvedLists.some((l) => l.id === activeListId)) {
          setActiveListId(resolvedLists[0].id);
        }
      } else {
        setActiveListId(null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load saved lists");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSavedLists();
  }, [currentUser]);

  const handleDeleteList = async (listId: string) => {
    if (!confirm("Are you sure you want to delete this list and all its saved creators?")) return;
    try {
      const { error } = await supabase.from("influencer_lists").delete().eq("id", listId);
      if (error) throw error;
      toast.success("List deleted");
      loadSavedLists();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete list");
    }
  };

  const handleRemoveInfluencer = async (itemId: string) => {
    try {
      const { error } = await supabase.from("influencer_list_items").delete().eq("id", itemId);
      if (error) throw error;
      toast.success("Creator removed from list");
      loadSavedLists();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to remove creator");
    }
  };

  const activeList = lists.find((l) => l.id === activeListId);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#fbfbef]">Saved Lists</h1>
        <p className="text-sm text-[rgba(251,251,239,0.6)] mt-1">
          Curate and manage lists of target creators for campaigns.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
          <div className="h-64 bg-[#0d0d0d] rounded-2xl md:col-span-1" />
          <div className="h-96 bg-[#0d0d0d] rounded-2xl md:col-span-3" />
        </div>
      ) : lists.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-[rgba(251,251,239,0.2)] rounded-3xl max-w-md mx-auto">
          <Bookmark className="size-12 text-[rgba(251,251,239,0.2)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#fbfbef]">No Lists Found</h3>
          <p className="text-sm text-[rgba(251,251,239,0.6)] mt-1 mb-6">
            Create lists and save creators from their profile pages or the influencer directory.
          </p>
          <Link
            href="/dashboard/brand/influencers"
            className="rounded-full bg-[#fbfbef] text-black px-6 py-2.5 text-xs font-bold"
          >
            Discover Influencers
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
          {/* Lists sidebar (Col 1) */}
          <div className="bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] rounded-2xl p-4 space-y-2.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[rgba(251,251,239,0.4)] px-2 block">
              Your Saved Lists ({lists.length})
            </span>
            <div className="space-y-1">
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => setActiveListId(list.id)}
                  className={`w-full text-left rounded-xl px-3 py-3 text-xs font-bold flex items-center justify-between transition-colors ${
                    activeListId === list.id
                      ? "bg-[#1c1c1c] text-[#fbfbef] border-l-2 border-[#fbfbef]"
                      : "text-[rgba(251,251,239,0.6)] hover:bg-[#141414] hover:text-[#fbfbef]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="size-4" />
                    <span className="truncate max-w-[120px]">{list.name}</span>
                  </div>
                  <span className="text-[10px] bg-black border border-[rgba(251,251,239,0.1)] px-1.5 py-0.5 rounded-md font-mono text-[rgba(251,251,239,0.5)]">
                    {list.items.length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* List contents (Col 2-4) */}
          <div className="md:col-span-3 space-y-6">
            {activeList && (
              <div className="space-y-6">
                {/* List Header Details */}
                <div className="flex justify-between items-center pb-4 border-b border-[rgba(251,251,239,0.1)]">
                  <div>
                    <h2 className="text-xl font-extrabold text-[#fbfbef]">{activeList.name}</h2>
                    <span className="text-[10px] text-[rgba(251,251,239,0.4)] block mt-0.5">
                      Created on {new Date(activeList.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteList(activeList.id)}
                    className="rounded-full hover:bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Delete List</span>
                  </button>
                </div>

                {/* Grid of Influencers in selected list */}
                {activeList.items.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-[rgba(251,251,239,0.1)] rounded-2xl text-[rgba(251,251,239,0.5)]">
                    No creators saved in this list yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {activeList.items.map((item) => {
                      const inf = item.influencer;
                      if (!inf) return null;

                      return (
                        <div
                          key={item.id}
                          className="group bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] hover:border-[rgba(251,251,239,0.35)] rounded-2xl p-5 flex flex-col justify-between transition-all lift-hover"
                        >
                          <div className="space-y-4">
                            {/* Header Info */}
                            <div className="flex gap-4 items-start">
                              <div className="size-12 rounded-xl border border-[rgba(251,251,239,0.15)] bg-black overflow-hidden flex items-center justify-center shrink-0">
                                {inf.avatar_url ? (
                                  <img src={inf.avatar_url} alt={inf.display_name} className="size-full object-cover" />
                                ) : (
                                  <User className="size-6 text-[rgba(251,251,239,0.2)]" />
                                )}
                              </div>

                              <div className="space-y-0.5 flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-extrabold text-sm text-[#fbfbef] truncate">
                                    {inf.display_name}
                                  </h4>
                                  {inf.is_verified && (
                                    <ShieldCheck className="size-4 text-[#fbfbef] fill-black stroke-[2]" />
                                  )}
                                </div>
                                <span className="text-[10px] font-semibold text-[rgba(251,251,239,0.5)] truncate block">
                                  {(inf.niche || []).join(" · ")}
                                </span>
                                {inf.location && (
                                  <span className="text-[9px] text-[rgba(251,251,239,0.4)] flex items-center gap-0.5 mt-0.5">
                                    <MapPin className="size-2.5" />
                                    {inf.location}
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-[11px] text-[rgba(251,251,239,0.6)] line-clamp-2 leading-relaxed">
                              {inf.bio || "No bio info provided."}
                            </p>

                            <div className="flex items-center justify-between text-[10px] font-bold text-[rgba(251,251,239,0.5)]">
                              <span>Reach: {inf.follower_count ? inf.follower_count.toLocaleString() : "10K"}</span>
                              <span>Platforms: {(inf.platforms || []).join(", ")}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-[rgba(251,251,239,0.05)] mt-4">
                            <Link
                              href={`/p/influencer/${inf.id}`}
                              className="text-center rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] text-[#fbfbef] hover:bg-[#1c1c1c] py-1.5 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                            >
                              <ExternalLink className="size-3" />
                              <span>View Profile</span>
                            </Link>

                            <button
                              onClick={() => handleRemoveInfluencer(item.id)}
                              className="text-center rounded-full hover:bg-red-500/10 border border-red-500/10 text-red-400 py-1.5 text-xs font-bold transition-colors"
                            >
                              Remove Saved
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
