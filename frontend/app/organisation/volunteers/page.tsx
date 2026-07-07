"use client";

import { useEffect, useState } from "react";
import { Application, PaginatedResponse, unwrapResults } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { RoleGate } from "@/components/RoleGate";
import { StatusMessage } from "@/components/StatusMessage";

export default function OrganisationVolunteersPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
      setMessage(action === "accepter" ? "Candidature acceptee. Le benevole a ete notifie." : "Candidature refusee. Le benevole a ete notifie.");
      setSelectedApplication(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible.");
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <p className="font-bold text-brand-600">Organisation</p>
      <h1 className="mt-2 text-4xl font-black">Volunteer Applications Management</h1>
      <p className="mt-3 text-slate-600">
        Cette page affiche uniquement les benevoles dont la candidature est encore en attente.
      </p>

      <RoleGate allowedRoles={["organisation", "admin"]}>
        <div className="mt-6 grid gap-3">
          <StatusMessage message={message} tone="success" />
          <StatusMessage message={error} tone="error" />
        </div>

        <div className="card mt-8 overflow-x-auto">
            <h2 className="text-xl font-black">Pending Applications</h2>
            {loading ? <p className="mt-5 text-slate-600">Chargement...</p> : null}
            {!loading && applications.length === 0 ? <p className="mt-5 text-slate-600">Aucune candidature en attente.</p> : null}
            {applications.length > 0 ? (
              <table className="mt-5 w-full min-w-[1040px] text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-3">Volunteer Name</th>
                    <th className="py-3">Email</th>
                    <th className="py-3">Phone Number</th>
                    <th className="py-3">Skills</th>
                    <th className="py-3">Availability</th>
                    <th className="py-3">Applied Event</th>
                    <th className="py-3">Application Date</th>
                    <th className="py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => (
                    <tr key={application.id} className="border-t border-slate-200 align-top">
                      <td className="py-4 font-semibold">{application.volunteer_name ?? `#${application.volunteer}`}</td>
                      <td className="py-4">{application.volunteer_email ?? "-"}</td>
                      <td className="py-4">{application.volunteer_phone_number || "-"}</td>
                      <td className="py-4">
                        {application.volunteer_skills?.length
                          ? application.volunteer_skills.map((skill) => `${skill.name} (${skill.level})`).join(", ")
                          : "-"}
                      </td>
                      <td className="py-4">{application.volunteer_availability || "-"}</td>
                      <td className="py-4">{application.event_title ?? application.mission_name ?? "-"}</td>
                      <td className="py-4">{new Date(application.applied_at).toLocaleDateString("fr-FR")}</td>
                      <td className="py-4 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedApplication(application)}>
                            View Profile
                          </button>
                          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => updateApplication(application.id, "refuser")}>
                            Reject
                          </button>
                          <button className="btn-primary px-3 py-2 text-xs" onClick={() => updateApplication(application.id, "accepter")}>
                            Accept
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
        </div>

        {selectedApplication?.volunteer_profile ? (
          <div className="card mt-8">
            <h2 className="text-2xl font-black">Volunteer Profile</h2>
            <div className="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              <p><strong>Name:</strong> {selectedApplication.volunteer_name}</p>
              <p><strong>Email:</strong> {selectedApplication.volunteer_email ?? "-"}</p>
              <p><strong>Phone:</strong> {selectedApplication.volunteer_phone_number || "-"}</p>
              <p><strong>City:</strong> {selectedApplication.volunteer_profile.city || "-"}</p>
              <p><strong>Birth date:</strong> {selectedApplication.volunteer_profile.birth_date ?? "-"}</p>
              <p><strong>Points:</strong> {selectedApplication.volunteer_profile.total_points}</p>
              <p className="md:col-span-2"><strong>Interests:</strong> {selectedApplication.volunteer_profile.interests || "-"}</p>
              <p className="md:col-span-2"><strong>Availability:</strong> {selectedApplication.volunteer_availability || "-"}</p>
              <p className="md:col-span-2">
                <strong>Skills:</strong>{" "}
                {selectedApplication.volunteer_skills?.length
                  ? selectedApplication.volunteer_skills.map((skill) => `${skill.name} (${skill.level})`).join(", ")
                  : "-"}
              </p>
            </div>
          </div>
        ) : null}
      </RoleGate>
    </section>
  );
}
