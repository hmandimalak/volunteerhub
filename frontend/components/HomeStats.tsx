"use client";

import { useEffect, useState } from "react";
import { getPlatformStats, PlatformStats } from "@/lib/api";

function formatStat(value: number, suffix = ""): string {
  if (value >= 1000) {
    return `${Math.round(value / 100) / 10}k${suffix}`;
  }
  return `${value}${suffix}`;
}

export function HomeStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    getPlatformStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const items = stats
    ? [
        [formatStat(stats.volunteers), "bénévoles inscrits"],
        [formatStat(stats.verified_organisations), "organisations vérifiées"],
        [formatStat(stats.active_events), "événements actifs"],
        [formatStat(stats.volunteer_hours, " h"), "heures de bénévolat"],
        [formatStat(stats.completed_events), "événements terminés"],
      ]
    : [
        ["-", "bénévoles inscrits"],
        ["-", "organisations vérifiées"],
        ["-", "événements actifs"],
        ["-", "heures de bénévolat"],
        ["-", "événements terminés"],
      ];

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      {items.map(([value, label]) => (
        <div key={label} className="soft-panel transition-all duration-300 hover:scale-[1.02]">
          <div className="text-3xl font-black text-brand-900">{value}</div>
          <div className="text-sm font-semibold text-slate-500">{label}</div>
        </div>
      ))}
    </div>
  );
}
