"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Application, PaginatedResponse, formatDate, unwrapResults } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { AdminPageHeader, AdminTabs, EmptyState, GlassCard, StatusBadge } from "@/components/admin";
import { StatusMessage } from "@/components/StatusMessage";

function applicationDisplay(application: Application) {
  const attendance = application.attendance_status;
  if (attendance === "terminee" || attendance === "completed") {
    return { label: "Terminé", tone: "info" as const, key: "termine" };
  }
  if (application.status === "acceptee") {
    return { label: "Acceptée", tone: "success" as const, key: "acceptee" };
  }
  if (application.status === "en_attente") {
    return { label: "En attente", tone: "warning" as const, key: "attente" };
  }
  if (application.status === "refusee") {
    return { label: "Refusée", tone: "danger" as const, key: "refusee" };
  }
  return { label: application.status, tone: "neutral" as const, key: application.status };
}

export default function VolunteerApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    authedFetch<PaginatedResponse<Application> | Application[]>("/candidatures/")
      .then((data) => setApplications(unwrapResults(data)))
      .catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger les candidatures."));
  }, []);

  const filtered = useMemo(() => {
    return applications.filter((application) => {
      if (filter === "all") return true;
      return applicationDisplay(application).key === filter;
    });
  }, [applications, filter]);

  return (
    <section>
      <AdminPageHeader
        kicker="Mes candidatures"
        title="Suivi de vos missions"
        subtitle="Chaque candidature reste visible, de l'envoi jusqu'à l'acceptation."
      />
      <div className="mt-6">
        <StatusMessage message={error} tone="error" />
      </div>
      <div className="mt-6">
        <AdminTabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { id: "all", label: "Toutes", count: applications.length },
            { id: "attente", label: "En attente" },
            { id: "acceptee", label: "Acceptées" },
            { id: "termine", label: "Terminées" },
          ]}
        />
      </div>
      <div className="mt-6 grid gap-4">
        {filtered.length === 0 ? (
          <GlassCard hover={false}>
            <EmptyState
              title="Aucune candidature"
              description="Explorez les missions ouvertes pour envoyer votre première candidature."
            />
            <Link href="/volunteer/discover" className="btn-primary mt-4 inline-flex">
              Voir les missions
            </Link>
          </GlassCard>
        ) : null}
        {filtered.map((application) => {
          const display = applicationDisplay(application);
          return (
            <GlassCard key={application.id}>
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h2 className="font-black">{application.event_title ?? application.mission_name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{application.mission_name}</p>
                  <p className="mt-1 text-xs text-slate-400">Envoyée le {formatDate(application.applied_at)}</p>
                </div>
                <StatusBadge label={display.label} tone={display.tone} />
              </div>
            </GlassCard>
          );
        })}
      </div>
    </section>
  );
}
