"use client";

import { CircleAlert, CircleCheck, Database, LoaderCircle, Plus, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { CreateTableDialog } from "@/components/vaakdb/create-table-dialog";
import { useAuth } from "@/lib/auth";
import type { ConnectionStatus, SchemaListData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { API_URL, ApiError, connectionStatus, listSchemas } from "@/lib/vaakdb-api";

/**
 * The signed-in user's private workspace: their own schemas and tables (nobody
 * else can see them), a "Create table" form, and the server's connection status.
 */
export function ConnectionsView() {
  const { user } = useAuth();
  const [schemas, setSchemas] = useState<SchemaListData["items"] | null>(null);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listSchemas()
      .then((res) => !cancelled && setSchemas(res.data.items))
      .catch((e: unknown) => !cancelled && setError(e instanceof ApiError ? e.message : "Failed to load."));
    connectionStatus()
      .then((res) => !cancelled && setStatus(res))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">My workspace</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your private schemas and tables{user && <> ({user.email})</>}. Only you can see
              or change them.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="size-4" /> Create table
          </button>
        </div>

        <h2 className="mt-8 mb-2 text-sm font-medium">Your schemas</h2>
        {error ? (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <CircleAlert className="size-4" /> {error}
          </p>
        ) : !schemas ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Loading…
          </p>
        ) : schemas.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Your workspace is empty. Use <b>Create table</b>, or attach a PDF, CSV or Excel file
            in the chat and ask to store it. Schemas are created automatically
            {status ? <> (the default one is <span className="font-mono">{status.default_schema}</span>)</> : null}.
          </p>
        ) : (
          <ul className="space-y-2">
            {schemas.map((s) => (
              <li key={s.schema} className="flex items-center gap-3 rounded-xl border bg-card p-4">
                <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Database className="size-4" />
                </span>
                <div className="flex-1">
                  <p className="font-mono font-medium">{s.schema}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.table_count} {s.table_count === 1 ? "table" : "tables"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {status && (
          <>
            <h2 className="mt-8 mb-2 text-sm font-medium">
              Server · <span className="font-mono font-normal">{API_URL}</span>
            </h2>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card text-sm">
              <StatusRow label="App database (meta_db)" ok={status.meta_db} />
              <StatusRow
                label="Target database · reads"
                ok={status.target_read.ok}
                detail={status.target_read.role && `${status.target_read.role}@${status.target_read.database}`}
              />
              <StatusRow
                label="Target database · writes"
                ok={status.target_write.ok}
                detail={status.target_write.role && `${status.target_write.role}@${status.target_write.database}`}
              />
            </ul>
            {status.warnings.map((w) => (
              <p key={w} className="mt-2 flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" /> {w}
              </p>
            ))}
          </>
        )}
      </div>
      <CreateTableDialog
        open={dialogOpen}
        schemas={(schemas ?? []).map((s) => s.schema)}
        defaultSchema={status?.default_schema ?? "main"}
        onClose={() => setDialogOpen(false)}
        onCreated={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      {ok ? (
        <CircleCheck className="size-4 text-success" />
      ) : (
        <CircleAlert className="size-4 text-destructive" />
      )}
      <span className="flex-1">{label}</span>
      <span className={cn("font-mono text-xs", ok ? "text-muted-foreground" : "text-destructive")}>
        {ok ? detail : "unreachable"}
      </span>
    </li>
  );
}
