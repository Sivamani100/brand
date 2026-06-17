"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * Human-readable labels for path segments.
 * Keeps URL slugs clean while showing friendly names in the trail.
 */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  brand: "Brand",
  influencer: "Influencer",
  cards: "My Cards",
  new: "New Card",
  edit: "Edit",
  applications: "Applications",
  "my-applications": "My Applications",
  chats: "Messages",
  notifications: "Notifications",
  profile: "Profile",
  influencers: "Discover Influencers",
  "saved-influencers": "Saved Influencers",
  campaigns: "Campaigns",
  analytics: "Analytics",
  brands: "Brands",
  saved: "Saved Cards",
  portfolio: "Portfolio",
  discover: "Discover",
  settings: "Settings",
  verification: "Verification",
  search: "Search",
};

/** Props for the {@link Breadcrumbs} component. */
export interface BreadcrumbsProps {
  /** Additional CSS classes applied to the root nav element. */
  className?: string;
}

/**
 * Desktop breadcrumb navigation auto-generated from the current pathname.
 *
 * - Hidden on mobile (`hidden md:block`).
 * - Only rendered when the path depth is greater than 2 (e.g. `/dashboard/brand/cards`).
 * - Each intermediate segment is a clickable link; the current (last) segment
 *   is rendered as non-interactive text.
 * - Uses the shadcn `Breadcrumb` primitive from `@/components/ui/breadcrumb`.
 *
 * @example
 * ```tsx
 * <Breadcrumbs className="mb-4" />
 * ```
 */
export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const pathname = usePathname();

  // Split into segments, filter empty strings
  const segments = pathname.split("/").filter(Boolean);

  // Only show breadcrumbs for pages deeper than level 2
  // e.g. /dashboard/brand/cards → depth 3 → show
  // e.g. /dashboard/brand       → depth 2 → hide
  if (segments.length <= 2) return null;

  /**
   * Resolve a segment to a human-readable label.
   * Falls back to title-casing the slug for dynamic segments (e.g. UUIDs).
   */
  const getLabel = (segment: string): string => {
    if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
    // Dynamic segment (e.g. a UUID or ID) — show as "Details"
    if (/^[0-9a-f-]{8,}$/i.test(segment)) return "Details";
    // Fallback: title-case the slug
    return segment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <Breadcrumb className={`hidden md:block ${className ?? ""}`}>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const href = "/" + segments.slice(0, index + 1).join("/");
          const label = getLabel(segment);
          const isLast = index === segments.length - 1;

          return (
            <React.Fragment key={href}>
              <BreadcrumbItem>
                {!isLast ? (
                  <BreadcrumbLink render={<Link href={href} />}>
                    {label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
