"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { BLOCK_DEFS, countBlocks, defByKind, makeBlock, replaceScript, type Block } from "@/lib/blocks";
import { GRADIENTS, drawRuntime, RT_H, RT_W, Runtime } from "@/lib/runtime";
import { uid, cls } from "@/lib/utils";
import GameStage from "@/components/GameStage";

const CAT_STYLE: Record<string, string> = {
  events: "bg-amber-500/20 border-amber-500/50",
  motion: "bg-sky-500/20 border-sky-500/50",
  looks: "bg-fuchsia-500/20 border-fuchsia-500/50",
  control: "bg-orange-500/20 border-orange-500/50",
  game: "bg-lime-500/20 border-lime-500/50",
};

const ARG_LABEL: Record<string, string> = {
  steps: "steps",
  degrees: "°",
  seconds: "sec",
  times: "times",
  text: "text",
  key: "key",
  color: "hex",
  shape: "shape",
  x: "x",
  y: "y",
  points: "pts",
  size: "size",
};

export default function EditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const project = useApp((s) => s.projects.find((p) => p.id === id));
  const setProgram = useApp((s) => s.setProgram);
  const [spriteId, setSpriteId] = useState("hero");
  const [cat, setCat] = useState<string>("all");

  const program = project?.program;

  const script = useMemo(() => {
    if (!program) return [];
    return program.sprites.find((s) => s.spriteId === spriteId)?.blocks ?? [];
  }, [program, spriteId]);

  if (!project || !program) {
    return (
      <div className="card py-16 text-center">
        <p className="muted">Project not found.</p>
        <Link href="/dashboard" className="btn-primary mt-4">Back to dashboard</Link>
      </div>
    );
  }

  const update = (blocks: Block[]) => setProgram(id, replaceScript(program, spriteId, blocks));

  function mutateScript(fn: (blocks: Block[]) => Block[]) {
    update(fn([...script]));
  }

  const total = countBlocks(script);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="h1 !text-2xl">{project.name} · Block editor</h1>
          <p className="muted">Scratch-style, but everything actually runs. {total} blocks in this sprite.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/build/${id}`} className="btn-ghost">🤖 AI Builder</Link>
          <Link href={`/publish/${id}`} className="btn-primary">📸 Publish it</Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr_400px]">
        {/* Palette */}
        <div className="card h-[620px] overflow-y-auto scroll-thin">
          <h2 className="h2 mb-2 text-sm">Blocks</h2>
          <div className="mb-3 flex flex-wrap gap-1">
            {["all", "events", "motion", "looks", "control", "game"].map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cls("rounded-md px-2 py-0.5 text-xs", cat === c ? "bg-neon text-white" : "bg-panel2 text-slate-400")}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            {BLOCK_DEFS.filter((b) => cat === "all" || b.cat === cat).map((def) => (
              <button
                key={def.kind}
                title={def.hint}
                onClick={() => mutateScript((bs) => [...bs, makeBlock(def)])}
                className={cls("w-full rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium text-white transition hover:brightness-125", CAT_STYLE[def.cat])}
              >
                {def.label}
              </button>
            ))}
          </div>
        </div>

        {/* Script area */}
        <div className="card h-[620px] overflow-y-auto scroll-thin">
          <div className="mb-2 flex flex-wrap items-center gap-1">
            {program.sprites.map((s) => (
              <button
                key={s.spriteId}
                onClick={() => setSpriteId(s.spriteId)}
                className={cls("rounded-lg px-2.5 py-1 text-xs font-semibold", spriteId === s.spriteId ? "bg-neon text-white" : "bg-panel2 text-slate-400 hover:text-white")}
              >
                {s.spriteId}
              </button>
            ))}
            <button
              className="rounded-lg bg-panel2 px-2.5 py-1 text-xs text-slate-400 hover:text-white"
              onClick={() => {
                const name = prompt("New sprite name (e.g. 'chaser2')");
                if (name && !program.sprites.some((s) => s.spriteId === name)) {
                  setProgram(id, replaceScript(program, name, []));
                  setSpriteId(name);
                }
              }}
            >
              + sprite
            </button>
          </div>
          {script.length === 0 ? (
            <div className="grid h-64 place-items-center rounded-xl border border-dashed border-edge text-sm text-slate-500">
              Click blocks on the left to build this sprite's program. Start with “when 🏁 clicked” or a “forever” loop.
            </div>
          ) : (
            <BlockList
              blocks={script}
              onChange={update}
              move={(from, to) =>
                mutateScript((bs) => {
                  const copy = [...bs];
                  if (to < 0 || to >= copy.length) return bs;
                  const [b] = copy.splice(from, 1);
                  copy.splice(to, 0, b);
                  return copy;
                })
              }
            />
          )}
        </div>

        {/* Stage + scenes */}
        <div className="card h-[620px] overflow-y-auto scroll-thin">
          <h2 className="h2 mb-2 text-sm">Stage</h2>
          <GameStage program={program} />
          <h3 className="mt-4 text-sm font-bold text-white">Background</h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {GRADIENTS.map((g) => (
              <button
                key={g.pair}
                onClick={() => setProgram(id, { ...program, bg: g.pair })}
                className={cls("rounded-lg border px-2 py-1.5 text-left text-xs", program.bg === g.pair ? "border-neon text-white" : "border-edge text-slate-400")}
              >
                <span className="mr-1 inline-block h-3 w-3 rounded-sm align-middle" style={{ background: g.css }} />
                {g.label}
              </button>
            ))}
          </div>
          <h3 className="mt-4 text-sm font-bold text-white">Danger zone</h3>
          <button className="btn-danger mt-2 w-full !py-1.5 text-xs" onClick={() => update([])}>Clear this sprite's script</button>
          {spriteId !== "hero" && spriteId !== program.sprites[0]?.spriteId && (
            <button
              className="btn-danger mt-2 w-full !py-1.5 text-xs"
              onClick={() => {
                const sprites = program.sprites.filter((s) => s.spriteId !== spriteId);
                setProgram(id, { ...program, sprites });
                setSpriteId("hero");
              }}
            >
              Delete sprite “{spriteId}”
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BlockList({
  blocks,
  onChange,
  move,
  depth = 0,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  move?: (from: number, to: number) => void;
  depth?: number;
}) {
  return (
    <div className={cls(depth > 0 && "ml-5 border-l-2 border-edge pl-3")}>
      {blocks.map((b, i) => {
        const def = defByKind(b.kind);
        const patch = (nb: Partial<Block>) => onChange(blocks.map((x, j) => (j === i ? { ...b, ...nb } : x)));
        const argKeys = def.fields ? def.fields.split("|").map((s) => s.split(":")[0]) : [];
        return (
          <div key={`${b.kind}-${i}`} className="mb-2">
            <div className={cls("flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-2.5 py-1.5 text-xs", CAT_STYLE[def.cat])}>
              <span className="font-semibold text-white">{def.label}</span>
              {argKeys.map((k) => (
                <label key={k} className="flex items-center gap-1 text-[10px] text-slate-300">
                  {ARG_LABEL[k] ?? k}
                  {k === "text" || k === "color" ? (
                    k === "color" ? (
                      <input type="color" value={b.args?.[k] ?? "#7c5cff"} onChange={(e) => patch({ args: { ...b.args, [k]: e.target.value } })} className="h-5 w-8 cursor-pointer rounded border-0 bg-transparent p-0" />
                    ) : (
                      <input className="w-24 rounded bg-black/40 px-1.5 py-0.5 text-[11px] text-white outline-none" value={b.args?.[k] ?? ""} onChange={(e) => patch({ args: { ...b.args, [k]: e.target.value } })} />
                    )
                  ) : k === "shape" ? (
                    <select className="rounded bg-black/40 px-1 py-0.5 text-[11px]" value={b.args?.shape ?? "circle"} onChange={(e) => patch({ args: { ...b.args, shape: e.target.value } })}>
                      <option>circle</option>
                      <option>square</option>
                      <option>triangle</option>
                      <option>star</option>
                    </select>
                  ) : k === "key" ? (
                    <select className="rounded bg-black/40 px-1 py-0.5 text-[11px]" value={b.args?.key ?? "right"} onChange={(e) => patch({ args: { ...b.args, key: e.target.value } })}>
                      <option value="up">up</option>
                      <option value="down">down</option>
                      <option value="left">left</option>
                      <option value="right">right</option>
                    </select>
                  ) : (
                    <input className="w-12 rounded bg-black/40 px-1 py-0.5 text-[11px] text-white outline-none" value={b.args?.[k] ?? ""} onChange={(e) => patch({ args: { ...b.args, [k]: e.target.value } })} />
                  )}
                </label>
              ))}
              <span className="ml-auto flex gap-1">
                {move && (
                  <>
                    <button className="text-slate-400 hover:text-white" onClick={() => move(i, i - 1)}>↑</button>
                    <button className="text-slate-400 hover:text-white" onClick={() => move(i, i + 1)}>↓</button>
                  </>
                )}
                <button className="text-slate-400 hover:text-rose2" onClick={() => onChange(blocks.filter((_, j) => j !== i))}>✕</button>
              </span>
            </div>
            {b.children && (
              <div className="mt-2">
                <BlockList blocks={b.children} onChange={(childBlocks) => patch({ children: childBlocks })} depth={depth + 1} />
                <select
                  className="mt-1 rounded-md bg-panel2 px-2 py-1 text-[10px] text-slate-400"
                  value=""
                  onChange={(e) => {
                    const defChild = BLOCK_DEFS.find((d) => d.kind === e.target.value);
                    if (!defChild) return;
                    patch({ children: [...(b.children ?? []), makeBlock(defChild)] });
                  }}
                >
                  <option value="">+ add block inside…</option>
                  {BLOCK_DEFS.map((d) => (
                    <option key={d.kind} value={d.kind}>{d.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
