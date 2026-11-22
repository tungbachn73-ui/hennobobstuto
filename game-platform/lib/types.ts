export type Tier = "free" | "pro" | "max";

export type ModelSpecialty = "reasoning" | "coding" | "art" | "narrative" | "budget" | "frontier";

export interface AIModel {
  id: string;
  name: string;
  vendor: string;
  tier: Tier;
  specialty: ModelSpecialty;
  blurb: string;
  costFactor: number;
  ctxK: number;
  emoji: string;
}

export interface Plan {
  id: Tier;
  name: string;
  priceMonthly: string;
  priceOnce: string | null;
  tokenPool: number;
  squadMax: number;
  squadOverheadLabel: string;
  highlights: string[];
}

export interface CreditPack {
  id: string;
  price: string;
  tokens: number;
  label: string;
  best?: boolean;
}

export type AgentPersona = "designer" | "programmer" | "artist" | "qa" | "producer" | "narrative" | "audio";

export interface SquadAgent {
  id: string;
  modelId: string;
  role: AgentPersona;
  instructions: string;
}

export const SPECIALTY_META: Record<ModelSpecialty, { label: string; color: string }> = {
  reasoning: { label: "Reasoning", color: "text-neon" },
  coding: { label: "Coding", color: "text-aqua" },
  art: { label: "Art & Media", color: "text-rose2" },
  narrative: { label: "Narrative", color: "text-lime" },
  budget: { label: "Budget", color: "text-amber-400" },
  frontier: { label: "Frontier", color: "text-fuchsia-400" },
};

export const AGENT_ROLES: Record<AgentPersona, { name: string; emoji: string; playbook: string }> = {
  designer: {
    name: "Game Designer",
    emoji: "🎮",
    playbook: "Turns the idea into core loop, difficulty curve and win/lose rules.",
  },
  programmer: {
    name: "Programmer",
    emoji: "🧩",
    playbook: "Writes the actual block program and logic wiring.",
  },
  artist: {
    name: "Art Director",
    emoji: "🎨",
    playbook: "Chooses palette, sprites, scenes and icon direction.",
  },
  qa: {
    name: "QA Critic",
    emoji: "🐞",
    playbook: "Playtests the build, reports bugs and balance issues.",
  },
  producer: {
    name: "Producer",
    emoji: "📋",
    playbook: "Breaks work into milestones and keeps the squad on scope.",
  },
  narrative: {
    name: "Narrative Writer",
    emoji: "📖",
    playbook: "Names, story beats, intro text and flavor copy.",
  },
  audio: {
    name: "Audio Designer",
    emoji: "🔊",
    playbook: "Describes jingles, SFX timing and mood per scene.",
  },
};
