import type { Block, BlockProgram } from "./blocks";

export const RT_W = 480;
export const RT_H = 320;

export interface RuntimeSprite {
  id: string;
  name: string;
  x: number;
  y: number;
  dir: number;
  color: string;
  shape: string;
  size: number;
  script: Block[];
  stack: Frame[];
  waitUntil: number;
  say: string | null;
  sayUntil: number;
}

interface Frame {
  blocks: Block[];
  i: number;
  loopLeft: number; // -1 = infinite
}

export interface GameState {
  score: number;
  level: number;
  status: "playing" | "won" | "lost";
  banner: string;
  frame: number;
  log: string[];
}

export interface Orb {
  id: string;
  x: number;
  y: number;
  points: number;
  color: string;
}

function n(b: Block, k: string, fallback = 0): number {
  const v = parseFloat(b.args?.[k]);
  return Number.isFinite(v) ? v : fallback;
}

let orbSeq = 0;

export class Runtime {
  program: BlockProgram;
  sprites: RuntimeSprite[] = [];
  orbs: Orb[] = [];
  keys: Set<string> = new Set();
  state: GameState = freshState();
  private now = 0;
  confetti = false;

  constructor(program: BlockProgram) {
    this.program = program;
    this.reset();
  }

  reset() {
    this.orbs = [];
    this.now = 0;
    this.confetti = false;
    this.state = freshState();
    this.sprites = this.program.sprites.map((s, i) => ({
      id: s.spriteId,
      name: s.spriteId,
      x: 120 + (i % 4) * 90,
      y: 160 + Math.floor(i / 4) * 60,
      dir: 0,
      color: i === 0 ? "#7c5cff" : i === 1 ? "#22d3ee" : i === 2 ? "#fb7185" : "#a3e635",
      shape: s.spriteId === "hero" ? "star" : "circle",
      size: s.spriteId === "hero" ? 20 : 16,
      script: s.blocks,
      stack: [],
      waitUntil: 0,
      say: null,
      sayUntil: 0,
    }));
    for (const s of this.sprites) this.startScript(s);
  }

  private startScript(s: RuntimeSprite) {
    if (!s.script.length) {
      s.stack = [];
      return;
    }
    const first = s.script[0];
    if (first.kind === "whenKey" && !this.keys.has(first.args?.key ?? "")) {
      s.stack = [];
      return;
    }
    s.stack = [{ blocks: s.script, i: 0, loopLeft: -1 }];
  }

  pressKey(k: string) {
    this.keys.add(k);
    for (const s of this.sprites) {
      if (s.stack.length) continue;
      const handler = s.script.find((b) => b.kind === "whenKey" && (b.args?.key ?? "") === k);
      if (handler) s.stack = [{ blocks: s.script, i: 0, loopLeft: -1 }];
    }
  }

  releaseKey(k: string) {
    this.keys.delete(k);
  }

  step(dtMs: number) {
    this.state.frame++;
    if (this.state.status !== "playing") return;
    this.now += dtMs;
    for (const s of this.sprites) {
      if (this.now < s.waitUntil) continue;
      if (!s.stack.length && s.script.length) this.startScript(s);
      if (!s.stack.length) continue;
      this.execSprite(s, 96);
      if (s.sayUntil && this.now > s.sayUntil) {
        s.say = null;
        s.sayUntil = 0;
      }
    }
    for (const s of this.sprites) {
      for (const orb of this.orbs) {
        const dx = s.x - orb.x;
        const dy = s.y - orb.y;
        if (dx * dx + dy * dy < (s.size + 9) ** 2) {
          this.state.score += orb.points;
          this.state.log.push(`${s.name} collected +${orb.points}`);
          orb.points = -1;
          this.confettiPing();
        }
      }
    }
    this.orbs = this.orbs.filter((o) => o.points >= 0);
    const hero = this.sprites.find((s) => s.name.startsWith("hero"));
    if (hero && this.state.status === "playing") {
      for (const s of this.sprites) {
        if (!s.name.startsWith("chaser")) continue;
        const dx = s.x - hero.x;
        const dy = s.y - hero.y;
        if (dx * dx + dy * dy < (s.size + hero.size) ** 2) {
          this.state.status = "lost";
          this.state.banner = "Caught! Game over.";
        }
      }
    }
    if (this.orbs.length && !this.orbs.some((o) => o.points > 0)) {
      this.state.status = "won";
      this.state.banner = `Level complete — score ${this.state.score}!`;
    }
  }

