"use client";

import { LoaderCircle, RefreshCw, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SchemaTree } from "@/components/vaakdb/schema-tree";
import type { SchemaTable } from "@/lib/types";
import { cn } from "@/lib/utils";
import { fetchSchema } from "@/lib/vaakdb-api";

export function SchemaSidebar({
  open,
  connectionId,
  onClose,
  onInsert,
}: {
  open: boolean;
  connectionId: string | null;
  onClose: () => void;
  onInsert?: (text: string) => void;
}) {
  const [tables, setTables] = useState<SchemaTable[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    fetchSchema(connectionId)
      .then((data) => {
        if (!cancelled) {
          setTables(data.tables);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load schema");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, connectionId, reloadKey]);

  const query = filter.trim().toLowerCase();
  const filtered = tables?.filter(
    (t) =>
      !query ||
      t.name.toLowerCase().includes(query) ||
      t.columns.some((c) => c.name.toLowerCase().includes(query)),
  );

  return (
    <>
      <div
        className={cn("fixed inset-0 z-30 bg-black/40 lg:hidden", open ? "block" : "hidden")}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 w-72 flex-col border-l bg-sidebar lg:static lg:z-auto",
          open ? "flex" : "hidden",
        )}
        aria-label="Database schema"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <span className="text-sm font-semibold">Schema</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setTables(null);
                setReloadKey((k) => k + 1);
              }}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Reload schema"
            >
              <RefreshCw className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close schema"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="border-b p-3">
          <label className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter tables or columns"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {error ? (
            <p className="p-2 text-sm text-destructive">{error}</p>
          ) : !filtered ? (
            <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Loading schema…
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">No matching tables.</p>
          ) : (
            <SchemaTree tables={filtered} onInsert={onInsert} />
          )}
        </div>
        {onInsert && (
          <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
            Click a column to add it to your question.
          </p>
        )}
      </aside>
    </>
  );
}
