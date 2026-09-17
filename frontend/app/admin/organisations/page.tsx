"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, FileWarning, ShieldCheck, Users } from "lucide-react";
import {
  Event,
  EventVolunteer,
  Organisation,
  OrganisationSummary,
  PaginatedResponse,
  formatDate,
  unwrapResults,
} from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { StatusMessage } from "@/components/StatusMessage";
import { labelStatus } from "@/lib/labels";
import {
  AdminPageHeader,
  AdminPagination,
  AdminSearch,
  AdminTable,
  AdminTabs,
  ConfirmDialog,
  GlassCard,
  SlideOver,
  StatCard,
  StatusBadge,
  paginate,
} from "@/components/admin";

const PAGE_SIZE = 8;

function displayStatus(organisation: Organisation) {
  if (organisation.validation_status === "validee") {
    return organisation.user?.status === "suspendu" ? "Suspendue" : "Approuvée";
  }
  if (organisation.validation_status === "refusee") {
    return "Refusée";
  }
  if (organisation.validation_status === "documents_requis") {
    return "Documents requis";
  }
  return "En attente";
}

function statusTone(organisation: Organisation): "success" | "warning" | "danger" | "info" {
  if (organisation.user?.status === "suspendu") return "danger";
  if (organisation.validation_status === "validee") return "success";
  if (organisation.validation_status === "refusee") return "danger";
  if (organisation.validation_status === "documents_requis") return "info";
  return "warning";
}

