"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Award, CalendarDays, Eye, Plus, QrCode, Shield, Trash2, Users } from "lucide-react";
import {
  Application,
  Badge,
  EventDetails,
  EventVolunteer,
  Mission,
  PaginatedResponse,
  formatDate,
  unwrapResults,
} from "@/lib/api";
import { authedFetch, downloadAuthedFile } from "@/lib/browser-api";
import { StatusMessage } from "@/components/StatusMessage";
import { labelStatus } from "@/lib/labels";
import {
  AdminPageHeader,
  AdminTabs,
  ConfirmDialog,
  EmptyState,
  GlassCard,
  SlideOver,
  StatCard,
  StatusBadge,
} from "@/components/admin";
import { Toast, useToast } from "@/components/portal/Toast";

function participationTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "presente" || status === "attended" || status === "terminee" || status === "completed") return "success";
  if (status === "confirmee" || status === "acceptee") return "info";
  if (status === "absente" || status === "absent") return "danger";
  return "warning";
}

function isValidated(status: string) {
  return ["presente", "attended", "terminee", "completed"].includes(status);
}

function toLocalInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type EventWorkspaceProps = {
  backHref: string;
  backLabel: string;
  mode?: "manage" | "oversight";
};

export function EventWorkspace({ backHref, backLabel, mode = "manage" }: EventWorkspaceProps) {
  const canManage = mode === "manage";
  const params = useParams();
  const eventId = Number(params.id);
  const [details, setDetails] = useState<EventDetails | null>(null);
  const [participants, setParticipants] = useState<EventVolunteer[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState<EventVolunteer | null>(null);
  const [tab, setTab] = useState("overview");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [hoursById, setHoursById] = useState<Record<number, number>>({});
  const [missionForm, setMissionForm] = useState<Partial<Mission> | null>(null);
  const [applicationsMission, setApplicationsMission] = useState<Mission | null>(null);
  const [missionApplications, setMissionApplications] = useState<Application[]>([]);
  const [awardBadgeId, setAwardBadgeId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Mission | null>(null);
  const { toast, showToast } = useToast();

  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);
    setError("");
    try {
      const [eventDetails, volunteers] = await Promise.all([
        authedFetch<EventDetails>(`/evenements/${eventId}/details/`),
        authedFetch<EventVolunteer[]>(`/evenements/${eventId}/volunteers/`),
      ]);
      setDetails(eventDetails);
      setParticipants(volunteers);
      setHoursById((current) => {
        const next = { ...current };
        volunteers.forEach((entry) => {
          if (next[entry.application_id] == null) {
            next[entry.application_id] = Number(entry.confirmed_hours ?? entry.hours ?? 4);
          }
        });
        return next;
      });
      const orgId = eventDetails.event.organisation;
      if (orgId && canManage) {
        const badgeData = await authedFetch<PaginatedResponse<Badge> | Badge[]>(`/badges/?organisation=${orgId}`);
        setBadges(unwrapResults(badgeData).filter((badge) => badge.organisation === orgId || badge.condition?.type === "manual"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger l'événement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (eventId) load();
  }, [eventId]);

  const awardableBadges = useMemo(
    () => badges.filter((badge) => badge.organisation || badge.condition?.type === "manual"),
    [badges]
  );

  async function updateParticipation(
    applicationId: number,
    action: "confirm-participation" | "mark-attended" | "mark-completed" | "mark-absent",
    hours?: number
  ) {
    if (!canManage) return;
    setMessage("");
    setError("");
    try {
      await authedFetch(`/candidatures/${applicationId}/${action}/`, {
        method: "PATCH",
        body: JSON.stringify(hours != null ? { hours } : {}),
      });
      showToast("Présence mise à jour !");
      await load(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mise à jour impossible.");
    }
  }

  async function downloadFile(path: string, filename: string) {
    try {
      await downloadAuthedFile(path, filename);
      showToast("Fichier téléchargé avec succès !");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Téléchargement impossible.");
    }
  }

  function toggleSelected(id: number) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  async function validateSelected() {
    const targets = selectedIds.length ? participants.filter((item) => selectedIds.includes(item.application_id)) : participants;
    for (const entry of targets) {
      await updateParticipation(entry.application_id, "mark-attended", hoursById[entry.application_id]);
    }
    setMessage("Présence et heures confirmées.");
  }

  async function awardBadgeToSelected() {
    if (!awardBadgeId) {
      setError("Choisissez un badge à attribuer.");
      return;
    }
    const targets = selectedIds.length ? participants.filter((item) => selectedIds.includes(item.application_id)) : [];
    if (!targets.length) {
      setError("Cochez au moins un bénévole.");
      return;
    }
    setError("");
    try {
      for (const entry of targets) {
        await authedFetch(`/badges/${awardBadgeId}/award/`, {
          method: "POST",
          body: JSON.stringify({ volunteer_id: entry.volunteer_id ?? entry.volunteer.id }),
        });
      }
      showToast("Badge attribué !");
      setMessage("Badge envoyé aux bénévoles sélectionnés.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attribution impossible. Le badge est peut-être déjà attribué.");
    }
  }

  async function generateCertificates() {
    setError("");
    try {
      const validated = participants.filter((item) => isValidated(item.participation_status));
      const ids = selectedIds.length ? selectedIds : validated.map((item) => item.application_id);
      const result = await authedFetch<{ generated: number; skipped: number }>(`/evenements/${eventId}/generate-certificates/`, {
        method: "POST",
        body: JSON.stringify({ application_ids: ids }),
      });
      showToast("Attestations générées !");
      setMessage(`${result.generated} attestation(s) générée(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Génération impossible. Validez d'abord la présence.");
    }
  }

  async function saveMission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!missionForm || !canManage) return;
    const form = new FormData(event.currentTarget);
    const payload: Record<string, string | number> = {
      name: String(form.get("name") || ""),
      description: String(form.get("description") || ""),
      capacity: Number(form.get("capacity") || 1),
    };
    const startsAt = String(form.get("starts_at") || "");
    const endsAt = String(form.get("ends_at") || "");
    if (startsAt) payload.starts_at = new Date(startsAt).toISOString();
    if (endsAt) payload.ends_at = new Date(endsAt).toISOString();
    try {
      if (missionForm.id) {
        await authedFetch(`/missions/${missionForm.id}/`, { method: "PATCH", body: JSON.stringify(payload) });
        showToast("Poste modifié !");
      } else {
        await authedFetch(`/evenements/${eventId}/missions/`, { method: "POST", body: JSON.stringify(payload) });
        showToast("Mission ajoutée !");
      }
      setMissionForm(null);
      await load(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    }
  }

  async function deleteMission() {
    if (!pendingDelete || !canManage) return;
    try {
      await authedFetch(`/missions/${pendingDelete.id}/`, { method: "DELETE" });
      showToast("Mission supprimée !");
      setPendingDelete(null);
      await load(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
    }
  }

  async function openApplications(mission: Mission) {
    setApplicationsMission(mission);
    try {
      const data = await authedFetch<Application[]>(`/missions/${mission.id}/candidatures/`);
      setMissionApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les candidatures.");
      setMissionApplications([]);
    }
  }

  async function reviewApplication(id: number, action: "accepter" | "refuser") {
    if (!canManage) return;
    try {
      await authedFetch(`/candidatures/${id}/${action}/`, { method: "PATCH" });
      showToast(action === "accepter" ? "Candidature acceptée !" : "Candidature refusée.");
      if (applicationsMission) await openApplications(applicationsMission);
      await load(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible.");
    }
  }

  if (loading) {
    return <p className="text-slate-600">Chargement...</p>;
  }

  if (!details) {
    return <p className="text-rose-600">{error || "Événement introuvable."}</p>;
  }

  const { event, missions, registered_volunteers, attendance_stats } = details;
  const tabs = [
    { id: "overview", label: "Vue d'ensemble" },
    { id: "missions", label: "Missions & Postes", count: missions.length },
    { id: "volunteers", label: canManage ? "Gérer les Bénévoles" : "Bénévoles", count: participants.length },
    ...(canManage ? [{ id: "rewards", label: "Récompenses & Certificats" }] : []),
  ];

  return (
    <section>
      <Link href={backHref} className="text-sm font-semibold text-brand-600 hover:text-brand-900">
        {backLabel}
      </Link>
      <div className="mt-4">
        <AdminPageHeader
          kicker={canManage ? "Espace organisation" : "Supervision admin"}
          title={event.title}
          subtitle={event.description}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={labelStatus(event.status)} tone="info" />
              {canManage ? null : (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-black text-brand-600 backdrop-blur-md">
                  <Shield className="h-3.5 w-3.5" /> Lecture seule
                </span>
              )}
            </div>
          }
        />
      </div>

      {canManage ? null : (
        <GlassCard className="mt-6 glow-border" hover={false}>
          <p className="text-sm font-bold text-brand-700">
            Mode supervision : vous consultez les missions, les jauges de bénévoles et les statuts. Seule l'organisation peut modifier les postes, accepter des candidatures ou décerner des récompenses.
          </p>
        </GlassCard>
      )}

      <div className="mt-6 grid gap-3">
        <StatusMessage message={message} tone="info" />
        <StatusMessage message={error} tone="error" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Inscrits" value={registered_volunteers} icon={Users} tone="lilac" />
        <StatCard label="Confirmés" value={attendance_stats.confirmed} icon={CalendarDays} tone="cyan" />
        <StatCard label="Présents" value={attendance_stats.attended} icon={QrCode} tone="mint" />
        <StatCard label="Taux de présence" value={`${attendance_stats.attendance_rate} %`} icon={Award} tone="pink" />
      </div>

      <div className="mt-8">
        <AdminTabs value={tab} onChange={setTab} tabs={tabs} />
      </div>

      {tab === "overview" ? (
        <GlassCard className="mt-6" hover={false}>
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-500">Organisation</dt>
              <dd className="mt-1 font-bold">{event.organisation_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Date</dt>
              <dd className="mt-1 font-bold">
                {formatDate(event.starts_at)} — {formatDate(event.ends_at)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Lieu</dt>
              <dd className="mt-1 font-bold">{[event.address, event.city, event.country].filter(Boolean).join(", ") || "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Catégorie</dt>
              <dd className="mt-1 font-bold">{event.category_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Bénévoles recherchés</dt>
              <dd className="mt-1 font-bold">{event.volunteers_needed}</dd>
            </div>
          </dl>
        </GlassCard>
      ) : null}

      {tab === "missions" ? (
        <div className="mt-6">
          {canManage ? (
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  setMissionForm({
                    name: "",
                    description: "",
                    capacity: 8,
                    starts_at: event.starts_at,
                    ends_at: event.ends_at,
                  } as Mission)
                }
              >
                <Plus className="h-4 w-4" /> Ajouter une mission
              </button>
            </div>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            {missions.length === 0 ? (
              <GlassCard hover={false}>
                <EmptyState
                  title="Aucune mission"
                  description={canManage ? "Ajoutez une mission pour ouvrir les candidatures." : "Aucune mission n'a encore été créée pour cet événement."}
                />
              </GlassCard>
            ) : null}
            {missions.map((mission) => {
              const accepted = mission.registered_volunteers_count ?? Math.max(mission.capacity - mission.remaining_places, 0);
              const percent = mission.capacity ? Math.min(100, Math.round((accepted / mission.capacity) * 100)) : 0;
              const assigned = participants.filter((entry) => entry.mission_id === mission.id || entry.mission_name === mission.name);
              return (
                <GlassCard key={mission.id} className="glow-border">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-black">{mission.name}</h3>
                    <StatusBadge label={labelStatus(mission.status)} tone="info" />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{mission.description || "—"}</p>
                  <p className="mt-3 text-xs font-bold text-brand-600">
                    {formatDate(mission.starts_at)} — {formatDate(mission.ends_at)}
                  </p>
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs font-bold">
                      <span>Capacité</span>
                      <span>
                        {accepted}/{mission.capacity} bénévoles
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/80">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 via-cyan-400 to-mint"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Bénévoles assignés</p>
                    {assigned.length === 0 ? <p className="mt-1 text-sm text-slate-500">Aucun bénévole accepté pour le moment.</p> : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {assigned.map((entry) => (
                        <span key={entry.application_id} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold">
                          {entry.volunteer.first_name} {entry.volunteer.last_name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {canManage ? (
                      <>
                        <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => setMissionForm(mission)}>
                          Modifier le poste
                        </button>
                        <button type="button" className="btn-primary px-3 py-2 text-xs" onClick={() => openApplications(mission)}>
                          Gérer les candidatures
                        </button>
                        <button type="button" className="btn-secondary px-3 py-2 text-xs text-rose-600" onClick={() => setPendingDelete(mission)}>
                          <Trash2 className="h-3.5 w-3.5" /> Supprimer
                        </button>
                      </>
                    ) : (
                      <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => openApplications(mission)}>
                        <Eye className="h-3.5 w-3.5" /> Voir les candidatures
                      </button>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      ) : null}

      {tab === "volunteers" ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {participants.length === 0 ? (
            <GlassCard hover={false}>
              <EmptyState title="Aucun participant accepté" description="Les bénévoles acceptés apparaîtront ici." />
            </GlassCard>
          ) : null}
          {participants.map((entry) => (
            <button key={entry.application_id} type="button" className="text-left" onClick={() => setSelectedVolunteer(entry)}>
              <GlassCard className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">
                      {entry.volunteer.first_name} {entry.volunteer.last_name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{entry.mission_name}</p>
                    <p className="mt-2 text-xs font-bold text-brand-600">{entry.hours ?? entry.confirmed_hours ?? 0} h</p>
                  </div>
                  <StatusBadge label={labelStatus(entry.participation_status)} tone={participationTone(entry.participation_status)} />
                </div>
              </GlassCard>
            </button>
          ))}
        </div>
      ) : null}

      {tab === "rewards" && canManage ? (
        <GlassCard className="mt-6 glow-border" hover={false}>
          <h2 className="text-xl font-black">Valider les bénévoles et décerner des récompenses</h2>
          <p className="mt-1 text-sm text-slate-500">Cochez les bénévoles, confirmez les heures, attribuez un badge ou générez les attestations.</p>
          {awardableBadges.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-brand-600">
              Créez d&apos;abord un badge manuel (Chef d&apos;Équipe, Ponctualité Exemplaire...) dans{" "}
              <Link href="/organisation/rewards" className="underline">
                Récompenses
              </Link>
              .
            </p>
          ) : null}
          <div className="mt-5 grid gap-3">
            {participants.length === 0 ? <EmptyState title="Aucun bénévole à valider" description="Acceptez d'abord des candidatures." /> : null}
            {participants.map((entry) => (
              <label key={entry.application_id} className="flex flex-col gap-3 rounded-2xl border border-white/50 bg-white/70 p-4 backdrop-blur-md md:flex-row md:items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={selectedIds.includes(entry.application_id)}
                  onChange={() => toggleSelected(entry.application_id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-black">
                    {entry.volunteer.first_name} {entry.volunteer.last_name}
                  </p>
                  <p className="text-xs text-slate-500">{entry.mission_name}</p>
                </div>
                <StatusBadge label={labelStatus(entry.participation_status)} tone={participationTone(entry.participation_status)} />
                <label className="grid text-xs font-bold">
                  Heures confirmées
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    className="mt-1 w-28"
                    value={hoursById[entry.application_id] ?? entry.hours ?? 4}
                    onChange={(event) => setHoursById((current) => ({ ...current, [entry.application_id]: Number(event.target.value) }))}
                  />
                </label>
              </label>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="btn-secondary" onClick={validateSelected}>
              Valider la présence
            </button>
            <select value={awardBadgeId} onChange={(event) => setAwardBadgeId(event.target.value)} className="min-w-52">
              <option value="">Choisir un badge</option>
              {awardableBadges.map((badge) => (
                <option key={badge.id} value={badge.id}>
                  {badge.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn-secondary" onClick={awardBadgeToSelected}>
              Attribuer un Badge
            </button>
            <button type="button" className="btn-primary glow-ring" onClick={generateCertificates}>
              Générer une Attestation / Certificat
            </button>
          </div>
        </GlassCard>
      ) : null}

      <SlideOver
        open={Boolean(selectedVolunteer)}
        title={selectedVolunteer ? `${selectedVolunteer.volunteer.first_name} ${selectedVolunteer.volunteer.last_name}` : "Bénévole"}
        subtitle={selectedVolunteer?.mission_name}
        onClose={() => setSelectedVolunteer(null)}
      >
        {selectedVolunteer ? (
          <div className="grid gap-3">
            <p className="text-sm text-slate-600">{selectedVolunteer.volunteer.user?.email ?? "—"}</p>
            <StatusBadge label={labelStatus(selectedVolunteer.participation_status)} tone={participationTone(selectedVolunteer.participation_status)} />
            <p className="text-sm font-bold text-brand-600">{selectedVolunteer.hours ?? selectedVolunteer.confirmed_hours ?? 0} h confirmées</p>
            {canManage ? (
              <div className="mt-2 grid gap-2">
                <button className="btn-secondary" onClick={() => updateParticipation(selectedVolunteer.application_id, "mark-attended", hoursById[selectedVolunteer.application_id])}>
                  Marquer présent
                </button>
                <button className="btn-secondary" onClick={() => updateParticipation(selectedVolunteer.application_id, "mark-completed", hoursById[selectedVolunteer.application_id])}>
                  Marquer terminé
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => downloadFile(`/candidatures/${selectedVolunteer.application_id}/qr-code/`, `qr-${selectedVolunteer.application_id}.png`)}
                >
                  Télécharger le QR Code
                </button>
                <button
                  className="btn-primary"
                  onClick={() =>
                    downloadFile(`/candidatures/${selectedVolunteer.application_id}/certificate/`, `certificat-${selectedVolunteer.application_id}.pdf`)
                  }
                >
                  Télécharger le certificat
                </button>
              </div>
            ) : (
              <p className="rounded-2xl bg-brand-50/80 p-3 text-sm font-semibold text-brand-700">
                Consultation uniquement. L'organisation gère la présence, les badges et les attestations.
              </p>
            )}
          </div>
        ) : null}
      </SlideOver>

      <SlideOver
        open={Boolean(missionForm) && canManage}
        title={missionForm?.id ? "Modifier le poste" : "Ajouter une mission"}
        onClose={() => setMissionForm(null)}
      >
        {missionForm ? (
          <form className="grid gap-4" onSubmit={saveMission}>
            <label className="grid gap-2 text-sm font-semibold">
              Nom du poste
              <input name="name" defaultValue={missionForm.name} placeholder="Ex. Accueil, Logistique, Secourisme" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Description
              <textarea name="description" className="min-h-24" defaultValue={missionForm.description} placeholder="Décrivez le rôle..." />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Capacité
              <input name="capacity" type="number" min="1" defaultValue={missionForm.capacity ?? 8} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Début du créneau
              <input name="starts_at" type="datetime-local" defaultValue={toLocalInput(missionForm.starts_at)} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Fin du créneau
              <input name="ends_at" type="datetime-local" defaultValue={toLocalInput(missionForm.ends_at)} />
            </label>
            <button className="btn-primary" type="submit">
              Enregistrer
            </button>
          </form>
        ) : null}
      </SlideOver>

      <SlideOver
        open={Boolean(applicationsMission)}
        title={applicationsMission ? `Candidatures · ${applicationsMission.name}` : "Candidatures"}
        onClose={() => setApplicationsMission(null)}
      >
        <div className="grid gap-3">
          {missionApplications.length === 0 ? <p className="text-sm text-slate-500">Aucune candidature pour ce poste.</p> : null}
          {missionApplications.map((application) => (
            <div key={application.id} className="rounded-2xl border border-white/50 bg-white/70 p-4 backdrop-blur-md">
              <p className="font-black">{application.volunteer_name ?? `Candidature n°${application.id}`}</p>
              <p className="mt-1 text-xs text-slate-500">{labelStatus(application.status)}</p>
              {canManage && application.status === "en_attente" ? (
                <div className="mt-3 flex gap-2">
                  <button type="button" className="btn-primary px-3 py-2 text-xs" onClick={() => reviewApplication(application.id, "accepter")}>
                    Accepter
                  </button>
                  <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => reviewApplication(application.id, "refuser")}>
                    Refuser
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </SlideOver>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Supprimer cette mission ?"
        description="Le poste et ses candidatures associées seront retirés. Cette action est irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={deleteMission}
        onCancel={() => setPendingDelete(null)}
      />
      <Toast toast={toast} />
    </section>
  );
}
