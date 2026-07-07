"use client";

import { useEffect, useState } from "react";
import {
  Event,
  EventVolunteer,
  Organisation,
  OrganisationSummary,
  PaginatedResponse,
  formatDate,
  unwrapResults
} from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { StatusMessage } from "@/components/StatusMessage";
import { RoleGate } from "@/components/RoleGate";

export default function AdminOrganisationsPage() {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [selectedOrganisation, setSelectedOrganisation] = useState<Organisation | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);
  const [eventsLoadedForOrganisationId, setEventsLoadedForOrganisationId] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedEventVolunteers, setSelectedEventVolunteers] = useState<EventVolunteer[]>([]);
  const [summaries, setSummaries] = useState<Record<number, OrganisationSummary>>({});
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadOrganisations() {
    setLoading(true);
    setError("");

    try {
      const data = await authedFetch<PaginatedResponse<Organisation> | Organisation[]>("/organisations/");
      setOrganisations(unwrapResults(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les organisations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrganisations();
  }, []);

  async function decide(id: number, action: "approve" | "reject" | "request-documents" | "suspend" | "reactivate") {
    setMessage("");
    setError("");

    try {
      await authedFetch(`/organisations/${id}/${action}/`, {
        method: "PATCH",
        body: JSON.stringify({ reason: reasons[id] ?? "" })
      });
      if (action === "approve") {
        setMessage("Organisation approuvee.");
      } else if (action === "reject") {
        setMessage("Organisation refusee avec motif.");
      } else if (action === "request-documents") {
        setMessage("Documents complementaires demandes.");
      } else if (action === "suspend") {
        setMessage("Organisation suspendue.");
      } else {
        setMessage("Organisation reactivee.");
      }
      await loadOrganisations();
      if (selectedOrganisation?.id === id) {
        setSelectedOrganisation(null);
        setSelectedEvents([]);
        setEventsLoadedForOrganisationId(null);
        setSelectedEvent(null);
        setSelectedEventVolunteers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision impossible.");
    }
  }

  async function deleteOrganisation(id: number) {
    if (!window.confirm("Supprimer cette organisation et ses donnees associees ?")) {
      return;
    }

    setMessage("");
    setError("");
    try {
      await authedFetch(`/organisations/${id}/`, { method: "DELETE" });
      setMessage("Organisation supprimee.");
      if (selectedOrganisation?.id === id) {
        setSelectedOrganisation(null);
        setSelectedEvents([]);
        setEventsLoadedForOrganisationId(null);
        setSelectedEvent(null);
        setSelectedEventVolunteers([]);
      }
      await loadOrganisations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  async function viewDetails(organisation: Organisation) {
    setSelectedOrganisation(organisation);
    setSelectedEvents([]);
    setEventsLoadedForOrganisationId(null);
    setSelectedEvent(null);
    setSelectedEventVolunteers([]);
    try {
      const summary = await authedFetch<OrganisationSummary>(`/organisations/${organisation.id}/summary/`);
      setSummaries((current) => ({ ...current, [organisation.id]: summary }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les details de l'organisation.");
    }
  }

  async function viewEvents(organisation: Organisation) {
    setSelectedOrganisation(organisation);
    setSelectedEvent(null);
    setSelectedEventVolunteers([]);
    try {
      const [events, summary] = await Promise.all([
        authedFetch<Event[]>(`/organisations/${organisation.id}/events/`),
        authedFetch<OrganisationSummary>(`/organisations/${organisation.id}/summary/`)
      ]);
      setSelectedEvents(events);
      setEventsLoadedForOrganisationId(organisation.id);
      setSummaries((current) => ({ ...current, [organisation.id]: summary }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les evenements.");
    }
  }

  async function viewEventVolunteers(event: Event) {
    setSelectedEvent(event);
    try {
      const volunteers = await authedFetch<EventVolunteer[]>(`/evenements/${event.id}/volunteers/`);
      setSelectedEventVolunteers(volunteers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les benevoles de l'evenement.");
    }
  }

  const pendingOrganisations = organisations.filter((organisation) =>
    ["en_attente", "documents_requis"].includes(organisation.validation_status)
  );
  const approvedOrganisations = organisations.filter((organisation) => organisation.validation_status === "validee");
  const rejectedOrganisations = organisations.filter((organisation) => organisation.validation_status === "refusee");

  function displayStatus(organisation: Organisation) {
    if (organisation.validation_status === "validee") {
      if (organisation.user?.status === "suspendu") {
        return "Suspended";
      }
      return "Approved";
    }
    if (organisation.validation_status === "refusee") {
      return "Rejected";
    }
    return "Pending";
  }

  function renderOrganisationTable(title: string, description: string, items: Organisation[], mode: "pending" | "approved" | "rejected") {
    return (
      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">{items.length}</span>
        </div>
        <div className="card mt-5 overflow-x-auto">
          {items.length === 0 ? <p className="text-slate-600">Aucune organisation.</p> : null}
          {items.length > 0 ? (
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-3">Organization Name</th>
                  <th className="py-3">Category/Type</th>
                  <th className="py-3">Email</th>
                  <th className="py-3">Phone Number</th>
                  <th className="py-3">Address</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Registration Date</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((organisation) => (
                  <tr key={organisation.id} className="border-t border-slate-200 align-top">
                    <td className="py-4 font-semibold">{organisation.name}</td>
                    <td className="py-4">{organisation.category_type || organisation.sector || "-"}</td>
                    <td className="py-4">{organisation.user?.email ?? "-"}</td>
                    <td className="py-4">{organisation.phone_number || organisation.user?.phone_number || "-"}</td>
                    <td className="py-4">{[organisation.address, organisation.city, organisation.country].filter(Boolean).join(", ") || "-"}</td>
                    <td className="py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{displayStatus(organisation)}</span>
                    </td>
                    <td className="py-4">
                      {organisation.verification_requested_at
                        ? new Date(organisation.verification_requested_at).toLocaleDateString("fr-FR")
                        : "-"}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button className="btn-secondary px-3 py-2 text-xs" onClick={() => viewDetails(organisation)}>
                          View Details
                        </button>
                        <button className="btn-secondary px-3 py-2 text-xs" onClick={() => viewEvents(organisation)}>
                          View Events
                        </button>
                        {mode !== "approved" ? (
                          <button className="btn-primary px-3 py-2 text-xs" onClick={() => decide(organisation.id, "approve")}>
                            Approve
                          </button>
                        ) : null}
                        {mode !== "rejected" ? (
                          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => decide(organisation.id, "reject")}>
                            Reject
                          </button>
                        ) : null}
                        {mode === "pending" ? (
                          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => decide(organisation.id, "request-documents")}>
                            More Docs
                          </button>
                        ) : null}
                        {organisation.user?.status === "suspendu" && mode === "approved" ? (
                          <button className="btn-primary px-3 py-2 text-xs" onClick={() => decide(organisation.id, "reactivate")}>
                            Reactivate
                          </button>
                        ) : mode === "approved" ? (
                          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => decide(organisation.id, "suspend")}>
                            Suspend
                          </button>
                        ) : null}
                        <button className="rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => deleteOrganisation(organisation.id)}>
                          Delete
                        </button>
                      </div>
                      {mode === "pending" || mode === "rejected" ? (
                        <textarea
                          className="mt-2 min-h-16 w-full rounded-2xl border border-slate-300 px-3 py-2 text-xs"
                          placeholder="Reject / document request reason..."
                          value={reasons[organisation.id] ?? ""}
                          onChange={(event) =>
                            setReasons((current) => ({ ...current, [organisation.id]: event.target.value }))
                          }
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <p className="font-bold text-brand-600">Admin</p>
      <h1 className="mt-2 text-4xl font-black">Organizations Management</h1>
      <p className="mt-3 text-slate-600">
        Pending, approved and rejected organizations with drill-down into details, events and event volunteers.
      </p>
      <RoleGate allowedRoles={["admin"]}>

      <div className="mt-6 grid gap-3">
        <StatusMessage message={message} tone="success" />
        <StatusMessage message={error} tone="error" />
      </div>

      {loading ? <div className="card mt-8 text-slate-600">Chargement...</div> : null}
      {renderOrganisationTable("Pending Organizations", "Organizations awaiting verification or additional documents.", pendingOrganisations, "pending")}
      {renderOrganisationTable("Approved Organizations", "Verified organizations, including active and suspended accounts.", approvedOrganisations, "approved")}
      {renderOrganisationTable("Rejected Organizations", "Rejected requests archived for review.", rejectedOrganisations, "rejected")}

      {selectedOrganisation ? (
        <section className="card mt-10">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="font-bold text-brand-600">View Details</p>
              <h2 className="mt-2 text-2xl font-black">{selectedOrganisation.name}</h2>
              <p className="mt-3 max-w-3xl text-slate-600">{selectedOrganisation.description || "Aucune description."}</p>
              <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                <p><strong>Type:</strong> {selectedOrganisation.category_type || selectedOrganisation.sector || "-"}</p>
                <p><strong>Email:</strong> {selectedOrganisation.user?.email ?? "-"}</p>
                <p><strong>Phone:</strong> {selectedOrganisation.phone_number || selectedOrganisation.user?.phone_number || "-"}</p>
                <p><strong>Address:</strong> {[selectedOrganisation.address, selectedOrganisation.city, selectedOrganisation.country].filter(Boolean).join(", ") || "-"}</p>
                <p><strong>Status:</strong> {displayStatus(selectedOrganisation)}</p>
                <p><strong>Registration:</strong> {new Date(selectedOrganisation.verification_requested_at).toLocaleDateString("fr-FR")}</p>
              </div>
            </div>
            <button className="btn-primary" onClick={() => viewEvents(selectedOrganisation)}>
              View Events
            </button>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <article className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">Number of events</p>
              <p className="mt-2 text-3xl font-black">{summaries[selectedOrganisation.id]?.events ?? "-"}</p>
            </article>
            <article className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">Number of volunteers</p>
              <p className="mt-2 text-3xl font-black">{summaries[selectedOrganisation.id]?.volunteers ?? "-"}</p>
            </article>
            <article className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-500">Applications</p>
              <p className="mt-2 text-3xl font-black">{summaries[selectedOrganisation.id]?.applications ?? "-"}</p>
            </article>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-black">Verification documents</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedOrganisation.documents?.length ? (
                selectedOrganisation.documents.map((document) => (
                  <a key={document.id} className="rounded-full border border-slate-300 px-3 py-2 text-xs font-bold" href={document.file_url} target="_blank">
                    {document.label || `Document #${document.id}`}
                  </a>
                ))
              ) : (
                <p className="text-sm text-red-600">No documents uploaded.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {selectedOrganisation && eventsLoadedForOrganisationId === selectedOrganisation.id ? (
        <section className="card mt-8 overflow-x-auto">
          <h2 className="text-2xl font-black">Events for {selectedOrganisation.name}</h2>
          {selectedEvents.length === 0 ? <p className="mt-4 text-slate-600">No events for this organization.</p> : null}
          {selectedEvents.length > 0 ? (
          <table className="mt-5 w-full min-w-[900px] text-left text-sm">
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
              {selectedEvents.map((event) => (
                <tr key={event.id} className="border-t border-slate-200 align-top">
                  <td className="py-4 font-semibold">{event.title}</td>
                  <td className="py-4">{event.description || "-"}</td>
                  <td className="py-4">{formatDate(event.starts_at)}</td>
                  <td className="py-4">{[event.city, event.country].filter(Boolean).join(", ") || "-"}</td>
                  <td className="py-4">{event.status}</td>
                  <td className="py-4">{event.registered_volunteers_count}</td>
                  <td className="py-4 text-right">
                    <button className="btn-secondary px-3 py-2 text-xs" onClick={() => viewEventVolunteers(event)}>
                      View Volunteers
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          ) : null}
        </section>
      ) : null}

      {selectedEvent ? (
        <section className="card mt-8 overflow-x-auto">
          <h2 className="text-2xl font-black">Volunteers in Event: {selectedEvent.title}</h2>
          {selectedEventVolunteers.length === 0 ? <p className="mt-4 text-slate-600">No volunteers registered for this event.</p> : null}
          {selectedEventVolunteers.length > 0 ? (
            <table className="mt-5 w-full min-w-[860px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-3">Volunteer Name</th>
                  <th className="py-3">Email</th>
                  <th className="py-3">Phone Number</th>
                  <th className="py-3">Skills</th>
                  <th className="py-3">Participation Status</th>
                  <th className="py-3">Registration Date</th>
                </tr>
              </thead>
              <tbody>
                {selectedEventVolunteers.map((entry) => (
                  <tr key={entry.application_id} className="border-t border-slate-200 align-top">
                    <td className="py-4 font-semibold">{entry.volunteer.first_name} {entry.volunteer.last_name}</td>
                    <td className="py-4">{entry.volunteer.user?.email ?? "-"}</td>
                    <td className="py-4">{entry.volunteer.user?.phone_number || "-"}</td>
                    <td className="py-4">
                      {entry.volunteer.skills_summary?.length
                        ? entry.volunteer.skills_summary.map((skill) => `${skill.name} (${skill.level})`).join(", ")
                        : "-"}
                    </td>
                    <td className="py-4">{entry.participation_status}</td>
                    <td className="py-4">{new Date(entry.registered_at).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      ) : null}
      </RoleGate>
    </section>
  );
}
