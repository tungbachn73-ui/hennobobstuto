"use client";

import { useEffect, useRef } from "react";
import type { BlockProgram } from "@/lib/blocks";
import { Runtime, drawRuntime, RT_W, RT_H } from "@/lib/runtime";
import { cls } from "@/lib/utils";

const KEYMAP: Record<string, string> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

export default function GameStage({
  program,
  className,
  focusKey = true,
}: {
  program: BlockProgram;
  className?: string;
  focusKey?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rtRef = useRef<Runtime | null>(null);
  const focusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    rtRef.current = new Runtime(program);
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      const dt = last ? Math.min(50, t - last) : 16;
      last = t;
      rtRef.current?.step(dt);
      if (ctx) drawRuntime(rtRef.current!, ctx);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const kd = (e: KeyboardEvent) => {
      const k = KEYMAP[e.key] ?? KEYMAP[e.key.toLowerCase()];
      if (!k) return;
      e.preventDefault();
      rtRef.current?.pressKey(k);
    };
    const ku = (e: KeyboardEvent) => {
      const k = KEYMAP[e.key] ?? KEYMAP[e.key.toLowerCase()];
      if (k) rtRef.current?.releaseKey(k);
    };
    const target = focusKey ? focusRef.current : document;
    target?.addEventListener("keydown", kd as EventListener);
    target?.addEventListener("keyup", ku as EventListener);
    return () => {
      cancelAnimationFrame(raf);
      target?.removeEventListener("keydown", kd as EventListener);
      target?.removeEventListener("keyup", ku as EventListener);
    };
  }, [program, focusKey]);

  return (
    <div ref={focusRef} tabIndex={0} className={cls("outline-none", className)} onClick={() => focusRef.current?.focus()}>
      <canvas
        ref={canvasRef}
        width={RT_W}
        height={RT_H}
        className="w-full max-w-[480px] cursor-pointer rounded-2xl border border-edge bg-black"
      />
      <p className="mt-2 text-xs text-slate-500">Click the stage, then use arrow keys or WASD. Click again to restart animation focus.</p>
    </div>
  );
}
