"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Building2,
  Plus,
  Search,
  BarChart2,
} from "lucide-react";
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";

/** Props for the {@link GlobalSearch} component. */
export interface GlobalSearchProps {
  /** The authenticated user's role — determines which nav items and actions appear. */
  role: "brand" | "influencer";
}

/**
 * Command palette (Cmd+K / Ctrl+K) for quick navigation and actions.
 *
 * Opens on `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux).  Provides two
 * sections:
 * - **Quick Navigation** — links to all major dashboard pages.
 * - **Quick Actions** — contextual actions like creating a new card.
 *
 * Each result shows a keyboard shortcut hint via the shadcn `Kbd` component.
 * Results navigate via `router.push()`.
 *
 * @example
 * ```tsx
 * <GlobalSearch role="brand" />
 * ```
 */
export function GlobalSearch({ role }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const prefix = `/dashboard/${role}`;

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  /** Navigate to a route and close the palette. */
  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const brandNavItems = [
    { label: "Home", href: `${prefix}`, icon: LayoutGrid, chord: "G H" },
    { label: "My Cards", href: `${prefix}/cards`, icon: Layers, chord: "G C" },
    {
      label: "Applications",
      href: `${prefix}/applications`,
      icon: Inbox,
      chord: "G A",
    },
    {
      label: "Discover Influencers",
      href: `${prefix}/influencers`,
      icon: Users,
    },
    { label: "Chats", href: `${prefix}/chats`, icon: MessageCircle, chord: "G M" },
    {
      label: "Notifications",
      href: `${prefix}/notifications`,
      icon: Bell,
      chord: "G N",
    },
    { label: "Analytics", href: `${prefix}/analytics`, icon: BarChart2 },
    { label: "Profile", href: `${prefix}/profile`, icon: User, chord: "G P" },
  ];

  const influencerNavItems = [
    { label: "Home", href: `${prefix}`, icon: LayoutGrid, chord: "G H" },
    {
      label: "Discover",
      href: `${prefix}/discover`,
      icon: Compass,
      chord: "G C",
    },
    {
      label: "My Applications",
      href: `${prefix}/my-applications`,
      icon: FileCheck,
      chord: "G A",
    },
    { label: "Brands", href: `${prefix}/brands`, icon: Building2 },
    { label: "Chats", href: `${prefix}/chats`, icon: MessageCircle, chord: "G M" },
    {
      label: "Notifications",
      href: `${prefix}/notifications`,
      icon: Bell,
      chord: "G N",
    },
    { label: "Analytics", href: `${prefix}/analytics`, icon: BarChart2 },
    { label: "Profile", href: `${prefix}/profile`, icon: User, chord: "G P" },
  ];

  const navItems = role === "brand" ? brandNavItems : influencerNavItems;

  const quickActions =
    role === "brand"
      ? [
          {
            label: "Post New Card",
            href: `${prefix}/cards/new`,
            icon: Plus,
          },
          {
            label: "Search Influencers",
            href: "/search",
            icon: Search,
          },
        ]
      : [
          {
            label: "Search Campaigns",
            href: "/search",
            icon: Search,
          },
        ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput
          id="global-search-input"
          placeholder="Search pages, actions…"
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Quick Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  onSelect={() => navigate(item.href)}
                >
                  <Icon className="size-4 mr-2 text-text-secondary" />
                  <span>{item.label}</span>
                  {item.chord && (
                    <CommandShortcut>
                      <Kbd>{item.chord}</Kbd>
                    </CommandShortcut>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandGroup heading="Quick Actions">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <CommandItem
                  key={action.href}
                  onSelect={() => navigate(action.href)}
                >
                  <Icon className="size-4 mr-2 text-text-secondary" />
                  <span>{action.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
