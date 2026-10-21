"use client";

import { CircleAlert, Database, RefreshCw } from "lucide-react";
import { memo } from "react";
import { MessageActions } from "@/components/chat/message-actions";
import { QueryStatus } from "@/components/vaakdb/query-status";
import { ResultsTable } from "@/components/vaakdb/results-table";
import { SqlPreview } from "@/components/vaakdb/sql-preview";
import { isPending } from "@/hooks/use-vaakdb-chat";
import type { ChatMessage, Feedback } from "@/lib/types";

export const Message = memo(function Message({
  message,
  onRetry,
  onFeedback,
}: {
  message: ChatMessage;
  onRetry: (id: string) => void;
  onFeedback: (id: string, feedback: Feedback) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] whitespace-pre-wrap text-primary-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  const { result } = message;

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-card text-primary">
        <Database className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        {isPending(message) && <QueryStatus stage={message.stage} />}

        {message.error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="flex-1">{message.error}</p>
            <button
              type="button"
              onClick={() => onRetry(message.id)}
              className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RefreshCw className="size-3" /> Retry
            </button>
          </div>
        )}

        {result && (
          <>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{result.answer}</p>
            {result.sql && <SqlPreview sql={result.sql} />}
            {result.columns && result.rows && result.rows.length > 0 && (
              <ResultsTable columns={result.columns} rows={result.rows} />
            )}
            {result.sources && result.sources.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                Sources:
                {result.sources.map((source) => (
                  <span key={source} className="rounded-md border bg-muted px-1.5 py-0.5 font-mono">
                    {source}
                  </span>
                ))}
              </div>
            )}
            {!isPending(message) && (
              <MessageActions
                message={message}
                onRetry={() => onRetry(message.id)}
                onFeedback={(feedback) => onFeedback(message.id, feedback)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
});
