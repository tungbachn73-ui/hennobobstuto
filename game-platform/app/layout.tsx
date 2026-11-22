import type { Metadata } from "next";
import "./globals.css";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "GamePlatform — build games with AI squads",
  description:
    "Build games with multiple AI models working as a squad, or with a beginner-friendly Scratch-style editor. Publish everywhere for free.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
