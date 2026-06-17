"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    if (error) {
      toast.error(error.message || "Failed to send reset email.");
      setLoading(false);
      return;
    }

    toast.success("Password reset link sent! Check your inbox.");
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-[#0d0d0d] p-8 border border-[rgba(251,251,239,0.2)] shadow-glow lift-hover">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#fbfbef] font-sans">
            Reset Password
          </h1>
          <p className="mt-2 text-sm text-[rgba(251,251,239,0.6)]">
            We will email you a link to reset your password
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleReset}>
          <div>
            <label className="text-xs font-medium text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              required
              className="mt-1 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-full bg-[#fbfbef] px-4 py-3 text-sm font-semibold text-black scale-active hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-[rgba(251,251,239,0.6)] mt-4">
          Remember password?{" "}
          <Link href="/auth/signin" className="text-[#fbfbef] font-semibold hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
