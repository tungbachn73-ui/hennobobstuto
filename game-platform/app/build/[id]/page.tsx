"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { PROVIDERS, modelsForTier, planById, modelById } from "@/lib/catalog";
import { AGENT_ROLES } from "@/lib/types";
import type { AgentPersona } from "@/lib/types";
import { buildProgram, mockChat, runSquad } from "@/lib/engine";
import { fmtTokens, uid, cls, timeAgo } from "@/lib/utils";
import GameStage from "@/components/GameStage";

type EngineMode = "mock" | "real";

export default function BuildPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const project = useApp((s) => s.projects.find((p) => p.id === id));
  const tier = useApp((s) => s.tier);
  const keys = useApp((s) => s.keys);
  const addChat = useApp((s) => s.addChat);
  const setSquad = useApp((s) => s.setSquad);
  const addRun = useApp((s) => s.addRun);
  const setProgram = useApp((s) => s.setProgram);
  const consume = useApp((s) => s.consume);
  const poolUsed = useApp((s) => s.poolUsed());
  const pool = useApp((s) => s.pool());
  const addVersion = useApp((s) => s.addVersion);

  const [engine, setEngine] = useState<EngineMode>("mock");
  const [realProvider, setRealProvider] = useState(PROVIDERS[0].id as string);
  const [leadModel, setLeadModel] = useState("gemini-3-1-pro");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const plan = planById(tier);
  const available = useMemo(() => modelsForTier(tier), [tier]);
  const remaining = pool - poolUsed;

  if (!project) {
    return (
      <div className="card py-16 text-center">
        <p className="muted">Project not found.</p>
        <Link href="/dashboard" className="btn-primary mt-4">Back to dashboard</Link>
      </div>
    );
  }

  const proj = project;
  const estimateSquad = (n: number) => Math.round(12000 * Math.max(1, n) * 0.8);

  async function sendMessage() {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    addChat(id, { id: uid("m"), role: "user", text, at: Date.now() });
    setBusy(true);
    try {
      let replyText: string;
      let tokens: number;
      const key = keys[realProvider] ?? "";
      if (engine === "real" && key) {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: realProvider,
            apiKey: key,
            model: modelById(leadModel).id,
            system: `You are ${modelById(leadModel).name}, a game development expert inside GamePlatform. Be practical and concise.`,
            prompt: text,
          }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error ?? "provider error");
        replyText = data.text;
        tokens = data.tokens ?? 8000;
      } else {
        const m = mockChat(leadModel, text);
        replyText = m.text;
        tokens = m.tokens;
        await new Promise((r) => setTimeout(r, 350));
      }
      addChat(id, { id: uid("m"), role: "assistant", modelId: leadModel, text: replyText, tokens, at: Date.now() });
      consume(tokens, "chat", `chat with ${modelById(leadModel).name} · ${project?.name ?? "project"}`);
      setNotice(null);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Provider call failed");
    } finally {
      setBusy(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  function runSquadNow() {
    if (!proj.squad.length) {
      setNotice("Add at least one agent to the squad.");
      return;
    }
    const prompt = proj.prompt || proj.name;
    const base = estimateSquad(proj.squad.length);
    const overhead = tier === "free" ? 50_000 : tier === "pro" ? base * 4 : base * 9;
    const estTotal = base + overhead;
    if (estTotal > remaining) {
      setNotice(`This run needs ~${fmtTokens(estTotal)} tokens but only ${fmtTokens(remaining)} remain. Buy credits or wait for the window reset.`);
      return;
    }
    const run = runSquad(prompt, proj.squad, tier);
    addRun(id, run);
    consume(run.totalTokens, "squad", `squad of ${proj.squad.length} · ${proj.name}`);
    if (proj.squad.some((a) => a.role === "programmer")) {
      const built = buildProgram(prompt);
      setProgram(id, built.program);
      addVersion(id, `Squad wired “${built.name}” block program for ${proj.name}`);
    }
    setNotice(null);
  }

  const squad = project.squad;

  function updateAgent(agentId: string, patch: { role?: AgentPersona; modelId?: string; instructions?: string }) {
    setSquad(id, squad.map((a) => (a.id === agentId ? { ...a, ...patch } : a)));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="h1 !text-2xl">{project.name} · AI Builder</h1>
          <p className="muted">{project.genre} · {plan.name} plan · squad cap {plan.squadMax} · {fmtTokens(remaining)} tokens left</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/edit/${id}`} className="btn-ghost">🧱 Editor</Link>
          <Link href={`/publish/${id}`} className="btn-ghost">📸 Publish</Link>
          <button className="btn-primary" onClick={runSquadNow} disabled={busy}>⚡ Run squad ({squad.length})</button>
        </div>
      </div>

      {notice && <div className="rounded-xl border border-rose2/40 bg-rose2/10 px-4 py-2 text-sm text-rose2">{notice}</div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <div className="card flex h-[560px] flex-col">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select className="input !w-auto" value={leadModel} onChange={(e) => setLeadModel(e.target.value)}>
              {available.map((m) => (
                <option key={m.id} value={m.id}>{m.emoji} {m.name} ({m.vendor})</option>
              ))}
            </select>
            <select className="input !w-auto" value={engine} onChange={(e) => setEngine(e.target.value as EngineMode)}>
              <option value="mock">Engine: built-in (free)</option>
              <option value="real" disabled={!Object.values(keys).some(Boolean)}>Engine: my API key</option>
            </select>
            {engine === "real" && (
              <select className="input !w-auto" value={realProvider} onChange={(e) => setRealProvider(e.target.value)}>
                {PROVIDERS.filter((p) => keys[p.id]).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            {engine === "real" && !Object.values(keys).some(Boolean) && (
              <Link href="/settings/account" className="chip border-amber-400/50 text-amber-300">Add an API key first →</Link>
            )}
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto scroll-thin pr-1">
            {project.chat.map((m) => (
              <div key={m.id} className={cls("rounded-xl px-4 py-2.5 text-sm", m.role === "user" ? "ml-8 bg-neon/20" : "mr-8 bg-panel2")}>
                <div className="mb-1 text-xs text-slate-400">
                  {m.role === "user" ? "You" : `${m.modelId ? modelById(m.modelId).emoji + " " + modelById(m.modelId).name : "Assistant"}`}
                  {m.tokens ? ` · ${fmtTokens(m.tokens)} tokens` : ""}
                </div>
                <div className="whitespace-pre-wrap text-slate-200">{m.text}</div>
              </div>
            ))}
            {busy && <div className="rounded-xl bg-panel2 px-4 py-2.5 text-sm text-slate-400">thinking…</div>}
            <div ref={chatEndRef} />
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="input"
              placeholder="Describe the game, ask for changes, or say 'surprise me'…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button className="btn-primary !px-5" onClick={sendMessage} disabled={busy || !draft.trim()}>
              {busy ? "…" : "Send"}
            </button>
          </div>
        </div>

        <div className="card flex h-[560px] flex-col overflow-hidden">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="h2 text-base">👥 AI Squad</h2>
            <span className={cls("chip", squad.length >= plan.squadMax ? "border-rose2/50 text-rose2" : "")}>
              {squad.length}/{plan.squadMax}
            </span>
          </div>
          <p className="muted text-xs">{plan.squadOverheadLabel}</p>
          <div className="mt-3 flex-1 space-y-2 overflow-y-auto scroll-thin pr-1">
            {squad.map((a) => (
              <div key={a.id} className="rounded-xl border border-edge bg-panel2 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{AGENT_ROLES[a.role].emoji}</span>
                  <select className="input !w-auto !py-1 text-xs" value={a.role} onChange={(e) => updateAgent(a.id, { role: e.target.value as AgentPersona })}>
                    {Object.entries(AGENT_ROLES).map(([k, v]) => (
                      <option key={k} value={k}>{v.name}</option>
                    ))}
                  </select>
                  <button className="ml-auto text-xs text-slate-400 hover:text-rose2" onClick={() => setSquad(id, squad.filter((x) => x.id !== a.id))}>remove</button>
                </div>
                <select className="input mt-2 !py-1 text-xs" value={a.modelId} onChange={(e) => updateAgent(a.id, { modelId: e.target.value })}>
                  {available.map((m) => (
                    <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>
                  ))}
                </select>
                <textarea
                  className="input mt-2 h-14 resize-none text-xs"
                  value={a.instructions}
                  onChange={(e) => updateAgent(a.id, { instructions: e.target.value })}
                  placeholder="What is this agent's job?"
                />
                <div className="mt-1 text-[10px] text-slate-500">{AGENT_ROLES[a.role].playbook}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            <button
              className="btn-ghost w-full"
              disabled={squad.length >= plan.squadMax}
              onClick={() => {
                const used = new Set(squad.map((a) => a.role));
                const nextRole = (Object.keys(AGENT_ROLES) as AgentPersona[]).find((r) => !used.has(r)) ?? "designer";
                const free = available.filter((m) => !squad.some((a) => a.modelId === m.id));
                setSquad(id, [
                  ...squad,
                  {
                    id: uid("agent"),
                    role: nextRole,
                    modelId: (free[0] ?? available[0]).id,
                    instructions: AGENT_ROLES[nextRole].playbook,
                  },
                ]);
              }}
            >
              + Assign an agent
            </button>
            <p className="text-xs text-slate-500">
              Each agent executes its assignment in the next squad run. Solo chat ≈ {fmtTokens(Math.round(10000 * modelById(leadModel).costFactor * 0.3))} tokens; a {squad.length}-agent run applies the{" "}
              {tier === "free" ? "+50K flat" : tier === "pro" ? "5×" : "10×"} overhead.
            </p>
          </div>
        </div>
      </div>

      {project.runs.length > 0 && (
        <div className="space-y-4">
          <h2 className="h2 text-lg">Squad run log</h2>
          {project.runs.map((run) => (
            <div key={run.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-semibold text-white">⚡ {run.prompt.slice(0, 70)}</div>
                <div className="text-xs text-slate-400">
                  {timeAgo(run.at)} · {fmtTokens(run.totalTokens)} tokens ({fmtTokens(run.overheadTokens)} squad overhead)
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {run.responses.map((r) => {
                  const agent = project.squad.find((a) => a.id === r.agentId);
                  const role = agent ? AGENT_ROLES[agent.role] : null;
                  return (
                    <div key={r.agentId} className="rounded-xl border border-edge bg-panel2 p-3">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{role?.emoji}</span>
                        <span className="font-semibold text-slate-200">{role?.name}</span>
                        <span>· {modelById(r.modelId).name}</span>
                        <span className="ml-auto">{fmtTokens(r.tokens)}</span>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{r.text}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2 className="h2 mb-3 text-base">Live preview</h2>
        <GameStage program={project.program} />
        <Link href={`/edit/${id}`} className="mt-3 inline-block text-sm text-neon hover:underline">Open the block editor to tune it →</Link>
      </div>
    </div>
  );
}
