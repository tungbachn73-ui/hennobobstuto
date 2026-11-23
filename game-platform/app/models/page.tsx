"use client";

import { useEffect, useState } from "react";
import { MODELS, PLANS, PROVIDERS, canUseModel } from "@/lib/catalog";
import { SPECIALTY_META } from "@/lib/types";
import { useApp } from "@/lib/store";
import { fmtTokens, cls } from "@/lib/utils";

export default function ModelsPage() {
  const [mounted, setMounted] = useState(false);
  const tier = useApp((s) => s.tier);
  const keys = useApp((s) => s.keys);
  const setKey = useApp((s) => s.setKey);
  const useRealApi = useApp((s) => s.useRealApi);
  const toggleRealApi = useApp((s) => s.toggleRealApi);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="h1">Model roster</h1>
        <p className="muted mt-1">{MODELS.length} game-specialized models. Your {tier} plan unlocks everything at or below its tier.</p>
      </div>

      {PLANS.map((p) => (
        <section key={p.id}>
          <div className="flex items-center gap-2">
            <h2 className="h2">{p.name} tier</h2>
            {tier === p.id && <span className="chip border-neon/60 text-neon">your plan</span>}
            {tier !== p.id && <span className="chip">{fmtTokens(p.tokenPool)} pool on this plan</span>}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODELS.filter((m) => m.tier === p.id).map((m) => {
              const unlocked = canUseModel(tier, m);
              return (
                <div key={m.id} className={cls("card", !unlocked && "opacity-55")}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{m.emoji}</span>
                    <div>
                      <div className="font-bold text-white">{m.name} {unlocked ? "" : "🔒"}</div>
                      <div className="text-xs text-slate-400">{m.vendor} · {m.ctxK}K context</div>
                    </div>
                    <span className={cls("ml-auto chip", SPECIALTY_META[m.specialty].color)}>{SPECIALTY_META[m.specialty].label}</span>
                  </div>
                  <p className="muted mt-2">{m.blurb}</p>
                  <div className="mt-2 text-xs text-slate-500">≈ {fmtTokens(Math.round(10000 * m.costFactor * 0.3))} tokens per typical answer</div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section className="card">
        <h2 className="h2">🔑 Bring your own keys</h2>
        <p className="muted mt-1">
          Wire any legit provider directly: OpenRouter, Hugging Face, OpenAI, Anthropic, Google AI. Keys are stored locally in
          your browser (never on our servers) and proxied through your own deployment's <code className="text-neon">/api/generate</code> route.
          Equivalently, set the env var in your host and restart — the platform picks it up.
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={useRealApi} onChange={(e) => toggleRealApi(e.target.checked)} className="h-4 w-4 accent-neon" />
          Prefer my own API keys over the built-in engine when both are available
        </label>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {PROVIDERS.map((p) => (
            <div key={p.id} className="rounded-xl border border-edge bg-panel2 p-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-white">{p.name}</div>
                <a href={p.docs} target="_blank" rel="noreferrer" className="text-xs text-neon hover:underline">get a key ↗</a>
              </div>
              <p className="mt-1 text-xs text-slate-400">{p.note}</p>
              <div className="mt-2 flex gap-2">
                <input
                  className="input !py-1.5 text-xs"
                  type="password"
                  placeholder={p.hint}
                  value={drafts[p.id] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                />
                <button className="btn-ghost !py-1.5 text-xs" onClick={() => setKey(p.id, drafts[p.id] ?? "")}>Save</button>
              </div>
              <div className="mt-1.5 text-[10px] text-slate-500">
                {keys[p.id] ? "✅ key saved (masked locally)" : `env var: ${p.envVar}`}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
