import Link from "next/link";
import { CREDIT_PACKS, MODELS, PLANS } from "@/lib/catalog";
import { fmtTokens, cls } from "@/lib/utils";

const SQUAD_TIERS = [
  { tier: "Free", n: "up to 3", cost: "+50K tokens flat per squad run" },
  { tier: "Pro", n: "up to 10", cost: "5× more tokens per squad run" },
  { tier: "Max", n: "up to 30", cost: "2× Pro (10× total) per squad run" },
];

export default function Landing() {
  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="card relative overflow-hidden !p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(600px 300px at 20% 0%, rgba(124,92,255,0.25), transparent), radial-gradient(500px 260px at 85% 20%, rgba(34,211,238,0.18), transparent)" }}
        />
        <div className="relative">
          <span className="chip border-neon/40 text-neon">🌍 ship everywhere · free publishing</span>
          <h1 className="h1 mt-4 max-w-3xl">
            Make games with a <span className="bg-gradient-to-r from-neon to-aqua bg-clip-text text-transparent">squad of AIs</span> — or drag blocks like Scratch.
          </h1>
          <p className="muted mt-3 max-w-2xl text-base">
            Assign up to 30 AI models real jobs — design, code, art, QA — and watch them build together. Publish with an
            auto-generated icon, screenshots and trailer. Export a standalone HTML5 game anywhere, for free.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn-primary">Start building — free →</Link>
            <Link href="/gallery" className="btn-ghost">Browse the gallery</Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {SQUAD_TIERS.map((s) => (
              <div key={s.tier} className="rounded-xl border border-edge bg-panel2 p-4">
                <div className="text-xs uppercase tracking-widest text-slate-500">{s.tier} squad</div>
                <div className="mt-1 text-lg font-bold text-white">{s.n} AI models</div>
                <div className="text-xs text-slate-400">{s.cost}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Standout features */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { e: "👥", t: "AI Squad collab", d: "Assign roles per model — designer, programmer, artist, QA. The squad debates and builds together. Different tiers unlock bigger squads." },
          { e: "🧱", t: "Scratch-style editor", d: "No-code users build with click-to-add blocks that actually run. Pros drop into real program logic anytime." },
          { e: "📸", t: "Auto store kit", d: "On publish, the platform records screenshots of key scenes, designs an icon, and cuts an animated trailer for you." },
          { e: "📦", t: "True HTML5 export", d: "One click compiles your game into a single standalone HTML file. Host it anywhere, free." },
          { e: "🔑", t: "Bring your own keys", d: "Plug in OpenRouter, Hugging Face, OpenAI, Anthropic or Google keys and use any model you like directly." },
          { e: "🧭", t: "Transparent usage", d: "5M/20M/100M token pools with 3-hour and 7-day rolling windows — never get surprised by a bill." },
        ].map((f) => (
          <div key={f.t} className="card">
            <div className="text-2xl">{f.e}</div>
            <div className="h2 mt-2 text-base">{f.t}</div>
            <p className="muted mt-1">{f.d}</p>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section id="pricing">
        <h2 className="h2">Plans &amp; pricing</h2>
        <p className="muted mt-1">Every plan includes publishing, export and the block editor. Pay monthly or once — no rebills on lifetime.</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={cls(
                "card relative flex flex-col",
                p.id === "pro" && "border-neon/50 shadow-glow",
                p.id === "max" && "border-amber-400/50"
              )}
            >
              {p.id === "pro" && (
                <span className="absolute -top-3 left-5 rounded-full bg-neon px-3 py-0.5 text-xs font-bold text-white">MOST POPULAR</span>
              )}
              {p.id === "max" && (
                <span className="absolute -top-3 left-5 rounded-full bg-amber-400 px-3 py-0.5 text-xs font-bold text-black">MAX POWER</span>
              )}
              <div className="text-lg font-bold text-white">{p.name}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">{p.priceMonthly}</span>
                {p.priceOnce && <span className="text-sm text-slate-400">or {p.priceOnce}</span>}
              </div>
              <div className="mt-3 chip">{fmtTokens(p.tokenPool)} tokens / pool</div>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-300">
                {p.highlights.map((h) => (
                  <li key={h} className="flex gap-2">
                    <span className="text-lime">✓</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-xl bg-panel2 p-3 text-xs text-slate-400">👥 Squad: {p.squadMax} models · {p.squadOverheadLabel}</div>
              <Link href={`/settings/billing?plan=${p.id}`} className={cls("mt-4", p.id === "free" ? "btn-ghost" : "btn-primary")}>
                {p.id === "free" ? "Start free" : `Choose ${p.name}`}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Credits */}
      <section>
        <h2 className="h2">Need more tokens? Credit packs</h2>
        <p className="muted mt-1">One-time packs stack on top of any plan pool. From $1.99 to $99.90.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CREDIT_PACKS.map((c) => (
            <div key={c.id} className={cls("card flex items-center justify-between !py-4", c.best && "border-lime/50")}>
              <div>
                <div className="font-bold text-white">{fmtTokens(c.tokens)} tokens</div>
                <div className="text-xs text-slate-400">{c.label}</div>
              </div>
              <div className={cls("text-lg font-extrabold", c.best ? "text-lime" : "text-white")}>{c.price}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Models preview */}
      <section>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="h2">{MODELS.length} models in the roster</h2>
            <p className="muted mt-1">Budget heroes on Free, frontier titans on Max. Full list on the Models page.</p>
          </div>
          <Link href="/models" className="btn-ghost">See all models →</Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {MODELS.map((m) => (
            <span key={m.id} className="chip">
              {m.emoji} {m.name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
