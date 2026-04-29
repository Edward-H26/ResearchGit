import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "ResearchGit",
  description: "Co-design probe for crowdsourced research ideation",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        className="min-h-screen bg-neutral-100 text-neutral-950 antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
