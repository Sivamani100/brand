"use client";

import { useNetworkState } from "@/lib/hooks/useNetworkState";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function OfflineBanner() {
  const { online, effectiveType, rtt } = useNetworkState();
  const [mounted, setMounted] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!online) {
      setWasOffline(true);
      setShowBackOnline(false);
    } else if (online && wasOffline) {
      setShowBackOnline(true);
      const timer = setTimeout(() => {
        setShowBackOnline(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [online, wasOffline]);

  const isSlow = mounted && online && (effectiveType === "slow-2g" || (rtt !== null && rtt > 1000));

  if (!mounted) return null;

  return (
    <div className="relative z-[9990] w-full">
      <AnimatePresence>
        {!online && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-full overflow-hidden bg-amber-600 dark:bg-amber-700 text-black dark:text-white font-semibold text-xs py-2 text-center flex items-center justify-center gap-2"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-black dark:bg-white animate-pulse" />
            No internet connection · Some features unavailable
          </motion.div>
        )}

        {showBackOnline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-full overflow-hidden bg-green-600 dark:bg-green-700 text-black dark:text-white font-semibold text-xs py-2 text-center flex items-center justify-center gap-2"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-white animate-ping" />
            Back online
          </motion.div>
        )}

        {isSlow && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border-b border-[var(--color-border)] text-[11px] py-1 text-center flex items-center justify-center gap-1.5"
          >
            <span>⚡</span>
            Slow connection detected — loading may take longer
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default OfflineBanner;
