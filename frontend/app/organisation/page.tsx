"use client";

import { BarChart3, FileDown, Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Organisation, OrganisationStats } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { RoleGate } from "@/components/RoleGate";
import { StatusMessage } from "@/components/StatusMessage";

export default function OrganisationDashboardPage() {
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [stats, setStats] = useState<OrganisationStats | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setError("");
    authedFetch<Organisation>("/organisations/me/")
      .then((currentOrganisation) => {
        setOrganisation(currentOrganisation);
        return authedFetch<OrganisationStats>(`/stats/organisation/${currentOrganisation.id}/overview/`);
      })
      .then(setStats)
      .catch((err) => {
        setStats(null);
        setError(err instanceof Error ? err.message : "Statistiques indisponibles.");
      });
  }, []);

  async function uploadDocuments(formData: FormData) {
    if (!organisation) {
      return;
    }
    setError("");
    setMessage("");
    try {
      await authedFetch(`/organisations/${organisation.id}/documents/`, {
        method: "POST",
        body: formData,
        headers: {}
      });
      setMessage("Documents envoyes. Votre demande repasse en attente de verification.");
      const refreshed = await authedFetch<Organisation>("/organisations/me/");
      setOrganisation(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    }
  }

  const kpis = [
    { label: "Evenements", value: stats?.events ?? "-" },
    { label: "Missions", value: stats?.missions ?? "-" },
    { label: "Presences validees", value: stats?.attendances ?? "-" }
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="font-bold text-brand-600">Espace organisation</p>
          <h1 className="mt-2 text-4xl font-black">Pilotez vos evenements et candidatures</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/organisation/events/new" className={`btn-primary ${organisation?.validation_status !== "validee" ? "pointer-events-none opacity-50" : ""}`}>
            <Plus className="mr-2 h-4 w-4" /> Nouvel evenement
          </Link>
        </div>
      </div>
      <RoleGate allowedRoles={["organisation", "admin"]}>

      {error ? (
        <p className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          {error} Connectez-vous via `/login` avec un compte organisation.
        </p>
      ) : null}
      <div className="mt-6 grid gap-3">
        <StatusMessage message={message} tone="success" />
      </div>

      {organisation ? (
        <div className="card mt-8">
          <h2 className="text-xl font-black">Verification de l'organisation</h2>
          <p className="mt-2 text-slate-600">
            Statut actuel : <span className="font-black text-brand-900">{organisation.validation_status}</span>
          </p>
          {organisation.review_reason ? (
            <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
              Message admin : {organisation.review_reason}
            </p>
          ) : null}
          {organisation.validation_status !== "validee" ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">
                Tant que l'organisation n'est pas approuvee, vous ne pouvez pas creer d'evenements, missions ou gerer les candidatures.
              </p>
              <form
                className="mt-4 flex flex-col gap-3 md:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  uploadDocuments(new FormData(event.currentTarget));
                }}
              >
                <input className="rounded-2xl border border-slate-300 px-4 py-3" name="documents" type="file" multiple required />
                <button className="btn-secondary" type="submit">Envoyer documents</button>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="card">
            <p className="text-sm font-bold text-slate-500">{kpi.label}</p>
            <p className="mt-3 text-4xl font-black">{kpi.value}</p>
          </article>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <Users className="h-8 w-8 text-brand-600" />
          <h2 className="mt-4 text-xl font-black">Candidatures a traiter</h2>
          <p className="mt-2 text-slate-600">Vue dediee aux decisions individuelles et actions en masse.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/organisation/volunteers" className={`btn-secondary ${organisation?.validation_status !== "validee" ? "pointer-events-none opacity-50" : ""}`}>
              Candidatures en attente
            </Link>
            <Link href="/organisation/missions/new" className={`btn-secondary ${organisation?.validation_status !== "validee" ? "pointer-events-none opacity-50" : ""}`}>
              Ajouter une mission
            </Link>
            <Link href="/organisation/events" className={`btn-secondary ${organisation?.validation_status !== "validee" ? "pointer-events-none opacity-50" : ""}`}>
              Suivre les participants
            </Link>
          </div>
        </div>
        <div className="card">
          <BarChart3 className="h-8 w-8 text-brand-600" />
          <h2 className="mt-4 text-xl font-black">Rapport d'impact</h2>
          <p className="mt-2 text-slate-600">Heures, presences, taux de remplissage et satisfaction par evenement.</p>
          <button className="btn-secondary mt-6">
            <FileDown className="mr-2 h-4 w-4" /> Exporter
          </button>
        </div>
      </div>
      </RoleGate>
    </section>
  );
}
