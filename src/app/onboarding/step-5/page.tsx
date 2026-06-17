"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Upload, FileText, Image as ImageIcon, Link2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";

interface PortfolioItemInput {
  title: string;
  caption: string;
  mediaBlob: Blob | null;
  mediaPreview: string;
  linkUrl: string;
}

export default function OnboardingStep5() {
  const { user, profile } = useUser();
  const router = useRouter();
  const supabase = createClient() as any;
  const [loading, setLoading] = useState(false);

  // Role detection
  const role = profile?.role || "influencer";

  // Influencer Step 5 portfolio items
  const [items, setItems] = useState<PortfolioItemInput[]>([
    { title: "", caption: "", mediaBlob: null, mediaPreview: "", linkUrl: "" }
  ]);

  useEffect(() => {
    // If we land on Step 5, trigger confetti burst once for a premium feel
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  const handleAddItem = () => {
    if (items.length >= 3) {
      toast.error("You can add up to 3 items during onboarding.");
      return;
    }
    setItems([...items, { title: "", caption: "", mediaBlob: null, mediaPreview: "", linkUrl: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleInputChange = (index: number, field: keyof PortfolioItemInput, value: any) => {
    setItems(
      items.map((item, i) => {
        if (i === index) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleInputChange(index, "mediaBlob", file);
      handleInputChange(index, "mediaPreview", URL.createObjectURL(file));
    }
  };

  const uploadPortfolioImage = async (blob: Blob): Promise<string | null> => {
    if (!user) return null;
    const fileName = `${user.id}/portfolio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
    
    const { data, error } = await supabase.storage
      .from("portfolios")
      .upload(fileName, blob, { contentType: "image/jpeg" });

    if (error) {
      console.error("Portfolio upload failed:", error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("portfolios")
      .getPublicUrl(data.path);
    return publicUrl;
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);

    try {
      if (role === "influencer") {
        // Upload filled items
        const filledItems = items.filter(
          (item) => item.title.trim() || item.mediaBlob || item.linkUrl.trim()
        );

        for (let i = 0; i < filledItems.length; i++) {
          const item = filledItems[i];
          let mediaUrl = item.linkUrl;
          let mediaType = "embed";

          if (item.mediaBlob) {
            const uploadedUrl = await uploadPortfolioImage(item.mediaBlob);
            if (uploadedUrl) {
              mediaUrl = uploadedUrl;
              mediaType = "image";
            }
          }

          // Insert into portfolio_items
          await supabase.from("portfolio_items").insert({
            owner_id: user.id,
            owner_role: "influencer",
            title: item.title || "Portfolio Item",
            caption: item.caption,
            media_url: mediaUrl || null,
            media_type: mediaType as any,
            sort_order: i,
            views: 0,
            likes: 0,
            comments: 0
          });
        }
      }

      // Mark onboarding complete
      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_complete: true,
          onboarding_step: 5
        })
        .eq("id", user.id);

      if (error) {
        toast.error("Failed to complete onboarding: " + error.message);
      } else {
        toast.success("Profile Setup Complete!");
        const dashboardPath = role === "brand" ? "/dashboard/brand" : "/dashboard/influencer";
        router.push(dashboardPath);
        router.refresh();
      }
    } catch (e) {
      console.error("Failed to finalize onboarding", e);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="text-center">
        <CheckCircle2 className="size-16 text-success mx-auto mb-2 animate-bounce" />
        <h3 className="text-xl font-bold text-text-primary">
          {role === "brand" ? "Your profile is Live! 🎉" : "Showcase your best work"}
        </h3>
        <p className="text-xs text-text-secondary mt-1 max-w-[400px] mx-auto leading-relaxed">
          {role === "brand" 
            ? "Your brand profile setup is now complete. Let's redirect you to the main dashboard." 
            : "Add up to 3 links, embeds, or images of your previous works to attract premium brands. Or click skip to proceed."}
        </p>
      </div>

      {role === "brand" ? (
        /* BRAND SUCCESS CARD */
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 max-w-[450px] mx-auto">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Next steps:</h4>
          <ul className="space-y-2.5 text-xs text-text-primary">
            <li className="flex items-center gap-2.5">
              <span className="size-5 rounded-full bg-accent-bg text-accent flex items-center justify-center font-bold text-[10px]">1</span>
              <span>Post your first collaboration Card</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="size-5 rounded-full bg-accent-bg text-accent flex items-center justify-center font-bold text-[10px]">2</span>
              <span>Search and filter creators matching your criteria</span>
            </li>
            <li className="flex items-center gap-2.5">
              <span className="size-5 rounded-full bg-accent-bg text-accent flex items-center justify-center font-bold text-[10px]">3</span>
              <span>Invite matching creators directly to apply</span>
            </li>
          </ul>
        </div>
      ) : (
        /* INFLUENCER PORTFOLIO STARTER */
        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
          {items.map((item, idx) => (
            <div key={`item-${idx}`} className="rounded-2xl border border-border bg-surface-2 p-5 space-y-4 relative">
              {items.length > 1 && (
                <button
                  onClick={() => handleRemoveItem(idx)}
                  className="absolute top-4 right-4 text-text-muted hover:text-red-400 p-1 rounded-full hover:bg-surface transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
              <h4 className="text-xs font-bold text-text-secondary">Portfolio Item #{idx + 1}</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block">Title / Campaign</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-full bg-surface border border-border px-4 py-2 text-xs text-text-primary placeholder-text-muted input-focus-animate"
                    placeholder="e.g. Summer Shoot for Nike"
                    value={item.title}
                    onChange={(e) => handleInputChange(idx, "title", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block">Upload Image (Optional)</label>
                    <div className="mt-1 flex items-center gap-2.5">
                      <div className="size-10 rounded-lg border border-border bg-surface overflow-hidden flex items-center justify-center relative group shrink-0">
                        {item.mediaPreview ? (
                          <img src={item.mediaPreview} alt="Preview" className="size-full object-cover" />
                        ) : (
                          <ImageIcon className="size-4 text-text-muted" />
                        )}
                        <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[9px] font-bold text-white">
                          File
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageChange(idx, e)} />
                        </label>
                      </div>
                      <span className="text-[10px] text-text-secondary truncate">{item.mediaBlob ? "Image selected" : "Choose file..."}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block">Or Link URL (Optional)</label>
                    <div className="relative mt-1">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
                      <input
                        type="url"
                        className="block w-full rounded-full bg-surface border border-border pl-9 pr-4 py-2 text-xs text-text-primary placeholder-https://instagram.com/p/xxx input-focus-animate"
                        placeholder="https://youtube.com/watch?..."
                        value={item.linkUrl}
                        onChange={(e) => handleInputChange(idx, "linkUrl", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block">Caption / Description</label>
                  <textarea
                    rows={2}
                    className="mt-1 block w-full rounded-xl bg-surface border border-border px-4 py-2 text-xs text-text-primary placeholder-text-muted input-focus-animate"
                    placeholder="Brief description of the deliverables and metrics (e.g. 50k views)..."
                    value={item.caption}
                    onChange={(e) => handleInputChange(idx, "caption", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

          {items.length < 3 && (
            <button
              onClick={handleAddItem}
              className="w-full py-3 border border-dashed border-border rounded-2xl flex items-center justify-center gap-1.5 text-xs text-text-secondary hover:text-text-primary hover:border-border-strong hover:bg-surface-2 transition-all scale-active focus:outline-none"
            >
              <Plus className="size-4" />
              <span>Add another item</span>
            </button>
          )}
        </div>
      )}

      {/* Footer next controls */}
      <div className="flex justify-end gap-2 pt-4 border-t border-border">
        {role === "influencer" && (
          <button
            onClick={handleFinish}
            disabled={loading}
            className="rounded-full border border-border px-5 py-2.5 text-xs font-bold hover:bg-surface-2 scale-active focus:outline-none transition-colors"
          >
            Skip Portfolio
          </button>
        )}
        <button
          onClick={handleFinish}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-accent text-invert-text px-6 py-2.5 text-xs font-bold hover:opacity-90 disabled:opacity-50 scale-active transition-opacity focus:outline-none shadow-glow"
        >
          {loading ? (
            <span>Finalizing...</span>
          ) : (
            <>
              <span>{role === "brand" ? "Go to Dashboard" : "Finish Setup"}</span>
              <ArrowRight className="size-3.5" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
