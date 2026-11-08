"use client";

import { useSyncExternalStore } from "react";
import { chatStore } from "@/lib/store";

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
