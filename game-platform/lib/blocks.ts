export type BlockCat = "events" | "motion" | "looks" | "control" | "game";

export interface BlockDef {
  kind: string;
  cat: BlockCat;
  label: string;
  fields: string; // e.g. "steps:N | speed:S" rendered as inputs
  hint: string;
}

export const FIELDS = {
  none: "",
  steps: "steps",
  degrees: "degrees",
  seconds: "seconds",
  times: "times",
  text: "text",
  color: "color",
  shape: "shape",
  points: "points",
} as const;

export const BLOCK_DEFS: BlockDef[] = [
  { kind: "whenFlag", cat: "events", label: "when 🏁 clicked", fields: "", hint: "Runs when the game starts." },
  { kind: "whenKey", cat: "events", label: "when key pressed", fields: "key", hint: "arrow keys / wasd / space" },
  { kind: "forever", cat: "control", label: "forever", fields: "", hint: "Loop its children every frame-end." },
  { kind: "repeat", cat: "control", label: "repeat", fields: "times", hint: "Loop children N times." },
  { kind: "wait", cat: "control", label: "wait", fields: "seconds", hint: "Pause this sprite." },
  { kind: "move", cat: "motion", label: "move", fields: "steps", hint: "Move forward in facing direction." },
  { kind: "turn", cat: "motion", label: "turn ↻", fields: "degrees", hint: "Rotate." },
  { kind: "point", cat: "motion", label: "point ↷", fields: "degrees", hint: "Face a direction (0=up, 90=right, 180=down, 270=left)." },
  { kind: "goto", cat: "motion", label: "go to x y", fields: "x|y", hint: "Teleport to a spot." },
  { kind: "edgeBounce", cat: "motion", label: "if on edge, bounce", fields: "", hint: "Classic bouncing behavior." },
  { kind: "home", cat: "motion", label: "go to center", fields: "", hint: "Back to the middle." },
  { kind: "say", cat: "looks", label: "say", fields: "seconds|text", hint: "Show a speech bubble." },
  { kind: "setColor", cat: "looks", label: "set color", fields: "color", hint: "hex color like #7c5cff" },
  { kind: "setShape", cat: "looks", label: "set shape", fields: "shape", hint: "circle | square | triangle | star" },
  { kind: "size", cat: "looks", label: "set size", fields: "size", hint: "sprite radius 4–60" },
  { kind: "spawn", cat: "game", label: "spawn orb", fields: "points", hint: "A collectible worth points." },
  { kind: "addScore", cat: "game", label: "score +", fields: "points", hint: "Add to the player's score." },
  { kind: "levelUp", cat: "game", label: "level up!", fields: "", hint: "Win the level with confetti." },
  { kind: "gameOver", cat: "game", label: "game over", fields: "", hint: "End the run." },
];

export type Block = {
  kind: string;
  args: Record<string, string>;
  children?: Block[];
};

export function makeBlock(def: BlockDef): Block {
  const args: Record<string, string> = {};
  if (def.fields) {
    for (const f of def.fields.split("|").map((s) => s.split(":")[0])) {
      args[f] = DEFAULT_ARGS[f] ?? "10";
    }
  }
  return { kind: def.kind, args, children: isContainer(def.kind) ? [] : undefined };
}

export const DEFAULT_ARGS: Record<string, string> = {
  steps: "10",
  degrees: "15",
  seconds: "1",
  times: "10",
  text: "hello!",
  key: "right",
  color: "#7c5cff",
  shape: "circle",
  x: "0",
  y: "0",
  points: "1",
  size: "18",
};

export const CONTAINERS = new Set(["forever", "repeat"]);

export function isContainer(kind: string): boolean {
  return CONTAINERS.has(kind);
}

export function defByKind(kind: string): BlockDef {
  return BLOCK_DEFS.find((b) => b.kind === kind) ?? BLOCK_DEFS[0];
}

// ---- Programs ----

export interface SpriteScript {
  spriteId: string;
  blocks: Block[];
}

export interface BlockProgram {
  bg: string; // background css gradient
  sprites: SpriteScript[];
}

export function emptyProgram(): BlockProgram {
  return { bg: "linear-gradient(180deg,#151a33,#0a0b12)", sprites: [{ spriteId: "hero", blocks: [] }] };
}

export function blocksOf(program: BlockProgram, spriteId: string): Block[] {
  return program.sprites.find((s) => s.spriteId === spriteId)?.blocks ?? [];
}

export function replaceScript(program: BlockProgram, spriteId: string, blocks: Block[]): BlockProgram {
  const sprites = program.sprites.some((s) => s.spriteId === spriteId)
    ? program.sprites.map((s) => (s.spriteId === spriteId ? { ...s, blocks } : s))
    : [...program.sprites, { spriteId, blocks }];
  return { ...program, sprites };
}

export function countBlocks(blocks: Block[]): number {
  return blocks.reduce((n, b) => n + 1 + countBlocks(b.children ?? []), 0);
}
