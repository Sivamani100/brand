"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * AuthRedirect — checks if user has an active session and redirects to dashboard.
 * Used on public pages (landing, etc.) to avoid showing marketing content to logged-in users.
 * Returns children only after confirming no session exists.
 */
export function AuthRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        router.push("/dashboard");
      } else {
        setReady(true);
      }
    }
    checkSession();
  }, [router, supabase]);

  if (!ready) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-[var(--color-text-primary)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[rgba(251,251,239,0.2)] border-t-[var(--color-cream)]" />
      </div>
    );
  }

  return <>{children}</>;
}

AuthRedirect.displayName = "AuthRedirect";
