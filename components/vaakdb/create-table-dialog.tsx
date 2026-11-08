"use client";

import { Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { OperationPreview } from "@/components/vaakdb/operation-preview";
import type { Envelope, OperationState } from "@/lib/types";
import {
  ApiError,
  cancelOperation,
  confirmOperation,
  createOperation,
  getOperation,
} from "@/lib/vaakdb-api";

const TYPES = [
  "text",
  "varchar(255)",
  "integer",
  "bigint",
  "numeric(12,2)",
  "boolean",
  "date",
  "timestamp",
  "uuid",
];

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

interface ColumnRow {
  key: number;
  name: string;
  type: string;
  primaryKey: boolean;
  nullable: boolean;
}

const firstColumns = (): ColumnRow[] => [
  { key: 1, name: "id", type: "integer", primaryKey: true, nullable: false },
  { key: 2, name: "", type: "text", primaryKey: false, nullable: true },
];

type Preview = Extract<Envelope, { type: "operation_preview" }>;

/**
 * Create a table in one of the allowed schemas. Uses the same safe flow as chat:
 * POST /operations creates a pending operation with a preview, nothing runs
 * until Confirm.
 */
export function CreateTableDialog({
  open,
  schemas,
  defaultSchema,
  onClose,
  onCreated,
}: {
  open: boolean;
  /** the user's existing schemas (suggestions); a new name creates a new schema */
  schemas: string[];
  defaultSchema: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [schema, setSchema] = useState("");
  const [table, setTable] = useState("");
  const [columns, setColumns] = useState<ColumnRow[]>(firstColumns);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [operation, setOperation] = useState<OperationState>({ status: "pending" });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      setSchema(schemas[0] ?? defaultSchema);
      setTable("");
      setColumns(firstColumns());
      setError(null);
      setPreview(null);
      setOperation({ status: "pending" });
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, schemas, defaultSchema]);

  const update = (key: number, patch: Partial<ColumnRow>) =>
    setColumns((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await createOperation({
        kind: "create_table",
        schema: schema.trim().toLowerCase(),
        table: table.trim(),
        columns: columns
          .filter((c) => c.name.trim())
          .map((c) => ({
            name: c.name.trim(),
            pg_type: c.type,
            primary_key: c.primaryKey,
            nullable: c.primaryKey ? false : c.nullable,
          })),
      });
      setPreview(result);
      setOperation({ status: "pending" });
    } catch (e) {
      if (e instanceof ApiError && e.code === "VALIDATION_ERROR") {
        const errors = (e.details?.errors as { msg: string }[] | undefined) ?? [];
        setError(errors.map((x) => x.msg.replace(/^Value error, /, "")).join(" ") || e.message);
      } else {
        setError(e instanceof Error ? e.message : "Could not create the table.");
      }
    } finally {
      setBusy(false);
    }
  };

  const opId = preview?.data.operation_id;

  const confirm = async () => {
    if (!opId) {
      return;
    }
    setOperation({ status: "confirming" });
    try {
      const result = await confirmOperation(opId);
      setOperation({ status: result.data.status, result });
      onCreated();
    } catch (e) {
      const expired = e instanceof ApiError && e.code === "OPERATION_EXPIRED";
      setOperation({
        status: expired ? "expired" : "failed",
        error: e instanceof Error ? e.message : "Failed.",
      });
    }
  };

  const cancel = async () => {
    if (!opId) {
      return;
    }
    setOperation({ status: "cancelling" });
    try {
      await cancelOperation(opId);
      setOperation({ status: "cancelled" });
    } catch (e) {
      setOperation({ status: "pending", error: e instanceof Error ? e.message : "Failed." });
    }
  };

  const refresh = async () => {
    if (!opId) {
      return;
    }
    try {
      const view = await getOperation(opId);
      setOperation((prev) => ({ ...prev, status: view.status }));
    } catch {
      // keep local state
    }
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-xl border bg-card p-0 text-foreground shadow-xl"
    >
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <h2 className="font-semibold">Create table</h2>
          <p className="text-xs text-muted-foreground">
            You&apos;ll see a preview first. Nothing is created until you confirm.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      {preview ? (
        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-4">
          <p className="text-sm">{preview.message}</p>
          <OperationPreview
            preview={preview.data}
            operation={operation}
            onConfirm={confirm}
            onCancel={cancel}
            onRefresh={refresh}
          />
          <div className="flex justify-end gap-2">
            {operation.status !== "executed" && operation.status !== "confirming" && (
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              >
                Back to edit
              </button>
            )}
            {operation.status === "executed" && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Done
              </button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Schema</span>
                <input
                  value={schema}
                  onChange={(e) => setSchema(e.target.value)}
                  required
                  list="vaakdb-own-schemas"
                  placeholder={defaultSchema}
                  className={inputClass}
                />
                <datalist id="vaakdb-own-schemas">
                  {schemas.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Table name
                </span>
                <input
                  value={table}
                  onChange={(e) => setTable(e.target.value)}
                  required
                  placeholder="students"
                  className={inputClass}
                />
              </label>
            </div>

            <div>
              <div className="mb-1.5 grid grid-cols-[1fr_9rem_3.5rem_4rem_2rem] gap-2 text-xs font-medium text-muted-foreground">
                <span>Column</span>
                <span>Type</span>
                <span className="text-center">Key</span>
                <span className="text-center">Nullable</span>
                <span />
              </div>
              <ul className="space-y-2">
                {columns.map((c) => (
                  <li
                    key={c.key}
                    className="grid grid-cols-[1fr_9rem_3.5rem_4rem_2rem] items-center gap-2"
                  >
                    <input
                      value={c.name}
                      onChange={(e) => update(c.key, { name: e.target.value })}
                      placeholder="column_name"
                      className={inputClass}
                      aria-label="Column name"
                    />
                    <select
                      value={c.type}
                      onChange={(e) => update(c.key, { type: e.target.value })}
                      className={inputClass}
                      aria-label="Column type"
                    >
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <input
                      type="checkbox"
                      checked={c.primaryKey}
                      onChange={(e) => update(c.key, { primaryKey: e.target.checked })}
                      className="mx-auto size-4"
                      aria-label="Primary key"
                    />
                    <input
                      type="checkbox"
                      checked={c.primaryKey ? false : c.nullable}
                      disabled={c.primaryKey}
                      onChange={(e) => update(c.key, { nullable: e.target.checked })}
                      className="mx-auto size-4"
                      aria-label="Nullable"
                    />
                    <button
                      type="button"
                      onClick={() => setColumns((prev) => prev.filter((x) => x.key !== c.key))}
                      disabled={columns.length === 1}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-30"
                      aria-label="Remove column"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() =>
                  setColumns((prev) => [
                    ...prev,
                    {
                      key: Math.max(0, ...prev.map((x) => x.key)) + 1,
                      name: "",
                      type: "text",
                      primaryKey: false,
                      nullable: true,
                    },
                  ])
                }
                className="mt-2 flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Plus className="size-4" /> Add column
              </button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 border-t px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Checking…" : "Preview"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
