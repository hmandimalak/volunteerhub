"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Building2, CalendarDays, ShieldCheck, Sparkles, Users } from "lucide-react";
import { AdminStats } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { StatusMessage } from "@/components/StatusMessage";
import { AdminPageHeader, GlassCard, StatCard } from "@/components/admin";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    authedFetch<AdminStats>("/stats/admin/overview/")
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Statistiques indisponibles."));
  }, []);

  const shortcuts = [
    {
      href: "/admin/organisations",
      icon: Building2,
      title: "Organisations",
      text: "Validez les associations, suspendez un compte ou consultez les documents.",
    },
    {
      href: "/admin/events",
      icon: CalendarDays,
      title: "Événements",
      text: "Parcourez les missions actives et archivées de toute la plateforme.",
    },
    {
      href: "/admin/reports",
      icon: BarChart3,
      title: "Rapports",
      text: "Suivez l'activité globale, les candidatures et l'impact des bénévoles.",
    },
  ];

  return (
    <section>
      <AdminPageHeader
        title="Vue d'ensemble"
        subtitle="Un tableau de bord clair pour piloter la plateforme sans faire défiler des listes interminables."
      />

      {error ? (
        <div className="mt-6">
          <StatusMessage
            message={`${error} Utilisez un compte administrateur connecté via la page de connexion.`}
            tone="error"
          />
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Organisations" value={stats?.organisations ?? "—"} icon={Building2} tone="lilac" />
        <StatCard label="Événements" value={stats?.events ?? "—"} icon={CalendarDays} tone="cyan" />
        <StatCard label="Candidatures" value={stats?.applications ?? "—"} icon={Users} tone="pink" />
        <StatCard
          label="Acceptées"
          value={stats?.accepted_applications ?? "—"}
          hint="Candidatures validées"
          icon={ShieldCheck}
          tone="mint"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {shortcuts.map((item) => (
          <GlassCard key={item.href}>
            <item.icon className="h-8 w-8 text-brand-600" />
            <h2 className="mt-4 text-xl font-black">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            <Link href={item.href} className="btn-primary mt-6">
              Ouvrir <ArrowRight className="h-4 w-4" />
            </Link>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="mt-8" hover={false}>
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-400 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-black">Astuce de navigation</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Chaque section utilise des onglets, des cartes d'indicateurs et des panneaux latéraux. Les formulaires
              denses restent cachés jusqu'à ce que vous en ayez besoin.
            </p>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}
