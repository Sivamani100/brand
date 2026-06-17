"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  User,
  Building,
  Globe,
  MapPin,
  CheckCircle2,
  Ban,
  ShieldCheck,
  Trash2,
  Layers,
  Inbox,
  MessageCircle,
} from "lucide-react";
import toast from "react-hot-toast";

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadUserData() {
    if (!id) return;
    setLoading(true);
    const userId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";

    // 1. Fetch Profile
    const { data: prof, error: profError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profError || !prof) {
      toast.error("User profile not found.");
      router.push("/admin/users");
      return;
    }

    setProfile(prof);

    // 2. Fetch specific items based on role
    if (prof.role === "brand") {
      const { data: cardData } = await supabase
        .from("cards")
        .select("*, applications(id)")
        .eq("brand_id", userId)
        .order("created_at", { ascending: false });
      setCards(cardData || []);

      const { data: roomData } = await supabase
        .from("rooms")
        .select(`
          *,
          influencer:profiles!rooms_influencer_id_fkey(display_name, avatar_url),
          card:cards(title)
        `)
        .eq("brand_id", userId);
      setRooms(roomData || []);
    } else if (prof.role === "influencer") {
      const { data: appData } = await supabase
        .from("applications")
        .select(`
          *,
          card:cards(title, category, budget_range)
        `)
        .eq("influencer_id", userId)
        .order("created_at", { ascending: false });
      setApplications(appData || []);

      const { data: roomData } = await supabase
        .from("rooms")
        .select(`
          *,
          brand:profiles!rooms_brand_id_fkey(display_name, avatar_url),
          card:cards(title)
        `)
        .eq("influencer_id", userId);
      setRooms(roomData || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadUserData();
  }, [id]);

  const handleToggleVerify = async () => {
    if (!profile) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: !profile.is_verified })
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to update verification status.");
    } else {
      toast.success("Verification badge status updated.");
      loadUserData();
    }
    setActionLoading(false);
  };

  const handleToggleSuspend = async () => {
    if (!profile) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !profile.is_active })
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to update user status.");
    } else {
      toast.success(profile.is_active ? "User suspended." : "User activated.");
      loadUserData();
    }
    setActionLoading(false);
  };

  const handleDeleteUser = async () => {
    if (!profile) return;
    const confirm = window.confirm("Are you sure you want to delete this user? This will remove all their data from the database.");
    if (!confirm) return;

    setActionLoading(true);
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to delete user profile: RLS restrictions apply.");
    } else {
      toast.success("User deleted successfully.");
      router.push("/admin/users");
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
    <div className="space-y-8 pb-12">
      {/* Back button */}
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[rgba(251,251,239,0.6)] hover:text-[#fbfbef] transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Users List</span>
        </Link>
      </div>

      {/* User Header Profile Card */}
      <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="size-20 rounded-full border border-[rgba(251,251,239,0.2)] bg-black overflow-hidden flex items-center justify-center flex-shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <User className="size-10 text-[rgba(251,251,239,0.2)]" />
            )}
          </div>
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h1 className="text-2xl font-bold font-sans">{profile.display_name}</h1>
              {profile.is_verified && (
                <span className="size-4 flex items-center justify-center bg-[#fbfbef] text-black rounded-full font-bold text-[9px]">
                  ✓
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-[rgba(251,251,239,0.6)]">
              {profile.role.toUpperCase()} • Joined {new Date(profile.created_at).toLocaleDateString()}
            </p>
            {profile.location && (
              <p className="text-xs text-[rgba(251,251,239,0.6)] flex items-center justify-center md:justify-start gap-1">
                <MapPin className="size-3.5" />
                <span>{profile.location}</span>
              </p>
            )}
          </div>
        </div>

        {/* Admin actions */}
        <div className="flex flex-wrap gap-2.5">
          <button
            disabled={actionLoading}
            onClick={handleToggleVerify}
            className={`rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-all scale-active border ${
              profile.is_verified
                ? "bg-[#fbfbef] text-black border-[#fbfbef]"
                : "border-[rgba(251,251,239,0.2)] text-[rgba(251,251,239,0.8)] hover:border-white"
            }`}
          >
            <ShieldCheck className="size-4" />
            <span>{profile.is_verified ? "Verified" : "Verify User"}</span>
          </button>
          <button
            disabled={actionLoading}
            onClick={handleToggleSuspend}
            className={`rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-all scale-active border ${
              profile.is_active
                ? "border-[#facc15]/40 hover:bg-[#facc15]/10 text-[#facc15]"
                : "bg-[#4ade80] text-black border-[#4ade80]"
            }`}
          >
            <Ban className="size-4" />
            <span>{profile.is_active ? "Suspend User" : "Activate User"}</span>
          </button>
          <button
            disabled={actionLoading}
            onClick={handleDeleteUser}
            className="rounded-full border border-[rgba(251,251,239,0.2)] text-[#f87171] hover:bg-[#261414] px-4 py-2 text-xs font-bold flex items-center gap-1.5 scale-active transition-all"
          >
            <Trash2 className="size-4" />
            <span>Delete User</span>
          </button>
        </div>
      </div>

      {/* Grid of Profile Stats & Context */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile metadata info */}
        <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-6 space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[rgba(251,251,239,0.4)]">
            Profile Details
          </h3>

          <div className="space-y-4 text-xs">
            {profile.role === "brand" ? (
              <>
                <div>
                  <span className="text-[rgba(251,251,239,0.4)] block uppercase">Company Name</span>
                  <span className="text-sm font-semibold text-[#fbfbef]">{profile.company_name || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[rgba(251,251,239,0.4)] block uppercase">Industry</span>
                  <span className="text-sm font-semibold text-[#fbfbef]">{profile.industry || "N/A"}</span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="text-[rgba(251,251,239,0.4)] block uppercase">Follower Count</span>
                  <span className="text-sm font-semibold text-[#fbfbef]">
                    {profile.follower_count ? profile.follower_count.toLocaleString() : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-[rgba(251,251,239,0.4)] block uppercase">Niche Tags</span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {profile.niche?.map((n: string) => (
                      <span key={n} className="rounded-full bg-[#141414] border border-[rgba(251,251,239,0.1)] px-2.5 py-1 text-[10px]">
                        {n}
                      </span>
                    )) || "N/A"}
                  </div>
                </div>
                <div>
                  <span className="text-[rgba(251,251,239,0.4)] block uppercase">Social Platforms</span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {profile.platforms?.map((p: string) => (
                      <span key={p} className="rounded-full bg-[#141414] border border-[rgba(251,251,239,0.1)] px-2.5 py-1 text-[10px]">
                        {p}
                      </span>
                    )) || "N/A"}
                  </div>
                </div>
              </>
            )}

            {profile.website_url && (
              <div>
                <span className="text-[rgba(251,251,239,0.4)] block uppercase">Website / Link</span>
                <a href={profile.website_url} target="_blank" rel="noreferrer" className="text-sm text-[#fbfbef] underline flex items-center gap-1 mt-1">
                  <Globe className="size-3.5" />
                  <span>Visit site</span>
                </a>
              </div>
            )}
            <div>
              <span className="text-[rgba(251,251,239,0.4)] block uppercase">Bio</span>
              <p className="text-xs text-[rgba(251,251,239,0.6)] leading-relaxed mt-1 whitespace-pre-wrap">
                {profile.bio || "No biography provided."}
              </p>
            </div>
          </div>
        </div>

        {/* Activity panels: Cards or Applications */}
        <div className="md:col-span-2 space-y-6">
          {profile.role === "brand" ? (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[rgba(251,251,239,0.4)] flex items-center gap-1.5">
                <Layers className="size-4" /> Posted Campaign Cards ({cards.length})
              </h3>
              {cards.length === 0 ? (
                <p className="text-xs text-[rgba(251,251,239,0.6)]">No campaign cards posted by this brand.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      className="rounded-xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.1)] p-4 flex justify-between items-center text-xs"
                    >
                      <div>
                        <h4 className="font-bold text-[#fbfbef]">{card.title}</h4>
                        <p className="text-[10px] text-[rgba(251,251,239,0.4)] mt-1">
                          {card.category} • {card.budget_range} • {card.applications?.length || 0} applicants
                        </p>
                      </div>
                      <Link
                        href={`/admin/cards/${card.id}`}
                        className="rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-3 py-1.5 text-[10px] font-bold text-[#fbfbef]"
                      >
                        Manage Card
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[rgba(251,251,239,0.4)] flex items-center gap-1.5">
                <Inbox className="size-4" /> Submitted Applications ({applications.length})
              </h3>
              {applications.length === 0 ? (
                <p className="text-xs text-[rgba(251,251,239,0.6)]">No applications submitted by this influencer.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="rounded-xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.1)] p-4 flex justify-between items-center text-xs"
                    >
                      <div>
                        <h4 className="font-bold text-[#fbfbef]">{app.card?.title}</h4>
                        <p className="text-[10px] text-[rgba(251,251,239,0.4)] mt-1">
                          Status: <span className="capitalize font-semibold text-[#fbfbef]">{app.status}</span> • Rate: {app.proposed_rate || "N/A"}
                        </p>
                      </div>
                      <Link
                        href="/admin/applications"
                        className="rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-3 py-1.5 text-[10px] font-bold text-[#fbfbef]"
                      >
                        View List
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User's Chat Rooms */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[rgba(251,251,239,0.4)] flex items-center gap-1.5">
              <MessageCircle className="size-4" /> Active Chat Rooms ({rooms.length})
            </h3>
            {rooms.length === 0 ? (
              <p className="text-xs text-[rgba(251,251,239,0.6)]">No chat rooms opened for this user.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.1)] p-4 flex justify-between items-center text-xs"
                  >
                    <div>
                      <h4 className="font-bold text-[#fbfbef]">
                        {profile.role === "brand"
                          ? `Chat with ${room.influencer?.display_name}`
                          : `Chat with ${room.brand?.display_name}`}
                      </h4>
                      <p className="text-[10px] text-[rgba(251,251,239,0.4)] mt-1">
                        Campaign: {room.card?.title}
                      </p>
                    </div>
                    <Link
                      href="/admin/rooms"
                      className="rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-3 py-1.5 text-[10px] font-bold text-[#fbfbef]"
                    >
                      Rooms List
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
