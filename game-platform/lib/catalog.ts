import type { AIModel, CreditPack, Plan, Tier } from "./types";

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: "$0",
    priceOnce: null,
    tokenPool: 5_000_000,
    squadMax: 3,
    squadOverheadLabel: "Squad costs a flat +50K tokens per run",
    highlights: [
      "Gemini 3.1 Pro, GPT 5.6 Terra, Haiku 4.6",
      "Budget fleet: DeepSeek V3 Lite, Llama 3.1 70B, Gemma 2, Qwen Coder",
      "Mistral Large 2 + Codestral included",
      "Collab up to 3 AI models at once",
      "Scratch-style block builder, publishing pipeline, HTML5 export",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: "$30/mo",
    priceOnce: "$100 once",
    tokenPool: 20_000_000,
    squadMax: 10,
    squadOverheadLabel: "Squad runs use 5x more tokens — for the best results",
    highlights: [
      "Everything in Free",
      "6.1 Sol, Opus 4.6, Gemini 4 Hydrogen",
      "DeepSeek R2 + Mistral Medium 3 unlocked",
      "Collab up to 10 AI models at once",
      "AI trailer studio + custom icon fonts",
    ],
  },
  {
    id: "max",
    name: "Max",
    priceMonthly: "$50/mo",
    priceOnce: "$150 once",
    tokenPool: 100_000_000,
    squadMax: 30,
    squadOverheadLabel: "Squad runs use 2x more tokens than Pro (10x total)",
    highlights: [
      "Everything in Pro",
      "The strongest models on the planet: GPT-6 Omega, Claude Ultra 2, Gemini Ultra Quantum, Grok-5 Sovereign",
      "Collab up to 30 AI models at once",
      "Priority render queue + 100M token pool",
      "Early access to new models the day they land",
    ],
  },
];

export const planById = (t: Tier): Plan => PLANS.find((p) => p.id === t) ?? PLANS[0];

export const CREDIT_PACKS: CreditPack[] = [
  { id: "c500k", price: "$1.99", tokens: 500_000, label: "Starter top-up" },
  { id: "c1_5m", price: "$4.99", tokens: 1_500_000, label: "Weekend jam pack" },
  { id: "c5m", price: "$9.99", tokens: 5_000_000, label: "Project pack" },
  { id: "c15m", price: "$24.99", tokens: 15_000_000, label: "Studio pack" },
  { id: "c30m", price: "$49.99", tokens: 30_000_000, label: "Heavy pack" },
  { id: "c50m", price: "$99.90", tokens: 50_000_000, label: "God-mode pack", best: true },
];

