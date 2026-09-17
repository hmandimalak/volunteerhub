"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Event, Organisation, formatDate } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { StatusMessage } from "@/components/StatusMessage";
import { AdminPageHeader, GlassCard } from "@/components/admin";
import { Toast, useToast } from "@/components/portal/Toast";

export default function NewMissionPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast, showToast } = useToast();

  const selectedEvent = events.find((event) => String(event.id) === selectedEventId) ?? null;

  useEffect(() => {
    authedFetch<Organisation>("/organisations/me/")
      .then((organisation) => authedFetch<Event[]>(`/organisations/${organisation.id}/events/`))
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEvent) {
      setError("Sélectionnez un événement.");
      return;
    }
    setMessage("");
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);

    try {
      await authedFetch(`/evenements/${selectedEvent.id}/missions/`, {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description"),
          capacity: Number(form.get("capacity") ?? 1),
          starts_at: selectedEvent.starts_at,
          ends_at: selectedEvent.ends_at,
          status: "ouverte",
        }),
      });

      setMessage("Mission créée avec succès.");
      showToast("Mission créée avec succès !");
      event.currentTarget.reset();
      setSelectedEventId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <Link href="/organisation/events" className="text-sm font-semibold text-brand-600 hover:text-brand-900">
        Retour aux événements
      </Link>
      <div className="mt-4">
        <AdminPageHeader
          kicker="Organisation"
          title="Créer une mission"
          subtitle="La mission hérite automatiquement des dates de l'événement sélectionné."
        />
      </div>

      <div className="mt-6 grid gap-3">
        <StatusMessage message={message} tone="success" />
        <StatusMessage message={error} tone="error" />
      </div>

      <GlassCard className="mt-8" hover={false}>
        <form onSubmit={handleSubmit} className="grid gap-5">
          <label className="grid gap-2 text-sm font-semibold">
            Événement
            <select value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)} required>
              <option value="">Choisir un événement</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </label>

          {selectedEvent ? (
            <div className="rounded-2xl bg-brand-50/70 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">Dates de la mission (verrouillées)</p>
              <p className="mt-2">Début : {formatDate(selectedEvent.starts_at)}</p>
              <p>Fin : {formatDate(selectedEvent.ends_at)}</p>
              <p className="mt-2 text-xs">Modifier les dates de l'événement mettra à jour toutes ses missions.</p>
            </div>
          ) : null}

          <label className="grid gap-2 text-sm font-semibold">
            Nom
            <input name="name" placeholder="Accueil du public" required />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Description
            <textarea className="min-h-28" name="description" placeholder="Tâches principales..." />
          </label>

          <label className="grid gap-2 text-sm font-semibold">
            Places
            <input name="capacity" type="number" min="1" defaultValue="1" />
          </label>

          <button className="btn-primary" disabled={loading || !selectedEvent} type="submit">
            {loading ? "Création..." : "Créer la mission"}
          </button>
        </form>
      </GlassCard>
      <Toast toast={toast} />
    </section>
  );
}
