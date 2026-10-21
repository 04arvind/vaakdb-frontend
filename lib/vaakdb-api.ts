import { DEMO_SCHEMA, demoAnswer } from "@/lib/demo";
import type {
  AskEvent,
  AskRequest,
  FeedbackRequest,
  QueryStage,
  SchemaTable,
} from "@/lib/types";

/**
 * Client-side mock of the VaakDB API.
 * Simulates the P2 agentic flow (context -> SQL -> guardrails -> execute -> answer)
 * so the UI can be built without the backend. Swap these functions for real
 * fetch calls when the API gateway is ready — the signatures stay the same.
 */

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

export async function ask(
  request: AskRequest,
  onEvent: (event: AskEvent) => void,
  signal?: AbortSignal,
) {
  const started = Date.now();
  const stages: QueryStage[] = [
    "queued",
    "retrieving_context",
    "generating_sql",
    "validating",
  ];
  for (const stage of stages) {
    onEvent({ type: "status", stage });
    await sleep(400, signal);
  }

  let result;
  try {
    result = demoAnswer(request.question);
  } catch (error) {
    // Guardrails rejected the query.
    onEvent({
      type: "error",
      message: error instanceof Error ? error.message : "Query rejected",
    });
    return;
  }

  onEvent({ type: "status", stage: "executing" });
  await sleep(500, signal);
  onEvent({ type: "status", stage: "answering" });
  await sleep(350, signal);

  onEvent({
    type: "result",
    result: { ...result, durationMs: Date.now() - started },
  });
  onEvent({ type: "status", stage: "done" });
}

export async function sendFeedback(request: FeedbackRequest) {
  // Mock: the real implementation POSTs to the audit & feedback store.
  void request;
  await sleep(100);
}

export async function fetchSchema(
  connectionId: string | null,
): Promise<{ tables: SchemaTable[] }> {
  void connectionId;
  await sleep(300);
  return { tables: DEMO_SCHEMA };
}
