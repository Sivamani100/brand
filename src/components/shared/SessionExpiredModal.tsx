"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function SessionExpiredModal() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleSessionExpired = () => {
      setIsOpen(true);
    };

    window.addEventListener("brand:session-expired", handleSessionExpired);
    return () => {
      window.removeEventListener("brand:session-expired", handleSessionExpired);
    };
  }, []);

  if (!isOpen) return null;

  const handleSignIn = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("redirect_after_login", window.location.href);
      setIsOpen(false);
      router.push("/auth/signin");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md scale-in-fade border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-8 rounded-xl shadow-glow text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center bg-[var(--color-accent-bg)] text-[var(--color-accent)] rounded-full">
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
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </div>
        <h2 className="mb-2 text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
          Session Expired
        </h2>
        <p className="mb-6 text-sm text-[var(--color-text-secondary)]">
          Your session has expired for security. Please sign in again.
        </p>
        <button
          onClick={handleSignIn}
          className="w-full bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-[var(--color-invert-text)] hover:opacity-90 rounded-md transition-all scale-active cursor-pointer"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}

export default SessionExpiredModal;
