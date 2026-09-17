"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Zap } from "lucide-react";
import { Event, EventCategory, Mission, formatDate, getEvents } from "@/lib/api";
import { ApplyButton } from "@/components/ApplyButton";
import { AdminPageHeader, AdminSearch, EmptyState, GlassCard, SlideOver, StatusBadge } from "@/components/admin";
import { Toast, useToast } from "@/components/portal/Toast";

type EventsBrowserProps = {
  initialEvents: Event[];
  initialError?: string;
  initialSearch?: string;
};

function remainingPlaces(event: Event) {
  if (!event.missions?.length) {
    return Math.max((event.volunteers_needed || 0) - (event.registered_volunteers_count || 0), 0);
  }
  return event.missions.reduce((total, mission) => total + (mission.remaining_places || 0), 0);
}

export function EventsBrowser({ initialEvents, initialError, initialSearch = "" }: EventsBrowserProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [search, setSearch] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [tag, setTag] = useState("all");
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const { toast, showToast } = useToast();

  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api"}/categories-evenements/`)
      .then((response) => response.json())
      .then((data) => setCategories(Array.isArray(data) ? data : data.results ?? []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getEvents({
          search: search || undefined,
          category: categoryFilter || undefined,
          city: cityFilter || undefined,
          status: "publie",
        });
        setEvents(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Impossible de charger les événements.");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, categoryFilter, cityFilter]);

  const cityOptions = useMemo(() => Array.from(new Set(events.map((event) => event.city).filter(Boolean))), [events]);

  const visibleEvents = events.filter((event) => {
    const spots = remainingPlaces(event);
    if (tag === "urgent") return spots > 0 && spots <= 3;
    if (tag === "limited") return spots > 0 && spots <= 8;
    return true;
  });

  return (
    <>
      <AdminPageHeader
        kicker="Trouver un événement"
        title="Missions ouvertes aux bénévoles"
        subtitle="Cartes lumineuses, filtres par tags et candidature rapide dans un panneau."
      />
      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center">
        <AdminSearch value={search} onChange={setSearch} placeholder="Rechercher un titre, une ville..." />
        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="">Toutes les catégories</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>
        <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}>
          <option value="">Toutes les villes</option>
          {cityOptions.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          ["all", "Tous"],
          ["urgent", "Urgent"],
          ["limited", "Places limitées"],
        ].map(([id, label]) => (
          <button key={id} type="button" className={tag === id ? "chip chip-active" : "chip"} onClick={() => setTag(id)}>
            {label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-6 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">API indisponible : {error}</p> : null}
      {loading ? <p className="mt-6 text-sm text-slate-500">Chargement...</p> : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {visibleEvents.map((event) => {
          const spots = remainingPlaces(event);
          return (
            <button key={event.id} type="button" className="text-left" onClick={() => setSelectedEvent(event)}>
              <GlassCard className="h-full">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge label={event.category_name ?? "Catégorie"} tone="info" />
                  {spots > 0 && spots <= 3 ? (
                    <span className="float-badge inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700">
                      <Zap className="h-3 w-3" /> Urgent
                    </span>
                  ) : null}
                  {spots > 0 && spots <= 8 ? <StatusBadge label="Places limitées" tone="warning" /> : null}
                  {spots === 0 ? <StatusBadge label="Complet" tone="neutral" /> : null}
                </div>
                <h2 className="mt-4 text-xl font-black">{event.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{event.description}</p>
                <div className="mt-4 space-y-1 text-sm font-semibold text-slate-500">
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> {event.city || "Lieu à confirmer"}
                  </p>
                  <p className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" /> {formatDate(event.starts_at)}
                  </p>
                </div>
                <p className="mt-4 text-xs font-bold text-brand-600">{spots} place(s) restante(s)</p>
              </GlassCard>
            </button>
          );
        })}
      </div>

      {!error && !loading && visibleEvents.length === 0 ? (
        <GlassCard className="mt-8" hover={false}>
          <EmptyState title="Aucun événement pour le moment" description="Essayez un autre filtre ou revenez plus tard." />
        </GlassCard>
      ) : null}

      <SlideOver
        open={Boolean(selectedEvent)}
        title={selectedEvent?.title ?? "Événement"}
        subtitle={selectedEvent?.organisation_name}
        onClose={() => setSelectedEvent(null)}
      >
        {selectedEvent ? (
          <div className="grid gap-4">
            <p className="text-sm leading-6 text-slate-600">{selectedEvent.description}</p>
            <p className="text-sm text-slate-500">
              {selectedEvent.city} · {formatDate(selectedEvent.starts_at)}
            </p>
            {(selectedEvent.missions ?? []).map((mission: Mission) => (
              <div key={mission.id} className="rounded-2xl border border-lilac/20 bg-white/70 p-4">
                <h3 className="font-black">{mission.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{mission.remaining_places} places restantes</p>
                <ApplyButton missionId={mission.id} onApplied={() => showToast("Candidature envoyée avec succès !")} />
              </div>
            ))}
            {!selectedEvent.missions?.length ? <p className="text-sm text-slate-500">Aucune mission publiée pour cet événement.</p> : null}
          </div>
        ) : null}
      </SlideOver>
      <Toast toast={toast} />
    </>
  );
}
