"use client";

import { X } from "lucide-react";
import { type SubmitEvent, useEffect, useRef } from "react";
import { addConnection } from "@/hooks/use-active-chat";
import type { DbEngine } from "@/lib/types";

const ENGINES: { value: DbEngine; label: string; port: number }[] = [
  { value: "postgres", label: "PostgreSQL", port: 5432 },
  { value: "mysql", label: "MySQL", port: 3306 },
  { value: "mssql", label: "SQL Server", port: 1433 },
  { value: "sqlite", label: "SQLite", port: 0 },
];

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export function ConnectionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      formRef.current?.reset();
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const engine = data.get("engine") as DbEngine;
    addConnection({
      name: String(data.get("name")).trim(),
      engine,
      host: String(data.get("host")).trim(),
      port: Number(data.get("port")) || (ENGINES.find((e) => e.value === engine)?.port ?? 0),
      database: String(data.get("database")).trim(),
      user: String(data.get("user")).trim(),
    });
    onClose();
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border bg-card p-0 text-foreground shadow-xl"
    >
      <form ref={formRef} onSubmit={submit}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Add connection</h2>
            <p className="text-xs text-muted-foreground">
              VaakDB only runs read-only queries against this database.
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

        <div className="grid grid-cols-2 gap-3 px-5 py-4">
          <Field label="Name" className="col-span-2">
            <input name="name" required placeholder="Sales replica" className={inputClass} />
          </Field>
          <Field label="Engine">
            <select name="engine" defaultValue="postgres" className={inputClass}>
              {ENGINES.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Port">
            <input name="port" type="number" min={0} placeholder="5432" className={inputClass} />
          </Field>
          <Field label="Host" className="col-span-2">
            <input name="host" required placeholder="replica.internal" className={inputClass} />
          </Field>
          <Field label="Database">
            <input name="database" required placeholder="shop" className={inputClass} />
          </Field>
          <Field label="Read-only user">
            <input name="user" required placeholder="vaakdb_reader" className={inputClass} />
          </Field>
          <p className="col-span-2 text-xs text-muted-foreground">
            Passwords are configured on the VaakDB server and never stored in the browser.
          </p>
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
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Save connection
          </button>
        </div>
      </form>
    </dialog>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
