"use client";

import { Key, Link2 } from "lucide-react";
import { OperationPreview } from "@/components/vaakdb/operation-preview";
import { ResultsTable } from "@/components/vaakdb/results-table";
import { SqlPreview } from "@/components/vaakdb/sql-preview";
import type { Envelope, OperationState } from "@/lib/types";
import { toRows } from "@/lib/utils";

/** Renders one backend response envelope (everything except errors). */
export function ResponseView({
  envelope,
  operation,
  onConfirm,
  onCancel,
  onRefresh,
}: {
  envelope: Envelope;
  operation?: OperationState;
  onConfirm: () => void;
  onCancel: () => void;
  onRefresh: () => void;
}) {
  const text = envelope.message ? (
    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{envelope.message}</p>
  ) : null;

  switch (envelope.type) {
    case "schema_list":
      return (
        <>
          {text}
          <ResultsTable
            columns={["schema", "tables"]}
            rows={envelope.data.items.map((i) => [i.schema, i.table_count])}
          />
        </>
      );
    case "table_list":
      return (
        <>
          {text}
          {envelope.data.items.length > 0 && (
            <ResultsTable
              columns={["table", "kind", "≈ rows"]}
              rows={envelope.data.items.map((i) => [i.table, i.kind, i.estimated_rows])}
            />
          )}
        </>
      );
    case "table_description": {
      const d = envelope.data;
      const sampleColumns = d.columns.map((c) => c.name);
      return (
        <>
          {text}
          <div className="overflow-hidden rounded-lg border">
            <div className="border-b bg-muted/60 px-3 py-1.5 font-mono text-xs font-medium text-muted-foreground">
              {d.schema}.{d.table} · {d.row_count ?? "?"} rows
              {d.row_count_is_estimate ? " (estimate)" : ""}
            </div>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {d.columns.map((c) => (
                  <tr key={c.name} className="border-b last:border-b-0">
                    <td className="px-3 py-1.5 font-mono text-[13px] whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        {c.primary_key ? <Key className="size-3 text-amber-500" /> : <span className="size-3" />}
                        {c.name}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{c.type}</td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">
                      {c.nullable ? "nullable" : "not null"}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-muted-foreground">
                      {c.references && (
                        <span className="flex items-center gap-1 font-mono">
                          <Link2 className="size-3" /> {c.references}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {d.sample_rows.length > 0 && (
            <ResultsTable columns={sampleColumns} rows={toRows(sampleColumns, d.sample_rows)} />
          )}
        </>
      );
    }
    case "query_result": {
      const d = envelope.data;
      return (
        <>
          {text}
          {d.sql && <SqlPreview sql={d.sql} />}
          {d.columns.length > 0 && d.rows.length > 0 && (
            <ResultsTable columns={d.columns} rows={toRows(d.columns, d.rows)} />
          )}
          {d.truncated && (
            <p className="text-xs text-muted-foreground">Only the first rows are shown.</p>
          )}
        </>
      );
    }
    case "operation_preview":
      return (
        <>
          {text}
          <OperationPreview
            preview={envelope.data}
            operation={operation ?? { status: "pending" }}
            onConfirm={onConfirm}
            onCancel={onCancel}
            onRefresh={onRefresh}
          />
        </>
      );
    case "operation_result":
    case "message":
      return text;
    default:
      return null;
  }
}
