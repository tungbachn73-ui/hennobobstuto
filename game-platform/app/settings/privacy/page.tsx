"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";

export default function PrivacySettings() {
  const [mounted, setMounted] = useState(false);
  const privacy = useApp((s) => s.privacy);
  const setPrivacy = useApp((s) => s.setPrivacy);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  function exportData() {
    const data = JSON.stringify(useApp.getState(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gameplatform-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="h2">Privacy controls</h2>
        <div className="mt-4 space-y-4">
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={privacy.galleryPublic} onChange={(e) => setPrivacy({ galleryPublic: e.target.checked })} className="mt-0.5 h-4 w-4 accent-neon" />
            <span>
              <span className="text-sm font-medium text-slate-200">List published games in the community gallery</span>
              <span className="block text-xs text-slate-400">Your games still get a direct /play link either way — this only controls gallery visibility.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={privacy.telemetry} onChange={(e) => setPrivacy({ telemetry: e.target.checked })} className="mt-0.5 h-4 w-4 accent-neon" />
            <span>
              <span className="text-sm font-medium text-slate-200">Anonymous product telemetry</span>
              <span className="block text-xs text-slate-400">Helps improve the editor. Never includes game content or prompts.</span>
            </span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={privacy.aiTraining} onChange={(e) => setPrivacy({ aiTraining: e.target.checked })} className="mt-0.5 h-4 w-4 accent-neon" />
            <span>
              <span className="text-sm font-medium text-slate-200">Allow my prompts to improve future game models</span>
              <span className="block text-xs text-slate-400">Off by default. When you use your own API keys, provider policies apply instead.</span>
            </span>
          </label>
        </div>
      </div>

      <div className="card">
        <h2 className="h2">Your data</h2>
        <p className="muted mt-1">
          Everything in this build — projects, keys, usage — lives in your browser's local storage. Export it as JSON anytime.
        </p>
        <button className="btn-ghost mt-3" onClick={exportData}>⬇ Export all my data (JSON)</button>
      </div>
    </div>
  );
}
