/**
 * Types shared with the VaakDB backend (vaakDB-backend, /api/v1).
 * Keep in sync with app/schemas/result.py and app/services/* on the backend.
 */

export interface User {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export type CellValue = string | number | boolean | null;
export type Row = Record<string, CellValue>;

// ---- /chat response envelope -------------------------------------------------

export type ResponseType =
  | "schema_list"
  | "table_list"
  | "table_description"
  | "query_result"
  | "operation_preview"
  | "operation_result"
  | "message"
  | "error";

export interface SchemaListData {
  columns: string[];
  items: { schema: string; table_count: number }[];
}

export interface TableListData {
  schema: string;
  columns: string[];
  items: { table: string; kind: string; estimated_rows: number | null }[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  primary_key: boolean;
  references: string | null;
  sensitive?: boolean;
}

export interface TableDescriptionData {
  schema: string;
  table: string;
  kind: string;
  columns: ColumnInfo[];
  primary_key: string[];
  row_count: number | null;
  row_count_is_estimate: boolean;
  sample_rows: Row[];
}

export interface QueryResultData {
  columns: string[];
  rows: Row[];
  sql?: string;
  truncated?: boolean;
  row_count?: number;
  total_rows?: number;
}

export interface FailedRow {
  row: number;
  column: string | null;
  value: string | null;
  error: string;
}

export interface OperationPreviewData {
  operation_id: string;
  expires_at: string;
  operation_type: "create_table" | "insert_rows" | "update_rows" | "delete_rows";
  target: { schema: string; table: string };
  mode: "fail" | "append" | "replace" | null;
  table_exists: boolean;
  ddl: string[];
  columns: { name: string; type: string; nullable: boolean; primary_key: boolean }[];
  column_mapping: { source: string | null; column: string; type: string }[];
  sample_rows: Row[];
  total_rows: number | null;
  rows_to_write: number | null;
  failed_rows: FailedRow[];
  failed_row_count: number;
  affected_rows: number | null;
  destructive: string[];
  warnings: string[];
}

export type OperationStatus =
  | "pending"
  | "confirmed"
  | "executed"
  | "failed"
  | "cancelled"
  | "expired";

export interface OperationView {
  operation_id: string;
  type: string;
  status: OperationStatus;
  target: { schema: string; table: string };
  preview: OperationPreviewData;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string | null;
  expires_at: string;
  confirmed_at: string | null;
  executed_at: string | null;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface EnvelopeBase {
  message: string;
  conversation_id?: string | null;
}

export type OperationResultEnvelope = EnvelopeBase & {
  type: "operation_result";
  data: OperationView;
};

export type Envelope =
  | (EnvelopeBase & { type: "schema_list"; data: SchemaListData })
  | (EnvelopeBase & { type: "table_list"; data: TableListData })
  | (EnvelopeBase & { type: "table_description"; data: TableDescriptionData })
  | (EnvelopeBase & { type: "query_result"; data: QueryResultData })
  | (EnvelopeBase & { type: "operation_preview"; data: OperationPreviewData })
  | OperationResultEnvelope
  | (EnvelopeBase & { type: "message"; data: { clarification?: boolean } | null })
  | (EnvelopeBase & { type: "error"; data: ApiErrorBody });

/** One progress step reported by the backend while it works on a message. */
export interface ChatStep {
  stage: string;
  message: string;
}

// ---- uploads -----------------------------------------------------------------

export interface ExtractedTableSummary {
  index: number;
  page: number | null;
  header: string[];
  row_count: number;
  method: string;
  sample_rows: (string | null)[][];
}

export interface UploadResult {
  upload_id: string;
  filename: string;
  mime: string;
  size_bytes: number;
  sha256: string;
  status: string;
  extraction: {
    source: string;
    pages: number;
    tables: ExtractedTableSummary[];
    warnings: string[];
  };
}

// ---- schema browser ----------------------------------------------------------

export interface SchemaColumn {
  name: string;
  type: string;
  primaryKey?: boolean;
}

export interface SchemaTable {
  /** schema-qualified name, e.g. "college.students" */
  name: string;
  schema: string;
  table: string;
  estimatedRows: number | null;
  /** undefined until loaded (columns are fetched when the table is expanded) */
  columns?: SchemaColumn[];
}

interface EngineStatus {
  ok: boolean;
  role?: string;
  database?: string;
  superuser?: boolean;
  error?: string;
}

export interface ConnectionStatus {
  meta_db: boolean;
  target_read: EngineStatus;
  target_write: EngineStatus;
  default_schema: string;
  ai_routes_enabled: boolean;
  warnings: string[];
}

// ---- local chat state --------------------------------------------------------

export type Feedback = "up" | "down" | null;

export interface Attachment {
  name: string;
  uploadId: string;
}

export interface OperationState {
  status: OperationStatus | "confirming" | "cancelling";
  result?: OperationResultEnvelope;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  /** user message: file sent with it */
  attachment?: Attachment;
  /** assistant message: still waiting for the backend */
  pending?: boolean;
  steps?: ChatStep[];
  response?: Envelope;
  error?: { code?: string; message: string };
  operation?: OperationState;
  durationMs?: number;
  feedback?: Feedback;
}

export interface ChatSession {
  id: string;
  title: string;
  /** backend conversation id, set from the first response */
  conversationId: string | null;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
