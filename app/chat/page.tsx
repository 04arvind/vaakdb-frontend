import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatRoute, ChatSkeleton } from "@/components/chat/chat";

export const metadata: Metadata = {
  title: "Chat · VaakDB",
};

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ChatRoute />
    </Suspense>
  );
}
