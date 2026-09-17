"use client";

import { CalendarDays, FileDown, Plus, QrCode, Users } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Organisation, OrganisationStats } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { StatusMessage } from "@/components/StatusMessage";
import { labelStatus } from "@/lib/labels";
import { AdminPageHeader, GlassCard, StatCard, StatusBadge } from "@/components/admin";
import { Toast, useToast } from "@/components/portal/Toast";
import { Dropzone } from "@/components/portal/Dropzone";

export default function OrganisationDashboardPage() {
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [stats, setStats] = useState<OrganisationStats | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);
  const { toast, showToast } = useToast();

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

  async function uploadDocuments() {
    if (!organisation || documents.length === 0) {
      setError("Ajoutez au moins un document.");
      return;
    }
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      documents.forEach((file) => formData.append("documents", file));
      await authedFetch(`/organisations/${organisation.id}/documents/`, {
        method: "POST",
        body: formData,
        headers: {},
      });
      setMessage("Documents envoyés. Votre demande repasse en attente de vérification.");
      showToast("Documents envoyés avec succès !");
      setDocuments([]);
      const refreshed = await authedFetch<Organisation>("/organisations/me/");
      setOrganisation(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    }
  }

  const verified = organisation?.validation_status === "validee";

  return (
    <section>
      <AdminPageHeader
        kicker="Espace organisation"
        title="Tableau de bord"
        subtitle="Pilotez vos événements, vos candidatures et votre impact depuis un hub unique."
        actions={
          <Link href="/organisation/events/new" className={`btn-primary ${verified ? "" : "pointer-events-none opacity-50"}`}>
            <Plus className="h-4 w-4" /> Créer un événement
          </Link>
        }
      />
      {error ? (
        <p className="mt-6 rounded-3xl border border-amber-200 bg-amber-50/80 p-4 text-sm font-semibold text-amber-800">{error}</p>
      ) : null}
      <div className="mt-4">
        <StatusMessage message={message} tone="success" />
      </div>

      {organisation ? (
        <GlassCard className="mt-8" hover={false}>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <h2 className="text-xl font-black">{organisation.name}</h2>
              <p className="mt-2 text-sm text-slate-600">Vérification de l'organisation</p>
            </div>
            <StatusBadge
              label={labelStatus(organisation.validation_status)}
              tone={verified ? "success" : organisation.validation_status === "refusee" ? "danger" : "warning"}
            />
          </div>
          {organisation.review_reason ? (
            <p className="mt-4 rounded-2xl bg-amber-50/80 p-3 text-sm font-semibold text-amber-800">
              Message de l'administrateur : {organisation.review_reason}
            </p>
          ) : null}
          {!verified ? (
            <div className="mt-5 rounded-2xl border border-dashed border-lilac/40 bg-white/60 p-4 dark:bg-white/5">
              <p className="text-sm font-semibold text-slate-700">
                Tant que l'organisation n'est pas approuvée, vous ne pouvez pas créer d'événements ni gérer les candidatures.
              </p>
              <div className="mt-4 grid gap-3">
                <Dropzone
                  variant="document"
                  multiple
                  files={documents}
                  onFiles={setDocuments}
                  label="Glissez vos documents officiels ou cliquez pour parcourir"
                />
                <button className="btn-secondary" type="button" onClick={uploadDocuments}>
                  Envoyer les documents
                </button>
              </div>
            </div>
          ) : null}
        </GlassCard>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Événements" value={stats?.events ?? "—"} icon={CalendarDays} tone="lilac" />
        <StatCard label="Événements actifs" value={stats?.active_events ?? "—"} icon={CalendarDays} tone="cyan" />
        <StatCard label="Candidatures" value={stats?.applications ?? "—"} icon={Users} tone="pink" />
        <StatCard label="Présences validées" value={stats?.attendances ?? "—"} icon={QrCode} tone="mint" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <GlassCard>
          <Users className="h-8 w-8 text-brand-600" />
          <h2 className="mt-4 text-xl font-black">Candidatures</h2>
          <p className="mt-2 text-sm text-slate-600">Acceptez ou refusez les bénévoles depuis un panneau dédié.</p>
          <Link href="/organisation/volunteers" className={`btn-secondary mt-5 ${verified ? "" : "pointer-events-none opacity-50"}`}>
            Traiter les candidatures
          </Link>
        </GlassCard>
        <GlassCard>
          <QrCode className="h-8 w-8 text-brand-600" />
          <h2 className="mt-4 text-xl font-black">Présence</h2>
          <p className="mt-2 text-sm text-slate-600">Scannez les QR Codes le jour J pour valider les arrivées.</p>
          <Link href="/organisation/attendance/scan" className={`btn-secondary mt-5 ${verified ? "" : "pointer-events-none opacity-50"}`}>
            Ouvrir le scanner
          </Link>
        </GlassCard>
        <GlassCard>
          <FileDown className="h-8 w-8 text-brand-600" />
          <h2 className="mt-4 text-xl font-black">Rapports</h2>
          <p className="mt-2 text-sm text-slate-600">Exportez l'impact, les bénévoles et les présences.</p>
          <Link href="/organisation/events" className="btn-secondary mt-5">
            Voir les exports
          </Link>
        </GlassCard>
      </div>
      <Toast toast={toast} />
    </section>
  );
}
