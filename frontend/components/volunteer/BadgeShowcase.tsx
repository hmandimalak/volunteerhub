"use client";

import { useEffect, useState } from "react";
import { BadgeProgress, Volunteer } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { AdminPageHeader, EmptyState, GlassCard } from "@/components/admin";
import { formatDate } from "@/lib/api";

export function BadgeShowcase() {
  const [items, setItems] = useState<BadgeProgress[]>([]);
  const [profile, setProfile] = useState<Volunteer | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    authedFetch<Volunteer>("/benevoles/me/")
      .then(setProfile)
      .catch(() => setProfile(null));
    authedFetch<BadgeProgress[]>("/benevoles/me/badges-progress/")
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger les badges."));
  }, []);

  return (
    <section>
      <AdminPageHeader
        kicker="Mes badges"
        title="Collection lumineuse"
        subtitle={profile ? `${profile.first_name}, vos badges débloqués brillent. Les autres affichent votre progression.` : "Vos badges débloqués brillent. Les autres affichent votre progression."}
      />
      {error ? <p className="mt-6 text-sm font-semibold text-rose-600">{error}</p> : null}
      {items.length === 0 && !error ? (
        <GlassCard className="mt-8" hover={false}>
          <EmptyState title="Aucun badge pour le moment" description="Terminez une mission pour débloquer Premier pas." />
        </GlassCard>
      ) : null}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const percent = item.target ? Math.min(100, Math.round((item.current / item.target) * 100)) : 0;
          return (
            <div
              key={item.badge.id}
              className="relative"
              onMouseEnter={() => setHovered(item.badge.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <GlassCard className={`h-full ${item.earned ? "badge-3d glow-border" : "grayscale"}`}>
                <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full border-4 ${item.earned ? "border-cyan-300 bg-gradient-to-br from-brand-500 to-cyan-400 text-white shadow-[0_0_24px_rgba(103,232,249,0.45)]" : "border-slate-200 bg-slate-100 text-slate-400"}`}>
                  <span className="text-2xl font-black">{item.badge.name.slice(0, 1)}</span>
                </div>
                <h3 className="mt-4 text-center text-lg font-black">{item.badge.name}</h3>
                <p className="mt-2 text-center text-sm text-slate-600">{item.badge.description}</p>
                {item.earned ? (
                  <p className="mt-4 text-center text-xs font-bold text-brand-600">Obtenu le {item.awarded_at ? formatDate(item.awarded_at) : "—"}</p>
                ) : (
                  <div className="mt-4">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="mt-2 text-center text-xs font-bold text-slate-500">{item.progress_label}</p>
                  </div>
                )}
              </GlassCard>
              {hovered === item.badge.id ? (
                <div className="absolute left-4 right-4 top-3 z-10 rounded-2xl border border-white/50 bg-white/95 p-3 text-xs shadow-xl backdrop-blur-md">
                  <p className="font-black">{item.earned ? "Pourquoi ce badge ?" : "Comment le débloquer ?"}</p>
                  <p className="mt-1 text-slate-600">{item.earned ? `${item.badge.description} Attribué le ${item.awarded_at ? formatDate(item.awarded_at) : "—"}.` : item.progress_label}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
