import { CircleCheck, LoaderCircle } from "lucide-react";
import type { QueryStage } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS: { stage: QueryStage; label: string }[] = [
  { stage: "retrieving_context", label: "Reading schema context" },
  { stage: "generating_sql", label: "Writing SQL" },
  { stage: "validating", label: "Guardrails check" },
  { stage: "executing", label: "Running read-only query" },
  { stage: "answering", label: "Composing answer" },
];

const ORDER: QueryStage[] = ["queued", ...STEPS.map((s) => s.stage), "done"];

export function QueryStatus({ stage = "queued" }: { stage?: QueryStage }) {
  const current = ORDER.indexOf(stage);

  return (
    <ol className="space-y-1.5" aria-live="polite">
      {STEPS.map((step) => {
        const index = ORDER.indexOf(step.stage);
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={step.stage}
            className={cn(
              "flex items-center gap-2 text-sm transition-colors",
              done && "text-muted-foreground",
              active && "font-medium text-foreground",
              !done && !active && "text-muted-foreground/50",
            )}
          >
            {done ? (
              <CircleCheck className="size-4 text-success" />
            ) : active ? (
              <LoaderCircle className="size-4 animate-spin text-primary" />
            ) : (
              <span className="mx-[3px] size-2.5 rounded-full border border-current" />
            )}
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
