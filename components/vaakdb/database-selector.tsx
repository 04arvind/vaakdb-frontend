"use client";

import { ChevronDown, Database } from "lucide-react";
import {
  setActiveConnection,
  useActiveConnection,
  useConnections,
  useHydrated,
} from "@/hooks/use-active-chat";

/** Picks the connection new chats run against. Existing chats keep their own. */
export function DatabaseSelector({ disabled }: { disabled?: boolean }) {
  const hydrated = useHydrated();
  const connections = useConnections();
  const active = useActiveConnection();

  return (
    <label className="relative flex items-center gap-2 rounded-lg border bg-card py-1.5 pr-8 pl-2.5 text-sm hover:bg-muted">
      <Database className="size-3.5 shrink-0 text-primary" />
      <select
        value={hydrated ? (active?.id ?? "") : ""}
        onChange={(e) => setActiveConnection(e.target.value || null)}
        disabled={disabled || connections.length === 0}
        className="max-w-44 cursor-pointer appearance-none truncate bg-transparent outline-none disabled:cursor-default"
        aria-label="Database"
      >
        {(!hydrated || connections.length === 0) && <option value="">Select database</option>}
        {hydrated &&
          connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-muted-foreground" />
    </label>
  );
}