export const MODELS: AIModel[] = [
  // ---- FREE tier ----
  { id: "gemini-3-1-pro", name: "Gemini 3.1 Pro", vendor: "Google", tier: "free", specialty: "reasoning", blurb: "Great all-rounder: strong at game logic and design docs.", costFactor: 1.2, ctxK: 2000, emoji: "✨" },
  { id: "gpt-5-6-terra", name: "GPT 5.6 Terra", vendor: "OpenAI", tier: "free", specialty: "coding", blurb: "Reliable code generation and refactors for game scripts.", costFactor: 1.3, ctxK: 1000, emoji: "🌐" },
  { id: "haiku-4-6", name: "Haiku 4.6", vendor: "Anthropic", tier: "free", specialty: "budget", blurb: "Fast and cheap. Perfect for a on the squad's duty day.", costFactor: 0.4, ctxK: 200, emoji: "🍃" },
  { id: "deepseek-v3-lite", name: "DeepSeek V3 Lite", vendor: "DeepSeek", tier: "free", specialty: "budget", blurb: "The budget workhorse. Solid logic at tiny prices.", costFactor: 0.3, ctxK: 128, emoji: "🐋" },
  { id: "llama-3-1-70b", name: "Llama 3.1 70B", vendor: "Meta", tier: "free", specialty: "budget", blurb: "Open-weights classic. Good narrative and brainstorming.", costFactor: 0.35, ctxK: 128, emoji: "🦙" },
  { id: "gemma-2-27b", name: "Gemma 2 27B", vendor: "Google", tier: "free", specialty: "budget", blurb: "Small, quick, great for QA pass notes.", costFactor: 0.25, ctxK: 128, emoji: "💎" },
  { id: "qwen-2-5-coder-32b", name: "Qwen2.5 Coder 32B", vendor: "Alibaba", tier: "free", specialty: "coding", blurb: "Budget code specialist for block programs.", costFactor: 0.3, ctxK: 128, emoji: "🧮" },
  { id: "mistral-large-2", name: "Mistral Large 2", vendor: "Mistral AI", tier: "free", specialty: "reasoning", blurb: "Europe's finest. Sharp design reasoning.", costFactor: 0.9, ctxK: 256, emoji: "🌬️" },
  { id: "codestral", name: "Codestral", vendor: "Mistral AI", tier: "free", specialty: "coding", blurb: "Code-specialized: compiles ideas into clean block logic.", costFactor: 0.6, ctxK: 256, emoji: "⌨️" },
  { id: "magistral-medium", name: "Magistral Medium", vendor: "Mistral AI", tier: "free", specialty: "reasoning", blurb: "Visual reasoning — plans levels and layouts.", costFactor: 0.7, ctxK: 128, emoji: "🧠" },

  // ---- PRO tier ----
  { id: "sol-6-1", name: "6.1 Sol", vendor: "Helios Labs", tier: "pro", specialty: "frontier", blurb: "Solar-class reasoning. Elite at game feel and pacing.", costFactor: 2.5, ctxK: 1000, emoji: "☀️" },
  { id: "opus-4-6", name: "Opus 4.6", vendor: "Anthropic", tier: "pro", specialty: "coding", blurb: "Deep, careful engineering for complex game systems.", costFactor: 2.2, ctxK: 800, emoji: "🏛️" },
  { id: "gemini-4-hydrogen", name: "Gemini 4 Hydrogen", vendor: "Google", tier: "pro", specialty: "art", blurb: "Visual powerhouse: palettes, sprites, icon art direction.", costFactor: 2.0, ctxK: 2000, emoji: "💧" },
  { id: "deepseek-r2", name: "DeepSeek R2", vendor: "DeepSeek", tier: "pro", specialty: "reasoning", blurb: "Reasoning-per-dollar champion for full game builds.", costFactor: 1.0, ctxK: 256, emoji: "🔭" },
  { id: "mistral-medium-3", name: "Mistral Medium 3", vendor: "Mistral AI", tier: "pro", specialty: "narrative", blurb: "Docs, lore, store copy — studio-grade writing.", costFactor: 0.8, ctxK: 256, emoji: "📜" },

  // ---- MAX tier ----
  { id: "gpt-6-omega", name: "GPT-6 Omega", vendor: "OpenAI", tier: "max", specialty: "frontier", blurb: "The strong one. Ships whole game systems in one pass.", costFactor: 4.5, ctxK: 2000, emoji: "🌀" },
  { id: "claude-ultra-2", name: "Claude Ultra 2", vendor: "Anthropic", tier: "max", specialty: "frontier", blurb: "Long-horizon planning for deep, polished games.", costFactor: 4.0, ctxK: 4000, emoji: "🏆" },
  { id: "gemini-ultra-quantum", name: "Gemini Ultra Quantum", vendor: "Google", tier: "max", specialty: "frontier", blurb: "Sees the whole game at once: code, art, marketing.", costFactor: 4.2, ctxK: 8000, emoji: "⚛️" },
  { id: "grok-5-sovereign", name: "Grok-5 Sovereign", vendor: "xAI", tier: "max", specialty: "narrative", blurb: "Wild creativity for hooks, jokes and viral moments.", costFactor: 3.8, ctxK: 1000, emoji: "🛰️" },
];

export const modelById = (id: string): AIModel => MODELS.find((m) => m.id === id) ?? MODELS[0];

export const modelsForTier = (t: Tier): AIModel[] => MODELS.filter((m) => m.tier === t || t === "max" && m.tier === "pro" || t === "pro" && m.tier === "free" || t === "max" && m.tier === "free");

export function tierRank(t: Tier): number {
  return { free: 0, pro: 1, max: 2 }[t];
}

export function canUseModel(tier: Tier, model: AIModel): boolean {
  return tierRank(tier) >= tierRank(model.tier);
}

export const PROVIDERS = [
  { id: "openrouter", name: "OpenRouter", docs: "https://openrouter.ai/keys", hint: "sk-or-…", envVar: "OPENROUTER_API_KEY", note: "One key, hundreds of models. Great budget route." },
  { id: "huggingface", name: "Hugging Face", docs: "https://huggingface.co/settings/tokens", hint: "hf_…", envVar: "HF_TOKEN", note: "Run open-weight models (Llama, Mistral, Qwen) on the Hub." },
  { id: "openai", name: "OpenAI", docs: "https://platform.openai.com/api-keys", hint: "sk-…", envVar: "OPENAI_API_KEY", note: "Direct GPT access for your workspace." },
  { id: "anthropic", name: "Anthropic", docs: "https://console.anthropic.com/settings/keys", hint: "sk-ant-…", envVar: "ANTHROPIC_API_KEY", note: "Direct Claude access." },
  { id: "google", name: "Google AI", docs: "https://aistudio.google.com/apikey", hint: "AIza…", envVar: "GEMINI_API_KEY", note: "Gemini family on your own billing." },
] as const;
