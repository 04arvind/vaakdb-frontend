"use client";

import { useSyncExternalStore } from "react";
import {
  activeConnectionStore,
  chatStore,
  connectionStore,
  createId,
} from "@/lib/store";
import type { Connection } from "@/lib/types";

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true once the browser has taken over. */
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function useChats() {
  return useSyncExternalStore(chatStore.subscribe, chatStore.get, chatStore.getServer);
}

export function useChatSession(id: string | null) {
  const chats = useChats();
  return id ? chats.find((chat) => chat.id === id) : undefined;
}

export function deleteChat(id: string) {
  chatStore.set((chats) => chats.filter((chat) => chat.id !== id));
}

export function clearChats() {
  chatStore.set(() => []);
}

export function useConnections() {
  return useSyncExternalStore(
    connectionStore.subscribe,
    connectionStore.get,
    connectionStore.getServer,
  );
}

/** The selected connection, falling back to the first one if the selection is gone. */
export function useActiveConnection(): Connection | null {
  const connections = useConnections();
  const activeId = useSyncExternalStore(
    activeConnectionStore.subscribe,
    activeConnectionStore.get,
    activeConnectionStore.getServer,
  );
  return connections.find((c) => c.id === activeId) ?? connections[0] ?? null;
}

export function setActiveConnection(id: string | null) {
  activeConnectionStore.set(() => id);
}

export function addConnection(input: Omit<Connection, "id" | "createdAt">) {
  const connection: Connection = { ...input, id: createId(), createdAt: Date.now() };
  connectionStore.set((connections) => [...connections, connection]);
  setActiveConnection(connection.id);
  return connection;
}

export function removeConnection(id: string) {
  connectionStore.set((connections) => connections.filter((c) => c.id !== id));
  if (activeConnectionStore.get() === id) {
    setActiveConnection(null);
  }
}
