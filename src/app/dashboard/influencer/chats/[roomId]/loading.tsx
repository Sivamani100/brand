import ChatMessageSkeleton from "@/components/skeletons/ChatMessageSkeleton";

export default function InfluencerChatRoomLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full skeleton" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 skeleton" />
            <div className="h-3 w-16 skeleton" />
          </div>
        </div>
        <div className="h-6 w-20 rounded-full skeleton" />
      </div>

      {/* Messages Scroll Area Skeleton */}
      <div className="flex-1 overflow-y-auto space-y-4">
        <ChatMessageSkeleton />
      </div>

      {/* Input Area Skeleton */}
      <div className="h-12 w-full rounded-full skeleton shrink-0" />
    </div>
  );
}
