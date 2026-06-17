"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { Upload, CheckCircle2, User, Globe, Sparkles } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const NICHES = [
  "Fashion",
  "Tech",
  "Food",
  "Fitness",
  "Beauty",
  "Travel",
  "Gaming",
  "Lifestyle",
];

const PLATFORMS = ["Instagram", "YouTube", "TikTok", "Twitter/X", "LinkedIn"];

export default function InfluencerProfilePage() {
  const { profile, user } = useUser();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Influencer specific states
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [location, setLocation] = useState("");

  // Read-only stats
  const [stats, setStats] = useState({
    appsSent: 0,
    acceptedCollabs: 0,
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setWebsiteUrl(profile.website_url || "");
      setAvatarUrl(profile.avatar_url || "");
      setSelectedNiches(profile.niche || []);
      setSelectedPlatforms(profile.platforms || []);
      setFollowerCount(profile.follower_count || 0);
      setLocation(profile.location || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    async function loadStats() {
      // 1. Applications sent
      const { count: appsCount } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("influencer_id", user.id);

      // 2. Accepted collaborations
      const { count: collabsCount } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("influencer_id", user.id)
        .eq("status", "accepted");

      setStats({
        appsSent: appsCount || 0,
        acceptedCollabs: collabsCount || 0,
      });
    }

    loadStats();
  }, [user]);

  const handleNicheToggle = (niche: string) => {
    setSelectedNiches((prev) =>
      prev.includes(niche) ? prev.filter((item) => item !== niche) : [...prev, niche]
    );
  };

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((item) => item !== platform) : [...prev, platform]
    );
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Avatar size cannot exceed 5MB.");
      return;
    }

    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (selectedNiches.length === 0 || selectedPlatforms.length === 0) {
      toast.error("Please select at least one niche and platform.");
      return;
    }

    setLoading(true);
    let finalAvatarUrl = avatarUrl;

    if (avatarFile) {
      const fileName = `${user.id}/${Date.now()}-${avatarFile.name}`;
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, avatarFile, { upsert: true });

      if (error) {
        toast.error("Avatar upload failed.");
        setLoading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(data.path);
      finalAvatarUrl = publicUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        bio: bio,
        website_url: websiteUrl,
        avatar_url: finalAvatarUrl,
        niche: selectedNiches,
        platforms: selectedPlatforms,
        follower_count: followerCount,
        location: location,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      toast.error(error.message || "Failed to update profile.");
    } else {
      toast.success("Profile saved successfully.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary font-sans">
          Influencer Profile Settings
        </h1>
        <p className="text-xs text-text-secondary">
          Configure your niche tags, follower counts, and target platforms
        </p>
      </div>

      {/* Profile Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-surface border border-border p-5 text-center">
          <span className="text-[10px] text-text-muted uppercase font-semibold">Applications Sent</span>
          <div className="text-2xl font-bold text-text-primary mt-2">{stats.appsSent}</div>
        </div>
        <div className="rounded-2xl bg-surface border border-border p-5 text-center">
          <span className="text-[10px] text-text-muted uppercase font-semibold">Accepted Collabs</span>
          <div className="text-2xl font-bold text-text-primary mt-2">{stats.acceptedCollabs}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Avatar upload preview */}
        <div className="rounded-2xl bg-surface border border-border-strong p-6 flex flex-col items-center justify-center space-y-4">
          <div className="size-32 rounded-full border border-border-strong bg-bg overflow-hidden flex items-center justify-center relative group">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <User className="size-16 text-text-muted" />
            )}
            <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-semibold text-white">
              Upload New
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </label>
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold text-text-primary">Profile Photo</h3>
            <p className="text-[10px] text-text-muted mt-1">PNG, JPG up to 5MB</p>
          </div>
          <div className="pt-2 w-full space-y-2">
            <Link
              href="/dashboard/influencer/settings/verification"
              className="block text-center rounded-full border border-border-strong bg-surface-2 hover:bg-bg text-xs font-bold text-text-primary py-2 w-full transition-all scale-active"
            >
              Verification Badge Status
            </Link>
            <Link
              href="/dashboard/influencer/settings/notifications"
              className="block text-center rounded-full border border-border-strong bg-surface-2 hover:bg-bg text-xs font-bold text-text-primary py-2 w-full transition-all scale-active"
            >
              Notification Settings
            </Link>
            <Link
              href="/dashboard/influencer/settings/security"
              className="block text-center rounded-full border border-border-strong bg-surface-2 hover:bg-bg text-xs font-bold text-text-primary py-2 w-full transition-all scale-active"
            >
              Security Settings
            </Link>
            <Link
              href="/dashboard/influencer/settings/privacy"
              className="block text-center rounded-full border border-border-strong bg-surface-2 hover:bg-bg text-xs font-bold text-text-primary py-2 w-full transition-all scale-active"
            >
              GDPR Privacy Control
            </Link>
          </div>
        </div>

        {/* Right column: Form inputs */}
        <div className="lg:col-span-2 rounded-2xl bg-surface border border-border-strong p-8">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Contact Display Name
                </label>
                <input
                  type="text"
                  required
                  className="mt-2 block w-full rounded-full bg-surface-2 border border-border-strong px-4 py-3 text-sm text-text-primary placeholder-text-muted input-focus-animate"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Website / Social Link
                </label>
                <div className="relative mt-2">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                  <input
                    type="url"
                    className="block w-full rounded-full bg-surface-2 border border-border-strong pl-11 pr-4 py-3 text-sm text-text-primary placeholder-https://instagram.com/my-channel input-focus-animate"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Follower Count
                </label>
                <input
                  type="number"
                  required
                  className="mt-2 block w-full rounded-full bg-surface-2 border border-border-strong px-4 py-3 text-sm text-text-primary placeholder-text-muted input-focus-animate"
                  value={followerCount || ""}
                  onChange={(e) => setFollowerCount(parseInt(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Location
                </label>
                <input
                  type="text"
                  required
                  className="mt-2 block w-full rounded-full bg-surface-2 border border-border-strong px-4 py-3 text-sm text-text-primary placeholder-text-muted input-focus-animate"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            {/* Niches Multi-select chips */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">
                Niches (Multi-select)
              </label>
              <div className="flex flex-wrap gap-2">
                {NICHES.map((niche) => {
                  const isSelected = selectedNiches.includes(niche);
                  return (
                    <button
                      type="button"
                      key={niche}
                      onClick={() => handleNicheToggle(niche)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all scale-active ${
                        isSelected
                          ? "bg-accent text-invert-text"
                          : "bg-surface-2 text-text-secondary border border-border hover:border-border-strong"
                      }`}
                    >
                      {niche}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Platforms Multi-select chips */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">
                Platforms (Multi-select)
              </label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((plat) => {
                  const isSelected = selectedPlatforms.includes(plat);
                  return (
                    <button
                      type="button"
                      key={plat}
                      onClick={() => handlePlatformToggle(plat)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all scale-active ${
                        isSelected
                          ? "bg-accent text-invert-text"
                          : "bg-surface-2 text-text-secondary border border-border hover:border-border-strong"
                      }`}
                    >
                      {plat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Influencer Biography (Bio)
              </label>
              <textarea
                rows={4}
                className="mt-2 block w-full rounded-2xl bg-surface-2 border border-border-strong px-4 py-3 text-sm text-text-primary placeholder-text-muted input-focus-animate"
                placeholder="Share more about your content style, target demographic, and prior collaboration successes..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-accent text-invert-text font-bold px-8 py-3 text-sm hover:opacity-90 disabled:opacity-50 scale-active transition-opacity"
              >
                {loading ? "Saving Changes..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
