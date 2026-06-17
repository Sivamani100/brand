"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function SuspendedPage() {
  const [reason, setReason] = useState("Violation of platform terms and conditions.");
  const [loading, setLoading] = useState(true);
  const supabase = createClient() as any;

  useEffect(() => {
    async function checkSuspension() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch moderation queue or audit log for suspension reason if any
        const { data: modData } = await supabase
          .from("moderation_queue")
          .select("flag_reason")
          .eq("author_id", user.id)
          .eq("status", "removed")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (modData?.flag_reason) {
          setReason(modData.flag_reason);
        }
      } catch (err) {
        console.error("Failed to load suspension reason:", err);
      } finally {
        setLoading(false);
      }
    }
    checkSuspension();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/signin";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl bg-[#0d0d0d] p-8 border border-red-500/20 shadow-glow text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center bg-red-500/10 text-red-500 rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-8 w-8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Account Suspended
        </h2>
        
        {loading ? (
          <div className="h-4 w-3/4 mx-auto skeleton" />
        ) : (
          <div className="bg-[#141414] border border-[var(--color-border)] p-4 rounded-xl text-left">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
              Reason for Suspension
            </span>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              {reason}
            </p>
          </div>
        )}

        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed pt-2">
          If you believe this is a mistake, you can submit an appeal or contact our support team at{" "}
          <a href="mailto:appeals@brand.com" className="text-[var(--color-text-primary)] underline">
            appeals@brand.com
          </a>.
        </p>

        <div className="pt-4 flex flex-col gap-2">
          <a
            href="/support"
            className="w-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-xs font-semibold py-3 rounded-full hover:bg-[var(--color-surface-3)] transition-all text-center block"
          >
            Submit an Appeal
          </a>
          <button
            onClick={handleSignOut}
            className="w-full bg-[var(--color-accent)] text-[var(--color-invert-text)] text-xs font-semibold py-3 rounded-full hover:opacity-90 transition-all cursor-pointer"
          >
            Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}
