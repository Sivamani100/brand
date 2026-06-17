"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export default function OnboardingStep1() {
  const { user, profile } = useUser();
  const router = useRouter();
  const supabase = createClient() as any;
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_step: 1 })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to save progress. Please try again.");
    } else {
      router.push("/onboarding/step-2");
    }
    setLoading(false);
  };

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "there";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 text-center flex flex-col justify-center min-h-[400px]"
    >
      <div className="space-y-4">
        {/* Animated logo mark */}
        <motion.div
          animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="size-20 bg-accent text-invert-text font-black text-4xl rounded-2xl flex items-center justify-center mx-auto shadow-glow"
        >
          B
        </motion.div>
        <h2 className="text-3xl font-extrabold tracking-tight text-text-primary">
          Welcome to Brand, {displayName}!
        </h2>
        <p className="text-sm text-text-secondary max-w-[400px] mx-auto leading-relaxed">
          Let&apos;s build your dynamic profile and configure your collaboration criteria in 4 quick steps.
        </p>
      </div>

      <div>
        <button
          onClick={handleNext}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-accent text-invert-text px-8 py-3.5 text-sm font-bold hover:opacity-90 disabled:opacity-50 scale-active transition-opacity focus:outline-none shadow-glow mx-auto"
        >
          <span>Let&apos;s go</span>
          <ArrowRight className="size-4" />
        </button>
      </div>
    </motion.div>
  );
}
