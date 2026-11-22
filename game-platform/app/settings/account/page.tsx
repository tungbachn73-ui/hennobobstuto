"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { PROVIDERS } from "@/lib/catalog";

export default function AccountSettings() {
  const [mounted, setMounted] = useState(false);
  const profile = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  const keys = useApp((s) => s.keys);
  const setKey = useApp((s) => s.setKey);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const savedCount = Object.values(keys).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="h2">Profile</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Display name</label>
            <input className="input" value={profile.displayName} onChange={(e) => setProfile({ displayName: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Email</label>
            <input className="input" value={profile.email} onChange={(e) => setProfile({ email: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Country</label>
            <input className="input" value={profile.country} onChange={(e) => setProfile({ country: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="h2">API keys</h2>
          <span className="chip">{savedCount}/5 providers connected</span>
        </div>
        <p className="muted mt-1">
          Stored only in this browser. Calls go through your own <code className="text-neon">/api/generate</code> server route — the platform
          never sees or logs them. Prefer env vars in production:{" "}
          {PROVIDERS.map((p) => p.envVar).join(", ")}.
        </p>
        <div className="mt-4">
          <Link href="/models" className="btn-ghost">Manage keys in the Models page →</Link>
        </div>
      </div>

      <div className="card">
        <h2 className="h2">Session</h2>
        <div className="mt-3 space-y-1 text-sm text-slate-300">
          <div>Signed in as <span className="text-white">{profile.email}</span> (demo account — local only)</div>
          <div className="text-slate-500">Sign-out, 2FA and OAuth are part of the auth milestone (see README roadmap).</div>
        </div>
        <button className="btn-ghost mt-3" onClick={() => alert("Signed out (demo). Refresh to continue.")}>Sign out</button>
      </div>
    </div>
  );
}
