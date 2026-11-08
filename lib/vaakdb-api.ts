import { authStore } from "@/lib/store";
import type {
  ApiErrorBody,
  ConnectionStatus,
  Envelope,
  OperationResultEnvelope,
  OperationView,
  SchemaColumn,
  SchemaListData,
  SchemaTable,
  TableDescriptionData,
  TableListData,
  TokenResponse,
  UploadResult,
  User,
} from "@/lib/types";

/**
 * Client for the VaakDB backend (FastAPI, /api/v1).
 * Base URL: NEXT_PUBLIC_API_URL (inlined at build time), e.g. http://localhost:8000/api/v1
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1").replace(
  /\/+$/,
  "",
);

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let unauthorizedHandler: (() => void) | null = null;

/** Called on any 401 from an authenticated request (token expired or revoked). */
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

function authHeaders(): Record<string, string> {
  const token = authStore.get().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: { error?: ApiErrorBody } | null = null;
  try {
    body = await res.json();
  } catch {
    // not JSON (proxy error page etc.)
  }
  const err = body?.error;
  return new ApiError(
    err?.code ?? `HTTP_${res.status}`,
    err?.message ?? `Request failed (${res.status}).`,
    res.status,
    err?.details,
  );
}

async function send(path: string, init: RequestInit = {}, auth = true): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...(auth ? authHeaders() : {}), ...(init.headers ?? {}) },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError(
      "NETWORK_ERROR",
      `Can't reach the VaakDB server at ${API_URL}. Is the backend running?`,
      0,
    );
  }
  if (!res.ok) {
    const error = await toApiError(res);
    if (res.status === 401 && auth) {
      unauthorizedHandler?.();
    }
    throw error;
  }
  return res;
}

async function json<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const res = await send(path, init, auth);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const jsonBody = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// ---- auth ----------------------------------------------------------------------

export const login = (email: string, password: string) =>
  json<TokenResponse>("/auth/login", jsonBody({ email, password }), false);

export const register = (email: string, password: string) =>
  json<User>("/auth/register", jsonBody({ email, password }), false);

export const fetchMe = () => json<User>("/auth/me");

export async function healthCheck(): Promise<boolean> {
  try {
    await send("/health", {}, false);
    return true;
  } catch {
    return false;
  }
}

// ---- chat (Server-Sent Events) -------------------------------------------------

export interface ChatRequest {
  message: string;
  upload_id?: string | null;
  conversation_id?: string | null;
}

export type ChatEvent =
  | { event: "status"; data: { stage: string; message: string } }
  | { event: "result"; data: Envelope }
  | { event: "error"; data: Envelope };

/** Parses one SSE block ("event: x\ndata: {...}") into an event. */
function parseSseBlock(block: string): ChatEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) {
      continue; // comment / keep-alive ping
    }
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
    if (field === "event") {
      event = value;
    } else if (field === "data") {
      data.push(value);
    }
  }
  if (!data.length || !["status", "result", "error"].includes(event)) {
    return null;
  }
  return { event, data: JSON.parse(data.join("\n")) } as ChatEvent;
}

/**
 * POST /chat and stream its events. Resolves with the final envelope
 * ("error" envelopes are returned, not thrown).
 */
export async function streamChat(
  request: ChatRequest,
  onEvent: (event: ChatEvent) => void,
  signal?: AbortSignal,
): Promise<Envelope> {
  const res = await send("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(request),
    signal,
  });
  if (!res.body) {
    throw new ApiError("NO_STREAM", "The server response could not be read.", res.status);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let final: Envelope | null = null;
  const handle = (block: string) => {
    const event = parseSseBlock(block);
    if (event) {
      if (event.event !== "status") {
        final = event.data;
      }
      onEvent(event);
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += value;
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    blocks.forEach(handle);
  }
  if (buffer.trim()) {
    handle(buffer);
  }
  if (!final) {
    throw new ApiError("STREAM_ENDED", "The connection closed before an answer arrived.", 0);
  }
  return final;
}

// ---- uploads -------------------------------------------------------------------

export const ACCEPTED_UPLOADS = ".pdf,.csv,.xlsx";

export function uploadFile(file: File, signal?: AbortSignal) {
  const form = new FormData();
  form.append("file", file);
  return json<UploadResult>("/files/upload", { method: "POST", body: form, signal });
}

// ---- operations ----------------------------------------------------------------

export interface CreateTablePlan {
  kind: "create_table";
  schema: string;
  table: string;
  columns: { name: string; pg_type: string; nullable: boolean; primary_key: boolean }[];
}

/** Creates a pending operation from a structured plan (no LLM). Returns its preview. */
export const createOperation = (plan: CreateTablePlan) =>
  json<Extract<Envelope, { type: "operation_preview" }>>("/operations", jsonBody({ plan }));

export const getOperation = (id: string) =>
  json<OperationView>(`/operations/${encodeURIComponent(id)}`);

export const confirmOperation = (id: string) =>
  json<OperationResultEnvelope>(`/operations/${encodeURIComponent(id)}/confirm`, {
    method: "POST",
  });

export const cancelOperation = (id: string) =>
  json<{ type: "message"; data: OperationView; message: string }>(
    `/operations/${encodeURIComponent(id)}/cancel`,
    { method: "POST" },
  );

// ---- schema browser ------------------------------------------------------------

export const listSchemas = () => json<{ data: SchemaListData }>("/schemas");

export const listTables = (schema: string) =>
  json<{ data: TableListData }>(`/schemas/${encodeURIComponent(schema)}/tables`);

export const describeTable = (schema: string, table: string) =>
  json<{ data: TableDescriptionData }>(
    `/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}`,
  );

/** All tables the user may see, schema-qualified. Columns load lazily (fetchColumns). */
export async function fetchSchema(): Promise<SchemaTable[]> {
  const { data } = await listSchemas();
  const perSchema = await Promise.all(
    data.items.map(async ({ schema }) => {
      const tables = await listTables(schema);
      return tables.data.items.map((t) => ({
        name: `${schema}.${t.table}`,
        schema,
        table: t.table,
        estimatedRows: t.estimated_rows,
      }));
    }),
  );
  return perSchema.flat();
}

export async function fetchColumns(schema: string, table: string): Promise<SchemaColumn[]> {
  const { data } = await describeTable(schema, table);
  return data.columns.map((c) => ({ name: c.name, type: c.type, primaryKey: c.primary_key }));
}

export const connectionStatus = () => json<ConnectionStatus>("/connections/status");
