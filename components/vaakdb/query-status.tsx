import { CircleCheck, LoaderCircle } from "lucide-react";
import type { ChatStep } from "@/lib/types";

/** Live progress of a chat request, as reported by the backend's status events. */
export function QueryStatus({ steps = [] }: { steps?: ChatStep[] }) {
  const done = steps.filter((s) => s.stage !== "respond");

  return (
    <ol className="space-y-1.5" aria-live="polite">
      {done.map((step, i) => (
        <li key={`${step.stage}-${i}`} className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleCheck className="size-4 text-success" />
          {step.message}
        </li>
      ))}
      <li className="flex items-center gap-2 text-sm font-medium text-foreground">
        <LoaderCircle className="size-4 animate-spin text-primary" />
        {done.length === 0 ? "Understanding your request" : "Working…"}
      </li>
    </ol>
  );
}
