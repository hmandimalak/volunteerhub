"use client";

import { useEffect, useState } from "react";
import { Application, PaginatedResponse, unwrapResults } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { StatusMessage } from "@/components/StatusMessage";
import { RoleGate } from "@/components/RoleGate";

export default function VolunteerApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authedFetch<PaginatedResponse<Application> | Application[]>("/candidatures/")
      .then((data) => setApplications(unwrapResults(data)))
      .catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger l'historique."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <p className="font-bold text-brand-600">Benevole</p>
      <h1 className="mt-2 text-4xl font-black">Mes candidatures</h1>
      <p className="mt-3 text-slate-600">Suivez vos inscriptions aux missions et leur statut.</p>
      <RoleGate allowedRoles={["benevole", "admin"]}>

      <div className="mt-6">
        <StatusMessage message={error} tone="error" />
      </div>

      <div className="mt-8 grid gap-4">
        {loading ? <div className="card text-slate-600">Chargement...</div> : null}
        {!loading && applications.length === 0 ? <div className="card text-slate-600">Aucune candidature.</div> : null}
        {applications.map((application) => (
          <article key={application.id} className="card">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-black">{application.mission_name ?? `Mission #${application.mission}`}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Candidature envoyee le {new Date(application.applied_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <span className="w-fit rounded-full bg-brand-100 px-4 py-2 text-sm font-black text-brand-900">
                {application.status}
              </span>
            </div>
          </article>
        ))}
      </div>
      </RoleGate>
    </section>
  );
}
