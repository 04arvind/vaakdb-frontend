import { redirect } from "next/navigation";

// The root only redirects, so there is no shell to validate.
export const instant = false;

export default function Home() {
  redirect("/chat");
}
