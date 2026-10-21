import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { Shell } from "@/components/chat/shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VaakDB",
  description: "Ask your database questions in plain language",
};

// globals.css uses a `.dark` class for dark mode. Apply the saved choice from the
// theme toggle before first paint, otherwise follow the OS preference.
const THEME_SCRIPT = `(() => {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const saved = () => { try { return localStorage.getItem("vaakdb:theme"); } catch { return null; } };
  const apply = () => {
    const theme = saved();
    document.documentElement.classList.toggle("dark", theme ? theme === "dark" : mql.matches);
  };
  apply();
  mql.addEventListener("change", apply);
})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="h-full">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
