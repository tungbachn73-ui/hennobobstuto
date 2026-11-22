import { emptyProgram, replaceScript, type Block, type BlockProgram } from "./blocks";
import { modelById } from "./catalog";
import type { AgentPersona, SquadAgent, Tier } from "./types";
import { uid } from "./utils";

// ---------- Squad runs ----------

export interface SquadResponse {
  agentId: string;
  modelId: string;
  text: string;
  tokens: number;
}

export interface SquadRun {
  id: string;
  at: number;
  prompt: string;
  responses: SquadResponse[];
  overheadTokens: number;
  totalTokens: number;
}

export interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  modelId?: string;
  text: string;
  tokens?: number;
  at: number;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const PERSONA_PLAY: Record<AgentPersona, (prompt: string, model: string, seed: number) => string> = {
  designer: (p, m, s) =>
    `**Core loop** (as ${m}): the player repeatedly ${s % 2 === 0 ? "dodges, collects, and upgrades" : "explores, collects, entries and escapes"} around the theme of “${p}”.\n\n- Session length target: ${(s % 4) + 2} minutes per run\n- Difficulty ramps every ${(s % 3) + 1} level(s)\n- Win rule: clear every orb in the scene\n- Lose rule: touch the chaser three stages in a row\n- Hook: one screen = one story beat`,
  programmer: (p, m, s) =>
    `**Build plan** (as ${m}):\n\n\`\`\`\n1. hero: 4-direction keys → point → move\n2. orb keeper: wander + edge bounce, drops 2 pickups per lap\n3. chaser: drifts, bounces, hunts\n4. win = all orbs collected · lose = chaser contact\n5. HUD score wired to addScore blocks\n\`\`\`\nI wired the starting block program. ${(s % 5) + 6} blocks are live in the editor — open **Editor** to tweak them.`,
  artist: (p, m, s) =>
    `**Art direction** (as ${m}): palette ${["Midnight void", "Nebula haze", "Emerald cave"][s % 3]} with a ${["neon rim", "soft glow", "high-contrast"][s % 3]} treatment.\n- Hero reads as a star (player magnetism)\n- Orbs lime-coded = “good” at a glance\n- Chaser rose-coded = “danger” without any text\n- Scene name suggestion: “${p.slice(0, 24)} — Sector ${(s % 9) + 1}”`,
  qa: (p, m, s) =>
    `**QA pass** (as ${m}):\n\n- ⚠️ Chaser speed feels ${(s % 2 === 0 ? "20 tokens fast" : "slightly slow")} — tune move steps 3–5\n- ✅ Win condition triggers correctly after orb sweeps\n- ⚠️ No score feedback on pickups until HUD glance — mostly fine\n- 💡 Add a \`wait\` before the chaser spawns for a grace period\n\nVerdict: **playable**, ship after tuning pass.`,
  producer: (p, m, s) =>
    `**Sprint plan** (as ${m}):\n\n1. ✅ Playable core (today)\n2. ${(s % 3) + 2} levels with palette swaps\n3. Icon + screenshots + trailer → Publisher\n4. Export HTML5 bundle, share the play link\n\nScope guard: no net-new systems before the publisher pass.`,
  narrative: (p, m, s) =>
    `**Lore drop** (as ${m}): You are the last Lumen Keeper. The chasers devoured Sector ${(s % 9) + 1}’s light — every orb you recover is a memory coming home.\n\nStore line: “Recover the light. Outrun the dark.”`,
  audio: (p, m, s) =>
    `**Sound sketch** (as ${m}): pickup = ${(s % 2 === 0 ? "soft marimba blip (C5→E5)" : "glassy chime (A5)")}, chaser proximity = low sub throb, win = ${(s % 3) + 3}-note ascending motif. BPM ${90 + (s % 30)}.`,
};

