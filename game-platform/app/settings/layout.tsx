"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cls } from "@/lib/utils";

const TABS = [
  { href: "/settings/general", label: "General", emoji: "⚙️" },
  { href: "/settings/usage", label: "Usage", emoji: "📊" },
  { href: "/settings/privacy", label: "Privacy", emoji: "🔒" },
  { href: "/settings/account", label: "Account & API keys", emoji: "👤" },
  { href: "/settings/billing", label: "Billing", emoji: "💳" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside>
        <h1 className="h2 mb-3">Settings</h1>
        <nav className="space-y-1">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={cls(
                "block rounded-xl px-3 py-2 text-sm font-medium transition",
                pathname === t.href ? "bg-neon/15 text-white" : "text-slate-400 hover:bg-panel2 hover:text-white"
              )}
            >
              {t.emoji} {t.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
