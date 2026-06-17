"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { Upload, ArrowLeft, ArrowRight, Eye, Calendar, Sparkles, Check } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = ["Fashion", "Tech", "Food", "Fitness", "Beauty", "Travel", "Gaming", "Lifestyle"];
const PLATFORMS = ["Instagram", "YouTube", "TikTok", "Twitter/X", "LinkedIn"];

export default function EditCardPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user } = useUser();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [status, setStatus] = useState<"active" | "paused" | "closed" | "draft">("active");

  // Requirements states
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [minFollowers, setMinFollowers] = useState(1000);
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [currentDeliverable, setCurrentDeliverable] = useState("");
  const [timeline, setTimeline] = useState("7 days");
  const [customTimeline, setCustomTimeline] = useState("");

  // Step 3 states
  const [deadline, setDeadline] = useState("");

  useEffect(() => {
    if (!id || !user) return;

    async function loadCard() {
      setFetching(true);
      const cardId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";
      
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("id", cardId)
        .single();

      if (error || !data) {
        toast.error("Failed to load campaign card details.");
        router.push("/dashboard/brand/cards");
        return;
      }

      if (data.brand_id !== user.id) {
        toast.error("Unauthorized access.");
        router.push("/dashboard/brand/cards");
        return;
      }

      // Prefill fields
      setTitle(data.title);
      setDescription(data.description);
      setCategory(data.category);
      setCoverUrl(data.cover_image_url || "");
      setCoverPreview(data.cover_image_url || "");
      setStatus(data.status as any);
      setSelectedNiches(data.niche_tags || []);
      setSelectedPlatforms(data.platform_requirements || []);
      setMinFollowers(data.min_followers || 1000);
      setDeliverables(data.deliverables || []);

      if (data.timeline) {
        if (["3 days", "7 days", "14 days", "30 days"].includes(data.timeline)) {
          setTimeline(data.timeline);
        } else {
          setTimeline("Custom");
          setCustomTimeline(data.timeline);
        }
      }

      if (data.application_deadline) {
        setDeadline(new Date(data.application_deadline).toISOString().split("T")[0]);
      }

      // Parse budget range (e.g. "₹5,000 – ₹20,000" or "$100 – $500")
      if (data.budget_range) {
        const regex = /([₹$])\s*([\d,]+)\s*–\s*([₹$])\s*([\d,]+)/;
        const match = data.budget_range.match(regex);
        if (match) {
          setCurrency(match[1] === "$" ? "USD" : "INR");
          setMinBudget(match[2].replace(/,/g, ""));
          setMaxBudget(match[4].replace(/,/g, ""));
        } else {
          setMinBudget("1000");
          setMaxBudget("10000");
        }
      }

      setFetching(false);
    }

    loadCard();
  }, [id, user, supabase, router]);

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

  const handleAddDeliverable = () => {
    if (!currentDeliverable.trim()) return;
    setDeliverables((prev) => [...prev, currentDeliverable.trim()]);
    setCurrentDeliverable("");
  };

  const handleRemoveDeliverable = (idx: number) => {
    setDeliverables((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size cannot exceed 10MB");
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const validateStep1 = () => {
    if (!title.trim()) {
      toast.error("Please enter a campaign title");
      return false;
    }
    if (!description.trim()) {
      toast.error("Please add a description");
      return false;
    }
    if (!category) {
      toast.error("Please select a category");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (selectedNiches.length === 0) {
      toast.error("Please select at least one niche tag");
      return false;
    }
    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one target platform");
      return false;
    }
    if (!minBudget || !maxBudget) {
      toast.error("Please configure the budget range");
      return false;
    }
    if (deliverables.length === 0) {
      toast.error("Please add at least one deliverable");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!user || !id) return;
    if (!deadline) {
      toast.error("Please set an application deadline date");
      return;
    }

    setLoading(true);
    let finalCoverUrl = coverUrl;
    const cardId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";

    // 1. Upload Cover Image if selected
    if (coverFile) {
      const fileName = `${user.id}/${Date.now()}-${coverFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("card-covers")
        .upload(fileName, coverFile);

      if (uploadError) {
        toast.error("Cover image upload failed.");
        setLoading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("card-covers")
        .getPublicUrl(uploadData.path);
      finalCoverUrl = publicUrl;
    }

    // 2. Format fields
    const finalTimeline = timeline === "Custom" ? customTimeline : timeline;
    const budgetRange = `${currency === "INR" ? "₹" : "$"}${minBudget} – ${currency === "INR" ? "₹" : "$"}${maxBudget}`;

    // 3. Save to database
    const { error } = await supabase
      .from("cards")
      .update({
        title,
        description,
        category,
        cover_image_url: finalCoverUrl || null,
        status,
        niche_tags: selectedNiches,
        platform_requirements: selectedPlatforms,
        min_followers: minFollowers,
        budget_range: budgetRange,
        deliverables,
        timeline: finalTimeline,
        application_deadline: new Date(deadline).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", cardId);

    if (error) {
      toast.error(error.message || "Failed to update campaign.");
      setLoading(false);
      return;
    }

    toast.success("Campaign updated successfully!");
    router.push(`/dashboard/brand/cards/${cardId}`);
    router.refresh();
  };

  if (fetching) {
    return (
      <div className="flex h-[50vh] items-center justify-center bg-black text-[#fbfbef]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[rgba(251,251,239,0.2)] border-t-[#fbfbef]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(251,251,239,0.1)] pb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/brand/cards/${id}`}
            className="flex items-center justify-center size-10 rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] text-[#fbfbef] hover:bg-[#1c1c1c] transition-colors"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#fbfbef] font-sans">
              Edit Collaboration Card
            </h1>
            <p className="text-xs text-[rgba(251,251,239,0.6)]">
              Modify details for your collaboration card
            </p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              disabled={s > step && s - 1 > step}
              onClick={() => setStep(s)}
              className={`size-8 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${
                s === step
                  ? "bg-[#fbfbef] text-black"
                  : s < step
                  ? "bg-[#141414] text-[#4ade80] border border-[#4ade80]"
                  : "bg-[#141414] text-[rgba(251,251,239,0.4)] border border-[rgba(251,251,239,0.1)]"
              }`}
            >
              {s < step ? <Check className="size-3.5" /> : s}
            </button>
          ))}
        </div>
      </div>

      {/* STEP 1: BASICS */}
      {step === 1 && (
        <div className="space-y-6 rounded-2xl bg-[#0d0d0d] p-8 border border-[rgba(251,251,239,0.2)]">
          <div>
            <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
              Campaign Title
            </label>
            <input
              type="text"
              className="mt-2 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
              placeholder="e.g. Autumn Leather Jacket Review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
              Campaign Description
            </label>
            <textarea
              rows={5}
              className="mt-2 block w-full rounded-2xl bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
              placeholder="Provide context about your campaign, guidelines, and what you expect from applicants."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider block mb-3">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`rounded-full py-2.5 text-xs font-semibold text-center transition-all scale-active ${
                    category === cat
                      ? "bg-[#fbfbef] text-black font-bold"
                      : "bg-[#141414] text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)] hover:border-[rgba(251,251,239,0.3)]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider block mb-2">
              Cover Image
            </label>
            <div className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-[rgba(251,251,239,0.2)] rounded-2xl bg-[#141414] p-6 text-center hover:border-[rgba(251,251,239,0.4)] transition-colors relative overflow-hidden group min-h-[160px]">
              {coverPreview ? (
                <>
                  <img src={coverPreview} alt="Cover Preview" className="absolute inset-0 h-full w-full object-cover opacity-80" />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <label className="cursor-pointer rounded-full bg-[#fbfbef] text-black px-4 py-2 text-xs font-semibold">
                      Change Photo
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  </div>
                </>
              ) : (
                <label className="cursor-pointer space-y-2 flex flex-col items-center">
                  <Upload className="size-8 text-[rgba(251,251,239,0.4)]" />
                  <span className="text-xs text-[rgba(251,251,239,0.6)]">
                    Drag and drop your image, or <span className="text-[#fbfbef] underline font-semibold">browse</span>
                  </span>
                  <span className="text-[10px] text-[rgba(251,251,239,0.3)]">PNG, JPG up to 10MB</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[rgba(251,251,239,0.1)] pt-6">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider">Status:</span>
              <select
                className="rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-1.5 text-xs text-[#fbfbef] outline-none"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <button
              onClick={() => {
                if (validateStep1()) setStep(2);
              }}
              className="flex items-center gap-2 rounded-full bg-[#fbfbef] px-6 py-2.5 text-xs font-bold text-black scale-active hover:opacity-90 ml-auto"
            >
              <span>Next: Requirements</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: REQUIREMENTS */}
      {step === 2 && (
        <div className="space-y-6 rounded-2xl bg-[#0d0d0d] p-8 border border-[rgba(251,251,239,0.2)]">
          <div>
            <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider block mb-3">
              Niche Tags (Multi-select)
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((niche) => {
                const isSelected = selectedNiches.includes(niche);
                return (
                  <button
                    type="button"
                    key={niche}
                    onClick={() => handleNicheToggle(niche)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-all scale-active ${
                      isSelected
                        ? "bg-[#fbfbef] text-black"
                        : "bg-[#141414] text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)] hover:border-[rgba(251,251,239,0.3)]"
                    }`}
                  >
                    {niche}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider block mb-3">
              Target Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((plat) => {
                const isSelected = selectedPlatforms.includes(plat);
                return (
                  <button
                    type="button"
                    key={plat}
                    onClick={() => handlePlatformToggle(plat)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-all scale-active ${
                      isSelected
                        ? "bg-[#fbfbef] text-black"
                        : "bg-[#141414] text-[rgba(251,251,239,0.6)] border border-[rgba(251,251,239,0.1)] hover:border-[rgba(251,251,239,0.3)]"
                    }`}
                  >
                    {plat}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                Minimum Follower Count: {minFollowers.toLocaleString()}
              </label>
            </div>
            <input
              type="range"
              min={1000}
              max={1000000}
              step={1000}
              className="w-full h-1 bg-[#141414] rounded-lg appearance-none cursor-pointer accent-[#fbfbef]"
              value={minFollowers}
              onChange={(e) => setMinFollowers(parseInt(e.target.value))}
            />
            <div className="flex justify-between text-[10px] text-[rgba(251,251,239,0.4)] mt-1">
              <span>1K</span>
              <span>100K</span>
              <span>500K</span>
              <span>1M+</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                Currency
              </label>
              <select
                className="mt-2 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] input-focus-animate"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                Min Budget
              </label>
              <input
                type="number"
                className="mt-2 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                placeholder="5000"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                Max Budget
              </label>
              <input
                type="number"
                className="mt-2 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                placeholder="20000"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
              Deliverables
            </label>
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                className="flex-1 rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-2.5 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                placeholder="e.g. 1 Instagram Reel"
                value={currentDeliverable}
                onChange={(e) => setCurrentDeliverable(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddDeliverable())}
              />
              <button
                type="button"
                onClick={handleAddDeliverable}
                className="rounded-full bg-[#1c1c1c] border border-[rgba(251,251,239,0.2)] px-5 text-sm font-semibold hover:bg-[#262626]"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {deliverables.map((del, idx) => (
                <div
                  key={idx}
                  className="rounded-full bg-[#141414] border border-[rgba(251,251,239,0.1)] px-3 py-1.5 text-xs text-[#fbfbef] flex items-center gap-2"
                >
                  <span>{del}</span>
                  <button type="button" onClick={() => handleRemoveDeliverable(idx)} className="text-[rgba(251,251,239,0.6)] hover:text-[#f87171]">
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                Timeline
              </label>
              <select
                className="mt-2 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] input-focus-animate"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
              >
                <option value="3 days">3 Days</option>
                <option value="7 days">7 Days</option>
                <option value="14 days">14 Days</option>
                <option value="30 days">30 Days</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            {timeline === "Custom" && (
              <div>
                <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                  Custom Timeline
                </label>
                <input
                  type="text"
                  className="mt-2 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-e.g. 45 days"
                  value={customTimeline}
                  onChange={(e) => setCustomTimeline(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex justify-between items-center border-t border-[rgba(251,251,239,0.1)] pt-6">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-6 py-2.5 text-xs font-bold text-[#fbfbef] scale-active hover:bg-[#1c1c1c]"
            >
              <ArrowLeft className="size-4" />
              <span>Back</span>
            </button>

            <button
              onClick={() => {
                if (validateStep2()) setStep(3);
              }}
              className="flex items-center gap-2 rounded-full bg-[#fbfbef] px-6 py-2.5 text-xs font-bold text-black scale-active hover:opacity-90"
            >
              <span>Next: Review</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & PUBLISH */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#0d0d0d] p-8 border border-[rgba(251,251,239,0.2)] space-y-6">
            <h2 className="text-lg font-bold text-[#fbfbef] flex items-center gap-2">
              <Eye className="size-5" /> Campaign Preview
            </h2>

            {/* Simulated card item */}
            <div className="rounded-2xl border border-[rgba(251,251,239,0.1)] bg-[#141414] overflow-hidden">
              {coverPreview && (
                <div className="aspect-video w-full relative">
                  <img src={coverPreview} alt="Cover" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <span className="rounded-full bg-[#c084fc] px-2.5 py-0.5 text-[10px] font-bold text-black uppercase">
                    {category}
                  </span>
                  <span className="text-xs font-semibold text-[rgba(251,251,239,0.6)]">
                    Budget: {currency === "INR" ? "₹" : "$"}{minBudget} – {currency === "INR" ? "₹" : "$"}{maxBudget}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-[#fbfbef]">{title}</h3>
                <p className="text-sm text-[rgba(251,251,239,0.6)] line-clamp-3 leading-relaxed">
                  {description}
                </p>

                <div className="border-t border-[rgba(251,251,239,0.1)] pt-4 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[rgba(251,251,239,0.4)] block uppercase font-medium">Timeline</span>
                    <span className="text-[#fbfbef] font-semibold">{timeline === "Custom" ? customTimeline : timeline}</span>
                  </div>
                  <div>
                    <span className="text-[rgba(251,251,239,0.4)] block uppercase font-medium">Follower Min</span>
                    <span className="text-[#fbfbef] font-semibold">{minFollowers.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs text-[rgba(251,251,239,0.4)] block uppercase font-medium">Deliverables</span>
                  <div className="flex flex-wrap gap-1.5">
                    {deliverables.map((del, i) => (
                      <span key={i} className="rounded-md bg-black/40 px-2.5 py-1 text-[11px] text-[#fbfbef]">
                        • {del}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[rgba(251,251,239,0.6)] uppercase tracking-wider flex items-center gap-2">
                <Calendar className="size-4" /> Application Deadline
              </label>
              <input
                type="date"
                required
                className="mt-2 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] input-focus-animate"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-between items-center border-t border-[rgba(251,251,239,0.1)] pt-6">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-6 py-2.5 text-xs font-bold text-[#fbfbef] scale-active hover:bg-[#1c1c1c]"
            >
              <ArrowLeft className="size-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 rounded-full bg-[#fbfbef] px-8 py-2.5 text-xs font-bold text-black scale-active hover:opacity-90 disabled:opacity-50"
            >
              <Sparkles className="size-4" />
              <span>{loading ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
