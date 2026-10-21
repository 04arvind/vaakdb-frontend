import type { Metadata } from "next";
import { ConnectionsView } from "@/components/vaakdb/connections-view";

export const metadata: Metadata = {
  title: "Connections · VaakDB",
};

export default function ConnectionsPage() {
  return <ConnectionsView />;
}
