"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { fmtTokens } from "@/lib/utils";

export default function GeneralSettings() {
  const [mounted, setMounted] = useState(false);
  const projects = useApp((s) => s.projects);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const totalBytes = JSON.stringify(useApp.getState()).length;

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="h2">Workspace</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-panel2 p-3">
            <div className="text-2xl font-extrabold text-white">{projects.length}</div>
            <div className="text-xs text-slate-400">Projects</div>
          </div>
          <div className="rounded-xl bg-panel2 p-3">
            <div className="text-2xl font-extrabold text-white">{projects.filter((p) => p.published).length}</div>
            <div className="text-xs text-slate-400">Published</div>
          </div>
          <div className="rounded-xl bg-panel2 p-3">
            <div className="text-2xl font-extrabold text-white">{fmtTokens(totalBytes)}</div>
            <div className="text-xs text-slate-400">Local workspace size</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="h2">Editor defaults</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-300">
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked disabled className="h-4 w-4 accent-neon" />
            Snap new sprites to the grid
          </label>
          <label className="flex items-center gap-2 text-slate-500">
            <input type="checkbox" disabled className="h-4 w-4" />
            Grid snapping is always on in this build (coming: custom shortcuts)
          </label>
        </div>
      </div>

      <div className="card">
        <h2 className="h2">Danger zone</h2>
        <p className="muted mt-1">Wipes every project, key and usage record from this browser. Cannot be undone.</p>
        <button
          className="btn-danger mt-3"
          onClick={() => {
            if (confirm("Delete ALL local data? This cannot be undone.")) {
              localStorage.clear();
              location.href = "/";
            }
          }}
        >
          Reset all platform data
        </button>
      </div>
    </div>
  );
}