export function runSquad(prompt: string, agents: SquadAgent[], tier: Tier): SquadRun {
  const seed = hash(prompt);
  const responses: SquadResponse[] = agents.map((a, idx) => {
    const model = modelById(a.modelId);
    const play = PERSONA_PLAY[a.role] ?? PERSONA_PLAY.designer;
    const base = 9000 + ((seed + idx * 977) % 9000);
    return {
      agentId: a.id,
      modelId: a.modelId,
      text: play(prompt, model.name, seed + idx * 131),
      tokens: Math.round(base * model.costFactor * 0.35),
    };
  });
  const base = responses.reduce((t, r) => t + r.tokens, 0);
  const overhead =
    tier === "free" ? 50_000 : tier === "pro" ? base * 4 : base * 9;
  const totalTokens = base + overhead;
  return { id: uid("run"), at: Date.now(), prompt, responses, overheadTokens: overhead, totalTokens };
}

export function mockChat(modelId: string, prompt: string): { text: string; tokens: number } {
  const model = modelById(modelId);
  const seed = hash(prompt + model.name);
  const lower = prompt.toLowerCase();
  let text: string;
  if (/hello|hi|hey/.test(lower)) {
    text = `Hey — ${model.name} here. I live for game jams. Tell me a genre or a vibe and I'll take it from there.`;
  } else if (/platformer|jump|maze|shooter|dodge|puzzle|quiz|clicker|collect/.test(lower)) {
    text = `“${prompt.slice(0, 80)}” — love it. Here’s my take:\n\n1. **Genre**: ${lower.includes("maze") ? "maze chase" : lower.includes("clicker") ? "idle clicker" : "arena collector"}\n2. **Core loop**: grab orbs → dodge chasers → level clear\n3. **First win** within 30 seconds so beginners feel great\n4. **Difficulty**: chaser count +1 every level\n\nWant me to spin up the full squad and wire the block program?`;
  } else if (/art|color|visual|icon|sprite/.test(lower)) {
    text = `Visual direction: high-contrast neon on dark gradients, hero = star shape for instant readability, danger = rose tones. I can have the Art Director lock a palette in one squad run.`;
  } else {
    text = `Got it. As ${model.name} I read “${prompt.slice(0, 60)}” as a fast arcade build with one strong mechanic. Options:\n\n- A) Orb rush: collect-all to win, chaser pressure\n- B) Gauntlet: survive waves, score attack\n- C) Puzzle-box: fewer orbs, meaner chasers\n\nPick one (or say “surprise me”) — solo build keeps it cheap, squad run costs more but hits harder.`;
  }
  return { text, tokens: Math.round((7000 + (seed % 6000)) * model.costFactor * 0.3) };
}

// ---------- Program generation ----------

type Template = { name: string; genre: string; bgPair: string; heroColor: string; orbName: string; chaserName: string };

const TEMPLATES: Template[] = [
  { name: "Orb Rush", genre: "Arena collector", bgPair: "#151a33|#0a0b12", heroColor: "#7c5cff", orbName: "orbKeeper", chaserName: "chaser" },
  { name: "Neon Gauntlet", genre: "Survival dodge", bgPair: "#221040|#0c0812", heroColor: "#22d3ee", orbName: "gemKeeper", chaserName: "chaserX" },
  { name: "Gem Cave", genre: "Maze chase", bgPair: "#0f2417|#08110c", heroColor: "#a3e635", orbName: "crystalKeeper", chaserName: "hunter" },
];

export function pickTemplate(prompt: string): Template {
  const p = prompt.toLowerCase();
  if (/maze|labyrinth/.test(p)) return TEMPLATES[2];
  if (/neon|wave|gauntlet|survive|dodge/.test(p)) return TEMPLATES[1];
  return TEMPLATES[hash(prompt) % TEMPLATES.length];
}

