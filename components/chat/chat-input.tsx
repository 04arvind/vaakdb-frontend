"use client";

import {
  ArrowUp,
  CircleAlert,
  File,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Paperclip,
  Square,
  Upload,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Attachment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ACCEPTED_UPLOADS, ApiError, uploadFile } from "@/lib/vaakdb-api";

const MAX_HEIGHT = 200;

/** One file at a time: the backend ingests a single upload per message. */
interface PendingUpload {
  name: string;
  size: number;
  status: "uploading" | "ready" | "error";
  uploadId?: string;
  summary?: string;
  error?: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "csv" || ext === "xlsx") {
    return <FileSpreadsheet className="size-4 shrink-0 text-success" />;
  }
  if (ext === "pdf") {
    return <FileText className="size-4 shrink-0 text-destructive" />;
  }
  return <File className="size-4 shrink-0 text-muted-foreground" />;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading,
  textareaRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (attachment?: Attachment) => void;
  onStop: () => void;
  isLoading: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const [upload, setUpload] = useState<PendingUpload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadController = useRef<AbortController | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the attach menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: globalThis.KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Grow with the content up to MAX_HEIGHT, then scroll.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value, textareaRef]);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    uploadController.current?.abort();
    const controller = new AbortController();
    uploadController.current = controller;
    setUpload({ name: file.name, size: file.size, status: "uploading" });
    try {
      const result = await uploadFile(file, controller.signal);
      const tables = result.extraction.tables;
      const rows = tables.reduce((sum, t) => sum + t.row_count, 0);
      setUpload({
        name: file.name,
        size: file.size,
        status: "ready",
        uploadId: result.upload_id,
        summary: `${tables.length} table${tables.length === 1 ? "" : "s"} · ${rows} rows`,
      });
      if (!value.trim()) {
        onChange("Store this file as a table named … in schema …");
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      setUpload({
        name: file.name,
        size: file.size,
        status: "error",
        error: error instanceof ApiError ? error.message : "Upload failed.",
      });
    }
  };

  const removeUpload = () => {
    uploadController.current?.abort();
    setUpload(null);
  };

  const send = () => {
    onSubmit(
      upload?.status === "ready" && upload.uploadId
        ? { name: upload.name, uploadId: upload.uploadId }
        : undefined,
    );
    setUpload(null);
  };

  const uploading = upload?.status === "uploading";
  const canSend = value.trim().length > 0 && !isLoading && !uploading;

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (canSend) {
        send();
      }
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) {
          send();
        }
      }}
      className="rounded-2xl border bg-card shadow-sm transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15"
    >
      {upload && (
        <div className="px-3 pt-3">
          <div
            className={cn(
              "flex max-w-full items-center gap-2 rounded-lg border bg-muted/50 py-1.5 pr-1.5 pl-2.5 text-sm",
              upload.status === "error" && "border-destructive/40 bg-destructive/5",
            )}
            title={upload.name}
          >
            {upload.status === "uploading" ? (
              <LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : upload.status === "error" ? (
              <CircleAlert className="size-4 shrink-0 text-destructive" />
            ) : (
              <FileIcon name={upload.name} />
            )}
            <span className="min-w-0 truncate">{upload.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {upload.status === "uploading"
                ? "Uploading…"
                : upload.status === "error"
                  ? upload.error
                  : `${formatSize(upload.size)} · ${upload.summary}`}
            </span>
            <button
              type="button"
              onClick={removeUpload}
              className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`Remove ${upload.name}`}
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder="Ask about your data, or attach a file to store it…"
        className="block max-h-[200px] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] outline-none placeholder:text-muted-foreground"
        aria-label="Message"
      />
      <div className="flex items-center gap-2 px-3 pb-2.5">
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            disabled={uploading}
            className={cn(
              "flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50",
              menuOpen && "bg-muted text-foreground",
            )}
            aria-label="Add file"
            aria-expanded={menuOpen}
            title="Add file"
          >
            <Paperclip className="size-4" />
          </button>
          {menuOpen && (
            <div className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted"
              >
                <Upload className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium">Upload document</span>
                  <span className="block text-xs text-muted-foreground">
                    PDF, CSV or Excel (.xlsx), up to 10 MB
                  </span>
                </span>
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_UPLOADS}
            onChange={onFile}
            className="hidden"
          />
        </div>
        <span className="hidden text-xs text-muted-foreground sm:block">
          Enter to send · Shift + Enter for a new line
        </span>
        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="ml-auto flex size-8 items-center justify-center rounded-full bg-foreground text-background hover:opacity-90"
            aria-label="Stop"
          >
            <Square className="size-3 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            className={cn(
              "ml-auto flex size-8 items-center justify-center rounded-full transition-colors",
              canSend
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground",
            )}
            aria-label="Send"
          >
            <ArrowUp className="size-4" />
          </button>
        )}
      </div>
    </form>
  );
}
