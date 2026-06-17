"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Bell, Search } from "lucide-react";
import ThemeToggle from "@/components/shared/ThemeToggle";

/** Props for the {@link AppBar} component. */
export interface AppBarProps {
  /** The authenticated user's role. */
  role: "brand" | "influencer";
  /** Count of unread notifications — drives the badge dot. */
  unreadNotifications: number;
  /** URL of the user's avatar image, if any. */
  avatarUrl?: string | null;
  /** Display name used for the fallback avatar initial. */
  displayName?: string | null;
}

/**
 * Mobile top app bar (visible below `md` breakpoint).
 *
 * Shows the current page title derived from the pathname, a contextual back
 * button on nested pages, and action icons (theme toggle, search, notification
 * bell, user avatar).
 *
 * **Back-button logic** navigates to the logical parent route rather than
 * using browser history:
 * - Card detail → cards list
 * - Application → cards list (via card detail)
 * - Chat room → chats list
 * - Profile edit → profile view
 *
 * @example
 * ```tsx
 * <AppBar
 *   role="brand"
 *   unreadNotifications={3}
 *   avatarUrl={profile.avatar_url}
 *   displayName={profile.display_name}
 * />
 * ```
 */
export function AppBar({
  role,
  unreadNotifications,
  avatarUrl,
  displayName,
}: AppBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const prefix = `/dashboard/${role}`;

  /** Derive a human-readable page title from the current path. */
  const getPageTitle = (): string => {
    if (pathname.includes("/cards/new")) return "Post New Card";
    if (pathname.includes("/cards/edit")) return "Edit Card";
    if (pathname.includes("/cards/")) return "Card Details";
    if (pathname.includes("/cards")) return "My Cards";
    if (pathname.includes("/discover")) return "Discover Campaigns";
    if (pathname.includes("/applications")) return "Applications";
    if (pathname.includes("/my-applications")) return "My Applications";
    if (pathname.includes("/chats/")) return "Chat Room";
    if (pathname.includes("/chats")) return "Messages";
    if (pathname.includes("/notifications")) return "Notifications";
    if (pathname.includes("/profile/edit")) return "Edit Profile";
    if (pathname.includes("/profile")) return "Profile Settings";
    if (pathname.includes("/influencers")) return "Discover Influencers";
    if (pathname.includes("/saved-influencers")) return "Saved Influencers";
    if (pathname.includes("/campaigns")) return "Campaign Showcase";
    if (pathname.includes("/analytics")) return "Analytics Dashboard";
    if (pathname.includes("/brands")) return "Brand Directory";
    if (pathname.includes("/saved")) return "Saved Cards";
    if (pathname.includes("/portfolio")) return "My Portfolio";
    if (pathname.includes("/settings/notifications"))
      return "Notification Settings";
    if (pathname.includes("/settings/verification"))
      return "Verification Request";
    return "Dashboard";
  };

  /**
   * Compute the logical parent route for back navigation.
   * Returns `null` when on a top-level dashboard page (no back button).
   */
  const getBackHref = (): string | null => {
    // Card detail → cards list
    if (/\/cards\/[^/]+$/.test(pathname) && !pathname.includes("/new") && !pathname.includes("/edit")) {
      return `${prefix}/cards`;
    }
    // Card new/edit → cards list
    if (pathname.includes("/cards/new") || pathname.includes("/cards/edit")) {
      return `${prefix}/cards`;
    }
    // Application detail → applications list
    if (/\/applications\/[^/]+$/.test(pathname)) {
      return `${prefix}/applications`;
    }
    // My-application detail → my-applications list
    if (/\/my-applications\/[^/]+$/.test(pathname)) {
      return `${prefix}/my-applications`;
    }
    // Chat room → chats list
    if (/\/chats\/[^/]+$/.test(pathname)) {
      return `${prefix}/chats`;
    }
    // Profile edit → profile view
    if (pathname.includes("/profile/edit")) {
      return `${prefix}/profile`;
    }
    // Settings sub-page → profile
    if (pathname.includes("/settings/")) {
      return `${prefix}/profile`;
    }
    return null;
  };

  const backHref = getBackHref();

  return (
    <header className="flex md:hidden h-14 items-center justify-between px-6 bg-bg border-b border-border sticky top-0 z-20">
      <div className="flex items-center gap-2">
        {backHref && (
          <button
            onClick={() => router.push(backHref)}
            className="p-1 -ml-1 text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="size-5" />
          </button>
        )}
        <h2 className="text-base font-bold text-text-primary tracking-tight">
          {getPageTitle()}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link
          href="/search"
          className="p-1 text-text-secondary hover:text-text-primary transition-colors"
        >
          <Search className="size-5" />
        </Link>
        <Link
          href={`${prefix}/notifications`}
          className="relative p-1 text-text-secondary hover:text-text-primary transition-colors"
          data-tour="notification-bell"
        >
          <Bell className="size-5" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 size-2 rounded-full bg-red-400" />
          )}
        </Link>
        <Link
          href={`${prefix}/profile`}
          className="size-8 overflow-hidden rounded-full border border-border bg-surface-2"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs font-bold text-invert-text bg-accent">
              {displayName ? displayName[0].toUpperCase() : "U"}
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}
