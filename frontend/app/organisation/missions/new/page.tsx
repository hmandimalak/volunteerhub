"use client";

import { FormEvent, useEffect, useState } from "react";
import { Event, PaginatedResponse, unwrapResults } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { StatusMessage } from "@/components/StatusMessage";
import { RoleGate } from "@/components/RoleGate";

export default function NewMissionPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authedFetch<PaginatedResponse<Event> | Event[]>("/evenements/")
      .then((data) => setEvents(unwrapResults(data)))
      .catch(() => setEvents([]));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const eventId = form.get("event");

    try {
      await authedFetch(`/evenements/${eventId}/missions/`, {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          description: form.get("description"),
          capacity: Number(form.get("capacity") ?? 1),
          starts_at: form.get("starts_at"),
          ends_at: form.get("ends_at"),
          status: "ouverte"
        })
      });

      setMessage("Mission creee avec succes.");
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <p className="font-bold text-brand-600">Organisation</p>
      <h1 className="mt-2 text-4xl font-black">Creer une mission</h1>
      <p className="mt-3 text-slate-600">Ajoutez une mission a un evenement deja cree.</p>
      <RoleGate allowedRoles={["organisation", "admin"]}>

      <div className="mt-6 grid gap-3">
        <StatusMessage message={message} tone="success" />
        <StatusMessage message={error} tone="error" />
      </div>

      <form onSubmit={handleSubmit} className="card mt-8 grid gap-5">
        <label className="grid gap-2 text-sm font-semibold">
          Evenement
          <select className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="event" required>
            <option value="">Choisir un evenement</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold">
          Nom
          <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="name" required />
        </label>

        <label className="grid gap-2 text-sm font-semibold">
          Description
          <textarea className="min-h-28 rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="description" />
        </label>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold">
            Places
            <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="capacity" type="number" min="1" defaultValue="1" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Debut
            <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="starts_at" type="datetime-local" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Fin
            <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="ends_at" type="datetime-local" required />
          </label>
        </div>

        <button className="btn-primary" disabled={loading} type="submit">
          {loading ? "Creation..." : "Creer la mission"}
        </button>
      </form>
      </RoleGate>
    </section>
  );
}
