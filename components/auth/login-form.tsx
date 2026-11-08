"use client";

import { Database, LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { useHydrated } from "@/hooks/use-active-chat";
import { signIn, signUp, useAuth } from "@/lib/auth";
import { API_URL, ApiError } from "@/lib/vaakdb-api";

const inputClass =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

/** Only same-site paths are allowed as a redirect target. */
function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/chat";
}

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const hydrated = useHydrated();
  const { token } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hydrated && token) {
      router.replace(next);
    }
  }, [hydrated, token, next, router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")).trim();
    const password = String(data.get("password"));
    setBusy(true);
    setError(null);
    try {
      await (mode === "signin" ? signIn(email, password) : signUp(email, password));
      router.replace(next);
    } catch (e) {
      if (e instanceof ApiError && e.code === "VALIDATION_ERROR") {
        setError("Enter a valid email and a password of at least 8 characters.");
      } else {
        setError(e instanceof Error ? e.message : "Sign-in failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="m-auto w-full max-w-sm px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Database className="size-5" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">
          {mode === "signin" ? "Sign in to VaakDB" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to your personal workspace."
            : "You get your own private workspace. Nobody else can see your data."}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Email</span>
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : 1}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className={inputClass}
          />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {busy && <LoaderCircle className="size-4 animate-spin" />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        {mode === "signin" ? "No account yet? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="font-medium text-primary hover:underline"
        >
          {mode === "signin" ? "Create one" : "Sign in"}
        </button>
      </p>
      <p className="mt-6 text-center font-mono text-[11px] text-muted-foreground">{API_URL}</p>
    </div>
  );
}
