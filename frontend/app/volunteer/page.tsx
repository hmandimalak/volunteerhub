"use client";

import { Award, CalendarCheck, Download, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MissionRecommendation, VolunteerStats, formatDate } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { RoleGate } from "@/components/RoleGate";

export default function VolunteerDashboardPage() {
  const [recommendations, setRecommendations] = useState<MissionRecommendation[]>([]);
  const [stats, setStats] = useState<VolunteerStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    authedFetch<MissionRecommendation[]>("/recommendations/missions/?limit=3")
      .then(setRecommendations)
      .catch(() => setRecommendations([]));
    authedFetch<VolunteerStats>("/stats/benevole/me/")
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Statistiques indisponibles."));
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <p className="font-bold text-brand-600">Tableau de bord benevole</p>
      <h1 className="mt-2 text-4xl font-black">Vos prochaines missions et recompenses</h1>
      <RoleGate allowedRoles={["benevole", "admin"]}>
      {error ? (
        <p className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          {error} Connectez-vous via `/login` avec un compte benevole.
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.7fr_0.3fr]">
        <div className="card">
          <h2 className="text-xl font-black">Recommended for You</h2>
          <p className="mt-2 text-sm text-slate-600">Suggestions basees sur vos competences, interets, disponibilites et votre historique.</p>
          <div className="mt-6 grid gap-4">
            {recommendations.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                Aucune recommandation personnalisee pour le moment. Completez votre profil et vos competences.
              </p>
            ) : null}
            {recommendations.map((item) => (
              <div key={item.mission.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-black">{item.mission.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-brand-700">{item.event.title}</p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="h-4 w-4" /> {item.event.city || "Lieu a confirmer"} - {formatDate(item.mission.starts_at)}
                    </p>
                    <p className="mt-3 text-sm text-slate-600">{item.reasons.join(" - ")}</p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">{item.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="grid gap-6">
          <div className="card">
            <Award className="h-8 w-8 text-brand-600" />
            <h2 className="mt-4 text-xl font-black">{stats?.badges ?? "-"} badges</h2>
            <p className="mt-2 text-sm text-slate-600">{stats?.points ?? "-"} points cumules.</p>
          </div>
          <div className="card">
            <CalendarCheck className="h-8 w-8 text-brand-600" />
            <h2 className="mt-4 text-xl font-black">{stats?.accepted_applications ?? "-"} missions acceptees</h2>
            <p className="mt-2 text-sm text-slate-600">{stats?.applications ?? "-"} candidatures au total.</p>
          </div>
          <Link href="/volunteer/certificates" className="btn-primary">
            <Download className="mr-2 h-4 w-4" /> Certificats
          </Link>
          <Link href="/volunteer/applications" className="btn-secondary">
            Mes candidatures
          </Link>
        </aside>
      </div>
      </RoleGate>
    </section>
  );
}
