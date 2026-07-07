"use client";

import { useEffect, useState } from "react";
import { AdminStats } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { RoleGate } from "@/components/RoleGate";
import { StatusMessage } from "@/components/StatusMessage";

export default function AdminReportsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    authedFetch<AdminStats>("/stats/admin/overview/")
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Statistiques indisponibles."));
  }, []);

  const cards = [
    ["Utilisateurs", stats?.users ?? "-"],
    ["Organisations", stats?.organisations ?? "-"],
    ["Benevoles", stats?.volunteers ?? "-"],
    ["Evenements", stats?.events ?? "-"],
    ["Candidatures", stats?.applications ?? "-"],
    ["Candidatures acceptees", stats?.accepted_applications ?? "-"]
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <p className="font-bold text-brand-600">Admin</p>
      <h1 className="mt-2 text-4xl font-black">Reports & Analytics</h1>
      <p className="mt-3 text-slate-600">Indicateurs globaux de la plateforme.</p>

      <RoleGate allowedRoles={["admin"]}>
        <div className="mt-6">
          <StatusMessage message={error} tone="error" />
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {cards.map(([label, value]) => (
            <article key={label} className="card">
              <p className="text-sm font-bold text-slate-500">{label}</p>
              <p className="mt-3 text-4xl font-black">{value}</p>
            </article>
          ))}
        </div>
      </RoleGate>
    </section>
  );
}
