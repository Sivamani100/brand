"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message || "Failed to sign in.");
      setLoading(false);
      return;
    }

    try {
      await fetch("/api/auth/after-signin", { method: "POST" });
    } catch (err) {
      console.error("Failed to log login history:", err);
    }

    toast.success("Successfully signed in!");

    // Fetch user profile to redirect correctly
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role === "admin") {
      router.push("/admin");
    } else if (profile?.role === "brand") {
      router.push("/dashboard/brand");
    } else {
      router.push("/dashboard/influencer");
    }
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-[#0d0d0d] p-8 border border-[rgba(251,251,239,0.2)] shadow-glow lift-hover">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#fbfbef] font-sans">
            Brand
          </h1>
          <p className="mt-2 text-sm text-[rgba(251,251,239,0.6)]">
            Sign in to start matching & collaborating
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSignIn}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="text-xs font-medium text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="mt-1 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-[rgba(251,251,239,0.6)] uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/auth/reset-password"
                  className="text-xs text-[#fbfbef] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 block w-full rounded-full bg-[#141414] border border-[rgba(251,251,239,0.2)] px-4 py-3 text-sm text-[#fbfbef] placeholder-[rgba(251,251,239,0.3)] input-focus-animate"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-full bg-[#fbfbef] px-4 py-3 text-sm font-semibold text-black scale-active hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-[rgba(251,251,239,0.6)] mt-4">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-[#fbfbef] font-semibold hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