export function buildProgram(prompt: string): { program: BlockProgram; name: string; genre: string; pitch: string } {
  const t = pickTemplate(prompt);
  const hero: Block[] = [
    {
      kind: "forever",
      args: {},
      children: [
        { kind: "whenKey", args: { key: "up" }, children: [] },
        { kind: "point", args: { degrees: "0" } },
        { kind: "move", args: { steps: "8" } },
        { kind: "whenKey", args: { key: "down" }, children: [] },
        { kind: "point", args: { degrees: "180" } },
        { kind: "move", args: { steps: "8" } },
        { kind: "whenKey", args: { key: "left" }, children: [] },
        { kind: "point", args: { degrees: "270" } },
        { kind: "move", args: { steps: "8" } },
        { kind: "whenKey", args: { key: "right" }, children: [] },
        { kind: "point", args: { degrees: "90" } },
        { kind: "move", args: { steps: "8" } },
      ],
    },
  ];
  const keeper: Block[] = [
    { kind: "whenFlag", args: {}, children: [] },
    { kind: "say", args: { seconds: "2", text: "Collect my orbs!" } },
    {
      kind: "forever",
      args: {},
      children: [
        { kind: "repeat", args: { times: "14" }, children: [{ kind: "edgeBounce", args: {} }, { kind: "move", args: { steps: "6" } }] },
        { kind: "spawn", args: { points: "2" } },
        { kind: "spawn", args: { points: "1" } },
        { kind: "wait", args: { seconds: "0.6" } },
      ],
    },
  ];
  const chaser: Block[] = [
    {
      kind: "forever",
      args: {},
      children: [
        { kind: "turn", args: { degrees: "7" } },
        { kind: "move", args: { steps: "4" } },
        { kind: "edgeBounce", args: {} },
      ],
    },
  ];
  let program = emptyProgram();
  program.bg = t.bgPair;
  program = replaceScript(program, "hero", hero);
  program = replaceScript(program, t.orbName, keeper);
  program = replaceScript(program, t.chaserName, chaser);
  return {
    program,
    name: t.name,
    genre: t.genre,
    pitch: `A ${t.genre.toLowerCase()} built around “${prompt.slice(0, 60)}”. Collect every orb, avoid the ${
      t.chaserName === "hunter" ? "hunter" : "chaser"
    }, clear the level.`,
  };
}

export function starterProgram(): BlockProgram {
  const p = buildProgram("beginner starter").program;
  return p;
}

// ---------- Squad assembly ----------

export function suggestAgents(tier: Tier, prompt: string): SquadAgent[] {
  const seed = hash(prompt);
  const preferred: Array<{ role: AgentPersona; models: string[] }> = [
    { role: "designer", models: ["gemini-3-1-pro", "sol-6-1", "gpt-6-omega"] },
    { role: "programmer", models: ["gpt-5-6-terra", "opus-4-6", "claude-ultra-2"] },
    { role: "artist", models: ["gemini-4-hydrogen", "mistral-large-2", "gemini-ultra-quantum"] },
    { role: "qa", models: ["haiku-4-6", "deepseek-r2", "claude-ultra-2"] },
    { role: "producer", models: ["codestral", "mistral-medium-3", "claude-ultra-2"] },
    { role: "narrative", models: ["llama-3-1-70b", "mistral-medium-3", "grok-5-sovereign"] },
    { role: "audio", models: ["deepseek-v3-lite", "magistral-medium", "gemini-4-hydrogen"] },
  ];
  return preferred.slice(0, Math.min(3, { free: 3, pro: 10, max: 30 }[tier])).map((pref, i) => {
    const modelId = pref.models[Math.min(2, Math.floor(tierRank(tier)))];
    return {
      id: uid("agent"),
      role: pref.role,
      modelId,
      instructions: `Own the ${pref.role} track for this project. Keep notes tight. Seed#${(seed + i) % 97}`,
    };
  });
}

function tierRank(t: Tier): number {
  return { free: 0, pro: 1, max: 2 }[t];
}
