import type { ChatSession, Connection } from "@/lib/types";

/**
 * Tiny localStorage-backed stores consumed through useSyncExternalStore.
 * Chats and connections live in the browser until the backend exposes history APIs.
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
    messages: chat.messages.map((message) =>
      message.role === "assistant" && message.stage !== "done" && !message.error
        ? { ...message, error: "Interrupted — the page was reloaded before the answer arrived." }
        : message,
    ),
  }));
}

const EMPTY_CHATS: ChatSession[] = [];
const EMPTY_CONNECTIONS: Connection[] = [];

export const chatStore = createStore("vaakdb:chats", EMPTY_CHATS, markInterrupted);
export const connectionStore = createStore("vaakdb:connections", EMPTY_CONNECTIONS);
export const activeConnectionStore = createStore<string | null>(
  "vaakdb:active-connection",
  null,
);

export function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
