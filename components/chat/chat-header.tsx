"use client";

import { Table2 } from "lucide-react";
import { DatabaseSelector } from "@/components/vaakdb/database-selector";
import { cn } from "@/lib/utils";

export function ChatHeader({
  title,
  schemaOpen,
  onToggleSchema,
  lockDatabase,
}: {
  title: string;
  schemaOpen: boolean;
  onToggleSchema: () => void;
  lockDatabase: boolean;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <h1 className="min-w-0 flex-1 truncate text-sm font-medium">{title}</h1>
      <DatabaseSelector disabled={lockDatabase} />
      <button
        type="button"
        onClick={onToggleSchema}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm hover:bg-muted",
          schemaOpen ? "bg-accent text-accent-foreground" : "bg-card",
        )}
        aria-pressed={schemaOpen}
      >
        <Table2 className="size-3.5" />
        <span className="hidden sm:inline">Schema</span>
      </button>
    </header>
  );
}
