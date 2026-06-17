"use client";

import { useEffect, useState } from "react";

interface RateLimitCountdownProps {
  retryAfter: number; // in seconds
  onExpiry?: () => void;
  className?: string;
}

export default function RateLimitCountdown({
  retryAfter,
  onExpiry,
  className = "",
}: RateLimitCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(retryAfter);

  useEffect(() => {
    setTimeLeft(retryAfter);
  }, [retryAfter]);

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpiry?.();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpiry?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, onExpiry]);

  if (timeLeft <= 0) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  return (
    <span className={`font-mono text-xs font-semibold ${className}`}>
      {formattedTime}
    </span>
  );
}
