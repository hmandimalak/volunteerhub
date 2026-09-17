"use client";

import { CalendarDays, MapPin, Sparkles, Users } from "lucide-react";
import { StatusBadge } from "@/components/admin";

type EventPreviewCardProps = {
  title: string;
  description: string;
  category: string;
  city: string;
  startsAt: string;
  volunteersNeeded: number;
  published: boolean;
  imageUrl?: string;
  missionCount: number;
};

function formatPreviewDate(value: string) {
  if (!value) return "Date à confirmer";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date à confirmer";
  return date.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function EventPreviewCard({
  title,
  description,
  category,
  city,
  startsAt,
  volunteersNeeded,
  published,
  imageUrl,
  missionCount,
}: EventPreviewCardProps) {
  return (
    <article className="glow-ring overflow-hidden rounded-3xl border border-white/40 bg-white/75 shadow-xl shadow-purple-500/10 backdrop-blur-md">
      <div
        className="relative h-40 bg-gradient-to-br from-brand-400 via-fuchsia-300 to-cyan-300"
        style={imageUrl ? { backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/50 to-transparent" />
        <div className="absolute bottom-3 left-3 flex gap-2">
          <StatusBadge label={published ? "Publié" : "Brouillon"} tone={published ? "success" : "warning"} />
          {category ? <StatusBadge label={category} tone="info" /> : null}
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 text-brand-600">
          <Sparkles className="h-4 w-4" />
          <p className="text-xs font-bold uppercase tracking-wide">Aperçu en direct</p>
        </div>
        <h3 className="mt-2 text-xl font-black text-brand-900">{title || "Titre de l'événement"}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
          {description || "La description apparaîtra ici au fur et à mesure de la saisie."}
        </p>
        <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-500">
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4" /> {city || "Lieu à confirmer"}
          </p>
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> {formatPreviewDate(startsAt)}
          </p>
          <p className="flex items-center gap-2">
            <Users className="h-4 w-4" /> {volunteersNeeded || 0} bénévoles · {missionCount} mission(s)
          </p>
        </div>
      </div>
    </article>
  );
}