export default function AdminOrganisationsPage() {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedOrganisation, setSelectedOrganisation] = useState<Organisation | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedEventVolunteers, setSelectedEventVolunteers] = useState<EventVolunteer[]>([]);
  const [summaries, setSummaries] = useState<Record<number, OrganisationSummary>>({});
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("overview");
  const [drawerTab, setDrawerTab] = useState("general");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<Organisation | null>(null);

  const pendingOrganisations = organisations.filter((organisation) =>
    ["en_attente", "documents_requis"].includes(organisation.validation_status)
  );
  const approvedOrganisations = organisations.filter((organisation) => organisation.validation_status === "validee");
  const rejectedOrganisations = organisations.filter((organisation) => organisation.validation_status === "refusee");
  const suspendedCount = approvedOrganisations.filter((organisation) => organisation.user?.status === "suspendu").length;

  async function loadOrganisations() {
    setLoading(true);
    setError("");
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = await authedFetch<PaginatedResponse<Organisation> | Organisation[]>(`/organisations/${query}`);
      setOrganisations(unwrapResults(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les organisations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadOrganisations();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  const visibleRows = useMemo(() => {
    if (tab === "pending") return pendingOrganisations;
    if (tab === "approved") return approvedOrganisations;
    if (tab === "rejected") return rejectedOrganisations;
    return pendingOrganisations;
  }, [tab, pendingOrganisations, approvedOrganisations, rejectedOrganisations]);

  const pagedRows = paginate(visibleRows, page, PAGE_SIZE);

  async function decide(id: number, action: "approve" | "reject" | "request-documents" | "suspend" | "reactivate") {
    setMessage("");
    setError("");
    try {
      await authedFetch(`/organisations/${id}/${action}/`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });
      const messages = {
        approve: "Organisation approuvée.",
        reject: "Organisation refusée avec motif.",
        "request-documents": "Documents complémentaires demandés.",
        suspend: "Organisation suspendue.",
        reactivate: "Organisation réactivée.",
      };
      setMessage(messages[action]);
      setReason("");
      await loadOrganisations();
      closeDrawer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Décision impossible.");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setMessage("");
    setError("");
    try {
      await authedFetch(`/organisations/${pendingDelete.id}/`, { method: "DELETE" });
      setMessage("Organisation supprimée.");
      setPendingDelete(null);
      closeDrawer();
      await loadOrganisations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  function closeDrawer() {
    setSelectedOrganisation(null);
    setSelectedEvents([]);
    setSelectedEvent(null);
    setSelectedEventVolunteers([]);
    setDrawerTab("general");
  }

  async function openOrganisation(organisation: Organisation, nextTab = "general") {
    setSelectedOrganisation(organisation);
    setSelectedEvent(null);
    setSelectedEventVolunteers([]);
    setDrawerTab(nextTab);
    setReason("");
    try {
      const summary = await authedFetch<OrganisationSummary>(`/organisations/${organisation.id}/summary/`);
      setSummaries((current) => ({ ...current, [organisation.id]: summary }));
      if (nextTab === "events" || nextTab === "volunteers") {
        const events = await authedFetch<Event[]>(`/organisations/${organisation.id}/events/`);
        setSelectedEvents(events);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les détails de l'organisation.");
    }
  }

  async function loadEvents(organisation: Organisation) {
    setDrawerTab("events");
    try {
      const events = await authedFetch<Event[]>(`/organisations/${organisation.id}/events/`);
      setSelectedEvents(events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les événements.");
    }
  }

  async function loadVolunteers(event: Event) {
    setSelectedEvent(event);
    setDrawerTab("volunteers");
    try {
      const volunteers = await authedFetch<EventVolunteer[]>(`/evenements/${event.id}/volunteers/`);
      setSelectedEventVolunteers(volunteers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les bénévoles de l'événement.");
    }
  }

  const columns = [
    {
      key: "name",
      header: "Organisation",
      render: (organisation: Organisation) => (
        <div>
          <p className="font-black text-brand-900">{organisation.name}</p>
          <p className="text-xs text-slate-500">{organisation.user?.email ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Catégorie",
      render: (organisation: Organisation) => organisation.category_type || organisation.sector || "—",
    },
    {
      key: "city",
      header: "Ville",
      render: (organisation: Organisation) => organisation.city || "—",
    },
    {
      key: "status",
      header: "Statut",
      render: (organisation: Organisation) => <StatusBadge label={displayStatus(organisation)} tone={statusTone(organisation)} />,
    },
    {
      key: "date",
      header: "Inscription",
      render: (organisation: Organisation) =>
        organisation.verification_requested_at
          ? new Date(organisation.verification_requested_at).toLocaleDateString("fr-FR")
          : "—",
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (organisation: Organisation) => (
        <button type="button" className="btn-primary px-4 py-2 text-xs" onClick={() => openOrganisation(organisation)}>
          Ouvrir
        </button>
      ),
    },
  ];

  const summary = selectedOrganisation ? summaries[selectedOrganisation.id] : undefined;
  const mode =
    selectedOrganisation?.validation_status === "validee"
      ? "approved"
      : selectedOrganisation?.validation_status === "refusee"
        ? "rejected"
        : "pending";

  return (
    <section>
      <AdminPageHeader
        title="Organisations"
        subtitle="Validez les associations, consultez leurs événements et pilotez les comptes depuis un panneau dédié."
      />

      <div className="mt-6 grid gap-3">
        <StatusMessage message={message} tone="success" />
        <StatusMessage message={error} tone="error" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={organisations.length} hint="Organisations inscrites" icon={Building2} tone="lilac" />
        <StatCard label="En attente" value={pendingOrganisations.length} hint="À vérifier" icon={FileWarning} tone="pink" />
        <StatCard label="Approuvées" value={approvedOrganisations.length} hint={`${suspendedCount} suspendue(s)`} icon={ShieldCheck} tone="mint" />
        <StatCard label="Refusées" value={rejectedOrganisations.length} hint="Demandes archivées" icon={Users} tone="cyan" />
      </div>

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center">
        <AdminTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "overview", label: "Vue d'ensemble", count: pendingOrganisations.length },
            { id: "pending", label: "En attente", count: pendingOrganisations.length },
            { id: "approved", label: "Approuvées", count: approvedOrganisations.length },
            { id: "rejected", label: "Refusées", count: rejectedOrganisations.length },
          ]}
        />
        {tab !== "overview" ? (
          <AdminSearch value={search} onChange={setSearch} placeholder="Rechercher par nom, catégorie, e-mail ou statut..." />
        ) : null}
      </div>

      {tab === "overview" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <GlassCard>
            <h2 className="text-lg font-black">À traiter en priorité</h2>
            <p className="mt-1 text-sm text-slate-500">Les demandes qui attendent une décision.</p>
            <div className="mt-5 grid gap-3">
              {pendingOrganisations.slice(0, 5).map((organisation) => (
                <button
                  key={organisation.id}
                  type="button"
                  className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/70 px-4 py-3 text-left transition-all duration-300 hover:-translate-y-0.5"
                  onClick={() => openOrganisation(organisation)}
                >
                  <div>
                    <p className="font-black">{organisation.name}</p>
                    <p className="text-xs text-slate-500">{organisation.city || "Ville non renseignée"}</p>
                  </div>
                  <StatusBadge label={displayStatus(organisation)} tone={statusTone(organisation)} />
                </button>
              ))}
              {pendingOrganisations.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune demande en attente. Tout est à jour.</p>
              ) : null}
            </div>
          </GlassCard>
          <GlassCard>
            <h2 className="text-lg font-black">Raccourcis</h2>
            <p className="mt-1 text-sm text-slate-500">Ouvrez une section sans faire défiler toute la page.</p>
            <div className="mt-5 grid gap-3">
              <button type="button" className="btn-secondary justify-between" onClick={() => setTab("pending")}>
                Examiner les demandes
              </button>
              <button type="button" className="btn-secondary justify-between" onClick={() => setTab("approved")}>
                Voir les organisations actives
              </button>
              <button type="button" className="btn-secondary justify-between" onClick={() => setTab("rejected")}>
                Consulter les refus
              </button>
            </div>
          </GlassCard>
        </div>
      ) : (
        <GlassCard className="mt-6" hover={false} padding={false}>
          <AdminTable
            columns={columns}
            rows={pagedRows}
            rowKey={(organisation) => organisation.id}
            loading={loading}
            emptyTitle="Aucune organisation"
            emptyDescription="Aucune organisation ne correspond à cet onglet ou à cette recherche."
          />
          <AdminPagination page={page} pageSize={PAGE_SIZE} total={visibleRows.length} onPageChange={setPage} />
        </GlassCard>
      )}

      <SlideOver
        open={Boolean(selectedOrganisation)}
        title={selectedOrganisation?.name ?? "Organisation"}
        subtitle={selectedOrganisation ? displayStatus(selectedOrganisation) : undefined}
        onClose={closeDrawer}
        footer={
          selectedOrganisation ? (
            <div className="grid gap-3">
              {mode !== "approved" ? (
                <textarea
                  className="min-h-20 text-sm"
                  placeholder="Motif de refus ou de demande de documents..."
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                {mode !== "approved" ? (
                  <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => decide(selectedOrganisation.id, "approve")}>
                    Approuver
                  </button>
                ) : null}
                {mode !== "rejected" ? (
                  <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => decide(selectedOrganisation.id, "reject")}>
                    Refuser
                  </button>
                ) : null}
                {mode === "pending" ? (
                  <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => decide(selectedOrganisation.id, "request-documents")}>
                    Demander des documents
                  </button>
                ) : null}
                {selectedOrganisation.user?.status === "suspendu" && mode === "approved" ? (
                  <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => decide(selectedOrganisation.id, "reactivate")}>
                    Réactiver
                  </button>
                ) : mode === "approved" ? (
                  <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => decide(selectedOrganisation.id, "suspend")}>
                    Suspendre
                  </button>
                ) : null}
                <button type="button" className="rounded-full bg-rose-500 px-4 py-2 text-sm font-bold text-white" onClick={() => setPendingDelete(selectedOrganisation)}>
                  Supprimer
                </button>
              </div>
            </div>
          ) : null
        }
      >
        {selectedOrganisation ? (
          <div className="grid gap-6">
            <AdminTabs
              value={drawerTab}
              onChange={(next) => {
                if (next === "events") {
                  void loadEvents(selectedOrganisation);
                  return;
                }
                setDrawerTab(next);
              }}
              tabs={[
                { id: "general", label: "Général" },
                { id: "events", label: "Événements" },
                { id: "volunteers", label: "Bénévoles" },
              ]}
            />

            {drawerTab === "general" ? (
              <div className="grid gap-5">
                <p className="text-sm leading-6 text-slate-600">{selectedOrganisation.description || "Aucune description."}</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-brand-50/70 p-4">
                    <p className="text-xs font-bold text-slate-500">Événements</p>
                    <p className="text-2xl font-black">{summary?.events ?? "—"}</p>
                  </div>
                  <div className="rounded-2xl bg-cyan-50/80 p-4">
                    <p className="text-xs font-bold text-slate-500">Bénévoles</p>
                    <p className="text-2xl font-black">{summary?.volunteers ?? "—"}</p>
                  </div>
                  <div className="rounded-2xl bg-pink-50/80 p-4">
                    <p className="text-xs font-bold text-slate-500">Candidatures</p>
                    <p className="text-2xl font-black">{summary?.applications ?? "—"}</p>
                  </div>
                </div>
                <dl className="grid gap-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Type</dt>
                    <dd className="font-semibold">{selectedOrganisation.category_type || selectedOrganisation.sector || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">E-mail</dt>
                    <dd className="font-semibold">{selectedOrganisation.user?.email ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Téléphone</dt>
                    <dd className="font-semibold">{selectedOrganisation.phone_number || selectedOrganisation.user?.phone_number || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Adresse</dt>
                    <dd className="text-right font-semibold">
                      {[selectedOrganisation.address, selectedOrganisation.city, selectedOrganisation.country].filter(Boolean).join(", ") || "—"}
                    </dd>
                  </div>
                </dl>
                <div>
                  <h3 className="font-black">Documents de vérification</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedOrganisation.documents?.length ? (
                      selectedOrganisation.documents.map((document) => (
                        <a
                          key={document.id}
                          className="rounded-full border border-lilac/40 bg-white/80 px-3 py-2 text-xs font-bold"
                          href={document.file_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {document.label || `Document n°${document.id}`}
                        </a>
                      ))
                    ) : (
                      <p className="text-sm text-rose-600">Aucun document téléversé.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {drawerTab === "events" ? (
              <div className="grid gap-3">
                {selectedEvents.length === 0 ? <p className="text-sm text-slate-500">Aucun événement pour cette organisation.</p> : null}
                {selectedEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-lilac/20 bg-white/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{event.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(event.starts_at)} · {event.city || "Lieu à confirmer"}
                        </p>
                      </div>
                      <StatusBadge label={labelStatus(event.status)} />
                    </div>
                    <button type="button" className="btn-secondary mt-3 px-3 py-2 text-xs" onClick={() => loadVolunteers(event)}>
                      <Users className="h-3.5 w-3.5" /> Voir les bénévoles
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {drawerTab === "volunteers" ? (
              <div className="grid gap-3">
                {selectedEvent ? (
                  <p className="text-sm font-semibold text-slate-500">
                    <CalendarDays className="mr-1 inline h-4 w-4" />
                    {selectedEvent.title}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">Choisissez un événement pour afficher ses bénévoles.</p>
                )}
                {selectedEventVolunteers.map((entry) => (
                  <div key={entry.application_id} className="rounded-2xl border border-lilac/20 bg-white/70 p-4 text-sm">
                    <p className="font-black">
                      {entry.volunteer.first_name} {entry.volunteer.last_name}
                    </p>
                    <p className="mt-1 text-slate-500">{entry.volunteer.user?.email ?? "—"}</p>
                    <p className="mt-2 text-xs">
                      {labelStatus(entry.participation_status)} · {new Date(entry.registered_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </SlideOver>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Supprimer l'organisation ?"
        description="Cette action supprimera l'organisation et ses données associées. Elle est irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
