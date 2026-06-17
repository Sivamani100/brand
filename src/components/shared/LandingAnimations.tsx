"use client";

import { useEffect, useRef, useState } from "react";

/**
 * LandingAnimations — client component for the landing page's animated stats.
 * Uses IntersectionObserver to trigger count-up animations when scrolled into view.
 */

const STATS = [
  { value: 500, suffix: "+", label: "Brands" },
  { value: 2000, suffix: "+", label: "Creators" },
  { value: 98, suffix: "%", label: "Match Rate" },
];

function useCountUp(target: number, isVisible: boolean, duration = 1800) {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isVisible || hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isVisible, target, duration]);

  return count;
}

function StatItem({ value, suffix, label, isVisible }: {
  value: number;
  suffix: string;
  label: string;
  isVisible: boolean;
}) {
  const count = useCountUp(value, isVisible);
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-bold tracking-tight text-[#fbfbef]">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-[10px] uppercase tracking-[0.15em] font-medium text-[rgba(251,251,239,0.4)] mt-1">
        {label}
      </div>
    </div>
  );
}

export function LandingAnimations() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="mt-16 md:mt-20 flex items-center justify-center gap-8 md:gap-16 border-t border-[rgba(251,251,239,0.06)] pt-8 w-full max-w-lg animate-fade-in-up [animation-delay:500ms]"
    >
      {STATS.map((stat) => (
        <StatItem key={stat.label} {...stat} isVisible={isVisible} />
      ))}
    </div>
  );
}

LandingAnimations.displayName = "LandingAnimations";
