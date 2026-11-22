"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AgentPersona, SquadAgent, Tier } from "./types";
import { planById } from "./catalog";
import type { BlockProgram } from "./blocks";
import { emptyProgram } from "./blocks";
import type { ChatMsg, SquadRun } from "./engine";
import { suggestAgents, starterProgram } from "./engine";
import { uid, DAY_MS } from "./utils";

export interface PublishedInfo {
  at: number;
  iconDataUri: string;
  screenshots: string[];
  trailerFrames: string[];
  description: string;
  gallery: boolean;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  genre: string;
  pitch: string;
  mode: "ai" | "blocks";
  prompt: string;
  createdAt: number;
  updatedAt: number;
  program: BlockProgram;
  chat: ChatMsg[];
  squad: SquadAgent[];
  runs: SquadRun[];
  published: PublishedInfo | null;
}

export interface UsageEvent {
  id: string;
  at: number;
  tokens: number;
  kind: "chat" | "squad" | "assets" | "import";
  note: string;
}

interface Privacy {
  galleryPublic: boolean;
  telemetry: boolean;
  aiTraining: boolean;
}

export interface AppState {
  tier: Tier;
  credits: number;
  usageEvents: UsageEvent[];
  projects: Project[];
  keys: Record<string, string>;
  useRealApi: boolean;
  privacy: Privacy;
  profile: { displayName: string; email: string; country: string };
  billingMode: "monthly" | "once";
  history: Array<{ id: string; at: number; text: string }>;

  setTier: (t: Tier, mode: "monthly" | "once") => void;
  buyCredits: (tokens: number, label: string) => void;
  setKey: (provider: string, key: string) => void;
  toggleRealApi: (v: boolean) => void;
  setPrivacy: (p: Partial<Privacy>) => void;
  setProfile: (p: Partial<AppState["profile"]>) => void;

  consume: (tokens: number, kind: UsageEvent["kind"], note: string) => void;
  tokensSince: (ms: number) => number;
  pool: () => number;
  poolUsed: () => number;

  createProject: (input: { name: string; genre: string; prompt: string; mode: "ai" | "blocks" }) => string;
  updateProject: (id: string, patch: Partial<Project>) => void;
  setProgram: (id: string, program: BlockProgram) => void;
  addChat: (id: string, msg: ChatMsg) => void;
  setSquad: (id: string, squad: SquadAgent[]) => void;
  addRun: (id: string, run: SquadRun) => void;
  publish: (id: string, info: PublishedInfo) => void;
  deleteProject: (id: string) => void;
  remix: (slug: string) => string | null;
  addVersion: (id: string, label: string) => void;
}

