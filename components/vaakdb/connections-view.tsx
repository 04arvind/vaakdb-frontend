"use client";

import { Check, Database, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConnectionDialog } from "@/components/vaakdb/connection-dialog";
import {
  removeConnection,
  setActiveConnection,
  useActiveConnection,
  useConnections,
  useHydrated,
} from "@/hooks/use-active-chat";
import { cn } from "@/lib/utils";

export function ConnectionsView() {
  const hydrated = useHydrated();
  const connections = useConnections();
  const active = useActiveConnection();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Connections</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Databases VaakDB can query. New chats use the selected connection.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="size-4" /> Add connection
          </button>
        </div>

        <ul className="mt-6 space-y-2">
          {(!hydrated || connections.length === 0) && (
            <li className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <span className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Database className="size-4" />
              </span>
              <div className="flex-1">
                <p className="font-medium">Demo database</p>
                <p className="text-sm text-muted-foreground">
                  Sample e-commerce data (customers, products, orders). Used until you add a
                  connection.
                </p>
              </div>
            </li>
          )}
          {hydrated &&
            connections.map((c) => {
              const selected = active?.id === c.id;
              return (
                <li
                  key={c.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-card p-4",
                    selected && "border-primary/50 ring-2 ring-primary/10",
                  )}
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Database className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {c.engine}://{c.user}@{c.host}
                      {c.port ? `:${c.port}` : ""}/{c.database}
                    </p>
                  </div>
                  {selected ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-success">
                      <Check className="size-3.5" /> Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveConnection(c.id)}
                      className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted"
                    >
                      Use
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeConnection(c.id)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label={`Remove ${c.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
        </ul>
      </div>
      <ConnectionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
