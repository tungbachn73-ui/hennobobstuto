"use client";

import { useApp, usageWindows } from "@/lib/store";
import { planById } from "@/lib/catalog";
import { fmtTokens } from "@/lib/utils";
import { cls } from "@/lib/utils";

function Bar({ used, cap, label, sub }: { used: number; cap: number; label: string; sub: string }) {
  const pct = Math.min(100, Math.round((used / Math.max(1, cap)) * 100));
  const color = pct > 90 ? "bg-rose2" : pct > 65 ? "bg-amber-400" : "bg-gradient-to-r from-neon to-aqua";
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        <span className="text-xs text-slate-400">{sub}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-panel2">
        <div className={cls("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function UsageMeter({ compact = false }: { compact?: boolean }) {
  const tier = useApp((s) => s.tier);
  const credits = useApp((s) => s.credits);
  const usedAll = useApp((s) => s.poolUsed());
  const windows = useApp((s) => usageWindows(s));
  const plan = planById(tier);
  const cap = plan.tokenPool + credits;
  const hourlyCap = Math.round(cap * 0.25);
  const weeklyCap = Math.round(cap * 0.75);

  const hH = Math.floor(windows.hourly.resetsInMs / 3600_000);
  const hM = Math.floor((windows.hourly.resetsInMs % 3600_000) / 60_000);

  return (
    <div className={cls("space-y-4", compact && "space-y-3")}>
      <Bar
        used={usedAll}
        cap={cap}
        label={`${plan.name} pool${credits ? " + credits" : ""}`}
        sub={`${fmtTokens(usedAll)} / ${fmtTokens(cap)}`}
      />
      <Bar
        used={windows.hourly.used}
        cap={hourlyCap}
        label="Hourly window (3h)"
        sub={`resets in ${hH}h ${hM}m · ${fmtTokens(windows.hourly.used)} used`}
      />
      {!compact && (
        <Bar
          used={windows.weekly.used}
          cap={weeklyCap}
          label="Weekly window (7d)"
          sub={`resets in 7d · ${fmtTokens(windows.weekly.used)} used`}
        />
      )}
    </div>
  );
}
