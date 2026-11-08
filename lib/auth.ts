"use client";

import { useSyncExternalStore } from "react";
import { authStore, chatOwnerStore, chatStore } from "@/lib/store";
import type { User } from "@/lib/types";
import * as api from "@/lib/vaakdb-api";

/**
 * Session handling. The JWT from POST /auth/login is kept in localStorage and
 * sent as a Bearer token. Every account has its own private workspace; the
 * backend scopes every request to the signed-in user.
 */

export function useAuth() {
  return useSyncExternalStore(authStore.subscribe, authStore.get, authStore.getServer);
}

function adoptUser(user: User) {
  // Cached chats belong to one user: drop them when someone else signs in.
  if (chatOwnerStore.get() !== user.id) {
    chatStore.set(() => []);
    chatOwnerStore.set(() => user.id);
  }
  authStore.set((prev) => ({ ...prev, user }));
}

export async function signIn(email: string, password: string) {
  const token = await api.login(email, password);
  authStore.set(() => ({ token: token.access_token, user: null }));
  try {
    adoptUser(await api.fetchMe());
  } catch (error) {
    authStore.set(() => ({ token: null, user: null }));
    throw error;
  }
}

export async function signUp(email: string, password: string) {
  await api.register(email, password);
  await signIn(email, password);
}

/** Re-reads the current user (validates the token). A 401 signs out via the handler. */
export async function refreshUser() {
  if (authStore.get().token) {
    adoptUser(await api.fetchMe());
  }
}

export function signOut() {
  authStore.set(() => ({ token: null, user: null }));
}

/** Explicit sign-out: also removes this user's cached chats from the browser,
 * so the next person on a shared computer sees nothing of them. */
export function signOutAndForget() {
  signOut();
  chatStore.set(() => []);
  chatOwnerStore.set(() => null);
}

// Expired or revoked token: clear it. The Shell then redirects to /login?next=...
api.onUnauthorized(signOut);
