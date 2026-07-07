"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Event, EventVolunteer, Organisation, formatDate } from "@/lib/api";
import { authedFetch, downloadAuthedFile } from "@/lib/browser-api";
import { RoleGate } from "@/components/RoleGate";
import { StatusMessage } from "@/components/StatusMessage";

export default function OrganisationEventsPage() {
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<EventVolunteer[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadEvents() {
    setLoading(true);
    setError("");

    try {
      const currentOrganisation = await authedFetch<Organisation>("/organisations/me/");
      setOrganisation(currentOrganisation);
      const organisationEvents = await authedFetch<Event[]>(`/organisations/${currentOrganisation.id}/events/`);
      setEvents(organisationEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les evenements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function viewParticipants(event: Event) {
    setSelectedEvent(event);
    setMessage("");
    setError("");

    try {
      const data = await authedFetch<EventVolunteer[]>(`/evenements/${event.id}/volunteers/`);
      setParticipants(data);
      if (data.length === 0) {
        setMessage("Aucun participant accepte pour cet evenement.");
      }
    } catch (err) {
      setParticipants([]);
      setError(err instanceof Error ? err.message : "Impossible de charger les participants.");
    }
  }

  async function updateParticipation(applicationId: number, action: "confirm-participation" | "mark-attended" | "mark-completed" | "mark-absent") {
    setMessage("");
    setError("");

    try {
      await authedFetch(`/candidatures/${applicationId}/${action}/`, { method: "PATCH" });
      setMessage("Statut de participation mis a jour. Le benevole a ete notifie.");
      if (selectedEvent) {
        await viewParticipants(selectedEvent);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise a jour impossible.");
    }
  }

  async function downloadOrganisationFile(path: string, filename: string) {
    setMessage("");
    setError("");
    try {
      await downloadAuthedFile(path, filename);
      setMessage("Fichier telecharge.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Telechargement impossible.");
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="font-bold text-brand-600">Organisation</p>
          <h1 className="mt-2 text-4xl font-black">Events Management</h1>
          <p className="mt-3 text-slate-600">
            Suivez vos evenements et consultez les participants acceptes pour chaque evenement.
          </p>
        </div>
        <Link
          href="/organisation/events/new"
          className={`btn-primary ${organisation?.validation_status !== "validee" ? "pointer-events-none opacity-50" : ""}`}
        >
          Nouvel evenement
        </Link>
      </div>

      <RoleGate allowedRoles={["organisation", "admin"]}>
        <div className="mt-6 grid gap-3">
          <StatusMessage message={message} tone="info" />
          <StatusMessage message={error} tone="error" />
        </div>

        {organisation ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/organisation/attendance/scan" className="btn-primary">
              Scanner QR presence
            </Link>
            <button className="btn-secondary px-4 py-2 text-sm" onClick={() => downloadOrganisationFile(`/organisations/${organisation.id}/report-pdf/`, `rapport-organisation-${organisation.id}.pdf`)}>
              Rapport PDF
            </button>
            <button className="btn-secondary px-4 py-2 text-sm" onClick={() => downloadOrganisationFile(`/organisations/${organisation.id}/export-excel/?type=volunteers`, `benevoles-${organisation.id}.xlsx`)}>
              Export benevoles
            </button>
            <button className="btn-secondary px-4 py-2 text-sm" onClick={() => downloadOrganisationFile(`/organisations/${organisation.id}/export-excel/?type=applications`, `candidatures-${organisation.id}.xlsx`)}>
              Export candidatures
            </button>
            <button className="btn-secondary px-4 py-2 text-sm" onClick={() => downloadOrganisationFile(`/organisations/${organisation.id}/export-excel/?type=attendance`, `presences-${organisation.id}.xlsx`)}>
              Export presences
            </button>
            <button className="btn-secondary px-4 py-2 text-sm" onClick={() => downloadOrganisationFile(`/organisations/${organisation.id}/export-excel/?type=events`, `evenements-${organisation.id}.xlsx`)}>
              Export statistiques
            </button>
          </div>
        ) : null}

        <div className="card mt-8 overflow-x-auto">
          {loading ? <p className="text-slate-600">Chargement...</p> : null}
          {!loading && events.length === 0 ? <p className="text-slate-600">Aucun evenement.</p> : null}
          {events.length > 0 ? (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-3">Event Title</th>
                  <th className="py-3">Description</th>
                  <th className="py-3">Date</th>
                  <th className="py-3">Location</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Registered Volunteers</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-slate-200 align-top">
                    <td className="py-4 font-semibold">{event.title}</td>
                    <td className="py-4">{event.description || "-"}</td>
                    <td className="py-4">{formatDate(event.starts_at)}</td>
                    <td className="py-4">{[event.city, event.country].filter(Boolean).join(", ") || "-"}</td>
                    <td className="py-4">{event.status}</td>
                    <td className="py-4">{event.registered_volunteers_count}</td>
                    <td className="py-4 text-right">
                      <button className="btn-secondary px-3 py-2 text-xs" onClick={() => viewParticipants(event)}>
                        View Participants
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>

        {selectedEvent ? (
          <div className="card mt-8 overflow-x-auto">
            <h2 className="text-2xl font-black">Participants: {selectedEvent.title}</h2>
            <p className="mt-2 text-slate-600">Only accepted volunteers participating in this event are shown.</p>
            {participants.length === 0 ? <p className="mt-5 text-slate-600">Aucun participant accepte.</p> : null}
            {participants.length > 0 ? (
              <table className="mt-5 w-full min-w-[860px] text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-3">Volunteer Name</th>
                    <th className="py-3">Email</th>
                    <th className="py-3">Phone Number</th>
                    <th className="py-3">Skills</th>
                    <th className="py-3">Registration Date</th>
                    <th className="py-3">Participation Status</th>
                    <th className="py-3">Arrival</th>
                    <th className="py-3">Departure</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((entry) => (
                    <tr key={entry.application_id} className="border-t border-slate-200 align-top">
                      <td className="py-4 font-semibold">{entry.volunteer.first_name} {entry.volunteer.last_name}</td>
                      <td className="py-4">{entry.volunteer.user?.email ?? "-"}</td>
                      <td className="py-4">{entry.volunteer.user?.phone_number || "-"}</td>
                      <td className="py-4">
                        {entry.volunteer.skills_summary?.length
                          ? entry.volunteer.skills_summary.map((skill) => `${skill.name} (${skill.level})`).join(", ")
                          : "-"}
                      </td>
                      <td className="py-4">{new Date(entry.registered_at).toLocaleDateString("fr-FR")}</td>
                      <td className="py-4">{entry.participation_status}</td>
                      <td className="py-4">{entry.arrived_at ? new Date(entry.arrived_at).toLocaleString("fr-FR") : "-"}</td>
                      <td className="py-4">{entry.departed_at ? new Date(entry.departed_at).toLocaleString("fr-FR") : "-"}</td>
                      <td className="py-4 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => updateParticipation(entry.application_id, "confirm-participation")}>
                            Confirm
                          </button>
                          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => updateParticipation(entry.application_id, "mark-attended")}>
                            Attended
                          </button>
                          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => updateParticipation(entry.application_id, "mark-completed")}>
                            Completed
                          </button>
                          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => downloadOrganisationFile(`/candidatures/${entry.application_id}/qr-code/`, `qr-${entry.application_id}.png`)}>
                            QR
                          </button>
                          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => downloadOrganisationFile(`/candidatures/${entry.application_id}/certificate/`, `certificat-${entry.application_id}.pdf`)}>
                            Certificat
                          </button>
                          <button className="rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => updateParticipation(entry.application_id, "mark-absent")}>
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </div>
        ) : null}
      </RoleGate>
    </section>
  );
}
