"use client";

import { useCallback } from "react";
import { useChatSession } from "@/hooks/use-active-chat";
import { chatStore, createId } from "@/lib/store";
import type { Attachment, ChatMessage, Feedback, OperationState } from "@/lib/types";
import {
  ApiError,
  cancelOperation,
  confirmOperation,
  getOperation,
  streamChat,
} from "@/lib/vaakdb-api";

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

function patchMessage(
  chatId: string,
  messageId: string,
  patch: Partial<ChatMessage> | ((m: ChatMessage) => Partial<ChatMessage>),
) {
  updateMessages(chatId, (messages) =>
    messages.map((m) =>
      m.id === messageId ? { ...m, ...(typeof patch === "function" ? patch(m) : patch) } : m,
    ),
  );
}

function newAssistantMessage(): ChatMessage {
  return { id: createId(), role: "assistant", content: "", createdAt: Date.now(), pending: true, steps: [] };
}

function errorText(error: unknown) {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.message };
  }
  return { message: error instanceof Error ? error.message : "Something went wrong." };
}

async function run(chatId: string, assistantId: string, question: string, uploadId?: string) {
  const chat = chatStore.get().find((c) => c.id === chatId);
  const controller = new AbortController();
  controllers.set(chatId, controller);
  const started = Date.now();

  try {
    const envelope = await streamChat(
      { message: question, upload_id: uploadId ?? null, conversation_id: chat?.conversationId ?? null },
      (event) => {
        if (event.event === "status") {
          patchMessage(chatId, assistantId, (m) => ({ steps: [...(m.steps ?? []), event.data] }));
        }
      },
      controller.signal,
    );

    if (envelope.conversation_id) {
      const conversationId = envelope.conversation_id;
      chatStore.set((chats) =>
        chats.map((c) => (c.id === chatId && !c.conversationId ? { ...c, conversationId } : c)),
      );
    }
    patchMessage(chatId, assistantId, {
      pending: false,
      content: envelope.message,
      response: envelope,
      durationMs: Date.now() - started,
      error:
        envelope.type === "error"
          ? { code: envelope.data.code, message: envelope.data.message || envelope.message }
          : undefined,
      operation: envelope.type === "operation_preview" ? { status: "pending" } : undefined,
    });
  } catch (error) {
    patchMessage(chatId, assistantId, {
      pending: false,
      error: controller.signal.aborted ? { message: "Stopped." } : errorText(error),
    });
  } finally {
    if (controllers.get(chatId) === controller) {
      controllers.delete(chatId);
    }
  }
}

export function isPending(message: ChatMessage) {
  return message.role === "assistant" && Boolean(message.pending);
}

function operationId(message: ChatMessage | undefined) {
  return message?.response?.type === "operation_preview"
    ? message.response.data.operation_id
    : null;
}

const STATUS_FROM_CODE: Record<string, OperationState["status"]> = {
  OPERATION_EXPIRED: "expired",
  OPERATION_NOT_FOUND: "failed",
};

/**
 * Chat state for one conversation. Pass `chatId = null` for a new chat;
 * `onCreate` fires with the new id when the first question is sent.
 */
export function useVaakdbChat(chatId: string | null, onCreate?: (id: string) => void) {
  const session = useChatSession(chatId);
  const messages = session?.messages ?? EMPTY;
  const isLoading = messages.some(isPending);

  const send = useCallback(
    (question: string, attachment?: Attachment) => {
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
            conversationId: null,
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
        attachment,
      };
      const assistant = newAssistantMessage();
      updateMessages(id, (prev) => [...prev, userMessage, assistant]);
      void run(id, assistant.id, text, attachment?.uploadId);
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
      const userMessage = messages.slice(0, index).findLast((m) => m.role === "user");
      if (index === -1 || !userMessage) {
        return;
      }
      const assistant = newAssistantMessage();
      updateMessages(chatId, (prev) => prev.map((m) => (m.id === assistantId ? assistant : m)));
      void run(chatId, assistant.id, userMessage.content, userMessage.attachment?.uploadId);
    },
    [chatId, messages],
  );

  /** POST /operations/{id}/confirm: nothing touches the database before this. */
  const confirm = useCallback(
    async (messageId: string) => {
      const opId = operationId(messages.find((m) => m.id === messageId));
      if (!chatId || !opId) {
        return;
      }
      patchMessage(chatId, messageId, { operation: { status: "confirming" } });
      try {
        const result = await confirmOperation(opId);
        patchMessage(chatId, messageId, {
          operation: { status: result.data.status, result, error: result.data.error ?? undefined },
        });
      } catch (error) {
        const { code, message } = errorText(error);
        patchMessage(chatId, messageId, {
          operation: { status: STATUS_FROM_CODE[code ?? ""] ?? "failed", error: message },
        });
      }
    },
    [chatId, messages],
  );

  const cancel = useCallback(
    async (messageId: string) => {
      const opId = operationId(messages.find((m) => m.id === messageId));
      if (!chatId || !opId) {
        return;
      }
      patchMessage(chatId, messageId, { operation: { status: "cancelling" } });
      try {
        const res = await cancelOperation(opId);
        patchMessage(chatId, messageId, { operation: { status: res.data.status } });
      } catch (error) {
        const { code, message } = errorText(error);
        patchMessage(chatId, messageId, {
          operation: { status: STATUS_FROM_CODE[code ?? ""] ?? "pending", error: message },
        });
      }
    },
    [chatId, messages],
  );

  /** Re-reads an operation's status from the server (after a reload, or when it expired). */
  const refreshOperation = useCallback(
    async (messageId: string) => {
      const opId = operationId(messages.find((m) => m.id === messageId));
      if (!chatId || !opId) {
        return;
      }
      try {
        const view = await getOperation(opId);
        patchMessage(chatId, messageId, (m) => ({
          operation: {
            status: view.status,
            error: view.error ?? undefined,
            result:
              view.status === "executed" && !m.operation?.result
                ? { type: "operation_result", data: view, message: "Done." }
                : m.operation?.result,
          },
        }));
      } catch {
        // keep the local state; the user can still try to confirm
      }
    },
    [chatId, messages],
  );

  const setFeedback = useCallback(
    (messageId: string, feedback: Feedback) => {
      // Stored with the local chat only: the backend has no feedback endpoint yet.
      if (chatId) {
        patchMessage(chatId, messageId, { feedback });
      }
    },
    [chatId],
  );

  return {
    session,
    messages,
    isLoading,
    send,
    stop,
    retry,
    confirm,
    cancel,
    refreshOperation,
    setFeedback,
  };
}
