"use client";

import { useEffect, useState } from "react";
import { BarChart3, Building2, CalendarDays, HeartHandshake, ShieldCheck, Users } from "lucide-react";
import { AdminStats } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { StatusMessage } from "@/components/StatusMessage";
import { AdminPageHeader, AdminTabs, GlassCard, StatCard } from "@/components/admin";

export default function AdminReportsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    authedFetch<AdminStats>("/stats/admin/overview/")
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Statistiques indisponibles."));
  }, []);

  const acceptanceRate =
    stats && stats.applications > 0 ? Math.round((stats.accepted_applications / stats.applications) * 100) : 0;

  return (
    <section>
      <AdminPageHeader
        title="Rapports et analyses"
        subtitle="Des indicateurs globaux, présentés en cartes plutôt qu'en tableaux denses."
      />

      <div className="mt-6">
        <StatusMessage message={error} tone="error" />
      </div>

      <div className="mt-8">
        <AdminTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "overview", label: "Vue d'ensemble" },
            { id: "activity", label: "Activité" },
            { id: "impact", label: "Impact" },
          ]}
        />
      </div>

      {tab === "overview" ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard label="Utilisateurs" value={stats?.users ?? "—"} icon={Users} tone="lilac" />
          <StatCard label="Organisations" value={stats?.organisations ?? "—"} icon={Building2} tone="cyan" />
          <StatCard label="Bénévoles" value={stats?.volunteers ?? "—"} icon={HeartHandshake} tone="pink" />
          <StatCard label="Événements" value={stats?.events ?? "—"} icon={CalendarDays} tone="mint" />
          <StatCard label="Candidatures" value={stats?.applications ?? "—"} icon={BarChart3} tone="lilac" />
          <StatCard label="Candidatures acceptées" value={stats?.accepted_applications ?? "—"} icon={ShieldCheck} tone="mint" />
        </div>
      ) : null}

      {tab === "activity" ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <GlassCard>
            <h2 className="text-lg font-black">Taux d'acceptation</h2>
            <p className="mt-2 text-sm text-slate-500">Part des candidatures validées sur l'ensemble des demandes.</p>
            <p className="mt-6 text-5xl font-black text-brand-900">{acceptanceRate} %</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-brand-50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${acceptanceRate}%` }}
              />
            </div>
          </GlassCard>
          <GlassCard>
            <h2 className="text-lg font-black">Volume de candidatures</h2>
            <p className="mt-2 text-sm text-slate-500">Demandes reçues et décisions positives.</p>
            <div className="mt-6 grid gap-4">
              <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
                <span className="font-semibold text-slate-500">Reçues</span>
                <span className="text-xl font-black">{stats?.applications ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
                <span className="font-semibold text-slate-500">Acceptées</span>
                <span className="text-xl font-black">{stats?.accepted_applications ?? "—"}</span>
              </div>
            </div>
          </GlassCard>
        </div>
      ) : null}

      {tab === "impact" ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <GlassCard>
            <h2 className="text-lg font-black">Communauté</h2>
            <p className="mt-2 text-sm text-slate-500">Personnes et structures actives sur VolunteerHub.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-brand-50/80 p-4">
                <p className="text-xs font-bold text-slate-500">Bénévoles</p>
                <p className="mt-1 text-3xl font-black">{stats?.volunteers ?? "—"}</p>
              </div>
              <div className="rounded-2xl bg-cyan-50/80 p-4">
                <p className="text-xs font-bold text-slate-500">Organisations</p>
                <p className="mt-1 text-3xl font-black">{stats?.organisations ?? "—"}</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard>
            <h2 className="text-lg font-black">Missions</h2>
            <p className="mt-2 text-sm text-slate-500">Événements publiés et engagements confirmés.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-pink-50/80 p-4">
                <p className="text-xs font-bold text-slate-500">Événements</p>
                <p className="mt-1 text-3xl font-black">{stats?.events ?? "—"}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50/80 p-4">
                <p className="text-xs font-bold text-slate-500">Acceptations</p>
                <p className="mt-1 text-3xl font-black">{stats?.accepted_applications ?? "—"}</p>
              </div>
            </div>
          </GlassCard>
        </div>
      ) : null}
    </section>
  );
}
