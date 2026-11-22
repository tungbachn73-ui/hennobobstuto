# 🎮 GamePlatform

Build games with **squads of AI models** — or with a **Scratch-style block editor** — then publish them anywhere for free.

## What's inside

| Area | Description |
| --- | --- |
| **AI Builder** (`/build/[id]`) | Chat with any model in the roster + assemble an **AI Squad** and assign each agent a job (designer, programmer, artist, QA, producer, narrative, audio). Squad runs apply the tier overhead rules and can wire a real block program into the editor. |
| **Block editor** (`/edit/[id]`) | Click-to-add blocks (events, motion, looks, control, game) with editable args, nested loops, multiple sprites, background picker — all executed by a real runtime on canvas with keyboard play. |
| **Publisher** (`/publish/[id]`) | 5-step pipeline: verify → **auto icon** → **key-scene screenshots** (real captures of the runtime) → **trailer frames** → store listing. Then publish to `/play/[slug]`. |
| **HTML5 export** | One click downloads a standalone `.html` file that runs the game anywhere. No lock-in. |
| **Models** (`/models`) | 20-model roster across tiers + **BYO API keys** (OpenRouter, Hugging Face, OpenAI, Anthropic, Google) stored locally and proxied through `/api/generate`. |
| **Gallery** (`/gallery`) | Published games + one-click remix into your workspace. |
| **Settings** | General, Usage (pools + 3h/7d windows), Privacy, Account & API keys, Billing (plans, credit packs, history). |

## Plans (as specced)

| | Free | Pro | Max |
| --- | --- | --- | --- |
| Price | $0 | $30/mo or $100 once | $50/mo or $150 once |
| Token pool | 5M | 20M | 100M |
| Squad cap | 3 models | 10 models | 30 models |
| Squad overhead | +50K tokens flat per run | 5x per run | 10x per run (2x Pro) |

Credit packs: $1.99/500K to $99.90/50M. Usage is tracked with rolling **3-hour** and **7-day** windows.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

Requires Node 18+.

## Architecture notes

- **Next.js 14 App Router** + TypeScript + Tailwind. All state is client-side (zustand + localStorage) so the demo works with zero backend; the shape of the store (`lib/store.ts`) mirrors what a production API would persist.
- Engine (`lib/engine.ts`): persona-driven squad simulation + token accounting. Swap `mockChat`/`runSquad` for real provider calls.
- Real providers: `lib/providers.ts` + `app/api/generate/route.ts` implement OpenAI-compatible chat + Anthropic messages for all five providers. Keys live in localStorage (dev) or env vars (prod).
- Runtime (`lib/runtime.ts`): a small interpreter over block programs (frame-based, stack per sprite) used by the stage, screenshots and the `/play` page.
- Exporter (`lib/exporter.ts`): compiles a block program to a standalone HTML file with an embedded ES5 runtime.

## Roadmap (suggested next milestones)

1. **Auth + real backend** — accounts, cloud projects, real token metering/billing (Stripe) against the same store shape.
2. **Token streaming** — stream squad responses; apply programmer-agent diffs to the program incrementally.
3. **Multi-scene games** — extend `BlockProgram` to scene graphs; publisher already captures per-scene shots.
4. **Community servers** — cross-user gallery requires a registry; `/play` and remix APIs are already isolated for it.
5. **Mobile touch controls** — on-screen dpad for the exported HTML runtime.

## Model names

Free/Pro/Max tiers use the naming from the product spec (GPT 5.6 Terra, Haiku 4.6, 6.1 Sol, Opus 4.6, Gemini 4 Hydrogen, GPT-6 Omega, ...). These are product-facing labels; map them to real provider IDs in `lib/catalog.ts` (the `id` fields) when wiring production accounts.
