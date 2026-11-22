"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import UsageMeter from "@/components/UsageMeter";
import { fmtTokens, timeAgo, cls } from "@/lib/utils";
import { planById } from "@/lib/catalog";
import { uid } from "@/lib/utils";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const projects = useApp((s) => s.projects);
  const tier = useApp((s) => s.tier);
  const createProject = useApp((s) => s.createProject);
  const deleteProject = useApp((s) => s.deleteProject);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"ai" | "blocks">("ai");

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  const plan = planById(tier);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="h1">Your games</h1>
            <p className="muted mt-1">
              {plan.name} plan · squad cap {plan.squadMax} models · {fmtTokens(plan.tokenPool + useApp.getState().credits)} tokens
            </p>
          </div>
          <button className="btn-primary" onClick={() => setOpen(true)}>+ New game</button>
        </div>

        {projects.length === 0 ? (
          <div className="card grid place-items-center py-16 text-center">
            <div className="text-5xl">🕹️</div>
            <h2 className="h2 mt-4">No games yet</h2>
            <p className="muted mt-1 max-w-sm">
              Start with an AI squad, a blank block project, or try the demo below.
            </p>
            <div className="mt-4 flex gap-2">
              <button className="btn-primary" onClick={() => { const id = createProject({ name: "Orb Rush Demo", genre: "Arena collector", prompt: "a fast arena game about collecting orbs while a chaser hunts you", mode: "ai" }); setOpen(false); location.href = `/build/${id}`; }}>
                Create demo project
              </button>
              <button className="btn-ghost" onClick={() => setOpen(true)}>Start from scratch</button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <div key={p.id} className="card flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={p.mode === "ai" ? `/build/${p.id}` : `/edit/${p.id}`} className="font-bold text-white hover:text-neon">
                      {p.name}
                    </Link>
                    <div className="muted">{p.genre || "unclassified"} · edited {timeAgo(p.updatedAt)}</div>
                  </div>
                  {p.published && <span className="chip border-lime/40 text-lime">shipped</span>}
                </div>
                <p className="muted mt-2 line-clamp-2 flex-1">{p.pitch || "No pitch yet."}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {p.mode === "ai" && <span className="chip">🤖 {p.squad.length} agents</span>}
                  <span className="chip">💬 {p.chat.length} msgs</span>
                  <span className="chip">🏃 {p.runs.length} squad runs</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href={p.mode === "ai" ? `/build/${p.id}` : `/edit/${p.id}`} className="btn-ghost flex-1 !py-1.5">Open</Link>
                  {p.published && <Link href={`/play/${p.published ? p.slug : ""}`} className="btn-ghost !py-1.5">Play</Link>}
                  <Link href={`/publish/${p.id}`} className="btn-ghost !py-1.5">Publish</Link>
                  <button className="btn-ghost !py-1.5" title="Delete" onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteProject(p.id); }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {open && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setOpen(false)}>
            <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <h2 className="h2">New game</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">Project name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Neon Orb Rush" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">What's the game about?</label>
                  <textarea
                    className="input h-24 resize-none"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="a maze escape game where a robot collects batteries while security drones patrol"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Build mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button className={cls("rounded-xl border p-3 text-left", mode === "ai" ? "border-neon bg-neon/10" : "border-edge bg-panel2")} onClick={() => setMode("ai")}>
                      <div className="font-semibold text-white">🤖 AI Squad</div>
                      <div className="text-xs text-slate-400">Models build it together, you steer</div>
                    </button>
                    <button className={cls("rounded-xl border p-3 text-left", mode === "blocks" ? "border-neon bg-neon/10" : "border-edge bg-panel2")} onClick={() => setMode("blocks")}>
                      <div className="font-semibold text-white">🧱 Build by hand</div>
                      <div className="text-xs text-slate-400">Scratch-style blocks, no AI tokens used</div>
                    </button>
                  </div>
                </div>
                <button
                  className="btn-primary w-full"
                  onClick={() => {
                    const id = createProject({ name, genre: "from prompt", prompt, mode });
                    setOpen(false);
                    location.href = mode === "ai" ? `/build/${id}` : `/edit/${id}`;
                  }}
                >
                  Create project
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <div className="card">
          <h2 className="h2 mb-3 text-base">Usage</h2>
          <UsageMeter />
          <Link href="/settings/usage" className="mt-4 inline-block text-sm text-neon hover:underline">Usage details &amp; resets →</Link>
        </div>
        <div className="card">
          <h2 className="h2 mb-3 text-base">Quick links</h2>
          <div className="space-y-2 text-sm">
            <Link className="block text-slate-300 hover:text-neon" href="/models">🧠 Model roster &amp; BYO keys</Link>
            <Link className="block text-slate-300 hover:text-neon" href="/gallery">🖼️ Community gallery</Link>
            <Link className="block text-slate-300 hover:text-neon" href="/settings/billing">💳 Plans &amp; credit packs</Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
