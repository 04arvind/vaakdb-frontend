"use client";

import { ArrowDown } from "lucide-react";
import { Message } from "@/components/chat/message";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import type { ChatMessage, Feedback } from "@/lib/types";

export function Messages({
  messages,
  onRetry,
  onFeedback,
}: {
  messages: ChatMessage[];
  onRetry: (id: string) => void;
  onFeedback: (id: string, feedback: Feedback) => void;
}) {
  const { containerRef, endRef, isAtBottom, scrollToBottom } = useScrollToBottom();

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={containerRef} className="h-full overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
          {messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              onRetry={onRetry}
              onFeedback={onFeedback}
            />
          ))}
          <div ref={endRef} className="h-px shrink-0" />
        </div>
      </div>
      {!isAtBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom()}
          className="absolute bottom-3 left-1/2 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border bg-card shadow-md hover:bg-muted"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="size-4" />
        </button>
      )}
    </div>
  );
}
