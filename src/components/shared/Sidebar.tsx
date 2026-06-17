"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, ChevronsUpDown, User, Settings, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { useUser } from "@/lib/hooks/useUser";
import type { LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** A single navigation item in the sidebar. */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  /** Optional data-tour attribute value for onboarding integration. */
  tourId?: string;
}

/** Props for the {@link Sidebar} component. */
export interface SidebarProps {
  /** The authenticated user's role — drives which nav items are shown. */
  role: "brand" | "influencer" | "admin";
  /** Ordered list of navigation items to render. */
  navItems: NavItem[];
  /** Live unread counts keyed by category. */
  unreadCounts: { notifications: number; messages: number };
  /** Callback fired when the user clicks "Sign Out". */
  onSignOut: () => void;
  /** Whether the user's profile is verified. */
  isVerified?: boolean;
  /** Whether the sidebar is currently expanded (controlled). */
  isExpanded?: boolean;
  /** Callback fired when the user toggles the collapse/expand state. */
  onToggleExpand?: () => void;
}

/** Stylized "eightysix" logo icon component. */
export function EightySixLogo({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle
        cx="16"
        cy="12.5"
        r="6"
        stroke="#2563EB"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle
        cx="16"
        cy="19.5"
        r="6"
        stroke="#EAB308"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Helper function to segment navItems into MAIN and INSIGHT/SUPPORT sections based on role. */
function getSections(role: "brand" | "influencer" | "admin", items: NavItem[]) {
  const mainLabels =
    role === "brand"
      ? ["Home", "Search", "My Cards", "Applications", "Discover Influencers", "My Campaigns"]
      : role === "influencer"
      ? ["Home", "Search", "Discover", "Applied", "Brands", "My Portfolio"]
      : ["Dashboard", "Users", "Cards", "Applications", "Rooms", "Verifications", "Disputes"];

  const mainItems = items.filter((item) => mainLabels.includes(item.label));
  const subItems = items.filter((item) => !mainLabels.includes(item.label));

  return [
    { title: "MAIN", items: mainItems },
    { title: role === "admin" ? "SUPPORT" : "INSIGHT", items: subItems },
  ];
}

/**
 * Desktop sidebar navigation (visible at `md` breakpoint and above).
 *
 * Layout: fixed logo → scrollable sectioned nav lists → fixed bottom actions
 * (horizontal/compact theme toggle + user profile popover).
 */
export function Sidebar({
  role,
  navItems,
  onSignOut,
  isVerified,
  isExpanded: isExpandedProp,
  onToggleExpand: onToggleExpandProp,
}: SidebarProps) {
  const pathname = usePathname();
  const { profile } = useUser();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(true);

  const isExpanded = isExpandedProp ?? internalExpanded;
  const onToggleExpand = onToggleExpandProp ?? (() => setInternalExpanded(!internalExpanded));

  /** Map well-known labels to their data-tour attribute values. */
  const tourMap: Record<string, string> = {
    "My Cards": "post-card-btn",
    "Discover Influencers": "influencers-nav",
    Applications: "applications-nav",
    Notifications: "notification-bell",
    Discover: "discover-nav",
    "My Portfolio": "portfolio-nav",
  };

  const sections = getSections(role, navItems);
  const displayName = profile?.display_name || profile?.company_name || "User";
  
  const roleLabel =
    role === "admin"
      ? "Admin - Eighty6"
      : role === "brand"
      ? `Brand - ${profile?.company_name || "Eighty6"}`
      : "Influencer";

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;
    const tourId = tourMap[item.label];

    const content = (
      <Link
        href={item.href}
        {...(tourId ? { "data-tour": tourId } : {})}
        className={`flex items-center transition-all duration-200 cursor-pointer rounded-xl font-semibold ${
          isActive
            ? "bg-surface-3 text-text-primary"
            : "text-text-secondary hover:bg-surface-2 hover:text-text-primary"
        } ${isExpanded ? "w-full px-3 py-2.5 justify-between" : "justify-center w-10 h-10 p-0"}`}
      >
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative size-[18px] flex items-center justify-center shrink-0">
            <Icon className="size-[18px] shrink-0" />
            {!isExpanded && item.badge && item.badge > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            ) : null}
          </div>
          {isExpanded && <span className="text-sm">{item.label}</span>}
        </div>
        {isExpanded && item.badge && item.badge > 0 ? (
          <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-invert-text shrink-0">
            {item.badge}
          </span>
        ) : null}
      </Link>
    );

    if (!isExpanded) {
      return (
        <Tooltip key={item.label}>
          <TooltipTrigger render={content} />
          <TooltipContent
            side="right"
            sideOffset={10}
            className="bg-popover text-popover-foreground border border-border font-medium"
          >
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.label}>{content}</div>;
  };

  return (
    <aside className={`hidden md:flex flex-col h-screen fixed inset-y-0 left-0 bg-surface border-r border-border/10 z-30 select-none transition-all duration-300 ease-in-out ${
      isExpanded ? "w-[240px] px-6 py-3" : "w-[76px] px-3 py-3"
    }`}>
      {/* Backdrop for profile popover menu */}
      {profileMenuOpen && (
        <div
          className="fixed inset-0 z-40 cursor-default"
          onClick={() => setProfileMenuOpen(false)}
        />
      )}

      {/* Logo — pinned to top (exactly 70px height) */}
      <div className={`h-[70px] flex items-center shrink-0 ${isExpanded ? "justify-between px-1" : "justify-center"}`}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity shrink-0"
          >
            <EightySixLogo className="size-8 shrink-0" />
            {isExpanded && (
              <span className="text-xl font-bold tracking-tight text-text-primary font-sans lowercase whitespace-nowrap">
                eightysix
              </span>
            )}
          </Link>
          {isExpanded && isVerified && (
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-accent text-invert-text text-[9px] font-bold shrink-0">
              ✓
            </span>
          )}
        </div>

        {isExpanded && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors cursor-pointer"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Expand trigger when collapsed */}
      {!isExpanded && (
        <div className="w-full flex justify-center py-2 shrink-0">
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-lg transition-colors cursor-pointer border border-border shadow-xs"
            aria-label="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Scrollable nav sections list (scrollbars hidden) */}
      <nav className="flex-1 space-y-6 overflow-y-auto pr-1 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {sections.map((section) => {
          if (section.items.length === 0) return null;
          return (
            <div key={section.title} className="space-y-1.5">
              {isExpanded ? (
                <div className="text-[10px] font-bold tracking-wider text-text-muted px-3 uppercase">
                  {section.title}
                </div>
              ) : (
                <div className="w-full flex justify-center py-1">
                  <div className="w-8 h-[1px] bg-border/20" />
                </div>
              )}
              <div className={`flex flex-col gap-1 w-full ${isExpanded ? "" : "items-center px-1"}`}>
                {section.items.map(renderItem)}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="relative mt-auto pt-4 border-t border-border/10 flex flex-col gap-4">
        {/* Horizontal or Compact Theme Switcher */}
        <ThemeToggle variant={isExpanded ? "horizontal" : "compact"} />

        {/* Profile Card Button */}
        {isExpanded ? (
          <button
            type="button"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="h-[50px] flex items-center justify-between w-full px-2.5 rounded-xl hover:bg-surface-2 transition-all text-left scale-active cursor-pointer flex-shrink-0"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {/* Avatar */}
              <div className="size-9 overflow-hidden rounded-full border border-border/15 bg-surface-3 flex-shrink-0">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm font-bold text-invert-text bg-accent">
                    {displayName[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>

              {/* User Meta */}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-text-primary truncate">
                  {displayName}
                </span>
                <span className="text-xs text-text-muted truncate">
                  {roleLabel}
                </span>
              </div>
            </div>

            {/* Chevron */}
            <ChevronsUpDown className="size-4 text-text-secondary flex-shrink-0 ml-1" />
          </button>
        ) : (
          <div className="w-full flex justify-center shrink-0">
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="size-10 rounded-full border border-border/15 bg-surface-3 flex items-center justify-center hover:bg-surface-2 transition-all cursor-pointer shadow-xs shrink-0"
                  >
                    <div className="size-8 overflow-hidden rounded-full">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs font-bold text-invert-text bg-accent">
                          {displayName[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                  </button>
                }
              />
              <TooltipContent
                side="right"
                sideOffset={10}
                className="bg-popover text-popover-foreground border border-border font-medium"
              >
                Profile & Settings
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Popover Actions Menu */}
        <AnimatePresence>
          {profileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={`absolute bottom-[68px] bg-surface border border-border rounded-xl shadow-lg p-1.5 z-50 flex flex-col gap-0.5 ${
                isExpanded ? "left-0 right-0" : "left-3 w-52"
              }`}
            >
              <Link
                href={role === "admin" ? "/admin/settings" : `/dashboard/${role}/profile`}
                onClick={() => setProfileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-all font-semibold"
              >
                <User className="size-4" />
                <span>View Profile</span>
              </Link>
              {role === "admin" ? (
                <Link
                  href="/dashboard"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-all font-semibold"
                >
                  <ArrowLeft className="size-4" />
                  <span>Return to App</span>
                </Link>
              ) : (
                <Link
                  href={`/dashboard/${role}/profile/edit`}
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-all font-semibold"
                >
                  <Settings className="size-4" />
                  <span>Edit Settings</span>
                </Link>
              )}
              <div className="h-px bg-border/10 my-1" />
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-all font-semibold text-left cursor-pointer"
              >
                <LogOut className="size-4" />
                <span>Sign Out</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
