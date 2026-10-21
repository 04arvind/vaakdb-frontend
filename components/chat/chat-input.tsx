"use client";

import {
  ArrowUp,
  File,
  FileSpreadsheet,
  FileText,
  Link,
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
import { cn } from "@/lib/utils";

const MAX_HEIGHT = 200;

const ACCEPTED_FILES = ".csv,.tsv,.xlsx,.xls,.ods,.pdf,.json,.txt";
const GOOGLE_SHEET_URL = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]+/;

interface Attachment {
  id: string;
  name: string;
  kind: "file" | "sheet";
  size?: number;
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

function AttachmentIcon({ attachment }: { attachment: Attachment }) {
  const ext = attachment.name.split(".").pop()?.toLowerCase();
  if (attachment.kind === "sheet" || ["csv", "tsv", "xlsx", "xls", "ods"].includes(ext ?? "")) {
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
  onSubmit: () => void;
  onStop: () => void;
  isLoading: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetError, setSheetError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Grow with the content up to MAX_HEIGHT, then scroll.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [value, textareaRef]);

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

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setAttachments((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        kind: "file" as const,
        size: file.size,
      })),
    ]);
    event.target.value = "";
    setMenuOpen(false);
  };

  const addSheet = () => {
    const url = sheetUrl.trim();
    if (!GOOGLE_SHEET_URL.test(url)) {
      setSheetError("Paste a docs.google.com/spreadsheets link");
      return;
    }
    setAttachments((prev) => [...prev, { id: url, name: "Google Sheet", kind: "sheet" }]);
    setSheetUrl("");
    setSheetError(null);
    setMenuOpen(false);
  };

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const send = () => {
    onSubmit();
    setAttachments([]);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!isLoading && value.trim()) {
        send();
      }
    }
  };

  const canSend = value.trim().length > 0 && !isLoading;

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
      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2 px-3 pt-3">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex max-w-60 items-center gap-2 rounded-lg border bg-muted/50 py-1.5 pr-1.5 pl-2.5 text-sm"
              title={attachment.kind === "sheet" ? attachment.id : attachment.name}
            >
              <AttachmentIcon attachment={attachment} />
              <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
              {attachment.size !== undefined && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatSize(attachment.size)}
                </span>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Remove ${attachment.name}`}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder="Ask a question about your data…"
        className="block max-h-[200px] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[15px] outline-none placeholder:text-muted-foreground"
        aria-label="Question"
      />
      <div className="flex items-center gap-2 px-3 pb-2.5">
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              "flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
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
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-muted"
              >
                <Upload className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium">Upload file</span>
                  <span className="block text-xs text-muted-foreground">
                    CSV, Excel, PDF, JSON or text
                  </span>
                </span>
              </button>
              <div className="mt-1 border-t px-2.5 pt-2.5 pb-1.5">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Link className="size-4 text-muted-foreground" />
                  Google Sheets link
                </span>
                <div className="mt-2 flex gap-1.5">
                  <input
                    value={sheetUrl}
                    onChange={(e) => {
                      setSheetUrl(e.target.value);
                      setSheetError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSheet();
                      }
                    }}
                    placeholder="https://docs.google.com/spreadsheets/…"
                    className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={addSheet}
                    className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                  >
                    Add
                  </button>
                </div>
                {sheetError && <p className="mt-1 text-xs text-destructive">{sheetError}</p>}
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILES}
            multiple
            onChange={onFiles}
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
