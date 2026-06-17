"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Shirt, Cpu, Utensils, Dumbbell, Sparkles, Compass, 
  Gamepad2, Smile, HeartPulse, Coins, BookOpen, Film,
  Upload, MapPin, Globe, Check
} from "lucide-react";
import toast from "react-hot-toast";
import ImageCropper from "@/components/shared/ImageCropper";
import LocationPicker, { LocationValue } from "@/components/shared/LocationPicker";

const INDUSTRIES = [
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

const COMPANY_SIZES = ["Solo", "Small 2–10", "Mid 11–100", "Enterprise 100+"];

const LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Mandarin", "Japanese", "Arabic", "Portuguese"];

const STATIC_LOCATIONS = [
  "New York, USA", "London, UK", "Mumbai, India", "New Delhi, India", "Bangalore, India",
  "Paris, France", "Tokyo, Japan", "Sydney, Australia", "Berlin, Germany", "Toronto, Canada",
  "Singapore", "Dubai, UAE", "Los Angeles, USA", "San Francisco, USA"
];

export default function OnboardingStep2() {
  const { user, profile } = useUser();
  const router = useRouter();
  const supabase = createClient() as any;
  const [loading, setLoading] = useState(false);

  // Common role check
  const role = profile?.role || "influencer";

  // Brand form states
  const [companyName, setCompanyName] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [foundingYear, setFoundingYear] = useState("");

  // Creator form states
  const [displayName, setDisplayName] = useState("");
  const [locationValue, setLocationValue] = useState<LocationValue | null>(null);
  const [location, setLocation] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [showLocSuggestions, setShowLocSuggestions] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);

  // Cropper states
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      if (role === "brand") {
        setCompanyName(profile.company_name || profile.display_name || "");
        setSelectedIndustry(profile.industry || "");
        const prefs = (profile as any).preferences as any;
        setSelectedSize(prefs?.company_size || "");
        setFoundingYear(prefs?.founding_year || "");
      } else {
        setDisplayName(profile.display_name || "");
        setLocation(profile.location || "");
        setLocationQuery(profile.location || "");
        setAvatarUrl(profile.avatar_url || "");

        if ((profile as any).location_city) {
          let coords = { lat: 18.9760, lng: 72.8777 };
          const rawCoords = (profile as any).location_coordinates;
          if (rawCoords) {
            if (typeof rawCoords === "object" && "x" in rawCoords && "y" in rawCoords) {
              coords = { lat: rawCoords.y, lng: rawCoords.x };
            } else if (typeof rawCoords === "string") {
              const clean = rawCoords.replace(/[()]/g, "");
              const parts = clean.split(",");
              if (parts.length === 2) {
                coords = { lat: parseFloat(parts[1]), lng: parseFloat(parts[0]) };
              }
            }
          }
          setLocationValue({
            city: (profile as any).location_city,
            state: (profile as any).location_state || "",
            country: (profile as any).location_country || "",
            countryCode: (profile as any).location_country_code || "IN",
            area: (profile as any).location_area || undefined,
            coordinates: coords,
            timezone: (profile as any).location_timezone || "Asia/Kolkata",
            display: (profile as any).location_display || profile.location || "",
          });
        } else if (profile.location) {
          setLocationValue({
            city: profile.location.split(",")[0]?.trim() || "",
            state: profile.location.split(",")[1]?.trim() || "",
            country: "India",
            countryCode: "IN",
            coordinates: { lat: 18.9760, lng: 72.8777 },
            timezone: "Asia/Kolkata",
            display: profile.location,
          });
        }
        const prefs = (profile as any).preferences as any;
        setSelectedLanguages(prefs?.languages || []);
      }
    }
  }, [profile, role]);

  // Handle image upload and trigger cropping modal
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    setAvatarBlob(croppedBlob);
    setAvatarUrl(URL.createObjectURL(croppedBlob));
    setImageSrc(null);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarBlob || !user) return avatarUrl || null;
    const fileName = `${user.id}/onboarding-${Date.now()}.jpg`;
    
    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(fileName, avatarBlob, { upsert: true, contentType: "image/jpeg" });

    if (error) {
      console.error("Avatar upload failed:", error);
      toast.error("Logo/Avatar upload failed.");
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(data.path);
    return publicUrl;
  };

  const handleLanguageToggle = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      setSelectedLanguages(selectedLanguages.filter((l) => l !== lang));
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    if (role === "brand") {
      if (!companyName.trim()) {
        toast.error("Please enter your company name.");
        setLoading(false);
        return;
      }
      if (!selectedIndustry) {
        toast.error("Please select an industry.");
        setLoading(false);
        return;
      }
      if (!selectedSize) {
        toast.error("Please select your company size.");
        setLoading(false);
        return;
      }

      const currentPrefs = ((profile as any)?.preferences as any) || {};
      const { error } = await supabase
        .from("profiles")
        .update({
          company_name: companyName,
          industry: selectedIndustry,
          preferences: {
            ...currentPrefs,
            company_size: selectedSize,
            founding_year: foundingYear
          },
          onboarding_step: 2
        })
        .eq("id", user.id);

      if (error) {
        toast.error("Failed to save identity: " + error.message);
      } else {
        router.push("/onboarding/step-3");
      }
    } else {
      // Influencer Validation
      if (!displayName.trim()) {
        toast.error("Please enter your display name.");
        setLoading(false);
        return;
      }
      if (!locationValue) {
        toast.error("Please select your location.");
        setLoading(false);
        return;
      }

      let finalAvatarUrl = avatarUrl;
      const uploadedUrl = await uploadAvatar();
      if (uploadedUrl) {
        finalAvatarUrl = uploadedUrl;
      }

      const currentPrefs = ((profile as any)?.preferences as any) || {};
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          avatar_url: finalAvatarUrl,
          location: locationValue.display,
          location_country: locationValue.country,
          location_state: locationValue.state,
          location_city: locationValue.city,
          location_area: locationValue.area || null,
          location_coordinates: `(${locationValue.coordinates.lng},${locationValue.coordinates.lat})`,
          location_timezone: locationValue.timezone,
          location_display: locationValue.display,
          location_verified: false,
          location_updated_at: new Date().toISOString(),
          preferences: {
            ...currentPrefs,
            languages: selectedLanguages
          },
          onboarding_step: 2
        })
        .eq("id", user.id);

      if (error) {
        toast.error("Failed to save identity: " + error.message);
      } else {
        router.push("/onboarding/step-3");
      }
    }
    setLoading(false);
  };

  const suggestions = STATIC_LOCATIONS.filter((l) =>
    l.toLowerCase().includes(locationQuery.toLowerCase())
  );

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
          {role === "brand" ? "Tell us about your Brand" : "Complete your creator profile"}
        </h3>
        <p className="text-xs text-text-secondary mt-1">
          {role === "brand" ? "Establish your business details to attract matches." : "Introduce yourself to brands looking for talent."}
        </p>
      </div>

      <form onSubmit={handleNext} className="space-y-6">
        {role === "brand" ? (
          /* BRAND STEP 2 FORM */
          <>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Company Name
              </label>
              <input
                type="text"
                required
                className="mt-2 block w-full rounded-full bg-surface-2 border border-border px-4 py-3 text-sm text-text-primary placeholder-text-muted input-focus-animate"
                placeholder="e.g. Acme Studio"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Industry
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                {INDUSTRIES.map((ind) => {
                  const Icon = ind.icon;
                  const isSelected = selectedIndustry === ind.name;
                  return (
                    <button
                      type="button"
                      key={ind.name}
                      onClick={() => setSelectedIndustry(ind.name)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all scale-active ${
                        isSelected 
                          ? "bg-accent-bg border-accent text-accent" 
                          : "bg-surface-2 border-border text-text-secondary hover:text-text-primary hover:border-border-strong"
                      }`}
                    >
                      <Icon className="size-5 mb-1.5" />
                      <span className="text-[10px] font-bold">{ind.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Company Size
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COMPANY_SIZES.map((sz) => {
                  const isSelected = selectedSize === sz;
                  return (
                    <button
                      type="button"
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className={`rounded-full px-4 py-2 text-xs font-bold border transition-all scale-active ${
                        isSelected 
                          ? "bg-accent text-invert-text border-accent" 
                          : "bg-surface-2 border-border text-text-secondary hover:border-border-strong hover:text-text-primary"
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Founding Year (Optional)
              </label>
              <input
                type="number"
                min={1800}
                max={new Date().getFullYear()}
                className="mt-2 block w-full rounded-full bg-surface-2 border border-border px-4 py-3 text-sm text-text-primary placeholder-text-muted input-focus-animate"
                placeholder="e.g. 2021"
                value={foundingYear}
                onChange={(e) => setFoundingYear(e.target.value)}
              />
            </div>
          </>
        ) : (
          /* INFLUENCER STEP 2 FORM */
          <>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="size-20 rounded-full border border-border bg-surface-2 overflow-hidden flex items-center justify-center relative group">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
                ) : (
                  <Upload className="size-6 text-text-muted" />
                )}
                <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold text-white">
                  Change
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <span className="text-xs font-bold block text-text-primary">Profile Photo</span>
                <span className="text-[10px] text-text-secondary mt-0.5 block">Square, cropped photos help brands identify you quickly.</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Display / Stage Name
              </label>
              <input
                type="text"
                required
                className="mt-2 block w-full rounded-full bg-surface-2 border border-border px-4 py-3 text-sm text-text-primary placeholder-text-muted input-focus-animate"
                placeholder="e.g. Clara Vlogs"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="relative">
              <LocationPicker
                value={locationValue}
                onChange={setLocationValue}
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Languages Spoken
              </label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {LANGUAGES.map((lang) => {
                  const isSelected = selectedLanguages.includes(lang);
                  return (
                    <button
                      type="button"
                      key={lang}
                      onClick={() => handleLanguageToggle(lang)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-all scale-active ${
                        isSelected 
                          ? "bg-accent-bg border-accent text-accent" 
                          : "bg-surface-2 border-border text-text-secondary hover:border-border-strong hover:text-text-primary"
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Form Footer Next button */}
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
      {imageSrc && (
        <ImageCropper
          imageSrc={imageSrc}
          aspect={1}
          onCropComplete={handleCropComplete}
          onCancel={() => setImageSrc(null)}
        />
      )}
    </motion.div>
  );
}
