"use client";

import {
  CircleAlert,
  CircleCheck,
  Clock,
  LoaderCircle,
  ShieldAlert,
  TriangleAlert,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ResultsTable } from "@/components/vaakdb/results-table";
import { SqlPreview } from "@/components/vaakdb/sql-preview";
import type { OperationPreviewData, OperationState } from "@/lib/types";
import { cn, toRows } from "@/lib/utils";

const TITLES: Record<OperationPreviewData["operation_type"], string> = {
  create_table: "Create table",
  insert_rows: "Insert rows",
  update_rows: "Update rows",
  delete_rows: "Delete rows",
};

function useRemaining(expiresAt: string, active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return Math.max(0, new Date(expiresAt).getTime() - now);
}

function formatRemaining(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Preview of a pending write. Nothing has been changed in the database yet:
 * Confirm calls POST /operations/{id}/confirm, Cancel discards it.
 */
export function OperationPreview({
  preview,
  operation,
  onConfirm,
  onCancel,
  onRefresh,
}: {
  preview: OperationPreviewData;
  operation: OperationState;
  onConfirm: () => void;
  onCancel: () => void;
  onRefresh: () => void;
}) {
  const pending = operation.status === "pending";
  const busy = operation.status === "confirming" || operation.status === "cancelling";
  const remaining = useRemaining(preview.expires_at, pending);
  const expired = operation.status === "expired" || (pending && remaining === 0);
  const target = `${preview.target.schema}.${preview.target.table}`;
  const sampleColumns = preview.columns.map((c) => c.name);
  const destructive = preview.destructive.length > 0;

  // After a reload, ask the server what happened to this operation.
  useEffect(() => {
    if (pending) {
      onRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border",
        destructive && pending && "border-destructive/40",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2">
        <span className="text-sm font-medium">
          {TITLES[preview.operation_type]} · <span className="font-mono">{target}</span>
        </span>
        <StatusBadge state={operation} expired={expired} remaining={remaining} />
      </div>

      <div className="space-y-3 p-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {preview.total_rows !== null && (
            <span>
              <b className="text-foreground">{preview.rows_to_write}</b> of {preview.total_rows} rows
              will be written
            </span>
          )}
          {preview.affected_rows !== null && (
            <span>
              <b className="text-foreground">{preview.affected_rows}</b> rows affected
            </span>
          )}
          {preview.mode && preview.operation_type === "create_table" && <span>mode: {preview.mode}</span>}
        </div>

        {destructive && (
          <Notice tone="danger" icon={<ShieldAlert className="size-4" />}>
            {preview.destructive.join(" · ")}
          </Notice>
        )}
        {preview.warnings.map((w) => (
          <Notice key={w} tone="warn" icon={<TriangleAlert className="size-4" />}>
            {w}
          </Notice>
        ))}

        {preview.ddl.length > 0 && <SqlPreview sql={preview.ddl.join(";\n\n") + ";"} defaultOpen />}

        {preview.column_mapping.some((m) => m.source) && (
          <details className="text-sm">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
              Column mapping ({preview.column_mapping.length})
            </summary>
            <ul className="mt-1.5 space-y-0.5 font-mono text-xs">
              {preview.column_mapping.map((m) => (
                <li key={m.column}>
                  <span className="text-muted-foreground">{m.source ?? "—"}</span> → {m.column}{" "}
                  <span className="text-muted-foreground">({m.type})</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        {preview.sample_rows.length > 0 && (
          <ResultsTable columns={sampleColumns} rows={toRows(sampleColumns, preview.sample_rows)} />
        )}

        {preview.failed_rows.length > 0 && (
          <details className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm" open>
            <summary className="cursor-pointer font-medium">
              {preview.failed_row_count} row(s) will be skipped
            </summary>
            <ul className="mt-1.5 space-y-0.5 text-xs">
              {preview.failed_rows.slice(0, 20).map((f, i) => (
                <li key={`${f.row}-${f.column}-${i}`}>
                  Row {f.row}
                  {f.column ? <> · <span className="font-mono">{f.column}</span></> : null}
                  {f.value !== null ? <> = &quot;{f.value}&quot;</> : null}: {f.error}
                </li>
              ))}
            </ul>
          </details>
        )}

        {operation.error && (
          <Notice tone="danger" icon={<CircleAlert className="size-4" />}>
            {operation.error}
          </Notice>
        )}
        {operation.result && (
          <Notice tone="ok" icon={<CircleCheck className="size-4" />}>
            {operation.result.message}
          </Notice>
        )}

        {(pending || busy) && !expired && (
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              {operation.status === "cancelling" ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <X className="size-3.5" />
              )}
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className={cn(
                "flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50",
                destructive ? "bg-destructive" : "bg-primary",
              )}
            >
              {operation.status === "confirming" && <LoaderCircle className="size-3.5 animate-spin" />}
              Confirm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({
  state,
  expired,
  remaining,
}: {
  state: OperationState;
  expired: boolean;
  remaining: number;
}) {
  if (expired) {
    return <span className="text-xs text-muted-foreground">Expired · ask again</span>;
  }
  const labels: Partial<Record<OperationState["status"], [string, string]>> = {
    executed: ["Done", "text-success"],
    cancelled: ["Cancelled", "text-muted-foreground"],
    failed: ["Failed · rolled back", "text-destructive"],
    confirmed: ["Running…", "text-muted-foreground"],
    confirming: ["Running…", "text-muted-foreground"],
    cancelling: ["Cancelling…", "text-muted-foreground"],
  };
  const label = labels[state.status];
  if (label) {
    return <span className={cn("text-xs font-medium", label[1])}>{label[0]}</span>;
  }
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground" title="Time left to confirm">
      <Clock className="size-3.5" /> {formatRemaining(remaining)}
    </span>
  );
}

function Notice({
  tone,
  icon,
  children,
}: {
  tone: "warn" | "danger" | "ok";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md px-3 py-2 text-sm",
        tone === "warn" && "bg-amber-500/10 [&>svg]:text-amber-600",
        tone === "danger" && "bg-destructive/10 [&>svg]:text-destructive",
        tone === "ok" && "bg-success/10 [&>svg]:text-success",
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p className="flex-1">{children}</p>
    </div>
  );
}
