"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { CREDIT_PACKS, PLANS, planById } from "@/lib/catalog";
import { fmtTokens, timeAgo, cls } from "@/lib/utils";

export default function BillingSettings() {
  return (
    <Suspense fallback={<div className="card">Loading billing…</div>}>
      <BillingInner />
    </Suspense>
  );
}

function BillingInner() {
  const [mounted, setMounted] = useState(false);
  const search = useSearchParams();
  const tier = useApp((s) => s.tier);
  const billingMode = useApp((s) => s.billingMode);
  const setTier = useApp((s) => s.setTier);
  const buyCredits = useApp((s) => s.buyCredits);
  const credits = useApp((s) => s.credits);
  const history = useApp((s) => s.history);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const preselect = search.get("plan");
  const plan = planById(tier);

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="h2">Current plan</h2>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-2xl font-extrabold text-white">{plan.name}</span>
          <span className="chip">{billingMode} · {plan.priceMonthly}{plan.priceOnce ? ` / ${plan.priceOnce}` : ""}</span>
          <span className="chip">{fmtTokens(plan.tokenPool + credits)} tokens available</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => {
          const active = p.id === tier;
          return (
            <div key={p.id} className={cls("card", active && "border-neon/60 shadow-glow")}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{p.name}</span>
                {active && <span className="chip border-lime/50 text-lime">active</span>}
              </div>
              <div className="mt-2 text-sm text-slate-300">{p.priceMonthly}{p.priceOnce ? ` or ${p.priceOnce}` : ""}</div>
              <div className="mt-1 text-xs text-slate-400">{fmtTokens(p.tokenPool)} tokens · squad {p.squadMax}</div>
              <button
                className={cls("mt-3 w-full", active ? "btn-ghost" : "btn-primary")}
                disabled={active}
                onClick={() => setTier(p.id, billingMode)}
              >
                {active ? "Current plan" : `Switch to ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2 className="h2">Billing mode</h2>
        <div className="mt-3 flex gap-2">
          {(["monthly", "once"] as const).map((m) => (
            <button
              key={m}
              className={cls("rounded-xl border px-4 py-2 text-sm", billingMode === m ? "border-neon bg-neon/10 text-white" : "border-edge bg-panel2 text-slate-400")}
              onClick={() => setTier(tier, m)}
            >
              {m === "monthly" ? "Pay monthly" : "Pay once (lifetime)"}
            </button>
          ))}
        </div>
        <p className="muted mt-2">Pay-once unlocks the same features with no rebills. Demo billing — swap in Stripe/Lemon Squeezy for production (see README).</p>
      </div>

      <div className="card">
        <h2 className="h2">Credit packs</h2>
        <p className="muted mt-1">{fmtTokens(credits)} credits in your wallet. Packs stack on any plan.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {CREDIT_PACKS.map((c) => (
            <button key={c.id} className={cls("btn-ghost justify-between", c.best && "border-lime/50")} onClick={() => buyCredits(c.tokens, c.label)}>
              <span>{fmtTokens(c.tokens)}</span>
              <span className="font-bold text-white">{c.price}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="h2">Billing history</h2>
        {history.length === 0 ? (
          <p className="muted mt-2">No activity yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-edge/60">
            {history.slice(0, 20).map((h) => (
              <div key={h.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-300">{h.text}</span>
                <span className="text-xs text-slate-500">{timeAgo(h.at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
