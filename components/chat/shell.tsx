"use client";

import { Database, Menu, PanelLeftOpen } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { AppSidebar } from "@/components/chat/app-sidebar";
import { useHydrated } from "@/hooks/use-active-chat";
import { refreshUser, useAuth } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/login"]);

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Desktop only: the mobile drawer is driven by `open`.
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const { token } = useAuth();
  const isPublic = PUBLIC_PATHS.has(pathname);

  // Close the mobile drawer after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Not signed in: go to the login page (and come back afterwards).
  useEffect(() => {
    if (hydrated && !token && !isPublic) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/login?next=${next}`);
    }
  }, [hydrated, token, isPublic, router]);

  // Validate the stored token once (a 401 signs out).
  useEffect(() => {
    if (hydrated && token) {
      refreshUser().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (isPublic) {
    return <div className="flex h-dvh overflow-y-auto">{children}</div>;
  }

  // Always render {children}, even before hydration / sign-in: the page segment
  // must be part of the server render, otherwise Next.js reports it as a
  // "dropped segment" during instant-navigation validation. Until the session is
  // ready the page stays hidden behind the spinner.
  const ready = hydrated && Boolean(token);

  return (
    <div className="flex h-dvh overflow-hidden">
      <AppSidebar
        open={open}
        onClose={() => setOpen(false)}
        collapsed={collapsed}
        onCollapse={() => setCollapsed((c) => !c)}
      />
      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Open sidebar"
          aria-label="Open sidebar"
          className="fixed left-3 top-3 z-40 hidden rounded-md border bg-background p-1.5 text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground md:block"
        >
          <PanelLeftOpen className="size-4" />
        </button>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b px-3 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Open sidebar"
          >
            <Menu className="size-5" />
          </button>
          <Database className="size-4 text-primary" />
          <span className="font-semibold">VaakDB</span>
        </div>
        {children}
      </div>
    </div>
  );
}
