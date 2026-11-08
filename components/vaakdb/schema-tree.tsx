"use client";

import { ChevronRight, Key, LoaderCircle, Plus, Table2 } from "lucide-react";
import { useState } from "react";
import type { SchemaTable } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SchemaTree({
  tables,
  onExpand,
  onInsert,
}: {
  tables: SchemaTable[];
  onExpand?: (name: string) => void;
  onInsert?: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggle = (name: string) => {
    const opening = !expanded.has(name);
    if (opening) {
      onExpand?.(name);
    }
    setExpanded((prev) => {
      const next = new Set(prev);
      if (opening) {
        next.add(name);
      } else {
        next.delete(name);
      }
      return next;
    });
  };

  return (
    <ul className="space-y-0.5 text-sm">
      {tables.map((table) => {
        const open = expanded.has(table.name);
        return (
          <li key={table.name}>
            <div className="group flex items-center rounded-md hover:bg-muted">
              <button
                type="button"
                onClick={() => toggle(table.name)}
                className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1 text-left"
                aria-expanded={open}
              >
                <ChevronRight
                  className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-90")}
                />
                <Table2 className="size-3.5 text-primary" />
                <span className="flex-1 truncate font-mono text-[13px]">
                  <span className="text-muted-foreground">{table.schema}.</span>
                  {table.table}
                </span>
                <span className="text-xs text-muted-foreground">
                  {table.columns ? table.columns.length : (table.estimatedRows ?? "")}
                </span>
              </button>
              {onInsert && (
                <button
                  type="button"
                  onClick={() => onInsert(table.name)}
                  className="mr-1 rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground focus:opacity-100"
                  aria-label={`Insert ${table.name}`}
                  title="Insert into message"
                >
                  <Plus className="size-3.5" />
                </button>
              )}
            </div>
            {open && (
              <ul className="ml-5 border-l py-0.5 pl-2">
                {!table.columns ? (
                  <li className="flex items-center gap-1.5 px-1.5 py-0.5 text-xs text-muted-foreground">
                    <LoaderCircle className="size-3 animate-spin" /> Loading columns…
                  </li>
                ) : (
                  table.columns.map((column) => (
                    <li key={column.name}>
                      <button
                        type="button"
                        onClick={() => onInsert?.(`${table.name}.${column.name}`)}
                        className="flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left hover:bg-muted"
                        title={onInsert ? "Insert into message" : undefined}
                      >
                        {column.primaryKey ? (
                          <Key className="size-3 text-amber-500" />
                        ) : (
                          <span className="size-3" />
                        )}
                        <span className="flex-1 truncate font-mono text-xs">{column.name}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{column.type}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
