"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Plus, QrCode } from "lucide-react";
import { Event, EventCategory, Organisation, PaginatedResponse, formatDate, unwrapResults } from "@/lib/api";
import { authedFetch, downloadAuthedFile } from "@/lib/browser-api";
import { StatusMessage } from "@/components/StatusMessage";
import { labelStatus } from "@/lib/labels";
import { AdminPageHeader, AdminSearch, EmptyState, GlassCard, SlideOver, StatusBadge } from "@/components/admin";
import { Toast, useToast } from "@/components/portal/Toast";

function eventTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "publie" || status === "en_cours") return "success";
  if (status === "brouillon") return "warning";
  if (status === "annule") return "danger";
  if (status === "termine") return "info";
  return "neutral";
}

export default function OrganisationEventsPage() {
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const { toast, showToast } = useToast();

  async function loadEvents(archived = showArchived) {
    setLoading(true);
    setError("");
    try {
      const currentOrganisation = await authedFetch<Organisation>("/organisations/me/");
      setOrganisation(currentOrganisation);
      const organisationEvents = await authedFetch<Event[]>(
        `/organisations/${currentOrganisation.id}/events/?archived=${archived ? "true" : "false"}`
      );
      setEvents(organisationEvents);
      const categoryData = await authedFetch<PaginatedResponse<EventCategory> | EventCategory[]>("/categories-evenements/");
      setCategories(unwrapResults(categoryData));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les événements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents(showArchived);
  }, [showArchived]);

  async function downloadOrganisationFile(path: string, filename: string) {
    setMessage("");
    setError("");
    try {
      await downloadAuthedFile(path, filename);
      setMessage("Fichier téléchargé.");
      showToast("Fichier téléchargé avec succès !");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Téléchargement impossible.");
    }
  }

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        !search ||
        event.title.toLowerCase().includes(search.toLowerCase()) ||
        (event.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (event.city ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !categoryFilter || String(event.category) === categoryFilter;
      const matchesStatus = !statusFilter || event.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [events, search, categoryFilter, statusFilter]);

  const verified = organisation?.validation_status === "validee";

  return (
    <section>
      <AdminPageHeader
        kicker="Organisation"
        title="Mes événements"
        subtitle="Pilotage complet : missions, candidatures, présence et récompenses pour vos événements."
        actions={
          <Link href="/organisation/events/new" className={`btn-primary ${verified ? "" : "pointer-events-none opacity-50"}`}>
            <Plus className="h-4 w-4" /> Créer un événement
          </Link>
        }
      />

      <div className="mt-6 grid gap-3">
        <StatusMessage message={message} tone="info" />
        <StatusMessage message={error} tone="error" />
      </div>

      {organisation ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/organisation/attendance/scan" className="btn-secondary px-4 py-2 text-sm">
            <QrCode className="h-4 w-4" /> Scanner un QR Code
          </Link>
          <button
            className="btn-secondary px-4 py-2 text-sm"
            onClick={() => downloadOrganisationFile(`/organisations/${organisation.id}/report-pdf/`, `rapport-organisation-${organisation.id}.pdf`)}
          >
            Rapport PDF
          </button>
          <button
            className="btn-secondary px-4 py-2 text-sm"
            onClick={() =>
              downloadOrganisationFile(`/organisations/${organisation.id}/export-excel/?type=volunteers`, `benevoles-${organisation.id}.xlsx`)
            }
          >
            Export bénévoles
          </button>
          <button
            className="btn-secondary px-4 py-2 text-sm"
            onClick={() =>
              downloadOrganisationFile(`/organisations/${organisation.id}/export-excel/?type=applications`, `candidatures-${organisation.id}.xlsx`)
            }
          >
            Export candidatures
          </button>
          <Link href="/organisation/rewards" className="btn-secondary px-4 py-2 text-sm">
            Badges et récompenses
          </Link>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center">
        <AdminSearch value={search} onChange={setSearch} placeholder="Rechercher un événement..." />
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="">Toutes les catégories</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="brouillon">Brouillon</option>
          <option value="publie">Publié</option>
          <option value="en_cours">En cours</option>
          <option value="termine">Terminé</option>
          <option value="annule">Annulé</option>
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className={!showArchived ? "chip chip-active" : "chip"} onClick={() => setShowArchived(false)}>
          Événements actifs
        </button>
        <button className={showArchived ? "chip chip-active" : "chip"} onClick={() => setShowArchived(true)}>
          Événements passés
        </button>
      </div>

      {loading ? <p className="mt-8 text-sm text-slate-500">Chargement...</p> : null}

      {!loading && filteredEvents.length === 0 ? (
        <GlassCard className="mt-8" hover={false}>
          <EmptyState title="Aucun événement" description="Créez votre premier événement ou changez de filtre." />
        </GlassCard>
      ) : null}

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredEvents.map((event) => (
          <button key={event.id} type="button" className="text-left" onClick={() => setSelectedEvent(event)}>
            <GlassCard className="h-full">
              <div className="flex flex-wrap gap-2">
                <StatusBadge label={labelStatus(event.status)} tone={eventTone(event.status)} />
                {event.category_name ? <StatusBadge label={event.category_name} tone="info" /> : null}
              </div>
              <h2 className="mt-4 text-xl font-black">{event.title}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600">{event.description || "Aucune description."}</p>
              <div className="mt-4 space-y-1 text-sm font-semibold text-slate-500">
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" /> {formatDate(event.starts_at)}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {[event.city, event.country].filter(Boolean).join(", ") || "Lieu à confirmer"}
                </p>
              </div>
              <p className="mt-4 text-xs font-bold text-brand-600">{event.registered_volunteers_count} bénévole(s) inscrit(s)</p>
            </GlassCard>
          </button>
        ))}
      </div>

      <SlideOver
        open={Boolean(selectedEvent)}
        title={selectedEvent?.title ?? "Événement"}
        subtitle={selectedEvent ? formatDate(selectedEvent.starts_at) : undefined}
        onClose={() => setSelectedEvent(null)}
        footer={
          selectedEvent ? (
            <Link href={`/organisation/events/${selectedEvent.id}`} className="btn-primary w-full">
              Ouvrir la fiche complète
            </Link>
          ) : null
        }
      >
        {selectedEvent ? (
          <div className="grid gap-4 text-sm">
            <p className="leading-6 text-slate-600">{selectedEvent.description || "Aucune description."}</p>
            <p>
              <strong>Lieu :</strong> {[selectedEvent.address, selectedEvent.city, selectedEvent.country].filter(Boolean).join(", ") || "—"}
            </p>
            <p>
              <strong>Statut :</strong> {labelStatus(selectedEvent.status)}
            </p>
            <p>
              <strong>Bénévoles recherchés :</strong> {selectedEvent.volunteers_needed}
            </p>
            <Link href="/organisation/missions/new" className="btn-secondary">
              Ajouter une mission
            </Link>
          </div>
        ) : null}
      </SlideOver>
      <Toast toast={toast} />
    </section>
  );
}
