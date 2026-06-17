"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, DollarSign, Users, ChevronDown, ChevronUp } from "lucide-react";
import { InstagramIcon, YoutubeIcon, TwitterIcon, LinkedinIcon } from "@/components/shared/SocialIcons";
import toast from "react-hot-toast";

const NICHES = ["Fashion", "Tech", "Food", "Fitness", "Beauty", "Travel", "Gaming", "Lifestyle", "Health", "Finance", "Education", "Entertainment"];

const PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: InstagramIcon },
  { id: "youtube", name: "YouTube", icon: YoutubeIcon },
  { id: "tiktok", name: "TikTok", icon: Users }, // Custom icon
  { id: "twitter", name: "Twitter/X", icon: TwitterIcon },
  { id: "linkedin", name: "LinkedIn", icon: LinkedinIcon },
];

const BUDGET_RANGES = [
  "Under ₹10k",
  "₹10k - ₹50k",
  "₹50k - ₹2L",
  "₹2L - ₹5L",
  "₹5L+"
];

export default function OnboardingStep4() {
  const { user, profile } = useUser();
  const router = useRouter();
  const supabase = createClient() as any;
  const [loading, setLoading] = useState(false);

  // Role detection
  const role = profile?.role || "influencer";

  // Brand Step 4 states
  const [targetNiches, setTargetNiches] = useState<string[]>([]);
  const [brandPlatforms, setBrandPlatforms] = useState<string[]>([]);
  const [typicalBudget, setTypicalBudget] = useState("");

  // Creator Step 4 states
  const [activePlatforms, setActivePlatforms] = useState<string[]>([]);
  const [platformData, setPlatformData] = useState<Record<string, { handleOrUrl: string; followers: string }>>({
    instagram: { handleOrUrl: "", followers: "" },
    youtube: { handleOrUrl: "", followers: "" },
    tiktok: { handleOrUrl: "", followers: "" },
    twitter: { handleOrUrl: "", followers: "" },
    linkedin: { handleOrUrl: "", followers: "" },
  });
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      if (role === "brand") {
        setTargetNiches(profile.niche || []);
        setBrandPlatforms(profile.platforms || []);
        const prefs = (profile as any).preferences as any;
        setTypicalBudget(prefs?.typical_budget || "");
      } else {
        const knownPlatformIds = PLATFORMS.map((p) => p.id);
        const activePlats = (profile.platforms || []).filter((id: string) => knownPlatformIds.includes(id));
        setActivePlatforms(activePlats);
        if (activePlats.length > 0 && !expandedPlatform) {
          setExpandedPlatform(activePlats[0]);
        }
        const prefs = (profile as any).preferences as any;
        if (prefs?.platform_details) {
          setPlatformData(prefs.platform_details);
        }
      }
    }
  }, [profile, role]);

  const handleNicheToggle = (name: string) => {
    if (targetNiches.includes(name)) {
      setTargetNiches(targetNiches.filter((n) => n !== name));
    } else {
      setTargetNiches([...targetNiches, name]);
    }
  };

  const handleBrandPlatformToggle = (id: string) => {
    if (brandPlatforms.includes(id)) {
      setBrandPlatforms(brandPlatforms.filter((p) => p !== id));
    } else {
      setBrandPlatforms([...brandPlatforms, id]);
    }
  };

  const handleCreatorPlatformToggle = (id: string) => {
    if (activePlatforms.includes(id)) {
      setActivePlatforms(activePlatforms.filter((p) => p !== id));
      if (expandedPlatform === id) {
        setExpandedPlatform(null);
      }
    } else {
      setActivePlatforms([...activePlatforms, id]);
      setExpandedPlatform(id);
    }
  };

  const handlePlatformInputChange = (id: string, field: "handleOrUrl" | "followers", value: string) => {
    setPlatformData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    if (role === "brand") {
      if (targetNiches.length === 0) {
        toast.error("Please pick at least one target niche.");
        setLoading(false);
        return;
      }
      if (brandPlatforms.length === 0) {
        toast.error("Please pick at least one preferred platform.");
        setLoading(false);
        return;
      }
      if (!typicalBudget) {
        toast.error("Please select a typical budget.");
        setLoading(false);
        return;
      }

      const currentPrefs = (profile as any)?.preferences || {};
      const { error } = await supabase
        .from("profiles")
        .update({
          niche: targetNiches,
          platforms: brandPlatforms,
          preferences: {
            ...currentPrefs,
            typical_budget: typicalBudget
          },
          onboarding_step: 4
        })
        .eq("id", user.id);

      if (error) {
        toast.error("Failed to update preferences: " + error.message);
      } else {
        router.push("/onboarding/step-5");
      }
    } else {
      // Creator Onboarding Step 4 Save
      if (activePlatforms.length === 0) {
        toast.error("Please connect at least one platform.");
        setLoading(false);
        return;
      }

      // Validation check for active platforms
      for (const plat of activePlatforms) {
        const data = platformData[plat] || { handleOrUrl: "", followers: "" };
        if (!data.handleOrUrl.trim()) {
          toast.error(`Please enter your handle/URL for ${plat}.`);
          setExpandedPlatform(plat);
          setLoading(false);
          return;
        }
        if (!data.followers || parseInt(data.followers, 10) <= 0) {
          toast.error(`Please enter a valid follower count for ${plat}.`);
          setExpandedPlatform(plat);
          setLoading(false);
          return;
        }
      }

      // Calculate total followers
      const totalFollowers = activePlatforms.reduce((sum, plat) => {
        const count = parseInt(platformData[plat]?.followers || "0", 10) || 0;
        return sum + count;
      }, 0);

      const currentPrefs = (profile as any)?.preferences || {};
      const { error } = await supabase
        .from("profiles")
        .update({
          platforms: activePlatforms,
          follower_count: totalFollowers,
          preferences: {
            ...currentPrefs,
            platform_details: platformData
          },
          onboarding_step: 4
        })
        .eq("id", user.id);

      if (error) {
        toast.error("Failed to update platform details: " + error.message);
      } else {
        router.push("/onboarding/step-5");
      }
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h3 className="text-xl font-bold text-text-primary">
          {role === "brand" ? "Campaign Preferences" : "Connect Social Platforms"}
        </h3>
        <p className="text-xs text-text-secondary mt-1">
          {role === "brand" ? "Set targeting niches and your average campaign budget." : "Input your handle and follower stats to display to brands."}
        </p>
      </div>

      <form onSubmit={handleNext} className="space-y-6">
        {role === "brand" ? (
          /* BRAND STEP 4 FORM */
          <>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                Which Niches do you want to Target? (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {NICHES.map((nic) => {
                  const isSelected = targetNiches.includes(nic);
                  return (
                    <button
                      type="button"
                      key={nic}
                      onClick={() => handleNicheToggle(nic)}
                      className={`rounded-full px-3.5 py-2 text-xs font-semibold border transition-all scale-active ${
                        isSelected 
                          ? "bg-accent border-accent text-invert-text" 
                          : "bg-surface-2 border-border text-text-secondary hover:border-border-strong hover:text-text-primary"
                      }`}
                    >
                      {nic}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                Preferred Platforms
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {PLATFORMS.map((plat) => {
                  const Icon = plat.icon;
                  const isSelected = brandPlatforms.includes(plat.id);
                  return (
                    <button
                      type="button"
                      key={plat.id}
                      onClick={() => handleBrandPlatformToggle(plat.id)}
                      className={`flex items-center gap-2 px-4 py-3.5 rounded-full border transition-all scale-active ${
                        isSelected 
                          ? "bg-accent-bg border-accent text-accent" 
                          : "bg-surface-2 border-border text-text-secondary hover:border-border-strong hover:text-text-primary"
                      }`}
                    >
                      <Icon className="size-4" />
                      <span className="text-xs font-bold">{plat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                Typical Campaign Budget
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {BUDGET_RANGES.map((rng) => {
                  const isSelected = typicalBudget === rng;
                  return (
                    <button
                      type="button"
                      key={rng}
                      onClick={() => setTypicalBudget(rng)}
                      className={`flex items-center justify-between px-5 py-3.5 rounded-full border transition-all text-xs font-bold scale-active ${
                        isSelected 
                          ? "bg-accent text-invert-text border-accent" 
                          : "bg-surface-2 border-border text-text-secondary hover:border-border-strong hover:text-text-primary"
                      }`}
                    >
                      <span>{rng}</span>
                      <DollarSign className="size-3.5 opacity-60" />
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* INFLUENCER STEP 4 FORM */
          <>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                Select your Active Platforms (At least 1)
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PLATFORMS.map((plat) => {
                  const Icon = plat.icon;
                  const isActive = activePlatforms.includes(plat.id);
                  return (
                    <button
                      type="button"
                      key={plat.id}
                      onClick={() => handleCreatorPlatformToggle(plat.id)}
                      className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold border transition-all scale-active ${
                        isActive 
                          ? "bg-accent text-invert-text border-accent" 
                          : "bg-surface-2 border-border text-text-secondary hover:border-border-strong hover:text-text-primary"
                      }`}
                    >
                      <Icon className="size-4" />
                      <span>{plat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {activePlatforms.map((platId) => {
                const plat = PLATFORMS.find((p) => p.id === platId);
                if (!plat) return null;
                const Icon = plat.icon;
                const isExpanded = expandedPlatform === platId;
                const data = platformData[platId];

                return (
                  <div 
                    key={`form-${platId}`} 
                    className="border border-border rounded-2xl bg-surface-2 overflow-hidden transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedPlatform(isExpanded ? null : platId)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-3 transition-colors focus:outline-none"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-accent" />
                        <span className="text-xs font-bold text-text-primary">{plat.name} Integration</span>
                      </div>
                      {isExpanded ? <ChevronUp className="size-4 text-text-secondary" /> : <ChevronDown className="size-4 text-text-secondary" />}
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="px-6 pb-6 pt-2 border-t border-border/5 space-y-4"
                        >
                          <div>
                            <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block">
                              {platId === "youtube" ? "Channel URL" : platId === "linkedin" ? "Profile URL" : "Username / Handle"}
                            </label>
                            <input
                              type="text"
                              required
                              className="mt-1.5 block w-full rounded-full bg-surface border border-border px-4 py-2.5 text-xs text-text-primary placeholder-text-muted input-focus-animate"
                              placeholder={
                                platId === "youtube" ? "https://youtube.com/c/yourchannel" :
                                platId === "linkedin" ? "https://linkedin.com/in/username" :
                                "@username"
                              }
                              value={data.handleOrUrl}
                              onChange={(e) => handlePlatformInputChange(platId, "handleOrUrl", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block">
                              {platId === "linkedin" ? "Connections Count" : platId === "youtube" ? "Subscribers Count" : "Followers Count"}
                            </label>
                            <input
                              type="number"
                              required
                              min={1}
                              className="mt-1.5 block w-full rounded-full bg-surface border border-border px-4 py-2.5 text-xs text-text-primary placeholder-e.g. 15000 input-focus-animate"
                              placeholder="e.g. 25000"
                              value={data.followers}
                              onChange={(e) => handlePlatformInputChange(platId, "followers", e.target.value)}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Footer buttons */}
        <div className="flex justify-end pt-4 border-t border-border">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-accent text-invert-text px-6 py-3 text-xs font-bold hover:opacity-90 disabled:opacity-50 scale-active transition-opacity focus:outline-none shadow-glow"
          >
            {loading ? (
              <span>Saving...</span>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="size-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
