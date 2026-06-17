"use client";

import RateLimitCountdown from "./RateLimitCountdown";

interface LockoutViewProps {
  retryAfter: number;
  onExpiry?: () => void;
  onResetPassword?: () => void;
}

export function AuthLockoutView({ retryAfter, onExpiry, onResetPassword }: LockoutViewProps) {
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
            className="h-8 w-8 animate-pulse"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Account Temporarily Locked
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Too many failed sign-in attempts. Try again in{" "}
          <RateLimitCountdown
            retryAfter={retryAfter}
            onExpiry={onExpiry}
            className="text-red-400 text-sm font-bold"
          />{" "}
          or reset your password.
        </p>

        <div className="pt-2">
          {onResetPassword ? (
            <button
              onClick={onResetPassword}
              className="text-xs text-[var(--color-text-primary)] hover:underline"
            >
              Reset your password &rarr;
            </button>
          ) : (
            <a
              href="/auth/reset-password"
              className="text-xs text-[var(--color-text-primary)] hover:underline"
            >
              Reset your password &rarr;
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

interface InlineRateLimitProps {
  title?: string;
  message: string;
  retryAfter: number;
  onExpiry?: () => void;
}

export function InlineRateLimit({
  title = "Limit reached",
  message,
  retryAfter,
  onExpiry,
}: InlineRateLimitProps) {
  return (
    <div className="w-full border border-amber-500/20 bg-amber-500/5 p-4 rounded-xl flex gap-3">
      <span className="text-xl">⚠️</span>
      <div>
        <h4 className="text-sm font-bold text-[var(--color-text-primary)]">{title}</h4>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">{message}</p>
        <p className="text-[11px] text-[var(--color-text-muted)] mt-2">
          Resets in <RateLimitCountdown retryAfter={retryAfter} onExpiry={onExpiry} />
        </p>
      </div>
    </div>
  );
}
