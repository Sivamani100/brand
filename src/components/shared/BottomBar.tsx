"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

/** A single item displayed in the mobile bottom navigation bar. */
export interface BottomBarItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

/** Props for the {@link BottomBar} component. */
export interface BottomBarProps {
  /** Navigation items to display (max 5 per role). */
  items: BottomBarItem[];
}

/**
 * Mobile bottom navigation bar (visible below `md` breakpoint).
 *
 * Renders up to 5 navigation items with icon, label, and optional unread
 * badge.  Active state is derived from the current pathname.
 *
 * @example
 * ```tsx
 * <BottomBar items={brandBottomItems} />
 * ```
 */
export function BottomBar({ items }: BottomBarProps) {
  const pathname = usePathname();

  return (
    <nav className="flex md:hidden fixed bottom-0 inset-x-0 h-16 bg-surface border-t border-border items-center justify-around z-30 pb-safe px-2">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 py-1 text-center group"
          >
            <div className="relative">
              <Icon
                className={`size-5 transition-transform duration-200 group-active:scale-90 ${
                  isActive ? "text-accent" : "text-text-secondary"
                }`}
              />
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-accent text-[9px] font-bold text-invert-text flex items-center justify-center">
                  {item.badge}
                </span>
              ) : null}
            </div>
            <span
              className={`text-[10px] font-medium mt-1 transition-colors duration-200 ${
                isActive ? "text-accent" : "text-text-secondary"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
