'use client';

/**
 * Pre-built empty state compositions for every major section of the app.
 *
 * Each named export uses the compound `Empty` component from `@/components/ui/empty`
 * and follows the Brand design language — concise headline, motivating body copy,
 * and a single clear CTA.
 */

import Link from 'next/link';
import {
  Bell,
  Bookmark,
  Clock,
  Layers,
  MessageSquare,
  Rocket,
} from 'lucide-react';


import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

/* ─── Brand: No Cards ───────────────────────────────────────── */

/**
 * Shown on the brand cards page when the user hasn't posted any cards yet.
 */
export function BrandNoCards() {
  return (
    <Empty data-tour="empty-brand-cards">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Layers className="size-5" />
        </EmptyMedia>
        <EmptyTitle>Post your first collaboration</EmptyTitle>
        <EmptyDescription>
          It takes 3 minutes. Brands who post within 24h get 3× more
          applications.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link
          href="/dashboard/brand/cards/new"
          data-tour="post-card-btn"
          className="inline-flex items-center justify-center rounded-full bg-[var(--color-cream)] text-black font-semibold text-xs px-5 py-2.5 hover:opacity-90 transition-opacity"
        >
          Post Your First Card →
        </Link>
      </EmptyContent>
    </Empty>
  );
}

/* ─── Influencer: No Applications ───────────────────────────── */

/**
 * Shown on the influencer applications page when they haven't applied to anything.
 */
export function InfluencerNoApplications() {
  return (
    <Empty data-tour="empty-influencer-applications">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Rocket className="size-5" />
        </EmptyMedia>
        <EmptyTitle>Your first collab is one step away</EmptyTitle>
        <EmptyDescription>
          Browse cards matched to your niche. Apply in 2 steps.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link
          href="/dashboard/influencer/discover"
          data-tour="discover-cards-btn"
          className="inline-flex items-center justify-center rounded-full bg-[var(--color-cream)] text-black font-semibold text-xs px-5 py-2.5 hover:opacity-90 transition-opacity"
        >
          Browse Matched Cards →
        </Link>
      </EmptyContent>
    </Empty>
  );
}

/* ─── Brand: No Applications on a Card ──────────────────────── */

/**
 * Shown on a brand's individual card detail when no creators have applied yet.
 */
export function BrandNoApplicationsOnCard() {
  return (
    <Empty data-tour="empty-brand-applications">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Clock className="size-5" />
        </EmptyMedia>
        <EmptyTitle>Applications are on their way</EmptyTitle>
        <EmptyDescription>
          Matched creators have been notified. Most cards receive applications
          within 2–6 hours.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <EmptyDescription className="text-xs">
          💡 Tip: Add more details to your card to improve visibility and
          attract higher-quality applications.
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  );
}

/* ─── No Chats ──────────────────────────────────────────────── */

interface NoChatsProps {
  /** The viewer's role — copy adjusts accordingly. */
  role: 'brand' | 'influencer';
}

/**
 * Shown in the chat inbox when there are no conversations.
 */
export function NoChats({ role }: NoChatsProps) {
  const description =
    role === 'brand'
      ? 'Accept an application to start chatting with a creator.'
      : 'Once a brand accepts your application, your chat will appear here.';

  return (
    <Empty data-tour="empty-chats">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MessageSquare className="size-5" />
        </EmptyMedia>
        <EmptyTitle>No conversations yet</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/* ─── No Notifications ──────────────────────────────────────── */

/**
 * Shown in the notification centre when there are no unread notifications.
 */
export function NoNotifications() {
  return (
    <Empty data-tour="empty-notifications">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Bell className="size-5" />
        </EmptyMedia>
        <EmptyTitle>All caught up!</EmptyTitle>
        <EmptyDescription>
          New notifications will appear here.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/* ─── No Saved Items ────────────────────────────────────────── */

/**
 * Shown on the saved/bookmarked page when the user hasn't saved anything.
 */
export function NoSavedItems() {
  return (
    <Empty data-tour="empty-saved">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Bookmark className="size-5" />
        </EmptyMedia>
        <EmptyTitle>Nothing saved yet</EmptyTitle>
        <EmptyDescription>
          Items you bookmark will appear here for quick access.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
