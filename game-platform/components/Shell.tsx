"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { fmtTokens, cls } from "@/lib/utils";
import { planById } from "@/lib/catalog";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/models", label: "Models" },
  { href: "/gallery", label: "Gallery" },
  { href: "/settings/general", label: "Settings" },
];

export function PlanBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    free: "border-edge text-slate-300",
    pro: "border-neon/60 text-neon bg-neon/10",
    max: "border-amber-400/60 text-amber-300 bg-amber-400/10",
  };
  return (
    <span className={cls("chip border", styles[tier] ?? styles.free)}>
      {tier === "max" ? "★" : tier === "pro" ? "◆" : "●"} {planById(tier as "free").name}
    </span>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const tier = useApp((s) => s.tier);
  const poolUsed = useApp((s) => s.poolUsed());
  const pool = useApp((s) => s.pool());

  useEffect(() => setMounted(true), []);

  if (pathname.startsWith("/play/")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-edge/70 bg-ink/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight text-white">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-neon to-aqua text-sm shadow-glow">🎮</span>
            GamePlatform
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cls(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                  pathname.startsWith(l.href.split("/").slice(0, 2).join("/")) ? "bg-panel2 text-white" : "text-slate-400 hover:text-white"
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {mounted && (
              <>
                <span className="hidden text-xs text-slate-400 md:inline">
                  {fmtTokens(poolUsed)} / {fmtTokens(pool)} tokens
                </span>
                <PlanBadge tier={tier} />
              </>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <footer className="border-t border-edge/60 py-6 text-center text-xs text-slate-500">
        GamePlatform · build games with AI squads · ship anywhere, free
      </footer>
    </div>
  );
}
