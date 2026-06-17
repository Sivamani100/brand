"use client";

import { useState, useEffect } from "react";

export interface NetworkState {
  online: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | null;
  downlink: number | null;
  rtt: number | null;
}

export function useNetworkState() {
  const [state, setState] = useState<NetworkState>({
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    effectiveType: typeof navigator !== "undefined" ? ((navigator as any).connection?.effectiveType ?? null) : null,
    downlink: typeof navigator !== "undefined" ? ((navigator as any).connection?.downlink ?? null) : null,
    rtt: typeof navigator !== "undefined" ? ((navigator as any).connection?.rtt ?? null) : null,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setState(s => ({ ...s, online: true }));
    const handleOffline = () => setState(s => ({ ...s, online: false }));
    
    const handleChange = () => {
      const conn = (navigator as any).connection;
      setState(s => ({
        ...s,
        effectiveType: conn?.effectiveType ?? null,
        downlink: conn?.downlink ?? null,
        rtt: conn?.rtt ?? null,
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener("change", handleChange);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (conn) {
        conn.removeEventListener("change", handleChange);
      }
    };
  }, []);

  return state;
}
