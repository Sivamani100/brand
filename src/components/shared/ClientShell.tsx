"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { setCsrfCookie, getCsrfTokenFromCookie } from "@/lib/security/csrf";
import { SessionExpiredModal } from "./SessionExpiredModal";
import { OfflineBanner } from "./OfflineBanner";
import { CookieConsent } from "./CookieConsent";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";

function ClientShell({ children }: { children: React.ReactNode }) {
  // CSRF Protection Initialize and Fetch Interceptor
  useEffect(() => {
    setCsrfCookie();

    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
      const method = init?.method?.toUpperCase() || "GET";
      const isMutating = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

      if (isMutating) {
        const token = getCsrfTokenFromCookie();
        if (token) {
          const headers = new Headers(init?.headers || {});
          if (!headers.has("X-CSRF-Token")) {
            headers.set("X-CSRF-Token", token);
          }
          init = { ...init, headers };
        }
      }
      return originalFetch.call(this, input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Proactive Token Refresh check every 60s
  useEffect(() => {
    const checkTokenExpiry = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session || !session.expires_at) return;
      const expiresAt = session.expires_at * 1000;
      const fiveMinutes = 5 * 60 * 1000;
      if (Date.now() > expiresAt - fiveMinutes) {
        await supabase.auth.refreshSession();
      }
    };

    checkTokenExpiry();
    const interval = setInterval(checkTokenExpiry, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Unhandled Exception & Rejection Structured Logging
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "error",
          service: "client-rejection",
          message: error?.message || "Unhandled promise rejection",
          error: {
            code: error?.code || "UNHANDLED_REJECTION",
            message: error?.message,
            stack: error?.stack,
          },
        })
      );
    };

    const handleError = (event: ErrorEvent) => {
      const error = event.error;
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "error",
          service: "client-uncaught",
          message: event.message || "Uncaught runtime error",
          error: {
            code: "UNCAUGHT_ERROR",
            message: event.message,
            stack: error?.stack,
          },
        })
      );
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);
    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      window.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <TooltipProvider>
      <SessionExpiredModal />
      <OfflineBanner />
      <CookieConsent />
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#0d0d0d",
            color: "#fbfbef",
            border: "1px solid rgba(251, 251, 239, 0.2)",
            borderRadius: "9999px",
            fontFamily: "var(--font-sans)",
          },
        }}
      />
    </TooltipProvider>
  );
}

export default ClientShell;

