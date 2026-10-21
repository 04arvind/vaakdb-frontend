import { Database } from "lucide-react";

export function Greeting() {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Database className="size-6" />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">Ask your database anything</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        VaakDB turns your question into a safe, read-only SQL query, runs it, and explains the
        result.
      </p>
    </div>
  );
}
