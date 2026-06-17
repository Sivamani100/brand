"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, ClipboardList, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  isComplete: boolean;
}

export default function ChecklistWidget() {
  const supabase = createClient();
  const { profile, user } = useUser();
  const [isOpen, setIsOpen] = useState(true);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const checkMilestones = async () => {
    if (!user || !profile) return;

    try {
      const role = profile.role;
      const checklistItems: ChecklistItem[] = [];

      // Fetch dynamic stats from database
      if (role === "influencer") {
        // 1. Bio complete
        const isBioComplete = !!profile.bio && profile.bio.trim().length > 10;

        // 2. Avatar complete
        const isAvatarComplete = !!profile.avatar_url;

        // 3. Portfolio complete (check if they have any portfolio_items)
        const { count: portfolioCount } = await supabase
          .from("portfolio_items")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", user.id);
        const isPortfolioComplete = (portfolioCount || 0) > 0;

        // 4. Social links connected (check preferences)
        const prefs = (profile as any).preferences as any;
        const hasSocials = prefs && prefs.platforms && Object.keys(prefs.platforms).length > 0;

        // 5. First application sent
        const { count: appCount } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("influencer_id", user.id);
        const isAppComplete = (appCount || 0) > 0;

        checklistItems.push(
          { id: "bio", label: "Complete display bio", description: "Write a short bio introducing your niche.", isComplete: isBioComplete },
          { id: "avatar", label: "Upload profile avatar", description: "Upload a clean profile image.", isComplete: isAvatarComplete },
          { id: "socials", label: "Connect social platforms", description: "Connect your Instagram, TikTok, or YouTube channel.", isComplete: !!hasSocials },
          { id: "portfolio", label: "Add a portfolio item", description: "Upload at least one work example or past collab.", isComplete: isPortfolioComplete },
          { id: "collab", label: "Apply for your first campaign", description: "Explore the discovery feed and submit a pitch.", isComplete: isAppComplete }
        );
      } else {
        // Brand milestones
        // 1. Profile / Bio complete
        const isBioComplete = !!profile.bio && profile.bio.trim().length > 10;

        // 2. Logo complete
        const isLogoComplete = !!profile.avatar_url;

        // 3. Website complete
        const prefs = (profile as any).preferences as any;
        const isWebComplete = prefs && (prefs.website || prefs.platforms?.instagram || prefs.platforms?.website);

        // 4. Posted a Card
        const { count: cardCount } = await supabase
          .from("cards")
          .select("*", { count: "exact", head: true })
          .eq("brand_id", user.id);
        const isCardComplete = (cardCount || 0) > 0;

        // 5. Open a chat or application review
        const { count: appReviewCount } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("card_id", user.id); // wait, applications are linked to cards, which are linked to brands.
        // Actually, we can check if they reviewed any application, or just check if they opened a room
        const { count: roomCount } = await supabase
          .from("rooms")
          .select("*", { count: "exact", head: true })
          .eq("brand_id", user.id);
        const isCollabComplete = (roomCount || 0) > 0;

        checklistItems.push(
          { id: "brand_bio", label: "Complete brand description", description: "Fill out your brand bio and history.", isComplete: isBioComplete },
          { id: "logo", label: "Upload company logo", description: "Upload your brand logo for card views.", isComplete: isLogoComplete },
          { id: "website", label: "Add website or links", description: "Add a website or social link to your preferences.", isComplete: !!isWebComplete },
          { id: "post_card", label: "Post a campaign card", description: "Publish your first collaboration card.", isComplete: isCardComplete },
          { id: "chat_room", label: "Accept a creator collab", description: "Review proposals and open a chat room.", isComplete: isCollabComplete }
        );
      }

      // Check for newly completed items to trigger confetti!
      const currentCompleted = checklistItems.filter(i => i.isComplete).map(i => i.id);
      const storedProgress = (profile as any).checklist_progress as any;
      const previouslyCompleted = storedProgress?.completed_ids || [];

      // Find if any item is newly completed
      const newlyCompleted = currentCompleted.filter(id => !previouslyCompleted.includes(id));

      if (newlyCompleted.length > 0) {
        // Trigger confetti!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
        newlyCompleted.forEach(id => {
          const itemLabel = checklistItems.find(item => item.id === id)?.label;
          toast.success(`Milestone completed: ${itemLabel}! 🎉`, { duration: 4000 });
        });

        // Save new progress in profiles table
        await supabase
          .from("profiles")
          .update({
            checklist_progress: {
              completed_ids: currentCompleted,
              updated_at: new Date().toISOString()
            }
          } as any)
          .eq("id", user.id);
      }

      setItems(checklistItems);
    } catch (e) {
      console.error("Failed checking onboarding milestones", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkMilestones();
  }, [profile, user]);

  if (loading || items.length === 0) return null;

  const completedCount = items.filter((item) => item.isComplete).length;
  const progressPercent = Math.round((completedCount / items.length) * 100);

  // If 100% complete, we don't display it to keep the dashboard clean
  if (completedCount === items.length) return null;

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden transition-all duration-200">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-2 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-bg border border-border rounded-xl">
            <ClipboardList className="size-5 text-accent" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              Get Started Checklist
              <span className="text-[10px] bg-accent text-invert-text px-2 py-0.5 rounded-full font-bold">
                {progressPercent}%
              </span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Complete these steps to set up your profile and start collaborating.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block w-32 h-2 bg-surface-3 rounded-full overflow-hidden border border-border">
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </button>

      {/* Checklist contents */}
      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-border divide-y divide-border/60 bg-surface-2/30">
          {items.map((item) => (
            <div key={item.id} className="py-3.5 flex items-start justify-between gap-4 first:pt-1 last:pb-1">
              <div className="flex items-start gap-3">
                <button className="mt-0.5 focus:outline-none" disabled>
                  {item.isComplete ? (
                    <CheckCircle2 className="size-5 text-accent fill-accent-bg" />
                  ) : (
                    <Circle className="size-5 text-text-muted" />
                  )}
                </button>
                <div className="space-y-0.5">
                  <h4
                    className={`text-xs font-semibold ${
                      item.isComplete ? "text-text-secondary line-through" : "text-text-primary"
                    }`}
                  >
                    {item.label}
                  </h4>
                  <p className="text-[11px] text-text-muted">{item.description}</p>
                </div>
              </div>

              {item.isComplete && (
                <span className="text-[10px] text-accent flex items-center gap-1 font-bold bg-accent-bg border border-border px-2 py-0.5 rounded-full font-sans uppercase tracking-wider">
                  <Sparkles className="size-3" /> Done
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
