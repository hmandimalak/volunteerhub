"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, CalendarDays, MapPin, Sparkles } from "lucide-react";
import { Event, PaginatedResponse, formatDate, unwrapResults } from "@/lib/api";
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

function eventTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "publie" || status === "en_cours") return "success";
  if (status === "termine") return "info";
  if (status === "annule") return "danger";
  if (status === "brouillon") return "warning";
  return "neutral";
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("active");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Event | null>(null);

  const showArchived = tab === "archived";

  async function loadEvents() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("archived", showArchived ? "true" : "false");
      const query = params.toString() ? `?${params.toString()}` : "";
      const data = await authedFetch<PaginatedResponse<Event> | Event[]>(`/evenements/${query}`);
      setEvents(unwrapResults(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les événements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadEvents();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, showArchived]);

  useEffect(() => {
    setPage(1);
  }, [search, tab]);

  const pagedEvents = useMemo(() => paginate(events, page, PAGE_SIZE), [events, page]);
  const cities = new Set(events.map((event) => event.city).filter(Boolean)).size;

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await authedFetch(`/evenements/${pendingDelete.id}/`, { method: "DELETE" });
      setMessage("Événement supprimé.");
      setPendingDelete(null);
      setSelectedEvent(null);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  return (
    <section>
      <AdminPageHeader
        title="Événements"
        subtitle="Surveillez les missions actives et archivées. La supervision est en lecture seule : seules les organisations gèrent les postes et les récompenses."
      />

      <div className="mt-6 grid gap-3">
        <StatusMessage message={message} tone="success" />
        <StatusMessage message={error} tone="error" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Dans cet onglet" value={events.length} icon={CalendarDays} tone="lilac" />
        <StatCard label="Villes" value={cities} icon={MapPin} tone="cyan" />
        <StatCard
          label="Places demandées"
          value={events.reduce((total, event) => total + (event.volunteers_needed || 0), 0)}
          icon={Sparkles}
          tone="pink"
        />
        <StatCard
          label="Inscrits"
          value={events.reduce((total, event) => total + (event.registered_volunteers_count || 0), 0)}
          icon={Archive}
          tone="mint"
        />
      </div>

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center">
        <AdminTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "active", label: "Actifs" },
            { id: "archived", label: "Archivés" },
          ]}
        />
        <AdminSearch value={search} onChange={setSearch} placeholder="Rechercher par titre, catégorie ou organisation..." />
      </div>

      <GlassCard className="mt-6" hover={false} padding={false}>
        <AdminTable
          columns={[
            {
              key: "title",
              header: "Événement",
              render: (event) => (
                <div>
                  <p className="font-black text-brand-900">{event.title}</p>
                  <p className="text-xs text-slate-500">{event.organisation_name ?? "—"}</p>
                </div>
              ),
            },
            { key: "category", header: "Catégorie", render: (event) => event.category_name ?? "—" },
            { key: "city", header: "Ville", render: (event) => event.city || "—" },
            { key: "date", header: "Date", render: (event) => formatDate(event.starts_at) },
            {
              key: "status",
              header: "Statut",
              render: (event) => <StatusBadge label={labelStatus(event.status)} tone={eventTone(event.status)} />,
            },
            {
              key: "actions",
              header: "Actions",
              className: "text-right",
              render: (event) => (
                <div className="flex justify-end gap-2">
                  <Link href={`/admin/events/${event.id}`} className="btn-secondary px-4 py-2 text-xs">
                    Superviser
                  </Link>
                  <button type="button" className="btn-primary px-4 py-2 text-xs" onClick={() => setSelectedEvent(event)}>
                    Ouvrir
                  </button>
                </div>
              ),
            },
          ]}
          rows={pagedEvents}
          rowKey={(event) => event.id}
          loading={loading}
          emptyTitle="Aucun événement"
          emptyDescription="Aucun événement ne correspond à cette recherche."
        />
        <AdminPagination page={page} pageSize={PAGE_SIZE} total={events.length} onPageChange={setPage} />
      </GlassCard>

      <SlideOver
        open={Boolean(selectedEvent)}
        title={selectedEvent?.title ?? "Événement"}
        subtitle={selectedEvent?.organisation_name}
        onClose={() => setSelectedEvent(null)}
        footer={
          selectedEvent ? (
            <div className="flex justify-end gap-2">
              <Link href={`/admin/events/${selectedEvent.id}`} className="btn-primary">
                Voir les missions
              </Link>
              <button type="button" className="rounded-full bg-rose-500 px-4 py-2 text-sm font-bold text-white" onClick={() => setPendingDelete(selectedEvent)}>
                Supprimer
              </button>
            </div>
          ) : null
        }
      >
        {selectedEvent ? (
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="font-bold text-slate-500">Description</dt>
              <dd className="mt-1 leading-6 text-slate-600">{selectedEvent.description || "Aucune description."}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Catégorie</dt>
              <dd className="font-semibold">{selectedEvent.category_name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Lieu</dt>
              <dd className="text-right font-semibold">{[selectedEvent.city, selectedEvent.country].filter(Boolean).join(", ") || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Début</dt>
              <dd className="font-semibold">{formatDate(selectedEvent.starts_at)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Fin</dt>
              <dd className="font-semibold">{formatDate(selectedEvent.ends_at)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Statut</dt>
              <dd>
                <StatusBadge label={labelStatus(selectedEvent.status)} tone={eventTone(selectedEvent.status)} />
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Bénévoles inscrits</dt>
              <dd className="font-semibold">{selectedEvent.registered_volunteers_count}</dd>
            </div>
          </dl>
        ) : null}
      </SlideOver>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Supprimer cet événement ?"
        description="L'événement et ses missions associées seront retirés. Cette action est irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}
