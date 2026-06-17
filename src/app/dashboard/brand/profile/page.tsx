"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { Upload, FileText, CheckCircle2, Heart, Award, ShieldAlert, Sparkles, Building, Globe } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

const INDUSTRIES = [
  "Fashion & Apparel",
  "Technology & Software",
  "Food & Beverage",
  "Health & Wellness",
  "Beauty & Cosmetics",
  "Travel & Tourism",
  "Gaming & Esports",
  "Lifestyle",
];

export default function BrandProfilePage() {
  const { profile, user } = useUser();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Read-only stats
  const [stats, setStats] = useState({
    cardsPosted: 0,
    appsReceived: 0,
    successfulCollabs: 0,
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setCompanyName(profile.company_name || "");
      setIndustry(profile.industry || "");
      setBio(profile.bio || "");
      setWebsiteUrl(profile.website_url || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    async function loadStats() {
      // 1. Cards posted
      const { count: cardsCount } = await supabase
        .from("cards")
        .select("*", { count: "exact", head: true })
        .eq("brand_id", user.id);

      // 2. Apps received
      const { count: appsCount } = await supabase
        .from("applications")
        .select("*, cards!inner(*)", { count: "exact", head: true })
        .eq("cards.brand_id", user.id);

      // 3. Successful collabs (accepted)
      const { count: collabsCount } = await supabase
        .from("applications")
        .select("*, cards!inner(*)", { count: "exact", head: true })
        .eq("cards.brand_id", user.id)
        .eq("status", "accepted");

      setStats({
        cardsPosted: cardsCount || 0,
        appsReceived: appsCount || 0,
        successfulCollabs: collabsCount || 0,
      });
    }

    loadStats();
  }, [user]);

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

    setLoading(true);
    let finalAvatarUrl = avatarUrl;

    // 1. Upload Avatar if changed
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

    // 2. Update profiles table
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        company_name: companyName,
        industry: industry,
        bio: bio,
        website_url: websiteUrl,
        avatar_url: finalAvatarUrl,
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
      <div className="border-b border-[rgba(251,251,239,0.1)] pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef] font-sans">
          Brand Profile Settings
        </h1>
        <p className="text-xs text-[rgba(251,251,239,0.6)]">
          Update your public profile context and view campaign statistics
        </p>
      </div>

      {/* Profile Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.1)] p-5 text-center">
          <span className="text-[10px] text-[rgba(251,251,239,0.4)] uppercase font-semibold">Cards Posted</span>
          <div className="text-2xl font-bold text-[#fbfbef] mt-2">{stats.cardsPosted}</div>
        </div>
        <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.1)] p-5 text-center">
          <span className="text-[10px] text-[rgba(251,251,239,0.4)] uppercase font-semibold">Applications Received</span>
          <div className="text-2xl font-bold text-[#fbfbef] mt-2">{stats.appsReceived}</div>
        </div>
        <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.1)] p-5 text-center">
          <span className="text-[10px] text-[rgba(251,251,239,0.4)] uppercase font-semibold">Successful Collabs</span>
          <div className="text-2xl font-bold text-[#fbfbef] mt-2">{stats.successfulCollabs}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Avatar Upload Preview */}
        <div className="rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-6 flex flex-col items-center justify-center space-y-4">
          <div className="size-32 rounded-full border border-[rgba(251,251,239,0.2)] bg-black overflow-hidden flex items-center justify-center relative group">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <Building className="size-16 text-[rgba(251,251,239,0.2)]" />
            )}
            <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-semibold text-white">
              Upload New
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </label>
          </div>
          <div className="text-center">
            <h3 className="text-sm font-bold text-[#fbfbef]">Company Logo</h3>
            <p className="text-[10px] text-[rgba(251,251,239,0.4)] mt-1">PNG, JPG up to 5MB</p>
          </div>
          <div className="pt-2 w-full space-y-2">
            <Link
              href="/dashboard/brand/settings/verification"
              className="block text-center rounded-full border border-[rgba(251,251,239,0.2)] bg-[#141414] hover:bg-black text-xs font-bold text-[#fbfbef] py-2 w-full transition-all scale-active"
            >
              Verification Badge Status
            </Link>
            <Link
              href="/dashboard/brand/settings/notifications"
              className="block text-center rounded-full border border-[rgba(251,251,239,0.2)] bg-[#141414] hover:bg-black text-xs font-bold text-[#fbfbef] py-2 w-full transition-all scale-active"
            >
              Notification Settings
            </Link>
            <Link
              href="/dashboard/brand/settings/security"
              className="block text-center rounded-full border border-[rgba(251,251,239,0.2)] bg-[#141414] hover:bg-black text-xs font-bold text-[#fbfbef] py-2 w-full transition-all scale-active"
            >
              Security Settings
            </Link>
            <Link
              href="/dashboard/brand/settings/privacy"
              className="block text-center rounded-full border border-[rgba(251,251,239,0.2)] bg-[#141414] hover:bg-black text-xs font-bold text-[#fbfbef] py-2 w-full transition-all scale-active"
            >
              GDPR Privacy Control
            </Link>
          </div>
        </div>

        {/* Right column: Edit inputs */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0d0d0d] border border-[rgba(251,251,239,0.2)] p-8">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                  Full Contact Name
                </label>
                <input
                  type="text"
                  required
                  className="mt-2 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  className="mt-2 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                  Industry
                </label>
                <select
                  required
                  className="mt-2 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] input-focus-animate"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                >
                  <option value="" disabled>Select Industry</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                  Website URL
                </label>
                <div className="relative mt-2">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[rgba(251,251,239,0.4)]" />
                  <input
                    type="url"
                    className="block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] pl-11 pr-4 py-3 text-sm text-[#fbfbef] placeholder-https://brand.com input-focus-animate"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                Company Biography (Bio)
              </label>
              <textarea
                rows={4}
                className="mt-2 block w-full rounded-2xl bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                placeholder="A brief overview about your company value and campaign target audience..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-[#fbfbef] text-black font-bold px-8 py-3 text-sm hover:opacity-90 disabled:opacity-50 scale-active transition-opacity"
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
