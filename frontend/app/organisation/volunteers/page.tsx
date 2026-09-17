"use client";

import { useEffect, useMemo, useState } from "react";
import { Application, PaginatedResponse, unwrapResults } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { StatusMessage } from "@/components/StatusMessage";
import { AdminPageHeader, AdminSearch, ConfirmDialog, EmptyState, GlassCard, SlideOver, StatusBadge } from "@/components/admin";
import { Toast, useToast } from "@/components/portal/Toast";

export default function OrganisationVolunteersPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [pendingRefuse, setPendingRefuse] = useState<Application | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast, showToast } = useToast();

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const applicationData = await authedFetch<PaginatedResponse<Application> | Application[]>("/candidatures/?status=en_attente");
      setApplications(unwrapResults(applicationData));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les candidatures en attente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function updateApplication(id: number, action: "accepter" | "refuser") {
    setMessage("");
    setError("");
    try {
      await authedFetch(`/candidatures/${id}/${action}/`, { method: "PATCH" });
      if (action === "accepter") {
        setMessage("Candidature acceptée. Le bénévole a été notifié.");
        showToast("Candidature acceptée !");
      } else {
        setMessage("Candidature refusée. Le bénévole a été notifié.");
        showToast("Candidature refusée.");
      }
      setSelectedApplication(null);
      setPendingRefuse(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible.");
    }
  }

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return applications.filter((application) => {
      const haystack = [
        application.volunteer_name,
        application.volunteer_email,
        application.event_title,
        application.mission_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return !query || haystack.includes(query);
    });
  }, [applications, search]);

  return (
    <section>
      <AdminPageHeader
        kicker="Organisation"
        title="Candidatures"
        subtitle="Les profils s'ouvrent dans un panneau. Acceptez ou refusez sans quitter la liste."
      />

      <div className="mt-6 grid gap-3">
        <StatusMessage message={message} tone="success" />
        <StatusMessage message={error} tone="error" />
      </div>

      <div className="mt-6">
        <AdminSearch value={search} onChange={setSearch} placeholder="Rechercher un bénévole, un événement..." />
      </div>

      {loading ? <p className="mt-8 text-sm text-slate-500">Chargement...</p> : null}

      {!loading && filtered.length === 0 ? (
        <GlassCard className="mt-8" hover={false}>
          <EmptyState title="Aucune candidature en attente" description="Dès qu'un bénévole postule, sa fiche apparaîtra ici." />
        </GlassCard>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {filtered.map((application) => (
          <GlassCard key={application.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">{application.volunteer_name ?? `Bénévole n°${application.volunteer}`}</h2>
                <p className="mt-1 text-sm text-slate-500">{application.event_title ?? application.mission_name}</p>
              </div>
              <StatusBadge label="En attente" tone="warning" />
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Candidature du {new Date(application.applied_at).toLocaleDateString("fr-FR")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedApplication(application)}>
                Voir le profil
              </button>
              <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setPendingRefuse(application)}>
                Refuser
              </button>
              <button className="btn-primary px-3 py-2 text-xs" onClick={() => updateApplication(application.id, "accepter")}>
                Accepter
              </button>
            </div>
          </GlassCard>
        ))}
      </div>

      <SlideOver
        open={Boolean(selectedApplication)}
        title={selectedApplication?.volunteer_name ?? "Profil du bénévole"}
        subtitle={selectedApplication?.event_title ?? selectedApplication?.mission_name}
        onClose={() => setSelectedApplication(null)}
        footer={
          selectedApplication ? (
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setPendingRefuse(selectedApplication)}>
                Refuser
              </button>
              <button className="btn-primary flex-1" onClick={() => updateApplication(selectedApplication.id, "accepter")}>
                Accepter
              </button>
            </div>
          ) : null
        }
      >
        {selectedApplication ? (
          <div className="grid gap-3 text-sm text-slate-600">
            <p>
              <strong>E-mail :</strong> {selectedApplication.volunteer_email ?? "—"}
            </p>
            <p>
              <strong>Téléphone :</strong> {selectedApplication.volunteer_phone_number || "—"}
            </p>
            <p>
              <strong>Ville :</strong> {selectedApplication.volunteer_profile?.city || "—"}
            </p>
            <p>
              <strong>Date de naissance :</strong> {selectedApplication.volunteer_profile?.birth_date ?? "—"}
            </p>
            <p>
              <strong>Points :</strong> {selectedApplication.volunteer_profile?.total_points ?? "—"}
            </p>
            <p>
              <strong>Centres d'intérêt :</strong> {selectedApplication.volunteer_profile?.interests || "—"}
            </p>
            <p>
              <strong>Disponibilité :</strong> {selectedApplication.volunteer_availability || "—"}
            </p>
            <p>
              <strong>Compétences :</strong>{" "}
              {selectedApplication.volunteer_skills?.length
                ? selectedApplication.volunteer_skills.map((skill) => `${skill.name} (${skill.level})`).join(", ")
                : "—"}
            </p>
          </div>
        ) : null}
      </SlideOver>

      <ConfirmDialog
        open={Boolean(pendingRefuse)}
        title="Refuser cette candidature ?"
        description="Le bénévole sera notifié. Cette action peut être définitive."
        confirmLabel="Refuser"
        cancelLabel="Annuler"
        onCancel={() => setPendingRefuse(null)}
        onConfirm={() => pendingRefuse && updateApplication(pendingRefuse.id, "refuser")}
      />
      <Toast toast={toast} />
    </section>
  );
}
