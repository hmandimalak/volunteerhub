"use client";

import { Award, CalendarCheck, Clock, HeartHandshake, MapPin, QrCode, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Application, MissionRecommendation, PaginatedResponse, VolunteerBadge, VolunteerQrCode, VolunteerStats, formatDate, unwrapResults } from "@/lib/api";
import { authedFetch, downloadAuthedFile } from "@/lib/browser-api";
import { AdminPageHeader, GlassCard, StatCard, StatusBadge } from "@/components/admin";

export default function VolunteerDashboardPage() {
  const [recommendations, setRecommendations] = useState<MissionRecommendation[]>([]);
  const [stats, setStats] = useState<VolunteerStats | null>(null);
  const [badges, setBadges] = useState<VolunteerBadge[]>([]);
  const [qrCodes, setQrCodes] = useState<VolunteerQrCode[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    authedFetch<PaginatedResponse<MissionRecommendation> | MissionRecommendation[]>("/recommendations/missions/?limit=3")
      .then((data) => setRecommendations(unwrapResults(data)))
      .catch(() => setRecommendations([]));
    authedFetch<VolunteerStats>("/stats/benevole/me/")
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Statistiques indisponibles."));
    authedFetch<PaginatedResponse<VolunteerBadge> | VolunteerBadge[]>("/benevoles/me/badges/")
      .then((data) => setBadges(unwrapResults(data)))
      .catch(() => setBadges([]));
    authedFetch<PaginatedResponse<VolunteerQrCode> | VolunteerQrCode[]>("/candidatures/my-qr-codes/")
      .then((data) => setQrCodes(unwrapResults(data)))
      .catch(() => setQrCodes([]));
    authedFetch<PaginatedResponse<Application> | Application[]>("/candidatures/")
      .then((data) => setApplications(unwrapResults(data)))
      .catch(() => setApplications([]));
  }, []);

  const upcoming = applications.filter((item) => item.status === "acceptee").slice(0, 4);
  const calendarDays = Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date;
  });
  const markedDays = new Set(qrCodes.map((entry) => new Date(entry.event_date).toDateString()));

  return (
    <section>
      <AdminPageHeader
        kicker="Espace bénévole"
        title="Votre hub d'impact"
        subtitle="Heures, missions à venir et opportunités choisies pour vous."
        actions={
          <Link href="/volunteer/discover" className="btn-primary">
            Trouver un événement
          </Link>
        }
      />
      {error ? <p className="mt-6 rounded-3xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{error}</p> : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Heures effectuées" value={`${stats?.hours ?? 0} h`} icon={Clock} tone="lilac" />
        <StatCard label="Événements rejoints" value={stats?.completed_events ?? stats?.accepted_applications ?? 0} icon={CalendarCheck} tone="cyan" />
        <StatCard label="Impact (points)" value={stats?.points ?? 0} icon={HeartHandshake} tone="pink" />
        <StatCard label="Badges" value={stats?.badges ?? badges.length} icon={Award} tone="mint" />
      </div>

      <GlassCard className="mt-8 glow-border" hover={false}>
        <h2 className="text-xl font-black">Calendrier des prochaines missions</h2>
        <p className="mt-1 text-sm text-slate-500">Les jours lumineux correspondent à une mission confirmée.</p>
        <div className="mt-5 grid grid-cols-7 gap-2">
          {calendarDays.map((day) => {
            const marked = markedDays.has(day.toDateString());
            return (
              <div
                key={day.toISOString()}
                className={`rounded-2xl px-2 py-3 text-center text-xs font-bold transition-all duration-300 ${
                  marked
                    ? "bg-gradient-to-br from-brand-500 to-cyan-400 text-white shadow-lg shadow-brand-500/30"
                    : "bg-white/70 text-slate-500"
                }`}
              >
                <p className="uppercase">{day.toLocaleDateString("fr-FR", { weekday: "short" })}</p>
                <p className="mt-1 text-lg">{day.getDate()}</p>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <GlassCard hover={false}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">Prochaines missions</h2>
            <Link href="/volunteer/applications" className="text-sm font-bold text-brand-600">
              Voir tout
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {upcoming.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-lilac/40 p-4 text-sm text-slate-500">
                Aucune mission confirmée pour le moment. Explorez les événements recommandés.
              </p>
            ) : null}
            {upcoming.map((item) => {
              const qr = qrCodes.find((entry) => entry.application_id === item.id);
              return (
                <div key={item.id} className="rounded-2xl border border-white/50 bg-white/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{item.event_title ?? item.mission_name}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.mission_name}</p>
                      {qr ? <p className="mt-1 text-xs text-brand-600">{formatDate(qr.event_date)}</p> : null}
                    </div>
                    <StatusBadge label="Confirmé" tone="success" />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" />
            <h2 className="text-xl font-black">Recommandé pour vous</h2>
          </div>
          <div className="mt-5 grid gap-3">
            {recommendations.length === 0 ? (
              <p className="text-sm text-slate-500">Complétez votre profil pour des suggestions plus précises.</p>
            ) : null}
            {recommendations.map((item) => (
              <div key={item.mission.id} className="rounded-2xl bg-brand-50/70 p-4 transition-all duration-300 hover:-translate-y-1">
                <p className="font-black">{item.mission.name}</p>
                <p className="mt-1 text-sm text-brand-700">{item.event.title}</p>
                <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" /> {item.event.city || "Lieu à confirmer"} · {formatDate(item.mission.starts_at)}
                </p>
                <p className="mt-2 text-xs font-bold text-brand-600">{item.score} % compatible</p>
                <Link href="/volunteer/discover" className="btn-secondary mt-3 px-3 py-2 text-xs">
                  Voir les événements
                </Link>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="mt-8" hover={false}>
        <div className="flex items-center gap-3">
          <QrCode className="h-6 w-6 text-brand-600" />
          <div>
            <h2 className="text-lg font-black">QR Codes à présenter</h2>
            <p className="text-sm text-slate-500">Téléchargez-les avant le jour J.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {qrCodes.slice(0, 4).map((entry) => (
            <div key={entry.application_id} className="rounded-2xl border border-lilac/20 bg-white/70 p-4">
              <p className="font-black">{entry.event_title}</p>
              <p className="text-xs text-slate-500">{formatDate(entry.event_date)}</p>
              <button
                className="btn-secondary mt-3 px-3 py-2 text-xs"
                onClick={() => downloadAuthedFile(`/candidatures/${entry.application_id}/qr-code/`, `qr-${entry.application_id}.png`)}
              >
                Télécharger
              </button>
            </div>
          ))}
          {qrCodes.length === 0 ? <p className="text-sm text-slate-500">Aucun QR Code pour l'instant.</p> : null}
        </div>
      </GlassCard>
    </section>
  );
}
