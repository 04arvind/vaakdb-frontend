"use client";

import { useCallback } from "react";
import { useChatSession } from "@/hooks/use-active-chat";
import { activeConnectionStore, chatStore, createId } from "@/lib/store";
import type { ChatMessage, Feedback } from "@/lib/types";
import { ask, sendFeedback } from "@/lib/vaakdb-api";

const EMPTY: ChatMessage[] = [];

// Kept at module level so a request keeps streaming into the store (and can be
// stopped) even if the chat view unmounts while it's running.
const controllers = new Map<string, AbortController>();

function updateMessages(chatId: string, update: (messages: ChatMessage[]) => ChatMessage[]) {
  chatStore.set((chats) =>
    chats.map((chat) =>
      chat.id === chatId
        ? { ...chat, messages: update(chat.messages), updatedAt: Date.now() }
        : chat,
    ),
  );
}

function patchMessage(chatId: string, messageId: string, patch: Partial<ChatMessage>) {
  updateMessages(chatId, (messages) =>
    messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
  );
}

function newAssistantMessage(): ChatMessage {
  return {
    id: createId(),
    role: "assistant",
    content: "",
    createdAt: Date.now(),
    stage: "queued",
  };
}

async function run(chatId: string, assistantId: string, question: string) {
  const chat = chatStore.get().find((c) => c.id === chatId);
  const history = (chat?.messages ?? [])
    .filter((m) => m.id !== assistantId && (m.role === "user" || m.result))
    .map((m) => ({ role: m.role, content: m.role === "user" ? m.content : (m.result?.answer ?? "") }));

  const controller = new AbortController();
  controllers.set(chatId, controller);

  try {
    await ask(
      { chatId, question, connectionId: chat?.connectionId ?? null, history },
      (event) => {
        if (event.type === "status") {
          patchMessage(chatId, assistantId, { stage: event.stage });
        } else if (event.type === "result") {
          patchMessage(chatId, assistantId, {
            content: event.result.answer,
            result: event.result,
          });
        } else {
          patchMessage(chatId, assistantId, { error: event.message });
        }
      },
      controller.signal,
    );
  } catch (error) {
    patchMessage(chatId, assistantId, {
      error: controller.signal.aborted
        ? "Stopped."
        : error instanceof Error
          ? error.message
          : "Something went wrong.",
    });
  } finally {
    if (controllers.get(chatId) === controller) {
      controllers.delete(chatId);
    }
  }
}

export function isPending(message: ChatMessage) {
  return message.role === "assistant" && message.stage !== "done" && !message.error;
}

/**
 * Chat state for one conversation. Pass `chatId = null` for a new chat;
 * `onCreate` fires with the new id when the first question is sent.
 */
export function useVaakdbChat(chatId: string | null, onCreate?: (id: string) => void) {
  const session = useChatSession(chatId);
  const messages = session?.messages ?? EMPTY;
  const isLoading = messages.some(isPending);

  const send = useCallback(
    (question: string) => {
      const text = question.trim();
      if (!text) {
        return;
      }

      let id = chatId;
      if (!id) {
        id = createId();
        const now = Date.now();
        const chatIdToCreate = id;
        chatStore.set((chats) => [
          {
            id: chatIdToCreate,
            title: text.length > 60 ? `${text.slice(0, 57)}...` : text,
            connectionId: activeConnectionStore.get(),
            messages: [],
            createdAt: now,
            updatedAt: now,
          },
          ...chats,
        ]);
        onCreate?.(id);
      }

      const userMessage: ChatMessage = {
        id: createId(),
        role: "user",
        content: text,
        createdAt: Date.now(),
      };
      const assistant = newAssistantMessage();
      updateMessages(id, (prev) => [...prev, userMessage, assistant]);
      void run(id, assistant.id, text);
    },
    [chatId, onCreate],
  );

  const stop = useCallback(() => {
    if (chatId) {
      controllers.get(chatId)?.abort();
    }
  }, [chatId]);

  const retry = useCallback(
    (assistantId: string) => {
      if (!chatId) {
        return;
      }
      const index = messages.findIndex((m) => m.id === assistantId);
      const question = messages
        .slice(0, index)
        .findLast((m) => m.role === "user")?.content;
      if (index === -1 || !question) {
        return;
      }
      const assistant = newAssistantMessage();
      updateMessages(chatId, (prev) =>
        prev.map((m) => (m.id === assistantId ? assistant : m)),
      );
      void run(chatId, assistant.id, question);
    },
    [chatId, messages],
  );

  const setFeedback = useCallback(
    (messageId: string, feedback: Feedback) => {
      if (!chatId) {
        return;
      }
      patchMessage(chatId, messageId, { feedback });
      const index = messages.findIndex((m) => m.id === messageId);
      const message = messages[index];
      const question = messages.slice(0, index).findLast((m) => m.role === "user")?.content;
      if (feedback && message) {
        void sendFeedback({
          chatId,
          messageId,
          question: question ?? "",
          feedback,
          sql: message.result?.sql,
        });
      }
    },
    [chatId, messages],
  );

  return { session, messages, isLoading, send, stop, retry, setFeedback };
}
