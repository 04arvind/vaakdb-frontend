export type DbEngine = "postgres" | "mysql" | "sqlite" | "mssql";

export interface Connection {
  id: string;
  name: string;
  engine: DbEngine;
  host: string;
  port: number;
  database: string;
  user: string;
  createdAt: number;
}

export interface SchemaColumn {
  name: string;
  type: string;
  primaryKey?: boolean;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
}

/**
 * Stages of the P2 (agentic) flow, in the order the backend reports them.
 * Mirrors the sequence diagram: orchestrator -> context -> agent -> guardrails -> query -> answer.
 */
export type QueryStage =
  | "queued"
  | "retrieving_context"
  | "generating_sql"
  | "validating"
  | "executing"
  | "answering"
  | "done";

export type CellValue = string | number | boolean | null;

export interface QueryResult {
  answer: string;
  sql?: string;
  columns?: string[];
  rows?: CellValue[][];
  sources?: string[];
  durationMs?: number;
}

export type Feedback = "up" | "down" | null;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  stage?: QueryStage;
  result?: QueryResult;
  error?: string;
  feedback?: Feedback;
}

export interface ChatSession {
  id: string;
  title: string;
  connectionId: string | null;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface AskRequest {
  chatId: string;
  question: string;
  connectionId: string | null;
  history: { role: ChatMessage["role"]; content: string }[];
}

/** Progress events emitted while a question is being answered. */
export type AskEvent =
  | { type: "status"; stage: QueryStage }
  | { type: "result"; result: QueryResult }
  | { type: "error"; message: string };

export interface FeedbackRequest {
  chatId: string;
  messageId: string;
  question: string;
  feedback: Exclude<Feedback, null>;
  sql?: string;
}
