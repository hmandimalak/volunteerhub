"use client";

import { FormEvent, useEffect, useState } from "react";
import { Badge, Organisation, PaginatedResponse, unwrapResults } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { StatusMessage } from "@/components/StatusMessage";
import { AdminPageHeader, EmptyState, GlassCard, StatusBadge } from "@/components/admin";
import { Toast, useToast } from "@/components/portal/Toast";

export default function OrganisationRewardsPage() {
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [conditionType, setConditionType] = useState("completed_events");
  const [minCount, setMinCount] = useState(1);
  const { toast, showToast } = useToast();

  async function loadBadges(orgId: number) {
    const data = await authedFetch<PaginatedResponse<Badge> | Badge[]>(`/badges/?organisation=${orgId}`);
    setBadges(unwrapResults(data));
  }

  useEffect(() => {
    authedFetch<Organisation>("/organisations/me/")
      .then((org) => {
        setOrganisation(org);
        return loadBadges(org.id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Chargement impossible."));
  }, []);

  async function createBadge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const condition =
        conditionType === "volunteer_hours"
          ? { type: "volunteer_hours", min_hours: minCount }
          : conditionType === "attendance_rate"
            ? { type: "attendance_rate", min_rate: minCount }
            : conditionType === "manual"
              ? { type: "manual" }
              : { type: "completed_events", min_count: minCount };

      await authedFetch("/badges/", {
        method: "POST",
        body: JSON.stringify({ name, description, condition, is_active: true }),
      });
      setMessage("Badge créé.");
      showToast("Badge créé avec succès !");
      setName("");
      setDescription("");
      if (organisation) await loadBadges(organisation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    }
  }

  return (
    <section>
      <AdminPageHeader
        kicker="Organisation"
        title="Badges et récompenses"
        subtitle="Créez des badges lumineux et définissez les critères d'attribution automatique."
      />

      <div className="mt-6 grid gap-3">
        <StatusMessage message={message} tone="success" />
        <StatusMessage message={error} tone="error" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <GlassCard hover={false}>
          <form onSubmit={createBadge} className="grid gap-4">
            <h2 className="text-xl font-black">Créer un badge</h2>
            <label className="grid gap-2 text-sm font-semibold">
              Nom du badge
              <input placeholder="Ex. Chef d'Équipe" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { name: "Chef d'Équipe", description: "A coordonné une équipe sur le terrain." },
                { name: "Ponctualité Exemplaire", description: "Toujours à l'heure, mission après mission." },
                { name: "Médiateur", description: "A su apaiser et relier les participants." },
              ].map((suggestion) => (
                <button
                  key={suggestion.name}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setName(suggestion.name);
                    setDescription(suggestion.description);
                    setConditionType("manual");
                  }}
                >
                  {suggestion.name}
                </button>
              ))}
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Description
              <textarea className="min-h-24" placeholder="Expliquez comment l'obtenir..." value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Critère
              <select value={conditionType} onChange={(event) => setConditionType(event.target.value)}>
                <option value="completed_events">Événements complétés</option>
                <option value="volunteer_hours">Heures de bénévolat</option>
                <option value="attendance_rate">Taux de présence (%)</option>
                <option value="manual">Attribution manuelle uniquement</option>
              </select>
            </label>
            {conditionType !== "manual" ? (
              <label className="grid gap-2 text-sm font-semibold">
                Seuil
                <input type="number" min="1" value={minCount} onChange={(event) => setMinCount(Number(event.target.value))} />
              </label>
            ) : null}
            <button className="btn-primary" type="submit">
              Créer le badge
            </button>
          </form>
        </GlassCard>

        <div className="grid gap-4">
          {badges.length === 0 ? (
            <GlassCard hover={false}>
              <EmptyState title="Aucun badge" description="Le premier badge que vous créez apparaîtra ici." />
            </GlassCard>
          ) : null}
          {badges.map((badge) => (
            <GlassCard key={badge.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-black">{badge.name}</h3>
                <StatusBadge label={badge.is_active ? "Actif" : "Inactif"} tone={badge.is_active ? "success" : "neutral"} />
              </div>
              <p className="mt-2 text-sm text-slate-600">{badge.description}</p>
              <p className="mt-3 text-xs text-slate-400">
                {badge.organisation_name ? `Organisation : ${badge.organisation_name}` : "Badge de la plateforme"}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
      <Toast toast={toast} />
    </section>
  );
}