  private confettiPing() {
    this.confetti = true;
    setTimeout(() => (this.confetti = false), 180);
  }

  private execSprite(s: RuntimeSprite, maxOps: number) {
    let ops = 0;
    while (s.stack.length && ops++ < maxOps && this.now >= s.waitUntil) {
      const frame = s.stack[s.stack.length - 1];
      if (frame.i >= frame.blocks.length) {
        if (frame.loopLeft === -1) {
          frame.i = 0;
          continue;
        }
        if (frame.loopLeft > 1) {
          frame.loopLeft--;
          frame.i = 0;
          continue;
        }
        s.stack.pop();
        continue;
      }
      const b = frame.blocks[frame.i];
      frame.i++;
      if (!this.runBlock(s, b, frame)) return; // yielded (wait)
      if (!s.stack.length) break;
      s.stack[s.stack.length - 1].i = Math.min(
        s.stack[s.stack.length - 1].i,
        s.stack[s.stack.length - 1].blocks.length
      );
    }
    if (!s.stack.length) this.startScript(s);
  }

  private runBlock(s: RuntimeSprite, b: Block, frame: Frame): boolean {
    switch (b.kind) {
      case "whenFlag":
        return true;
      case "whenKey": {
        if (this.keys.has(b.args?.key ?? "")) return true;
        if (b === s.script[0] && s.stack.length === 1) {
          s.stack = [];
          return false;
        }
        frame.i = frame.blocks.length;
        return true;
      }
      case "forever":
        if (b.children?.length) s.stack.push({ blocks: b.children, i: 0, loopLeft: -1 });
        return true;
      case "repeat": {
        const t = Math.max(0, Math.round(n(b, "times", 1)));
        if (b.children?.length && t > 0) s.stack.push({ blocks: b.children, i: 0, loopLeft: t });
        return true;
      }
      case "wait":
        s.waitUntil = this.now + Math.max(0, n(b, "seconds", 1)) * 1000;
        return false;
      case "move": {
        const rad = (s.dir * Math.PI) / 180;
        s.x += Math.cos(rad) * n(b, "steps", 10);
        s.y += Math.sin(rad) * n(b, "steps", 10);
        s.x = clamp(s.x, -60, RT_W + 60);
        s.y = clamp(s.y, -60, RT_H + 60);
        return true;
      }
      case "turn":
        s.dir = (s.dir + n(b, "degrees", 15)) % 360;
        return true;
      case "point":
        s.dir = n(b, "degrees", 90);
        return true;
      case "goto":
        s.x = clamp(n(b, "x"), 10, RT_W - 10);
        s.y = clamp(n(b, "y"), 10, RT_H - 10);
        return true;
      case "home":
        s.x = RT_W / 2;
        s.y = RT_H / 2;
        return true;
      case "edgeBounce": {
        let hit = false;
        if (s.x < s.size) { s.dir = 180 - s.dir; hit = true; }
        if (s.x > RT_W - s.size) { s.dir = 180 - s.dir; hit = true; }
        if (s.y < s.size) { s.dir = -s.dir; hit = true; }
        if (s.y > RT_H - s.size) { s.dir = -s.dir; hit = true; }
        s.x = clamp(s.x, s.size, RT_W - s.size);
        s.y = clamp(s.y, s.size, RT_H - s.size);
        if (hit) s.dir = (s.dir + 360) % 360;
        return true;
      }
      case "say":
        s.say = b.args?.text ?? "";
        s.sayUntil = this.now + Math.max(1, n(b, "seconds", 2)) * 1000;
        return true;
      case "setColor":
        if (/^#[0-9a-fA-F]{6}$/.test(b.args?.color ?? "")) s.color = b.args!.color;
        return true;
      case "setShape":
        s.shape = ["circle", "square", "triangle", "star"].includes(b.args?.shape ?? "") ? b.args!.shape : "circle";
        return true;
      case "size":
        s.size = clamp(n(b, "size", 18), 4, 60);
        return true;
      case "spawn": {
        const rad = (s.dir * Math.PI) / 180;
        this.orbs.push({
          id: `orb_${++orbSeq}`,
          x: clamp(s.x + Math.cos(rad) * 40, 15, RT_W - 15),
          y: clamp(s.y + Math.sin(rad) * 40, 15, RT_H - 15),
          points: Math.max(1, Math.round(n(b, "points", 1))),
          color: "#a3e635",
        });
        return true;
      }
      case "addScore":
        this.state.score += Math.round(n(b, "points", 1));
        return true;
      case "levelUp":
        this.state.status = "won";
        this.state.banner = `Level ${this.state.level} cleared — score ${this.state.score}!`;
        return true;
      case "gameOver":
        this.state.status = "lost";
        this.state.banner = `Game over — score ${this.state.score}`;
        return true;
      default:
        return true;
    }
  }

  idle(): boolean {
    return this.sprites.every((s) => !s.stack.length);
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function freshState(): GameState {
  return { score: 0, level: 1, status: "playing", banner: "", frame: 0, log: [] };
}

export const PALETTES: Record<string, string> = {
  "#151a33": "linear-gradient(180deg,#151a33,#0a0b12)",
  "#0f2417": "linear-gradient(180deg,#0f2417,#08110c)",
  "#1c0f24": "linear-gradient(180deg,#1c0f24,#0c0812)",
  "#241c0f": "linear-gradient(180deg,#2b2213,#12100a)",
};

export const GRADIENTS: Array<{ label: string; css: string; pair: string }> = [
  { label: "Midnight void", css: "linear-gradient(180deg,#151a33,#0a0b12)", pair: "#151a33|#0a0b12" },
  { label: "Emerald cave", css: "linear-gradient(180deg,#0f2417,#08110c)", pair: "#0f2417|#08110c" },
  { label: "Nebula haze", css: "linear-gradient(180deg,#221040,#0c0812)", pair: "#221040|#0c0812" },
  { label: "Sunset dunes", css: "linear-gradient(180deg,#2b2213,#12100a)", pair: "#2b2213|#12100a" },
];

// ---- Drawing ----

export function drawRuntime(rt: Runtime, ctx: CanvasRenderingContext2D) {
  const pair = rt.program.bg.includes("|") ? rt.program.bg : "#151a33|#0a0b12";
  const [c1, c2] = pair.split("|");
  const g = ctx.createLinearGradient(0, 0, 0, RT_H);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, RT_W, RT_H);

  for (const o of rt.orbs) {
    ctx.fillStyle = o.color;
    ctx.beginPath();
    ctx.arc(o.x, o.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.font = "9px ui-monospace, monospace";
    ctx.fillText(`+${o.points}`, o.x + 9, o.y - 6);
  }

  for (const s of rt.sprites) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = s.color;
    const r = s.size;
    if (s.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (s.shape === "square") {
      ctx.fillRect(-r, -r, r * 2, r * 2);
    } else if (s.shape === "triangle") {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, r);
      ctx.lineTo(-r, r);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = (i * Math.PI) / 5 - Math.PI / 2;
        const rr = i % 2 === 0 ? r : r * 0.45;
        ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(rad) * rr, Math.sin(rad) * rr);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    if (s.say) {
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "11px ui-sans-serif, system-ui";
      const wText = ctx.measureText(s.say).width;
      ctx.fillStyle = "rgba(10,11,18,0.8)";
      roundRect(ctx, s.x - wText / 2 - 6, s.y - s.size - 26, wText + 12, 18, 6);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(s.say, s.x - wText / 2, s.y - s.size - 13);
    }
  }

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  roundRect(ctx, 8, 8, 132, 22, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px ui-monospace, monospace";
  ctx.fillText(`SCORE ${rt.state.score}`, 16, 23);

  if (rt.confetti) {
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = ["#7c5cff", "#22d3ee", "#a3e635", "#fb7185"][i % 4];
      ctx.fillRect(Math.random() * RT_W, Math.random() * RT_H, 4, 4);
    }
  }

  if (rt.state.status !== "playing") {
    ctx.fillStyle = "rgba(6,7,12,0.72)";
    ctx.fillRect(0, 0, RT_W, RT_H);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 22px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.fillText(rt.state.status === "won" ? "YOU WIN!" : "GAME OVER", RT_W / 2, RT_H / 2 - 8);
    ctx.font = "13px ui-sans-serif, system-ui";
    ctx.fillText(rt.state.banner, RT_W / 2, RT_H / 2 + 18);
    ctx.textAlign = "left";
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
