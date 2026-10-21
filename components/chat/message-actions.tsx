"use client";

import { Check, Copy, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { ChatMessage, Feedback } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MessageActions({
  message,
  onRetry,
  onFeedback,
}: {
  message: ChatMessage;
  onRetry: () => void;
  onFeedback: (feedback: Feedback) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggle = (value: Exclude<Feedback, null>) =>
    onFeedback(message.feedback === value ? null : value);

  return (
    <div className="flex items-center gap-0.5 text-muted-foreground">
      <ActionButton label={copied ? "Copied" : "Copy answer"} onClick={copy}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </ActionButton>
      <ActionButton
        label="Good answer"
        onClick={() => toggle("up")}
        active={message.feedback === "up"}
      >
        <ThumbsUp className="size-3.5" />
      </ActionButton>
      <ActionButton
        label="Bad answer"
        onClick={() => toggle("down")}
        active={message.feedback === "down"}
      >
        <ThumbsDown className="size-3.5" />
      </ActionButton>
      <ActionButton label="Regenerate" onClick={onRetry}>
        <RefreshCw className="size-3.5" />
      </ActionButton>
      {message.result?.durationMs !== undefined && (
        <span className="ml-2 text-xs">{(message.result.durationMs / 1000).toFixed(1)}s</span>
      )}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "rounded-md p-1.5 hover:bg-muted hover:text-foreground",
        active && "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}
