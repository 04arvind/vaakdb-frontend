"use client";

import {
  Database,
  History,
  MessageSquare,
  PanelLeftClose,
  Plug,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { SidebarHistory } from "@/components/chat/sidebar-history";
import { ThemeToggle } from "@/components/chat/theme-toggle";
import { useActiveConnection, useHydrated } from "@/hooks/use-active-chat";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/connections", label: "Connections", icon: Plug },
  { href: "/history", label: "History", icon: History },
];

export function AppSidebar({
  open,
  onClose,
  collapsed,
  onCollapse,
}: {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onCollapse: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/40 md:hidden",
          open ? "block" : "hidden",
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-sidebar transition-transform md:static md:z-auto md:w-64 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed && "md:hidden",
        )}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/chat" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Database className="size-4" />
            </span>
            <span className="text-base font-semibold tracking-tight">VaakDB</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              onClick={onCollapse}
              title="Close sidebar"
              className="hidden rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:block"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="size-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted md:hidden"
              aria-label="Close sidebar"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="px-3">
          <Link
            href="/chat"
            className="flex items-center justify-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted"
          >
            <Plus className="size-4" />
            New chat
          </Link>
        </div>

        <nav className="mt-4 space-y-0.5 px-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm",
                pathname === href
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <Suspense>
            <SidebarHistory />
          </Suspense>
        </div>

        <ConnectionBadge />
      </aside>
    </>
  );
}

function ConnectionBadge() {
  const hydrated = useHydrated();
  const connection = useActiveConnection();

  return (
    <Link
      href="/connections"
      className="m-3 flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-sm hover:bg-muted"
    >
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          connection ? "bg-success" : "bg-amber-500",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          {hydrated && connection ? connection.name : "Demo database"}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {hydrated && connection
            ? `${connection.engine} · ${connection.database}`
            : "Sample e-commerce data"}
        </span>
      </span>
    </Link>
  );
}
