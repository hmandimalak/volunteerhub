"use client";

import { useEffect, useState } from "react";
import { Event, PaginatedResponse, formatDate, unwrapResults } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { RoleGate } from "@/components/RoleGate";
import { StatusMessage } from "@/components/StatusMessage";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadEvents() {
    setLoading(true);
    setError("");
    try {
      const data = await authedFetch<PaginatedResponse<Event> | Event[]>("/evenements/");
      setEvents(unwrapResults(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les evenements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function deleteEvent(eventId: number) {
    if (!window.confirm("Supprimer cet evenement ?")) {
      return;
    }
    try {
      await authedFetch(`/evenements/${eventId}/`, { method: "DELETE" });
      setMessage("Evenement supprime.");
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <p className="font-bold text-brand-600">Admin</p>
      <h1 className="mt-2 text-4xl font-black">Events Management</h1>
      <p className="mt-3 text-slate-600">Vue globale de tous les evenements de la plateforme.</p>

      <RoleGate allowedRoles={["admin"]}>
        <div className="mt-6 grid gap-3">
          <StatusMessage message={message} tone="success" />
          <StatusMessage message={error} tone="error" />
        </div>

        <div className="card mt-8 overflow-x-auto">
          {loading ? <p className="text-slate-600">Chargement...</p> : null}
          {!loading && events.length === 0 ? <p className="text-slate-600">Aucun evenement.</p> : null}
          {events.length > 0 ? (
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-3">Titre</th>
                  <th className="py-3">Organisation</th>
                  <th className="py-3">Ville</th>
                  <th className="py-3">Date</th>
                  <th className="py-3">Statut</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-slate-200">
                    <td className="py-4 font-semibold">{event.title}</td>
                    <td className="py-4">{event.organisation_name ?? "-"}</td>
                    <td className="py-4">{event.city || "-"}</td>
                    <td className="py-4">{formatDate(event.starts_at)}</td>
                    <td className="py-4">{event.status}</td>
                    <td className="py-4 text-right">
                      <button className="rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => deleteEvent(event.id)}>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </RoleGate>
    </section>
  );
}
