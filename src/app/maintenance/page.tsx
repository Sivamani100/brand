"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";

export default function MaintenancePage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();

      if (data?.value) {
        setSettings(data.value);
      }
    }

    loadSettings();
  }, []);

  useEffect(() => {
    if (!settings?.expected_end) return;

    const interval = setInterval(() => {
      const difference = new Date(settings.expected_end).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setTimeLeft(null);
        clearInterval(interval);
      } else {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft({ hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [settings]);

  const message = settings?.message || "We're currently upgrading Brand. Please check back shortly.";

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Animated Icon */}
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          className="size-16 bg-accent-bg text-accent rounded-2xl flex items-center justify-center mx-auto border border-border"
        >
          <AlertTriangle className="size-8" />
        </motion.div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight">System Maintenance</h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            {message}
          </p>
        </div>

        {/* Countdown Timer */}
        {timeLeft && (
          <div className="bg-surface-2 border border-border rounded-2xl p-6 flex flex-col items-center space-y-2">
            <span className="text-[10px] uppercase font-bold text-text-secondary flex items-center gap-1">
              <Clock className="size-3.5" />
              <span>Estimated Resume In</span>
            </span>
            <div className="flex items-center gap-4 text-2xl font-black text-text-primary mt-1">
              <div>
                <span>{String(timeLeft.hours).padStart(2, "0")}</span>
                <span className="text-[9px] uppercase font-bold block text-text-muted mt-1">Hrs</span>
              </div>
              <span className="opacity-40">:</span>
              <div>
                <span>{String(timeLeft.minutes).padStart(2, "0")}</span>
                <span className="text-[9px] uppercase font-bold block text-text-muted mt-1">Min</span>
              </div>
              <span className="opacity-40">:</span>
              <div>
                <span>{String(timeLeft.seconds).padStart(2, "0")}</span>
                <span className="text-[9px] uppercase font-bold block text-text-muted mt-1">Sec</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Admin Link */}
        <div className="pt-8 border-t border-border/10">
          <Link
            href="/auth/signin"
            className="text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors focus:outline-none"
          >
            Admin Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
