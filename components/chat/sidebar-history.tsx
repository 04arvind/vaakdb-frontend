"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { deleteChat, useChats, useHydrated } from "@/hooks/use-active-chat";
import { cn } from "@/lib/utils";

const MAX_RECENT = 20;

export function SidebarHistory() {
  const hydrated = useHydrated();
  const chats = useChats();
  const pathname = usePathname();
  const activeId = useSearchParams().get("id");
  const router = useRouter();

  if (!hydrated) {
    return null;
  }

  const recent = [...chats].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_RECENT);

  return (
    <div>
      <p className="px-2.5 pb-1.5 text-xs font-medium text-muted-foreground">Recent</p>
      {recent.length === 0 ? (
        <p className="px-2.5 text-xs text-muted-foreground">
          Your conversations will appear here.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {recent.map((chat) => {
            const active = pathname === "/chat" && chat.id === activeId;
            return (
              <li key={chat.id} className="group relative">
                <Link
                  href={`/chat?id=${chat.id}`}
                  className={cn(
                    "block truncate rounded-md py-1.5 pr-8 pl-2.5 text-sm",
                    active
                      ? "bg-muted font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  title={chat.title}
                >
                  {chat.title}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    deleteChat(chat.id);
                    if (active) {
                      router.push("/chat");
                    }
                  }}
                  className="absolute top-1/2 right-1 -translate-y-1/2 rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive focus:opacity-100"
                  aria-label={`Delete ${chat.title}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
