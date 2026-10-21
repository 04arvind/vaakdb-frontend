"use client";

import { Download, Table2 } from "lucide-react";
import { useState } from "react";
import type { CellValue } from "@/lib/types";
import { cn, formatCell, toCsv } from "@/lib/utils";

const PREVIEW_ROWS = 10;

export function ResultsTable({ columns, rows }: { columns: string[]; rows: CellValue[][] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, PREVIEW_ROWS);

  const download = () => {
    const blob = new Blob([toCsv(columns, rows)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vaakdb-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex items-center justify-between border-b bg-muted/60 px-3 py-1.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Table2 className="size-3.5" />
          {rows.length} {rows.length === 1 ? "row" : "rows"}
        </span>
        <button
          type="button"
          onClick={download}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Download className="size-3.5" />
          CSV
        </button>
      </div>
      <div className="max-h-96 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-card">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="border-b px-3 py-2 text-left font-mono text-xs font-medium whitespace-nowrap text-muted-foreground"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, r) => (
              <tr key={r} className="hover:bg-muted/50">
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className={cn(
                      "border-b px-3 py-1.5 whitespace-nowrap last:border-b-0",
                      typeof cell === "number" && "text-right tabular-nums",
                      cell === null && "text-muted-foreground italic",
                    )}
                  >
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > PREVIEW_ROWS && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full border-t py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {expanded ? "Show less" : `Show all ${rows.length} rows`}
        </button>
      )}
    </div>
  );
}
