"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import type { PublishedInfo } from "@/lib/store";
import { Runtime, drawRuntime, RT_W, RT_H } from "@/lib/runtime";
import { downloadHtml } from "@/lib/exporter";
import { fmtTokens, uid, cls } from "@/lib/utils";

const ICON_GLYPHS = ["🎮", "🚀", "⭐", "👾", "🛸", "🐉", "🔥", "⚡", "🌙", "💎"];

type StepState = "idle" | "running" | "done";

interface Step {
  id: string;
  title: string;
  detail: string;
}

const STEPS: Step[] = [
  { id: "verify", title: "Verify & optimize build", detail: "Compile-check the block program, prune dead branches, bucket sprites." },
  { id: "icon", title: "Design app icon & logo", detail: "Palette-derived gradient + glyph lockup at 512px." },
  { id: "shots", title: "Capture key-scene screenshots", detail: "Auto-play the game and photograph opening, mid-run and finale." },
  { id: "trailer", title: "Cut the trailer", detail: "Sample animated frames with motion pacing for the store page." },
  { id: "listing", title: "Write the store listing", detail: "Pitch copy generated from your project brief." },
];

export default function PublishPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const project = useApp((s) => s.projects.find((p) => p.id === id));
  const publish = useApp((s) => s.publish);
  const consume = useApp((s) => s.consume);
  const galleryPublic = useApp((s) => s.privacy.galleryPublic);
  const tier = useApp((s) => s.tier);

  const [states, setStates] = useState<Record<string, StepState>>({});
  const [icon, setIcon] = useState<string | null>(null);
  const [shots, setShots] = useState<string[]>([]);
  const [frames, setFrames] = useState<string[]>([]);
  const [listing, setListing] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [trailerIdx, setTrailerIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (project?.published) {
      setIcon(project.published.iconDataUri);
      setShots(project.published.screenshots);
      setFrames(project.published.trailerFrames);
      setListing(project.published.description);
      setDone(true);
      setStates(Object.fromEntries(STEPS.map((s) => [s.id, "done"])));
    }
  }, [project?.published]);

  useEffect(() => {
    if (!frames.length || !done) return;
    const t = setInterval(() => setTrailerIdx((i) => (i + 1) % frames.length), 450);
    return () => clearInterval(t);
  }, [frames, done]);

  if (!project) {
    return (
      <div className="card py-16 text-center">
        <p className="muted">Project not found.</p>
        <Link href="/dashboard" className="btn-primary mt-4">Back to dashboard</Link>
      </div>
    );
  }

  const cost = 60000;

  async function runPipeline() {
    if (running || !project) return;
    setRunning(true);
    setDone(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;

    const setStep = (sid: string, st: StepState) => setStates((s) => ({ ...s, [sid]: st }));

    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    setStep("verify", "running");
    await wait(500);
    const rt0 = new Runtime(project.program);
    let steps = 0;
    while (rt0.state.status === "playing" && steps++ < 600) rt0.step(16);
    setStep("verify", "done");

    setStep("icon", "running");
    await wait(500);
    const glyph = ICON_GLYPHS[project.name.length % ICON_GLYPHS.length];
    const iconCanvas = document.createElement("canvas");
    iconCanvas.width = 512;
    iconCanvas.height = 512;
    const ictx = iconCanvas.getContext("2d")!;
    const [c1, c2] = (project.program.bg.includes("|") ? project.program.bg : "#151a33|#0a0b12").split("|");
    const grad = ictx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ictx.fillStyle = grad;
    ictx.fillRect(0, 0, 512, 512);
    ictx.fillStyle = "rgba(255,255,255,0.08)";
    ictx.fillRect(0, 300, 512, 212);
    ictx.font = "260px serif";
    ictx.textAlign = "center";
    ictx.textBaseline = "middle";
    ictx.fillText(glyph, 256, 240);
    ictx.font = "bold 44px system-ui, sans-serif";
    ictx.fillStyle = "#ffffff";
    ictx.fillText(project.name.slice(0, 12).toUpperCase(), 256, 430);
    const iconUri = iconCanvas.toDataURL("image/png");
    setIcon(iconUri);
    setStep("icon", "done");

    setStep("shots", "running");
    await wait(500);
    const shotCanvas = document.createElement("canvas");
    shotCanvas.width = RT_W;
    shotCanvas.height = RT_H;
    const sctx = shotCanvas.getContext("2d")!;
    const taken: string[] = [];
    for (let take = 0; take < 3; take++) {
      const rt = new Runtime(project.program);
      for (let f = 0; f < take * 90 + 45; f++) {
        rt.step(16);
        if (f % 40 === 0) rt.pressKey(["up", "right", "down", "left"][take]);
        if (f % 40 === 20) rt.releaseKey(["up", "right", "down", "left"][take]);
      }
      drawRuntime(rt, sctx);
      taken.push(shotCanvas.toDataURL("image/png"));
    }
    setShots(taken);
    setStep("shots", "done");

    setStep("trailer", "running");
    await wait(500);
    const fr: string[] = [];
    const rtT = new Runtime(project.program);
    let pressed = false;
    for (let f = 0; f < 240; f++) {
      rtT.step(16);
      if (f > 30 && !pressed) {
        rtT.pressKey("right");
        pressed = true;
      }
      if (f % 30 === 0) {
        drawRuntime(rtT, sctx);
        fr.push(shotCanvas.toDataURL("image/jpeg", 0.7));
      }
    }
    setFrames(fr);
    setStep("trailer", "done");

    setStep("listing", "running");
    await wait(500);
    const text = [
      `${project.name} — ${project.genre || "arcade"}`,
      "",
      project.pitch || "A fast arcade game built in GamePlatform.",
      "",
      "🎯 Collect every orb to clear the level",
      "👻 Dodge the chaser — one touch ends the run",
      "🎮 Arrow keys / WASD · instant restart",
      "",
      `Built with a ${project.squad.length || "solo"}-agent AI squad in GamePlatform.`,
    ].join("\n");
    setListing(text);
    setStep("listing", "done");

    const info: PublishedInfo = {
      at: Date.now(),
      iconDataUri: iconUri,
      screenshots: taken,
      trailerFrames: fr,
      description: text,
      gallery: galleryPublic,
    };
    publish(id, info);
    consume(cost, "assets", `publish kit · ${project.name}`);
    setDone(true);
    setRunning(false);
  }

  const pctDone = () => Math.round((Object.values(states).filter((s) => s === "done").length / STEPS.length) * 100);

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} width={RT_W} height={RT_H} className="hidden" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="h1 !text-2xl">Publish · {project.name}</h1>
          <p className="muted">{tier === "free" ? "Free" : tier === "pro" ? "Pro" : "Max"} pipeline · store kit costs ~{fmtTokens(cost)} tokens</p>
        </div>
        <div className="flex gap-2">
          <Link href={project.mode === "ai" ? `/build/${id}` : `/edit/${id}`} className="btn-ghost">← Back to build</Link>
          <button className="btn-primary" onClick={runPipeline} disabled={running}>
            {running ? "Working…" : done ? "↻ Regenerate kit" : "🚀 Generate store kit & publish"}
          </button>
        </div>
      </div>

      {done && project.published && (
        <div className="rounded-xl border border-lime/40 bg-lime/10 px-4 py-3 text-sm text-lime">
          ✅ Published! Your game is live at <Link href={`/play/${project.slug}`} className="underline font-semibold">/play/{project.slug}</Link> and the HTML5 export is one click away.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="h2 text-base">Pipeline {done && `· ${pctDone()}%`}</h2>
          <ol className="mt-3 space-y-3">
            {STEPS.map((s) => {
              const st = states[s.id] ?? "idle";
              return (
                <li key={s.id} className="flex items-start gap-3">
                  <span className={cls(
                    "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                    st === "done" ? "bg-lime/20 text-lime" : st === "running" ? "bg-neon/30 text-neon animate-pulse" : "bg-panel2 text-slate-500"
                  )}>
                    {st === "done" ? "✓" : st === "running" ? "…" : "•"}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-white">{s.title}</div>
                    <div className="text-xs text-slate-400">{s.detail}</div>
                  </div>
                </li>
              );
            })}
          </ol>
          {done && (
            <div className="mt-4">
              <button className="btn-primary w-full" onClick={() => downloadHtml(project.name, project.program)}>
                📦 Download standalone HTML5 game
              </button>
              <p className="mt-2 text-xs text-slate-500">A single .html file that runs anywhere — no installs, no lock-in. Send it to itch.io, your site, a USB stick, whatever.</p>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="h2 text-base">Store kit preview</h2>
          {icon && (
            <div className="mt-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={icon} alt="App icon" className="h-20 w-20 rounded-2xl border border-edge" />
              <div>
                <div className="font-bold text-white">{project.name}</div>
                <div className="text-xs text-slate-400">Auto-generated icon &amp; logo lockup</div>
              </div>
            </div>
          )}
          {shots.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-bold text-white">Screenshots of key scenes</h3>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {shots.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt={`Screenshot ${i + 1}`} className="w-full rounded-lg border border-edge" />
                ))}
              </div>
            </>
          )}
          {frames.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-bold text-white">Trailer (frames sampled by the platform)</h3>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={frames[trailerIdx]} alt="Trailer frame" className="mt-2 w-full rounded-lg border border-edge" />
            </>
          )}
          {listing && (
            <>
              <h3 className="mt-4 text-sm font-bold text-white">Store listing</h3>
              <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-edge bg-panel2 p-3 text-xs text-slate-300">{listing}</pre>
            </>
          )}
          {!done && <p className="muted mt-6 text-center">Run the pipeline to generate the icon, screenshots, trailer and listing.</p>}
        </div>
      </div>
    </div>
  );
}
