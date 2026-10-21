"use client";

import { Check, ChevronDown, CodeXml, Copy } from "lucide-react";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

const KEYWORDS = new Set(
  `select from where group by order having limit offset join left right inner outer full cross on as and or not in is null like ilike between case when then else end distinct union all with count sum avg min max round coalesce interval desc asc over partition date_trunc now cast true false exists`.split(
    " ",
  ),
);

const TOKEN = /(--[^\n]*)|('(?:[^']|'')*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+|.)/g;

function highlight(sql: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let i = 0;
  for (const [text, comment, str, num, word] of sql.matchAll(TOKEN)) {
    const key = i++;
    if (comment) {
      nodes.push(<span key={key} className="sql-comment">{text}</span>);
    } else if (str) {
      nodes.push(<span key={key} className="sql-string">{text}</span>);
    } else if (num) {
      nodes.push(<span key={key} className="sql-number">{text}</span>);
    } else if (word && KEYWORDS.has(word.toLowerCase())) {
      nodes.push(<span key={key} className="sql-keyword">{text}</span>);
    } else {
      nodes.push(text);
    }
  }
  return nodes;
}

export function SqlPreview({ sql, defaultOpen = false }: { sql: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="overflow-hidden rounded-lg border bg-code">
      <div className="flex items-center justify-between px-3 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          aria-expanded={open}
        >
          <CodeXml className="size-3.5" />
          Generated SQL
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </button>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {open && (
        <pre className="overflow-x-auto border-t px-4 py-3 font-mono text-[13px] leading-relaxed">
          <code>{highlight(sql)}</code>
        </pre>
      )}
    </div>
  );
}
