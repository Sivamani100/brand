import React from "react";

export function NotificationItemSkeleton() {
  return (
    <div className="flex gap-4 p-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl">
      <div className="h-10 w-10 rounded-full skeleton shrink-0" />
      <div className="space-y-2 w-full">
        <div className="h-4 w-1/4 skeleton" />
        <div className="h-3 w-5/6 skeleton" />
        <div className="h-2.5 w-16 skeleton" />
      </div>
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="space-y-6 pb-6 border-b border-[var(--color-border)]">
      {/* Cover Banner */}
      <div className="h-48 w-full rounded-xl skeleton" />
      
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-16 sm:px-6">
        {/* Avatar */}
        <div className="h-28 w-28 rounded-full border-4 border-black skeleton shrink-0" />
        <div className="space-y-3 w-full sm:pb-3">
          <div className="h-6 w-1/3 skeleton" />
          <div className="h-4 w-1/4 skeleton" />
        </div>
      </div>
    </div>
  );
}

export function ReviewItemSkeleton() {
  return (
    <div className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full skeleton" />
          <div className="h-4 w-24 skeleton" />
        </div>
        <div className="h-4 w-20 skeleton" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3.5 w-full skeleton" />
        <div className="h-3.5 w-3/4 skeleton" />
      </div>
    </div>
  );
}

export function PortfolioItemSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] space-y-3">
      <div className="h-40 w-full skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-2/3 skeleton" />
        <div className="h-3 w-1/3 skeleton" />
      </div>
    </div>
  );
}

export function MilestoneSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl">
      <div className="space-y-2">
        <div className="h-4 w-32 skeleton" />
        <div className="h-3 w-20 skeleton" />
      </div>
      <div className="h-7 w-20 rounded-md skeleton" />
    </div>
  );
}

export function ActivityFeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex gap-3">
          <div className="h-2 w-2 rounded-full skeleton mt-1.5 shrink-0" />
          <div className="space-y-1 w-full">
            <div className="h-3.5 w-5/6 skeleton" />
            <div className="h-2.5 w-20 skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatRoomListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-transparent">
      <div className="h-10 w-10 rounded-full skeleton shrink-0" />
      <div className="space-y-2 w-full">
        <div className="flex justify-between">
          <div className="h-4 w-24 skeleton" />
          <div className="h-3 w-10 skeleton" />
        </div>
        <div className="h-3 w-5/6 skeleton" />
      </div>
    </div>
  );
}

export function AdminTableRowSkeleton() {
  return (
    <div className="flex justify-between items-center py-3.5 border-b border-[var(--color-border)] px-4">
      <div className="h-4 w-1/4 skeleton" />
      <div className="h-4 w-1/6 skeleton" />
      <div className="h-4 w-1/6 skeleton" />
      <div className="h-4 w-20 rounded-full skeleton" />
    </div>
  );
}

export function SearchResultSkeleton() {
  return (
    <div className="space-y-2 py-3">
      <div className="h-4 w-1/3 skeleton" />
      <div className="h-3 w-full skeleton" />
      <div className="h-3 w-2/3 skeleton" />
    </div>
  );
}

export function OnboardingStepSkeleton() {
  return (
    <div className="max-w-md mx-auto p-8 border border-[var(--color-border)] bg-[var(--color-surface)] rounded-xl space-y-6">
      <div className="space-y-2 text-center">
        <div className="h-6 w-1/2 mx-auto skeleton" />
        <div className="h-3.5 w-2/3 mx-auto skeleton" />
      </div>
      <div className="space-y-4 pt-4">
        <div className="h-10 w-full rounded-full skeleton" />
        <div className="h-10 w-full rounded-full skeleton" />
        <div className="h-10 w-full rounded-full skeleton" />
      </div>
      <div className="flex justify-between pt-6">
        <div className="h-10 w-24 rounded-full skeleton" />
        <div className="h-10 w-24 rounded-full skeleton" />
      </div>
    </div>
  );
}
