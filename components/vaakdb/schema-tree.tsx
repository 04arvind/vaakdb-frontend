"use client";

import { ChevronRight, Key, Table2 } from "lucide-react";
import { useState } from "react";
import type { SchemaTable } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SchemaTree({
  tables,
  onInsert,
}: {
  tables: SchemaTable[];
  onInsert?: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggle = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });

  return (
    <ul className="space-y-0.5 text-sm">
      {tables.map((table) => {
        const open = expanded.has(table.name);
        return (
          <li key={table.name}>
            <button
              type="button"
              onClick={() => toggle(table.name)}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left hover:bg-muted"
              aria-expanded={open}
            >
              <ChevronRight
                className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-90")}
              />
              <Table2 className="size-3.5 text-primary" />
              <span className="flex-1 truncate font-mono text-[13px]">{table.name}</span>
              <span className="text-xs text-muted-foreground">{table.columns.length}</span>
            </button>
            {open && (
              <ul className="ml-5 border-l py-0.5 pl-2">
                {table.columns.map((column) => (
                  <li key={column.name}>
                    <button
                      type="button"
                      onClick={() => onInsert?.(`${table.name}.${column.name}`)}
                      className="flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left hover:bg-muted"
                      title={onInsert ? "Insert into question" : undefined}
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
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
