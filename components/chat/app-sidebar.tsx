"use client";

import { Database, History, LogOut, MessageSquare, Plus, Server, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { SidebarHistory } from "@/components/chat/sidebar-history";
import { ThemeToggle } from "@/components/chat/theme-toggle";
import { signOutAndForget, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { healthCheck } from "@/lib/vaakdb-api";

const NAV = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/connections", label: "My workspace", icon: Server },
  { href: "/history", label: "History", icon: History },
];

export function AppSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={cn("fixed inset-0 z-30 bg-black/40 md:hidden", open ? "block" : "hidden")}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r bg-sidebar transition-transform md:static md:z-auto md:w-64 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
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

        <UserBadge />
      </aside>
    </>
  );
}

function UserBadge() {
  const { user } = useAuth();
  const router = useRouter();
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const check = () => healthCheck().then((ok) => !cancelled && setOnline(ok));
    check();
    const timer = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="m-3 flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 text-sm">
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          online === null ? "bg-muted-foreground" : online ? "bg-success" : "bg-destructive",
        )}
        title={online === false ? "Backend unreachable" : "Backend connected"}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{user?.email ?? "Signed in"}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {online === false ? "Backend unreachable" : "Personal workspace"}
        </span>
      </span>
      <button
        type="button"
        onClick={() => {
          signOutAndForget();
          router.replace("/login");
        }}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
