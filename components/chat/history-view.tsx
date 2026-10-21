"use client";

import { MessageSquare, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { clearChats, deleteChat, useChats, useHydrated } from "@/hooks/use-active-chat";
import type { ChatSession } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";

export function HistoryView() {
  const hydrated = useHydrated();
  const chats = useChats();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = [...chats]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter(
      (chat) =>
        !q ||
        chat.title.toLowerCase().includes(q) ||
        chat.messages.some((m) => m.content.toLowerCase().includes(q)),
    );

  const groups = new Map<string, ChatSession[]>();
  for (const chat of filtered) {
    const label = formatRelativeDate(chat.updatedAt);
    groups.set(label, [...(groups.get(label) ?? []), chat]);
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">History</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {hydrated ? `${chats.length} conversations` : "Loading…"}
            </p>
          </div>
          {hydrated && chats.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete all conversations? This can't be undone.")) {
                  clearChats();
                }
              }}
              className="rounded-lg border px-3 py-2 text-sm text-destructive hover:bg-muted"
            >
              Clear all
            </button>
          )}
        </div>

        <label className="mt-6 flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>

        {hydrated && filtered.length === 0 && (
          <div className="mt-12 text-center text-sm text-muted-foreground">
            {chats.length === 0 ? (
              <>
                No conversations yet.{" "}
                <Link href="/chat" className="text-primary hover:underline">
                  Ask your first question
                </Link>
              </>
            ) : (
              "No conversations match your search."
            )}
          </div>
        )}

        {[...groups].map(([label, items]) => (
          <section key={label} className="mt-6">
            <h2 className="mb-2 text-xs font-medium text-muted-foreground">{label}</h2>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">
              {items.map((chat) => {
                const questions = chat.messages.filter((m) => m.role === "user").length;
                return (
                  <li key={chat.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                    <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                    <Link href={`/chat?id=${chat.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{chat.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {questions} {questions === 1 ? "question" : "questions"} ·{" "}
                        {new Date(chat.updatedAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </Link>
                    <button
                      type="button"
                      onClick={() => deleteChat(chat.id)}
                      className="rounded-md p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive focus:opacity-100"
                      aria-label={`Delete ${chat.title}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
