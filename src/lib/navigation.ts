import {
  LayoutGrid,
  Layers,
  Inbox,
  MessageCircle,
  Bell,
  User,
  Compass,
  FileCheck,
  Users,
  Bookmark,
  Trophy,
  BarChart2,
  Building2,
  Heart,
  Grid,
  Search,
} from "lucide-react";
import type { NavItem } from "@/components/shared/Sidebar";
import type { BottomBarItem } from "@/components/shared/BottomBar";

/** Unread counts injected into nav items that display badges. */
export interface UnreadCounts {
  notifications: number;
  messages: number;
}

/**
 * Build the sidebar nav items for a brand user.
 *
 * Badge counts are injected at build time so the item definitions stay
 * declarative while the layout owns the live state.
 */
export function getBrandSidebarItems(counts: UnreadCounts): NavItem[] {
  return [
    { label: "Home", href: "/dashboard/brand", icon: LayoutGrid },
    { label: "Search", href: "/search", icon: Search },
    { label: "My Cards", href: "/dashboard/brand/cards", icon: Layers },
    { label: "Applications", href: "/dashboard/brand/applications", icon: Inbox },
    { label: "Discover Influencers", href: "/dashboard/brand/influencers", icon: Users },
    { label: "Saved Lists", href: "/dashboard/brand/saved-influencers", icon: Bookmark },
    { label: "My Campaigns", href: "/dashboard/brand/campaigns", icon: Trophy },
    { label: "Chats", href: "/dashboard/brand/chats", icon: MessageCircle, badge: counts.messages },
    { label: "Analytics", href: "/dashboard/brand/analytics", icon: BarChart2 },
    { label: "Notifications", href: "/dashboard/brand/notifications", icon: Bell, badge: counts.notifications },
    { label: "Profile", href: "/dashboard/brand/profile", icon: User },
  ];
}

/** Build the bottom bar items for a brand user. */
export function getBrandBottomItems(counts: UnreadCounts): BottomBarItem[] {
  return [
    { label: "Home", href: "/dashboard/brand", icon: LayoutGrid },
    { label: "Cards", href: "/dashboard/brand/cards", icon: Layers },
    { label: "Influencers", href: "/dashboard/brand/influencers", icon: Users },
    { label: "Chats", href: "/dashboard/brand/chats", icon: MessageCircle, badge: counts.messages },
    { label: "Profile", href: "/dashboard/brand/profile", icon: User },
  ];
}

/** Build the sidebar nav items for an influencer user. */
export function getInfluencerSidebarItems(counts: UnreadCounts): NavItem[] {
  return [
    { label: "Home", href: "/dashboard/influencer", icon: LayoutGrid },
    { label: "Search", href: "/search", icon: Search },
    { label: "Discover", href: "/dashboard/influencer/discover", icon: Compass },
    { label: "Applied", href: "/dashboard/influencer/my-applications", icon: FileCheck },
    { label: "Brands", href: "/dashboard/influencer/brands", icon: Building2 },
    { label: "Saved Cards", href: "/dashboard/influencer/saved", icon: Heart },
    { label: "My Portfolio", href: "/dashboard/influencer/portfolio", icon: Grid },
    { label: "Chats", href: "/dashboard/influencer/chats", icon: MessageCircle, badge: counts.messages },
    { label: "Analytics", href: "/dashboard/influencer/analytics", icon: BarChart2 },
    { label: "Notifications", href: "/dashboard/influencer/notifications", icon: Bell, badge: counts.notifications },
    { label: "Profile", href: "/dashboard/influencer/profile", icon: User },
  ];
}

/** Build the bottom bar items for an influencer user. */
export function getInfluencerBottomItems(counts: UnreadCounts): BottomBarItem[] {
  return [
    { label: "Home", href: "/dashboard/influencer", icon: LayoutGrid },
    { label: "Brands", href: "/dashboard/influencer/brands", icon: Building2 },
    { label: "Applied", href: "/dashboard/influencer/my-applications", icon: FileCheck },
    { label: "Chats", href: "/dashboard/influencer/chats", icon: MessageCircle, badge: counts.messages },
    { label: "Profile", href: "/dashboard/influencer/profile", icon: User },
  ];
}

/**
 * Return sidebar + bottom bar items for the given role, with live badge counts.
 *
 * @example
 * ```ts
 * const { sidebarItems, bottomItems } = getNavItems("brand", { notifications: 3, messages: 1 });
 * ```
 */
export function getNavItems(
  role: "brand" | "influencer",
  counts: UnreadCounts
): { sidebarItems: NavItem[]; bottomItems: BottomBarItem[] } {
  if (role === "brand") {
    return {
      sidebarItems: getBrandSidebarItems(counts),
      bottomItems: getBrandBottomItems(counts),
    };
  }
  return {
    sidebarItems: getInfluencerSidebarItems(counts),
    bottomItems: getInfluencerBottomItems(counts),
  };
}
