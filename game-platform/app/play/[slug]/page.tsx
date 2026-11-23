"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import GameStage from "@/components/GameStage";
import { downloadHtml } from "@/lib/exporter";
import { timeAgo } from "@/lib/utils";

export default function PlayPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const project = useApp((s) => s.projects.find((p) => p.slug === slug && p.published));
  const remix = useApp((s) => s.remix);
  const router = useRouter();

  if (!mounted) return null;

  if (!project || !project.published) {
    return (
      <div className="card mx-auto my-24 max-w-md py-16 text-center">
        <div className="text-5xl">🔍</div>
        <h1 className="h2 mt-4">Game not found</h1>
        <p className="muted mt-1">This link lives on the creator's device — published games are stored locally in this demo build.</p>
        <Link href="/gallery" className="btn-primary mt-4">Back to gallery</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="card flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={project.published.iconDataUri} alt={project.name} className="h-16 w-16 rounded-2xl border border-edge" />
        <div className="flex-1">
          <h1 className="h2">{project.name}</h1>
          <p className="muted">{project.genre || "arcade"} · shipped {timeAgo(project.published.at)}</p>
        </div>
        <button className="btn-ghost" onClick={() => { const newId = remix(project.id); if (newId) router.push(`/build/${newId}`); }}>🔀 Remix</button>
        <button className="btn-ghost" onClick={() => downloadHtml(project.name, project.program)}>📦 Export</button>
      </div>

      <div className="card grid place-items-center">
        <GameStage program={project.program} />
      </div>

      <div className="card">
        <h2 className="h2 text-base">About</h2>
        <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{project.published.description || project.pitch}</pre>
        {project.published.screenshots.length > 0 && (
          <>
            <h3 className="mt-4 text-sm font-bold text-white">Screens</h3>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {project.published.screenshots.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt={`Screenshot ${i + 1}`} className="w-full rounded-lg border border-edge" />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
