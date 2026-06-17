"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { InstagramIcon, YoutubeIcon } from "@/components/shared/SocialIcons";
import { Globe, Save, Loader2, Plus, Trash2, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function PlatformSettingsPage() {
  const { user, profile } = useUser();
  const router = useRouter();
  const supabase = createClient() as any;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Instagram States
  const [igActive, setIgActive] = useState(false);
  const [igHandle, setIgHandle] = useState("");
  const [igUrl, setIgUrl] = useState("");
  const [igFollowers, setIgFollowers] = useState("");
  const [igLikes, setIgLikes] = useState("");
  const [igComments, setIgComments] = useState("");
  const [igStoryViews, setIgStoryViews] = useState("");
  const [igReelViews, setIgReelViews] = useState("");
  const [igEr, setIgEr] = useState("");
  const [igAge, setIgAge] = useState("25-34");
  const [igGender, setIgGender] = useState("female");
  const [igGenderPct, setIgGenderPct] = useState("74");
  const [igCities, setIgCities] = useState<{ city: string; pct: number }[]>([
    { city: "Mumbai", pct: 28 },
    { city: "Delhi", pct: 18 },
    { city: "Bangalore", pct: 12 }
  ]);
  const [igCountries, setIgCountries] = useState<{ country: string; pct: number }[]>([
    { country: "India", pct: 91 }
  ]);

  // YouTube States
  const [ytActive, setYtActive] = useState(false);
  const [ytHandle, setYtHandle] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const [ytSubscribers, setYtSubscribers] = useState("");
  const [ytViews, setYtViews] = useState("");
  const [ytAvgViews, setYtAvgViews] = useState("");
  const [ytFreq, setYtFreq] = useState("");
  const [ytEr, setYtEr] = useState("");

  // TikTok States
  const [ttActive, setTtActive] = useState(false);
  const [ttHandle, setTtHandle] = useState("");
  const [ttUrl, setTtUrl] = useState("");
  const [ttFollowers, setTtFollowers] = useState("");
  const [ttAvgViews, setTtAvgViews] = useState("");
  const [ttEr, setTtEr] = useState("");

  useEffect(() => {
    if (!profile) return;
    setLoading(true);

    try {
      const data = (profile as any).platform_data || {};
      
      // Load Instagram
      if (data.instagram) {
        setIgActive(true);
        setIgHandle(data.instagram.handle || "");
        setIgUrl(data.instagram.profile_url || "");
        setIgFollowers(data.instagram.followers?.toString() || "");
        setIgLikes(data.instagram.avg_likes?.toString() || "");
        setIgComments(data.instagram.avg_comments?.toString() || "");
        setIgStoryViews(data.instagram.avg_story_views?.toString() || "");
        setIgReelViews(data.instagram.avg_reel_views?.toString() || "");
        setIgEr(data.instagram.engagement_rate?.toString() || "");
        
        if (data.instagram.audience) {
          setIgAge(data.instagram.audience.top_age_group || "25-34");
          setIgGender(data.instagram.audience.top_gender || "female");
          setIgGenderPct(data.instagram.audience.top_gender_pct?.toString() || "74");
          setIgCities(data.instagram.audience.top_cities || []);
          setIgCountries(data.instagram.audience.top_countries || []);
        }
      }

      // Load YouTube
      if (data.youtube) {
        setYtActive(true);
        setYtHandle(data.youtube.handle || "");
        setYtUrl(data.youtube.profile_url || "");
        setYtSubscribers(data.youtube.followers?.toString() || "");
        setYtViews(data.youtube.total_views?.toString() || "");
        setYtAvgViews(data.youtube.avg_views?.toString() || "");
        setYtFreq(data.youtube.upload_freq || "");
        setYtEr(data.youtube.engagement_rate?.toString() || "");
      }

      // Load TikTok
      if (data.tiktok) {
        setTtActive(true);
        setTtHandle(data.tiktok.handle || "");
        setTtUrl(data.tiktok.profile_url || "");
        setTtFollowers(data.tiktok.followers?.toString() || "");
        setTtAvgViews(data.tiktok.avg_views?.toString() || "");
        setTtEr(data.tiktok.engagement_rate?.toString() || "");
      }
    } catch (err) {
      console.error("Error loading platform settings", err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Handle auto engagement rate calculations
  useEffect(() => {
    const followersNum = parseFloat(igFollowers);
    const likesNum = parseFloat(igLikes);
    const commentsNum = parseFloat(igComments);

    if (followersNum > 0 && (likesNum > 0 || commentsNum > 0)) {
      const computed = (((likesNum + commentsNum) / followersNum) * 100).toFixed(2);
      setIgEr(computed);
    }
  }, [igFollowers, igLikes, igComments]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const updatedPlatformData: any = {};

      if (igActive) {
        updatedPlatformData.instagram = {
          handle: igHandle,
          profile_url: igUrl,
          followers: parseInt(igFollowers) || 0,
          avg_likes: parseInt(igLikes) || 0,
          avg_comments: parseInt(igComments) || 0,
          avg_story_views: parseInt(igStoryViews) || 0,
          avg_reel_views: parseInt(igReelViews) || 0,
          engagement_rate: parseFloat(igEr) || 0,
          audience: {
            top_age_group: igAge,
            top_gender: igGender,
            top_gender_pct: parseInt(igGenderPct) || 0,
            top_cities: igCities,
            top_countries: igCountries
          }
        };
      }

      if (ytActive) {
        updatedPlatformData.youtube = {
          handle: ytHandle,
          profile_url: ytUrl,
          followers: parseInt(ytSubscribers) || 0,
          total_views: parseInt(ytViews) || 0,
          avg_views: parseInt(ytAvgViews) || 0,
          upload_freq: ytFreq,
          engagement_rate: parseFloat(ytEr) || 0
        };
      }

      if (ttActive) {
        updatedPlatformData.tiktok = {
          handle: ttHandle,
          profile_url: ttUrl,
          followers: parseInt(ttFollowers) || 0,
          avg_views: parseInt(ttAvgViews) || 0,
          engagement_rate: parseFloat(ttEr) || 0
        };
      }

      // Update in profiles
      const { error } = await supabase
        .from("profiles")
        .update({
          platform_data: updatedPlatformData,
          platforms: Object.keys(updatedPlatformData).map((k) => k.charAt(0).toUpperCase() + k.slice(1)),
          // update total follower reach count
          follower_count: (updatedPlatformData.instagram?.followers || 0) + 
                          (updatedPlatformData.youtube?.followers || 0) + 
                          (updatedPlatformData.tiktok?.followers || 0)
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Platform statistics saved successfully!");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save platform statistics.");
    } finally {
      setSaving(false);
    }
  };

  const addCity = () => {
    setIgCities([...igCities, { city: "", pct: 0 }]);
  };
  const removeCity = (idx: number) => {
    setIgCities(igCities.filter((_, i) => i !== idx));
  };
  const updateCity = (idx: number, field: "city" | "pct", val: any) => {
    setIgCities(
      igCities.map((c, i) => {
        if (i === idx) {
          return { ...c, [field]: field === "pct" ? parseInt(val) || 0 : val };
        }
        return c;
      })
    );
  };

  const addCountry = () => {
    setIgCountries([...igCountries, { country: "", pct: 0 }]);
  };
  const removeCountry = (idx: number) => {
    setIgCountries(igCountries.filter((_, i) => i !== idx));
  };
  const updateCountry = (idx: number, field: "country" | "pct", val: any) => {
    setIgCountries(
      igCountries.map((c, i) => {
        if (i === idx) {
          return { ...c, [field]: field === "pct" ? parseInt(val) || 0 : val };
        }
        return c;
      })
    );
  };

  if (loading) {
    return (
      <div className="flex h-60 w-full items-center justify-center bg-bg">
        <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-black text-text-primary">Platform Statistics</h2>
          <p className="text-xs text-text-secondary mt-1">
            Provide self-reported metrics from your creator analytics. Brands view these directly.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-accent text-invert-text hover:opacity-90 transition-all px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          <span>Save Changes</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* Instagram Form Section */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <InstagramIcon className="h-6 w-6 text-text-primary" />
              <div>
                <h3 className="font-bold text-sm text-text-primary">Instagram Analytics</h3>
                <span className="text-[10px] text-text-secondary">Likes, Reels, Stories, and audience demographics</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={igActive}
                onChange={(e) => setIgActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-2 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted after:border-text-secondary after:border after:rounded-full after:height-4 after:h-4 after:w-4 after:transition-all peer-checked:bg-accent peer-checked:after:bg-black peer-checked:after:border-black" />
              <span className="ml-2 text-xs font-bold text-text-muted">Enable</span>
            </label>
          </div>

          {igActive && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Instagram Handle</label>
                  <input
                    type="text"
                    placeholder="@username"
                    value={igHandle}
                    onChange={(e) => setIgHandle(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Profile Link URL</label>
                  <input
                    type="url"
                    placeholder="https://instagram.com/username"
                    value={igUrl}
                    onChange={(e) => setIgUrl(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Followers Count</label>
                  <input
                    type="number"
                    placeholder="120000"
                    value={igFollowers}
                    onChange={(e) => setIgFollowers(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Avg Likes / Post</label>
                  <input
                    type="number"
                    placeholder="8000"
                    value={igLikes}
                    onChange={(e) => setIgLikes(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Avg Comments</label>
                  <input
                    type="number"
                    placeholder="300"
                    value={igComments}
                    onChange={(e) => setIgComments(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5 flex items-center gap-1">
                    <span>Engagement Rate (%)</span>
                    <span title="Auto-calculated but editable"><HelpCircle className="h-3 w-3 text-text-muted cursor-pointer" /></span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="6.8"
                    value={igEr}
                    onChange={(e) => setIgEr(e.target.value)}
                    className="w-full bg-surface-2 border border-border rounded-lg px-3.5 py-2 text-sm text-text-secondary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Avg Story Views</label>
                  <input
                    type="number"
                    placeholder="15000"
                    value={igStoryViews}
                    onChange={(e) => setIgStoryViews(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Avg Reel Views</label>
                  <input
                    type="number"
                    placeholder="80000"
                    value={igReelViews}
                    onChange={(e) => setIgReelViews(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
              </div>

              {/* Audience Demographics fields */}
              <div className="border-t border-border pt-6 space-y-4">
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest">Audience Demographics</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Top Age Group</label>
                    <select
                      value={igAge}
                      onChange={(e) => setIgAge(e.target.value)}
                      className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary outline-none"
                    >
                      <option value="13-17">13-17</option>
                      <option value="18-24">18-24</option>
                      <option value="25-34">25-34</option>
                      <option value="35-44">35-44</option>
                      <option value="45+">45+</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Primary Gender</label>
                    <select
                      value={igGender}
                      onChange={(e) => setIgGender(e.target.value)}
                      className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary outline-none"
                    >
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other / Non-Binary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Primary Gender (%)</label>
                    <input
                      type="number"
                      placeholder="74"
                      value={igGenderPct}
                      onChange={(e) => setIgGenderPct(e.target.value)}
                      className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  {/* Cities */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-text-muted">Top Audience Cities</label>
                      <button
                        type="button"
                        onClick={addCity}
                        className="text-[10px] text-text-secondary font-bold flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Add City
                      </button>
                    </div>
                    {igCities.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Mumbai"
                          value={item.city}
                          onChange={(e) => updateCity(idx, "city", e.target.value)}
                          className="flex-1 bg-bg border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary"
                        />
                        <input
                          type="number"
                          placeholder="%"
                          value={item.pct || ""}
                          onChange={(e) => updateCity(idx, "pct", e.target.value)}
                          className="w-16 bg-bg border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary"
                        />
                        <button
                          type="button"
                          onClick={() => removeCity(idx)}
                          className="text-text-muted hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Countries */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-text-muted">Top Audience Countries</label>
                      <button
                        type="button"
                        onClick={addCountry}
                        className="text-[10px] text-text-secondary font-bold flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Add Country
                      </button>
                    </div>
                    {igCountries.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="India"
                          value={item.country}
                          onChange={(e) => updateCountry(idx, "country", e.target.value)}
                          className="flex-1 bg-bg border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary"
                        />
                        <input
                          type="number"
                          placeholder="%"
                          value={item.pct || ""}
                          onChange={(e) => updateCountry(idx, "pct", e.target.value)}
                          className="w-16 bg-bg border border-border rounded-lg px-2 py-1.5 text-xs text-text-primary"
                        />
                        <button
                          type="button"
                          onClick={() => removeCountry(idx)}
                          className="text-text-muted hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* YouTube Section */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <YoutubeIcon className="h-6 w-6 text-text-primary" />
              <div>
                <h3 className="font-bold text-sm text-text-primary">YouTube Analytics</h3>
                <span className="text-[10px] text-text-secondary">Subscribers, total views, and video integrations</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={ytActive}
                onChange={(e) => setYtActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-2 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted after:border-text-secondary after:border after:rounded-full after:height-4 after:h-4 after:w-4 after:transition-all peer-checked:bg-accent peer-checked:after:bg-black peer-checked:after:border-black" />
              <span className="ml-2 text-xs font-bold text-text-muted">Enable</span>
            </label>
          </div>

          {ytActive && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Channel Name / Handle</label>
                  <input
                    type="text"
                    placeholder="@channel"
                    value={ytHandle}
                    onChange={(e) => setYtHandle(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Channel Link URL</label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/channel/..."
                    value={ytUrl}
                    onChange={(e) => setYtUrl(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Subscribers</label>
                  <input
                    type="number"
                    placeholder="45000"
                    value={ytSubscribers}
                    onChange={(e) => setYtSubscribers(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Total Channel Views</label>
                  <input
                    type="number"
                    placeholder="2500000"
                    value={ytViews}
                    onChange={(e) => setYtViews(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Avg Video Views</label>
                  <input
                    type="number"
                    placeholder="20000"
                    value={ytAvgViews}
                    onChange={(e) => setYtAvgViews(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Engagement Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="4.2"
                    value={ytEr}
                    onChange={(e) => setYtEr(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1.5">Upload Frequency</label>
                <input
                  type="text"
                  placeholder="e.g. 2x per week, 1x per month"
                  value={ytFreq}
                  onChange={(e) => setYtFreq(e.target.value)}
                  className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* TikTok Section */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <Globe className="h-6 w-6 text-text-primary" />
              <div>
                <h3 className="font-bold text-sm text-text-primary">TikTok Analytics</h3>
                <span className="text-[10px] text-text-secondary">TikTok followers, views, and engagement metrics</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={ttActive}
                onChange={(e) => setTtActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-surface-2 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted after:border-text-secondary after:border after:rounded-full after:height-4 after:h-4 after:w-4 after:transition-all peer-checked:bg-accent peer-checked:after:bg-black peer-checked:after:border-black" />
              <span className="ml-2 text-xs font-bold text-text-muted">Enable</span>
            </label>
          </div>

          {ttActive && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">TikTok Handle</label>
                  <input
                    type="text"
                    placeholder="@username"
                    value={ttHandle}
                    onChange={(e) => setTtHandle(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Profile Link URL</label>
                  <input
                    type="url"
                    placeholder="https://tiktok.com/@username"
                    value={ttUrl}
                    onChange={(e) => setTtUrl(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Followers</label>
                  <input
                    type="number"
                    placeholder="200000"
                    value={ttFollowers}
                    onChange={(e) => setTtFollowers(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Avg Video Views</label>
                  <input
                    type="number"
                    placeholder="120000"
                    value={ttAvgViews}
                    onChange={(e) => setTtAvgViews(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Engagement Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="8.1"
                    value={ttEr}
                    onChange={(e) => setTtEr(e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg px-3.5 py-2 text-sm text-text-primary focus:ring-1 focus:ring-accent/20 outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
