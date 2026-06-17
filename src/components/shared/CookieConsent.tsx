"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: true,
    telemetry: true,
  });

  const setCookie = (name: string, value: string, days: number) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict;Secure`;
  };

  const getCookie = (name: string) => {
    if (typeof document === "undefined") return null;
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const consent = getCookie("cookie_consent");
      if (!consent) {
        setShowConsent(true);
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const consentVal = JSON.stringify({
      essential: true,
      analytics: true,
      telemetry: true,
    });
    setCookie("cookie_consent", consentVal, 365);
    setShowConsent(false);
  };

  const handleEssentialOnly = () => {
    const consentVal = JSON.stringify({
      essential: true,
      analytics: false,
      telemetry: false,
    });
    setCookie("cookie_consent", consentVal, 365);
    setShowConsent(false);
  };

  const handleSavePreferences = () => {
    setCookie("cookie_consent", JSON.stringify(preferences), 365);
    setShowConsent(false);
  };

  if (!showConsent) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9990] w-full max-w-md px-4">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-6 rounded-xl shadow-glow text-left"
        >
          {!showSettings ? (
            <>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xl">🍪</span>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                    We value your privacy
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    We use essential cookies for authentication and optional analytics cookies to improve your experience.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={handleAcceptAll}
                  className="bg-[var(--color-accent)] text-[var(--color-invert-text)] font-semibold text-xs px-3.5 py-2 rounded-md hover:opacity-90 transition-all scale-active cursor-pointer"
                >
                  Accept All
                </button>
                <button
                  onClick={handleEssentialOnly}
                  className="bg-[var(--color-surface-2)] text-[var(--color-text-primary)] border border-[var(--color-border)] font-semibold text-xs px-3.5 py-2 rounded-md hover:bg-[var(--color-surface-3)] transition-all scale-active cursor-pointer"
                >
                  Essential Only
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors self-center py-2 px-1 cursor-pointer"
                >
                  Manage &rarr;
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">
                Cookie Preferences
              </h3>
              
              <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--color-text-primary)]">Essential Cookies</h4>
                    <p className="text-[10px] text-[var(--color-text-secondary)]">Required for login and security.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="h-4 w-4 accent-[var(--color-accent)] opacity-60"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--color-text-primary)]">Analytics</h4>
                    <p className="text-[10px] text-[var(--color-text-secondary)]">Help us improve the platform.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences(p => ({ ...p, analytics: e.target.checked }))}
                    className="h-4 w-4 accent-[var(--color-accent)] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--color-text-primary)]">Telemetry</h4>
                    <p className="text-[10px] text-[var(--color-text-secondary)]">Errors and diagnostic reports.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.telemetry}
                    onChange={(e) => setPreferences(p => ({ ...p, telemetry: e.target.checked }))}
                    className="h-4 w-4 accent-[var(--color-accent)] cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSavePreferences}
                  className="bg-[var(--color-accent)] text-[var(--color-invert-text)] font-semibold text-xs px-3.5 py-2 rounded-md hover:opacity-90 transition-all scale-active cursor-pointer"
                >
                  Save Preferences
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="bg-[var(--color-surface-2)] text-[var(--color-text-primary)] border border-[var(--color-border)] font-semibold text-xs px-3.5 py-2 rounded-md hover:bg-[var(--color-surface-3)] transition-all scale-active cursor-pointer"
                >
                  Back
                </button>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default CookieConsent;
