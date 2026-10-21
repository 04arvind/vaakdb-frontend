import type { Metadata } from "next";
import { HistoryView } from "@/components/chat/history-view";

export const metadata: Metadata = {
  title: "History · VaakDB",
};

export default function HistoryPage() {
  return <HistoryView />;
}
