"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export default function GalleryPage() {
  const [mounted, setMounted] = useState(false);
  const projects = useApp((s) => s.projects);
  const remix = useApp((s) => s.remix);
  const router = useRouter();

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const published = projects.filter((p) => p.published);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Community gallery</h1>
        <p className="muted mt-1">
          Games shipped from GamePlatform. Remix any of them into your own workspace — the blocks, palette and pitch come along.
        </p>
      </div>

      {published.length === 0 ? (
        <div className="card grid place-items-center py-16 text-center">
          <div className="text-5xl">🖼️</div>
          <h2 className="h2 mt-4">Nothing published yet</h2>
          <p className="muted mt-1">Finish a game and hit publish — it shows up here.</p>
          <Link href="/dashboard" className="btn-primary mt-4">Go build something</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {published.map((p) => (
            <div key={p.id} className="card flex flex-col">
              {p.published?.iconDataUri ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.published.iconDataUri} alt={p.name} className="h-24 w-24 self-start rounded-xl border border-edge" />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-xl border border-edge bg-panel2 text-3xl">🎮</div>
              )}
              <div className="mt-3 font-bold text-white">{p.name}</div>
              <div className="text-xs text-slate-400">{p.genre || "arcade"} · shipped {timeAgo(p.published!.at)}</div>
              <p className="muted mt-2 line-clamp-3 flex-1">{p.pitch}</p>
              <div className="mt-3 flex gap-2">
                <Link href={`/play/${p.slug}`} className="btn-primary flex-1 !py-1.5 text-xs">▶ Play</Link>
                <button
                  className="btn-ghost !py-1.5 text-xs"
                  onClick={() => {
                    const newId = remix(p.slug);
                    if (newId) router.push(`/build/${newId}`);
                  }}
                >
                  🔀 Remix
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
