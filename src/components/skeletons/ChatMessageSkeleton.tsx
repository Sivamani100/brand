export default function ChatMessageSkeleton() {
  return (
    <div className="space-y-4 py-4 w-full">
      {/* Left Message */}
      <div className="flex gap-3 justify-start items-end max-w-[70%]">
        <div className="h-8 w-8 rounded-full skeleton shrink-0" />
        <div className="space-y-1.5 w-full">
          <div className="h-10 rounded-2xl rounded-bl-none skeleton" />
          <div className="h-3 w-16 skeleton" />
        </div>
      </div>
      
      {/* Right Message */}
      <div className="flex gap-3 justify-end items-end max-w-[70%] ml-auto">
        <div className="space-y-1.5 w-full">
          <div className="h-14 rounded-2xl rounded-br-none skeleton bg-[var(--color-surface-3)]" />
          <div className="h-3 w-16 ml-auto skeleton" />
        </div>
        <div className="h-8 w-8 rounded-full skeleton shrink-0" />
      </div>

      {/* Left Message (Short) */}
      <div className="flex gap-3 justify-start items-end max-w-[50%]">
        <div className="h-8 w-8 rounded-full skeleton shrink-0" />
        <div className="space-y-1.5 w-full">
          <div className="h-8 rounded-2xl rounded-bl-none skeleton" />
          <div className="h-3 w-16 skeleton" />
        </div>
      </div>
    </div>
  );
}
