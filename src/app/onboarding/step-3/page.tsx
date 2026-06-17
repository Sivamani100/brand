"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { 
  ArrowRight, Upload, Globe, Film,
  Shirt, Cpu, Utensils, Dumbbell, Sparkles, Compass, 
  Gamepad2, Smile, HeartPulse, Coins, BookOpen
} from "lucide-react";
import toast from "react-hot-toast";
import ImageCropper from "@/components/shared/ImageCropper";

const NICHES = [
  { name: "Fashion", icon: Shirt },
  { name: "Tech", icon: Cpu },
  { name: "Food", icon: Utensils },
  { name: "Fitness", icon: Dumbbell },
  { name: "Beauty", icon: Sparkles },
  { name: "Travel", icon: Compass },
  { name: "Gaming", icon: Gamepad2 },
  { name: "Lifestyle", icon: Smile },
  { name: "Health", icon: HeartPulse },
  { name: "Finance", icon: Coins },
  { name: "Education", icon: BookOpen },
  { name: "Entertainment", icon: Film },
];

const STYLE_TAGS = ["Educational", "Entertainment", "Lifestyle", "Reviews", "Comedy", "Vlogs", "Tutorials", "Aesthetic"];

export default function OnboardingStep3() {
  const { user, profile } = useUser();
  const router = useRouter();
  const supabase = createClient() as any;
  const [loading, setLoading] = useState(false);

  // Role detection
  const role = profile?.role || "influencer";

  // Brand Step 3 state
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);

  // Influencer Step 3 state
  const [primaryNiche, setPrimaryNiche] = useState("");
  const [secondaryNiches, setSecondaryNiches] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);

  // Cropper helper state
  const [cropTarget, setCropTarget] = useState<"logo" | "cover" | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      if (role === "brand") {
        setBio(profile.bio || "");
        setWebsiteUrl(profile.website_url || "");
        setLogoUrl(profile.avatar_url || "");
        setCoverUrl((profile as any).cover_banner_url || "");
      } else {
        const nicheList = profile.niche || [];
        setPrimaryNiche(nicheList[0] || "");
        setSecondaryNiches(nicheList.slice(1) || []);
        const prefs = (profile as any).preferences as any;
        setSelectedStyles(prefs?.content_styles || []);
      }
    }
  }, [profile, role]);

  const handleImageChange = (target: "logo" | "cover", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropTarget(target);
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    if (cropTarget === "logo") {
      setLogoBlob(croppedBlob);
      setLogoUrl(URL.createObjectURL(croppedBlob));
    } else if (cropTarget === "cover") {
      setCoverBlob(croppedBlob);
      setCoverUrl(URL.createObjectURL(croppedBlob));
    }
    setImageSrc(null);
    setCropTarget(null);
  };

  const uploadFile = async (blob: Blob, bucket: string): Promise<string | null> => {
    if (!user) return null;
    const ext = "jpg";
    const fileName = `${user.id}/${bucket}-${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, { upsert: true, contentType: "image/jpeg" });

    if (error) {
      console.error(`${bucket} upload failed:`, error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);
    return publicUrl;
  };

  const handleSecondaryNicheToggle = (name: string) => {
    if (name === primaryNiche) {
      toast.error("This is already set as your primary niche.");
      return;
    }
    if (secondaryNiches.includes(name)) {
      setSecondaryNiches(secondaryNiches.filter((n) => n !== name));
    } else {
      if (secondaryNiches.length >= 3) {
        toast.error("Select up to 3 secondary niches only.");
        return;
      }
      setSecondaryNiches([...secondaryNiches, name]);
    }
  };

  const handleStyleToggle = (style: string) => {
    if (selectedStyles.includes(style)) {
      setSelectedStyles(selectedStyles.filter((s) => s !== style));
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    if (role === "brand") {
      if (bio.length > 300) {
        toast.error("Biography cannot exceed 300 characters.");
        setLoading(false);
        return;
      }

      let finalLogoUrl = logoUrl;
      if (logoBlob) {
        const uploadedLogo = await uploadFile(logoBlob, "avatars");
        if (uploadedLogo) finalLogoUrl = uploadedLogo;
      }

      let finalCoverUrl = coverUrl;
      if (coverBlob) {
        const uploadedCover = await uploadFile(coverBlob, "banners");
        if (uploadedCover) finalCoverUrl = uploadedCover;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          bio,
          website_url: websiteUrl,
          avatar_url: finalLogoUrl,
          cover_banner_url: finalCoverUrl,
          onboarding_step: 3
        })
        .eq("id", user.id);

      if (error) {
        toast.error("Failed to update visual profile: " + error.message);
      } else {
        router.push("/onboarding/step-4");
      }
    } else {
      // Creator Step 3 Save
      if (!primaryNiche) {
        toast.error("Please pick a primary niche.");
        setLoading(false);
        return;
      }

      const mergedNiches = [primaryNiche, ...secondaryNiches];
      const currentPrefs = (profile as any)?.preferences || {};

      const { error } = await supabase
        .from("profiles")
        .update({
          niche: mergedNiches,
          preferences: {
            ...currentPrefs,
            content_styles: selectedStyles
          },
          onboarding_step: 3
        })
        .eq("id", user.id);

      if (error) {
        toast.error("Failed to update creator profile: " + error.message);
      } else {
        router.push("/onboarding/step-4");
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
          {role === "brand" ? "Establish Visual Identity" : "Define your content niche"}
        </h3>
        <p className="text-xs text-text-secondary mt-1">
          {role === "brand" ? "Upload logos and banners to represent your brand." : "Help brands find you based on category tags."}
        </p>
      </div>

      <form onSubmit={handleNext} className="space-y-6">
        {role === "brand" ? (
          /* BRAND STEP 3 FORM */
          <>
            <div className="space-y-4">
              {/* Logo Upload */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="size-16 rounded-full border border-border bg-surface-2 overflow-hidden flex items-center justify-center relative group shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="size-full object-cover" />
                  ) : (
                    <Upload className="size-5 text-text-muted" />
                  )}
                  <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[9px] font-bold text-white">
                    Upload
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageChange("logo", e)} />
                  </label>
                </div>
                <div>
                  <span className="text-xs font-bold block text-text-primary">Company Logo</span>
                  <span className="text-[10px] text-text-secondary mt-0.5 block">1:1 ratio square logo image. Max 2MB.</span>
                </div>
              </div>

              {/* Cover Banner Upload */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                  Cover Banner
                </label>
                <div className="h-32 w-full rounded-2xl border border-border bg-surface-2 overflow-hidden flex items-center justify-center relative group">
                  {coverUrl ? (
                    <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="size-5 text-text-muted" />
                      <span className="text-[10px] text-text-muted">Upload cover banner</span>
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-bold text-white">
                    Change Banner
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageChange("cover", e)} />
                  </label>
                </div>
                <span className="text-[10px] text-text-secondary mt-0.5 block">16:9 ratio landscape banner. Max 5MB.</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Brand Biography (Bio)
                </label>
                <span className="text-[10px] text-text-secondary">{bio.length}/300</span>
              </div>
              <textarea
                required
                rows={3}
                maxLength={300}
                className="mt-2 block w-full rounded-2xl bg-surface-2 border border-border px-4 py-3 text-sm text-text-primary placeholder-text-muted input-focus-animate"
                placeholder="A brief overview about your company value and campaign target audience..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                Website URL
              </label>
              <div className="relative mt-2">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
                <input
                  type="url"
                  className="block w-full rounded-full bg-surface-2 border border-border pl-11 pr-4 py-3 text-sm text-text-primary placeholder-https://brand.com input-focus-animate"
                  placeholder="https://yourcompany.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              </div>
            </div>
          </>
        ) : (
          /* INFLUENCER STEP 3 FORM */
          <>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Primary Niche (Pick One)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                {NICHES.map((nic) => {
                  const Icon = nic.icon;
                  const isSelected = primaryNiche === nic.name;
                  return (
                    <button
                      type="button"
                      key={`primary-${nic.name}`}
                      onClick={() => {
                        setPrimaryNiche(nic.name);
                        setSecondaryNiches(secondaryNiches.filter((n) => n !== nic.name));
                      }}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all scale-active ${
                        isSelected 
                          ? "bg-accent border-accent text-invert-text" 
                          : "bg-surface-2 border-border text-text-secondary hover:text-text-primary hover:border-border-strong"
                      }`}
                    >
                      <Icon className="size-5 mb-1.5" />
                      <span className="text-[10px] font-bold">{nic.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                Secondary Niches (Select up to 3)
              </label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {NICHES.map((nic) => {
                  const isSelected = secondaryNiches.includes(nic.name);
                  const isPrimary = primaryNiche === nic.name;
                  if (isPrimary) return null;
                  return (
                    <button
                      type="button"
                      key={`secondary-${nic.name}`}
                      onClick={() => handleSecondaryNicheToggle(nic.name)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all scale-active ${
                        isSelected 
                          ? "bg-accent-bg border-accent text-accent" 
                          : "bg-surface-2 border-border text-text-secondary hover:border-border-strong hover:text-text-primary"
                      }`}
                    >
                      {nic.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                Content Style Tags
              </label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {STYLE_TAGS.map((style) => {
                  const isSelected = selectedStyles.includes(style);
                  return (
                    <button
                      type="button"
                      key={style}
                      onClick={() => handleStyleToggle(style)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all scale-active ${
                        isSelected 
                          ? "bg-accent-bg border-accent text-accent" 
                          : "bg-surface-2 border-border text-text-secondary hover:border-border-strong hover:text-text-primary"
                      }`}
                    >
                      {style}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Footer Next button */}
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

      {/* Image Cropper Modal */}
      {imageSrc && cropTarget && (
        <ImageCropper
          imageSrc={imageSrc}
          aspect={cropTarget === "logo" ? 1 : 16 / 9}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setImageSrc(null);
            setCropTarget(null);
          }}
        />
      )}
    </motion.div>
  );
}
