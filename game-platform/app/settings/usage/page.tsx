"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import UsageMeter from "@/components/UsageMeter";
import { fmtTokens, timeAgo } from "@/lib/utils";
import { CREDIT_PACKS, planById } from "@/lib/catalog";

export default function UsageSettings() {
  const [mounted, setMounted] = useState(false);
  const events = useApp((s) => s.usageEvents);
  const tier = useApp((s) => s.tier);
  const buyCredits = useApp((s) => s.buyCredits);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const plan = planById(tier);
  const recent = [...events].reverse().slice(0, 25);
  const byKind = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.kind] = (acc[e.kind] ?? 0) + e.tokens;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="h2">Pool &amp; windows</h2>
        <p className="muted mt-1">
          {plan.name} plan: {fmtTokens(plan.tokenPool)} tokens included. Window caps are soft guardrails: hourly (resets every 3h)
          and weekly (resets every 7 days) so a single day can't drain the whole pool.
        </p>
        <div className="mt-4">
          <UsageMeter />
        </div>
      </div>

      <div className="card">
        <h2 className="h2">Breakdown</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {["chat", "squad", "assets", "import"].map((k) => (
            <div key={k} className="rounded-xl bg-panel2 p-3">
              <div className="text-lg font-extrabold text-white">{fmtTokens(byKind[k] ?? 0)}</div>
              <div className="text-xs text-slate-400">{k} tokens</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="h2">Recent activity</h2>
        {recent.length === 0 ? (
          <p className="muted mt-2">No usage yet — go build something.</p>
        ) : (
          <div className="mt-3 divide-y divide-edge/60">
            {recent.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="chip capitalize">{e.kind}</span> <span className="text-slate-300">{e.note}</span>
                </div>
                <div className="text-right text-xs text-slate-400">
                  +{fmtTokens(e.tokens)} tokens
                  <div>{timeAgo(e.at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="h2">Top up now</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {CREDIT_PACKS.map((c) => (
            <button key={c.id} className="btn-ghost justify-between" onClick={() => buyCredits(c.tokens, c.label)}>
              <span>{fmtTokens(c.tokens)} tokens</span>
              <span className="font-bold text-white">{c.price}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
