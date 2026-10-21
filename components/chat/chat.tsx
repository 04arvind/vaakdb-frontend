"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { Greeting } from "@/components/chat/greeting";
import { Messages } from "@/components/chat/messages";
import { SuggestedActions } from "@/components/chat/suggested-actions";
import { SchemaSidebar } from "@/components/vaakdb/schema-sidebar";
import { useActiveConnection, useHydrated } from "@/hooks/use-active-chat";
import { useVaakdbChat } from "@/hooks/use-vaakdb-chat";

/** Reads ?id= and remounts the chat when switching conversations. */
export function ChatRoute() {
  const id = useSearchParams().get("id");
  return <Chat key={id ?? "new"} chatId={id} />;
}

function Chat({ chatId }: { chatId: string | null }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const activeConnection = useActiveConnection();
  const [input, setInput] = useState("");
  const [schemaOpen, setSchemaOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const onCreate = useCallback(
    (id: string) => router.replace(`/chat?id=${id}`, { scroll: false }),
    [router],
  );
  const { session, messages, isLoading, send, stop, retry, setFeedback } = useVaakdbChat(
    chatId,
    onCreate,
  );

  const submit = (text = input) => {
    if (!text.trim() || isLoading) {
      return;
    }
    send(text);
    setInput("");
  };

  const insert = (text: string) => {
    setInput((prev) => (prev && !prev.endsWith(" ") ? `${prev} ${text}` : `${prev}${text}`));
    textareaRef.current?.focus();
  };

  if (hydrated && chatId && !session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-medium">This conversation doesn&apos;t exist anymore.</p>
        <Link href="/chat" className="text-sm text-primary hover:underline">
          Start a new chat
        </Link>
      </div>
    );
  }

  const isEmpty = messages.length === 0;
  const schemaConnection = session ? session.connectionId : (activeConnection?.id ?? null);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatHeader
          title={session?.title ?? "New chat"}
          schemaOpen={schemaOpen}
          onToggleSchema={() => setSchemaOpen((v) => !v)}
          lockDatabase={Boolean(session)}
        />

        {isEmpty ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-4 py-8">
            <Greeting />
            <div className="w-full max-w-2xl">
              <SuggestedActions onSelect={(text) => submit(text)} />
            </div>
          </div>
        ) : (
          <Messages messages={messages} onRetry={retry} onFeedback={setFeedback} />
        )}

        <div className="mx-auto w-full max-w-3xl px-4 pb-4">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={() => submit()}
            onStop={stop}
            isLoading={isLoading}
            textareaRef={textareaRef}
          />
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Read-only queries, checked by guardrails. Verify important numbers.
          </p>
        </div>
      </div>

      <SchemaSidebar
        open={schemaOpen}
        connectionId={schemaConnection}
        onClose={() => setSchemaOpen(false)}
        onInsert={insert}
      />
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="h-14 shrink-0 border-b" />
      <div className="flex-1" />
    </div>
  );
}