const initialApp = {
  tier: "free" as Tier,
  credits: 0,
  usageEvents: [] as UsageEvent[],
  projects: [] as Project[],
  keys: {} as Record<string, string>,
  useRealApi: false,
  privacy: { galleryPublic: true, telemetry: false, aiTraining: false },
  profile: { displayName: "New Dev", email: "you@example.com", country: "Earth" },
  billingMode: "monthly" as const,
  history: [] as Array<{ id: string; at: number; text: string }>,
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialApp,

      setTier: (t, mode) =>
        set((s) => ({
          tier: t,
          billingMode: mode,
          history: [{ id: uid("h"), at: Date.now(), text: `Plan → ${planById(t).name} (${mode})` }, ...s.history].slice(0, 50),
        })),

      buyCredits: (tokens, label) =>
        set((s) => ({
          credits: s.credits + tokens,
          history: [{ id: uid("h"), at: Date.now(), text: `+${tokens.toLocaleString()} credits — ${label}` }, ...s.history].slice(0, 50),
        })),

      setKey: (provider, key) => set((s) => ({ keys: { ...s.keys, [provider]: key } })),

      toggleRealApi: (v) => set({ useRealApi: v }),

      setPrivacy: (p) => set((s) => ({ privacy: { ...s.privacy, ...p } })),

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),

      consume: (tokens, kind, note) =>
        set((s) => ({
          usageEvents: [...s.usageEvents, { id: uid("u"), at: Date.now(), tokens, kind, note }].slice(-2000),
        })),

      tokensSince: (ms) => {
        const cutoff = Date.now() - ms;
        return get()
          .usageEvents.filter((e) => e.at >= cutoff)
          .reduce((t, e) => t + e.tokens, 0);
      },

      pool: () => planById(get().tier).tokenPool + get().credits,

      poolUsed: () => get().usageEvents.reduce((t, e) => t + e.tokens, 0),

      createProject: ({ name, genre, prompt, mode }) => {
        const id = uid("proj");
        const program: BlockProgram = mode === "ai" ? starterProgram() : emptyProgram();
        const project: Project = {
          id,
          name: name || "Untitled Game",
          slug: (name || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40),
          genre,
          pitch: prompt,
          mode,
          prompt,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          program,
          chat: mode === "ai"
            ? [{ id: uid("m"), role: "assistant", modelId: "gemini-3-1-pro", text: `Workspace ready for “${name}”. Describe your game, or spin up an AI Squad and assign roles.`, at: Date.now() }]
            : [],
          squad: mode === "ai" ? suggestAgents(get().tier, prompt) : [],
          runs: [],
          published: null,
        };
        set((s) => ({ projects: [project, ...s.projects] }));
        return id;
      },

      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)),
        })),

      setProgram: (id, program) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, program, updatedAt: Date.now() } : p)),
        })),

      addChat: (id, msg) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, chat: [...p.chat, msg], updatedAt: Date.now() } : p)),
        })),

      setSquad: (id, squad) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, squad, updatedAt: Date.now() } : p)),
        })),

      addRun: (id, run) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, runs: [run, ...p.runs], updatedAt: Date.now() } : p)),
        })),

      publish: (id, info) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, published: info, updatedAt: Date.now() } : p)),
        })),

      deleteProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      remix: (slug) => {
        const src = get().projects.find((p) => p.slug === slug || p.id === slug);
        if (!src) return null;
        const id = uid("proj");
        const copy: Project = {
          ...src,
          id,
          name: `${src.name} (remix)`,
          slug: `${src.slug}-remix-${Math.random().toString(36).slice(2, 5)}`,
          chat: [],
          runs: [],
          published: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((s) => ({ projects: [copy, ...s.projects] }));
        return id;
      },

      addVersion: (id, label) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id
              ? { ...p, updatedAt: Date.now(), published: p.published }
              : p
          ),
          history: [{ id: uid("h"), at: Date.now(), text: `${label}` }, ...s.history].slice(0, 50),
        })),
    }),
    {
      name: "game-platform-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

// ---- derived helpers ----

export const HOURLY_WINDOW_MS = 3 * 3600_000;
export const WEEKLY_WINDOW_MS = 7 * DAY_MS;

export function usageWindows(s: AppState) {
  const now = Date.now();
  const sum = (from: number) => s.usageEvents.filter((e) => e.at >= from).reduce((t, e) => t + e.tokens, 0);
  return {
    hourly: { used: sum(now - HOURLY_WINDOW_MS), resetsInMs: HOURLY_WINDOW_MS - ((now - earliest(s)) % HOURLY_WINDOW_MS) },
    weekly: { used: sum(now - WEEKLY_WINDOW_MS), resetsInMs: WEEKLY_WINDOW_MS - ((now - earliest(s)) % WEEKLY_WINDOW_MS) },
  };
}

function earliest(s: AppState): number {
  return s.usageEvents.length ? s.usageEvents[0].at : Date.now();
}

export function defaultRole(): AgentPersona {
  return "designer";
}

export const roleOrder: AgentPersona[] = ["designer", "programmer", "artist", "qa", "producer", "narrative", "audio"];
