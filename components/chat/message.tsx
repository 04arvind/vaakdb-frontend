"use client";

import { CircleAlert, Database, FileText, RefreshCw } from "lucide-react";
import { memo } from "react";
import { MessageActions } from "@/components/chat/message-actions";
import { QueryStatus } from "@/components/vaakdb/query-status";
import { ResponseView } from "@/components/vaakdb/response-view";
import { isPending } from "@/hooks/use-vaakdb-chat";
import type { ChatMessage, Feedback } from "@/lib/types";

export interface MessageHandlers {
  onRetry: (id: string) => void;
  onFeedback: (id: string, feedback: Feedback) => void;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onRefresh: (id: string) => void;
}

export const Message = memo(function Message({
  message,
  onRetry,
  onFeedback,
  onConfirm,
  onCancel,
  onRefresh,
}: { message: ChatMessage } & MessageHandlers) {
  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {message.attachment && (
          <span className="flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-xs text-muted-foreground">
            <FileText className="size-3.5" />
            {message.attachment.name}
          </span>
        )}
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] whitespace-pre-wrap text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  const pending = isPending(message);
  const response = message.response;

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-card text-primary">
        <Database className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        {pending && <QueryStatus steps={message.steps} />}

        {message.error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="flex-1">{message.error.message}</p>
            <button
              type="button"
              onClick={() => onRetry(message.id)}
              className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RefreshCw className="size-3" /> Retry
            </button>
          </div>
        )}

        {response && response.type !== "error" && (
          <>
            <ResponseView
              envelope={response}
              operation={message.operation}
              onConfirm={() => onConfirm(message.id)}
              onCancel={() => onCancel(message.id)}
              onRefresh={() => onRefresh(message.id)}
            />
            {!pending && (
              <MessageActions
                message={message}
                onRetry={() => onRetry(message.id)}
                onFeedback={(feedback) => onFeedback(message.id, feedback)}
                canRegenerate={response.type !== "operation_preview"}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
});
