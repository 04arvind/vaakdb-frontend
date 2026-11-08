import type { ChatSession, User } from "@/lib/types";

/**
 * Tiny localStorage-backed stores consumed through useSyncExternalStore.
 * Chats are cached in the browser per user; the backend keeps the authoritative
 * query history (GET /queries) and the operations.
 */

type Listener = () => void;

export interface Store<T> {
  get: () => T;
  getServer: () => T;
  set: (updater: (prev: T) => T) => void;
  subscribe: (listener: Listener) => () => void;
}

function createStore<T>(
  key: string,
  initial: T,
  hydrate: (value: T) => T = (value) => value,
): Store<T> {
  let state = initial;
  let loaded = false;
  const listeners = new Set<Listener>();

  const load = () => {
    if (loaded || typeof window === "undefined") {
      return;
    }
    loaded = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        state = hydrate(JSON.parse(raw) as T);
      }
    } catch {
      // Corrupt or unavailable storage: start fresh.
    }
  };

  const emit = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key === key) {
      loaded = false;
      load();
      emit();
    }
  };

  return {
    get: () => {
      load();
      return state;
    },
    getServer: () => initial,
    set: (updater) => {
      load();
      state = updater(state);
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // Quota exceeded or storage blocked: keep in-memory state only.
      }
      emit();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      if (listeners.size === 1) {
        window.addEventListener("storage", onStorage);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.removeEventListener("storage", onStorage);
        }
      };
    },
  };
}

/** Requests in flight are lost on reload, so mark any unfinished answer as interrupted. */
function markInterrupted(chats: ChatSession[]): ChatSession[] {
  return chats.map((chat) => ({
    ...chat,
    messages: chat.messages.map((message) => {
      if (message.role === "assistant" && message.pending) {
        return {
          ...message,
          pending: false,
          error: { message: "Interrupted — the page was reloaded before the answer arrived." },
        };
      }
      const op = message.operation?.status;
      if (op === "confirming" || op === "cancelling") {
        // The request may have finished on the server; the preview re-checks the status.
        return { ...message, operation: { status: "pending" } };
      }
      return message;
    }),
  }));
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

const EMPTY_CHATS: ChatSession[] = [];
const NO_AUTH: AuthState = { token: null, user: null };

export const chatStore = createStore("vaakdb:chats", EMPTY_CHATS, markInterrupted);
export const authStore = createStore<AuthState>("vaakdb:auth", NO_AUTH);
/** Id of the user the cached chats belong to (chats are cleared when another user signs in). */
export const chatOwnerStore = createStore<number | null>("vaakdb:chats-owner", null);

export function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
