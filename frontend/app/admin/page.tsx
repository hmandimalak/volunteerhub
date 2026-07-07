"use client";

import { BarChart3, Building2, CalendarDays, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminStats } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { RoleGate } from "@/components/RoleGate";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    authedFetch<AdminStats>("/stats/admin/overview/")
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Statistiques indisponibles."));
  }, []);

  const adminCards = [
    { label: "Organisations", value: stats?.organisations ?? "-", icon: Building2 },
    { label: "Evenements", value: stats?.events ?? "-", icon: CalendarDays },
    { label: "Candidatures", value: stats?.applications ?? "-", icon: BarChart3 },
    { label: "Candidatures acceptees", value: stats?.accepted_applications ?? "-", icon: ShieldCheck }
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <p className="font-bold text-brand-600">Administration plateforme</p>
      <h1 className="mt-2 text-4xl font-black">Dashboard Overview</h1>
      <RoleGate allowedRoles={["admin"]}>
      {error ? (
        <p className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          {error} Utilisez un compte admin connecte via `/login`.
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-4">
        {adminCards.map((card) => (
          <article key={card.label} className="card">
            <card.icon className="h-7 w-7 text-brand-600" />
            <p className="mt-5 text-sm font-bold text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-black">{card.value}</p>
          </article>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <Building2 className="h-8 w-8 text-brand-600" />
          <h2 className="mt-4 text-xl font-black">Organizations Management</h2>
          <p className="mt-3 text-slate-600">
            Gerer les organisations en attente et approuvees, avec benevoles integres par organisation.
          </p>
          <Link href="/admin/organisations" className="btn-primary mt-6">
            Ouvrir
          </Link>
        </div>
        <div className="card">
          <CalendarDays className="h-8 w-8 text-brand-600" />
          <h2 className="mt-4 text-xl font-black">Events Management</h2>
          <p className="mt-3 text-slate-600">
            Vue globale des evenements de toutes les organisations.
          </p>
          <Link href="/admin/events" className="btn-secondary mt-6">Ouvrir</Link>
        </div>
        <div className="card">
          <BarChart3 className="h-8 w-8 text-brand-600" />
          <h2 className="mt-4 text-xl font-black">Reports & Analytics</h2>
          <p className="mt-3 text-slate-600">
            Statistiques plateforme, candidatures, evenements et activite.
          </p>
          <Link href="/admin/reports" className="btn-secondary mt-6">Ouvrir</Link>
        </div>
      </div>
      </RoleGate>
    </section>
  );
}
