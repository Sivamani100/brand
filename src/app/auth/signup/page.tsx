"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
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

export default function SignUpPage() {
  const [role, setRole] = useState<"brand" | "influencer">("influencer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  // Brand-specific fields
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");

  // Influencer-specific fields
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [location, setLocation] = useState("");

  const router = useRouter();
  const supabase = createClient();

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !displayName) {
      toast.error("Please fill in all basic fields.");
      return;
    }

    if (role === "brand" && (!companyName || !industry)) {
      toast.error("Please fill in company name and industry.");
      return;
    }

    if (role === "influencer" && (selectedNiches.length === 0 || selectedPlatforms.length === 0)) {
      toast.error("Please select at least one niche and one platform.");
      return;
    }

    setLoading(true);

    const metaData: Record<string, any> = {
      role,
      display_name: displayName,
    };

    if (role === "brand") {
      metaData.company_name = companyName;
      metaData.industry = industry;
    } else {
      metaData.niche = selectedNiches;
      metaData.platforms = selectedPlatforms;
      metaData.follower_count = followerCount;
      metaData.location = location;
    }

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metaData,
      },
    });

    if (error) {
      toast.error(error.message || "Failed to sign up.");
      setLoading(false);
      return;
    }

    try {
      await fetch("/api/auth/after-signin", { method: "POST" });
    } catch (err) {
      console.error("Failed to log signup login history:", err);
    }

    toast.success("Successfully registered! Redirecting...");
    
    // Redirect to relevant dashboard
    setTimeout(() => {
      if (role === "brand") {
        router.push("/dashboard/brand");
      } else {
        router.push("/dashboard/influencer");
      }
      router.refresh();
    }, 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6 py-12">
      <div className="w-full max-w-lg space-y-8 rounded-2xl bg-[#0d0d0d] p-8 border border-[rgba(251,251,239,0.2)] shadow-glow lift-hover">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#fbfbef] font-sans">
            Create Account
          </h1>
          <p className="mt-2 text-sm text-[rgba(251,251,239,0.6)]">
            Join Brand as a partner
          </p>
        </div>

        {/* Role Picker (Segmented Pill Toggle) */}
        <div className="flex justify-center mt-6">
          <div className="relative flex w-full max-w-xs rounded-full bg-[#141414] p-1 border border-[rgba(251,251,239,0.1)]">
            <button
              type="button"
              className={`flex-1 rounded-full py-2 text-center text-sm font-semibold transition-all duration-200 ${
                role === "influencer"
                  ? "bg-[#fbfbef] text-black shadow-sm"
                  : "text-[rgba(251,251,239,0.6)] hover:text-[#fbfbef]"
              }`}
              onClick={() => setRole("influencer")}
            >
              Influencer
            </button>
            <button
              type="button"
              className={`flex-1 rounded-full py-2 text-center text-sm font-semibold transition-all duration-200 ${
                role === "brand"
                  ? "bg-[#fbfbef] text-black shadow-sm"
                  : "text-[rgba(251,251,239,0.6)] hover:text-[#fbfbef]"
              }`}
              onClick={() => setRole("brand")}
            >
              Brand
            </button>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSignUp}>
          <div className="space-y-4">
            {/* Common Fields */}
            <div>
              <label className="text-xs font-medium text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                placeholder="John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                className="mt-1 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                className="mt-1 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Dynamic Role Fields */}
            {role === "brand" ? (
              <div className="space-y-4 pt-2 border-t border-[rgba(251,251,239,0.1)]">
                <div>
                  <label className="text-xs font-medium text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                    placeholder="Acme Corp"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                    Industry
                  </label>
                  <select
                    required
                    className="mt-1 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate appearance-none"
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
              </div>
            ) : (
              <div className="space-y-4 pt-2 border-t border-[rgba(251,251,239,0.1)]">
                <div>
                  <label className="text-xs font-medium text-[rgba(251,251,239,0.6)] uppercase tracking-wider block mb-2">
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
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all scale-active ${
                            isSelected
                              ? "bg-[#fbfbef] text-black"
                              : "bg-[#141414] text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)]"
                          }`}
                        >
                          {niche}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[rgba(251,251,239,0.6)] uppercase tracking-wider block mb-2">
                    Platforms (Multi-select)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((platform) => {
                      const isSelected = selectedPlatforms.includes(platform);
                      return (
                        <button
                          type="button"
                          key={platform}
                          onClick={() => handlePlatformToggle(platform)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all scale-active ${
                            isSelected
                              ? "bg-[#fbfbef] text-black"
                              : "bg-[#141414] text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)]"
                          }`}
                        >
                          {platform}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                      Follower Count
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="mt-1 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                      placeholder="e.g. 50000"
                      value={followerCount || ""}
                      onChange={(e) => setFollowerCount(parseInt(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                      Location
                    </label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                      placeholder="e.g. Mumbai, IN"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-full bg-[#fbfbef] px-4 py-3 text-sm font-semibold text-black scale-active hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Registering..." : "Create Account"}
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-[rgba(251,251,239,0.6)] mt-4">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-[#fbfbef] font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
