"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Event, EventCategory, PaginatedResponse, Skill, unwrapResults } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { AdminPageHeader, GlassCard } from "@/components/admin";
import { Dropzone } from "@/components/portal/Dropzone";
import { EventPreviewCard } from "@/components/portal/EventPreviewCard";
import { StepIndicator } from "@/components/portal/StepIndicator";
import { Toast, useToast } from "@/components/portal/Toast";

type MissionDraft = {
  name: string;
  description: string;
  capacity: number;
  skillIds: number[];
};

const emptyMission = (): MissionDraft => ({ name: "", description: "", capacity: 1, skillIds: [] });

const STEPS = [
  { id: "general", label: "Informations générales" },
  { id: "place", label: "Date et lieu" },
  { id: "needs", label: "Besoins en bénévoles" },
  { id: "confirm", label: "Confirmation et visualisation" },
];

export default function NewEventPage() {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("France");
  const [volunteersNeeded, setVolunteersNeeded] = useState(8);
  const [published, setPublished] = useState(true);
  const [missions, setMissions] = useState<MissionDraft[]>([emptyMission()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    authedFetch<PaginatedResponse<EventCategory> | EventCategory[]>("/categories-evenements/")
      .then((data) => setCategories(unwrapResults(data)))
      .catch(() => setCategories([]));
    authedFetch<PaginatedResponse<Skill> | Skill[]>("/competences/")
      .then((data) => setSkills(unwrapResults(data)))
      .catch(() => setSkills([]));
  }, []);

  const categoryName = useMemo(() => {
    if (showNewCategory) return newCategoryName || "Nouvelle catégorie";
    return categories.find((category) => String(category.id) === selectedCategory)?.name ?? "";
  }, [categories, selectedCategory, showNewCategory, newCategoryName]);

  function updateMission(index: number, patch: Partial<MissionDraft>) {
    setMissions((current) => current.map((mission, i) => (i === index ? { ...mission, ...patch } : mission)));
  }

  function toggleSkill(index: number, skillId: number) {
    const mission = missions[index];
    const skillIds = mission.skillIds.includes(skillId)
      ? mission.skillIds.filter((id) => id !== skillId)
      : [...mission.skillIds, skillId];
    updateMission(index, { skillIds });
  }

  function validateStep() {
    if (step === 0 && !title.trim()) return "Indiquez un titre pour l'événement.";
    if (step === 1 && (!startsAt || !endsAt)) return "Renseignez les dates de début et de fin.";
    if (step === 2 && !missions.some((mission) => mission.name.trim())) return "Ajoutez au moins une mission.";
    return "";
  }

  async function createCategory(): Promise<number | null> {
    if (!newCategoryName.trim()) return null;
    const created = await authedFetch<EventCategory>("/categories-evenements/", {
      method: "POST",
      body: JSON.stringify({ name: newCategoryName.trim(), active: true }),
    });
    setCategories((current) => [...current, created]);
    setSelectedCategory(String(created.id));
    return created.id;
  }

  async function handleCreate() {
    const problem = validateStep();
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setLoading(true);
    try {
      let categoryId = selectedCategory ? Number(selectedCategory) : null;
      if (showNewCategory && newCategoryName.trim()) {
        categoryId = await createCategory();
      }
      const createdEvent = await authedFetch<Event>("/evenements/", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          category: categoryId,
          starts_at: startsAt,
          ends_at: endsAt,
          address,
          city,
          country,
          volunteers_needed: volunteersNeeded,
          status: published ? "publie" : "brouillon",
        }),
      });
      const validMissions = missions.filter((mission) => mission.name.trim());
      for (const mission of validMissions) {
        const createdMission = await authedFetch<{ id: number }>(`/evenements/${createdEvent.id}/missions/`, {
          method: "POST",
          body: JSON.stringify({
            name: mission.name,
            description: mission.description,
            capacity: mission.capacity,
            starts_at: startsAt,
            ends_at: endsAt,
            status: "ouverte",
          }),
        });
        for (const skillId of mission.skillIds) {
          await authedFetch("/mission-competences/", {
            method: "POST",
            body: JSON.stringify({ mission: createdMission.id, skill: skillId, required_level: "debutant", mandatory: false }),
          }).catch(() => undefined);
        }
      }
      if (coverFile) {
        const imageData = new FormData();
        imageData.append("image", coverFile);
        await authedFetch(`/evenements/${createdEvent.id}/images/`, {
          method: "POST",
          body: imageData,
          headers: {},
        }).catch(() => undefined);
      }
      showToast("Événement créé avec succès !");
      setTimeout(() => router.push("/organisation/events"), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
      showToast("Impossible de créer l'événement.", "error");
    } finally {
      setLoading(false);
    }
  }

  function next() {
    const problem = validateStep();
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  return (
    <section>
      <AdminPageHeader
        kicker="Organisation"
        title="Créer un événement"
        subtitle="Un parcours en 4 étapes, avec aperçu en direct de votre carte événement."
      />
      <div className="mt-6">
        <StepIndicator steps={STEPS} current={step} />
      </div>
      {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p> : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <GlassCard hover={false}>
          {step === 0 ? (
            <div key="general" className="step-pane grid gap-4">
              <h2 className="text-xl font-black">Étape 1 · Informations générales</h2>
              <Dropzone
                previewUrl={coverUrl}
                onFile={(file, url) => {
                  setCoverFile(file);
                  setCoverUrl(url);
                }}
                onClear={() => {
                  setCoverFile(null);
                  setCoverUrl("");
                }}
                label="Glissez une image de couverture ou cliquez pour parcourir"
                hint="Cette image alimente l'aperçu en direct"
              />
              <label className="grid gap-2 text-sm font-semibold">
                Titre
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Collecte alimentaire solidaire" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Description
                <textarea className="min-h-28" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Présentez la mission en quelques phrases..." />
              </label>
              <div className="grid gap-2 text-sm font-semibold">
                Catégorie
                {!showNewCategory ? (
                  <div className="flex gap-2">
                    <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                      <option value="">Sans catégorie</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="btn-secondary px-3 text-xs" onClick={() => setShowNewCategory(true)}>
                      Nouvelle
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input placeholder="Nouvelle catégorie" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} />
                    <button type="button" className="btn-secondary px-3 text-xs" onClick={() => setShowNewCategory(false)}>
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div key="place" className="step-pane grid gap-4">
              <h2 className="text-xl font-black">Étape 2 · Date et lieu</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  Début
                  <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Fin
                  <input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-semibold">
                Adresse
                <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="12 rue des Lilas" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  Ville
                  <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Lyon" />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Pays
                  <input value={country} onChange={(event) => setCountry(event.target.value)} />
                </label>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div key="needs" className="step-pane grid gap-4">
              <h2 className="text-xl font-black">Étape 3 · Besoins en bénévoles</h2>
              <label className="grid gap-2 text-sm font-semibold">
                Nombre de bénévoles recherchés
                <input type="number" min={1} value={volunteersNeeded} onChange={(event) => setVolunteersNeeded(Number(event.target.value))} />
              </label>
              <label className="flex items-center justify-between rounded-2xl bg-brand-50/80 px-4 py-3 text-sm font-semibold dark:bg-brand-900/40">
                Publier immédiatement
                <button
                  type="button"
                  onClick={() => setPublished((value) => !value)}
                  className={`relative h-7 w-12 rounded-full transition-all duration-300 ${published ? "bg-gradient-to-r from-brand-500 to-cyan-400" : "bg-slate-300"}`}
                  aria-label="Publier l'événement"
                >
                  <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all duration-300 ${published ? "left-6" : "left-1"}`} />
                </button>
              </label>
              <div className="flex items-center justify-between">
                <h3 className="font-black">Missions</h3>
                <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => setMissions((current) => [...current, emptyMission()])}>
                  <Plus className="h-3.5 w-3.5" /> Ajouter
                </button>
              </div>
              {missions.map((mission, index) => (
                <div key={index} className="rounded-2xl border border-lilac/30 bg-white/70 p-4 dark:bg-white/5">
                  <div className="flex justify-between gap-3">
                    <label className="grid flex-1 gap-2 text-sm font-semibold">
                      Nom de la mission
                      <input value={mission.name} onChange={(event) => updateMission(index, { name: event.target.value })} placeholder="Accueil du public" />
                    </label>
                    {missions.length > 1 ? (
                      <button type="button" className="mt-7 text-rose-500" onClick={() => setMissions((current) => current.filter((_, i) => i !== index))} aria-label="Supprimer la mission">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-semibold">
                      Places
                      <input type="number" min={1} value={mission.capacity} onChange={(event) => updateMission(index, { capacity: Number(event.target.value) })} />
                    </label>
                    <label className="grid gap-2 text-sm font-semibold">
                      Description
                      <input value={mission.description} onChange={(event) => updateMission(index, { description: event.target.value })} placeholder="Tâches principales" />
                    </label>
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-500">Compétences souhaitées</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {skills.map((skill) => {
                      const active = mission.skillIds.includes(skill.id);
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => toggleSkill(index, skill.id)}
                          className={`rounded-full px-3 py-1 text-xs font-bold transition-all duration-300 ${
                            active ? "bg-gradient-to-r from-brand-500 to-cyan-400 text-white" : "bg-white text-slate-600 dark:bg-white/10 dark:text-slate-300"
                          }`}
                        >
                          {skill.name}
                        </button>
                      );
                    })}
                    {skills.length === 0 ? <p className="text-xs text-slate-400">Aucune compétence en base pour le moment.</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {step === 3 ? (
            <div key="confirm" className="step-pane grid gap-4">
              <h2 className="text-xl font-black">Étape 4 · Confirmation et visualisation</h2>
              <p className="text-sm text-slate-600">Vérifiez l'aperçu à droite, puis publiez. Vous pourrez ensuite gérer les candidatures.</p>
              <div className="grid gap-2 rounded-2xl bg-brand-50/70 p-4 text-sm">
                <p><strong>Titre :</strong> {title}</p>
                <p><strong>Lieu :</strong> {[address, city, country].filter(Boolean).join(", ") || "—"}</p>
                <p><strong>Bénévoles :</strong> {volunteersNeeded}</p>
                <p><strong>Missions :</strong> {missions.filter((mission) => mission.name.trim()).length}</p>
                <p><strong>Statut :</strong> {published ? "Publié" : "Brouillon"}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex justify-between gap-3">
            <button type="button" className="btn-secondary" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>
              Retour
            </button>
            {step < 3 ? (
              <button type="button" className="btn-primary" onClick={next}>
                Continuer
              </button>
            ) : (
              <button type="button" className="btn-primary" disabled={loading} onClick={handleCreate}>
                {loading ? "Création..." : "Créer l'événement"}
              </button>
            )}
          </div>
        </GlassCard>

        <div className="lg:sticky lg:top-28">
          <EventPreviewCard
            title={title}
            description={description}
            category={categoryName}
            city={city}
            startsAt={startsAt}
            volunteersNeeded={volunteersNeeded}
            published={published}
            imageUrl={coverUrl}
            missionCount={missions.filter((mission) => mission.name.trim()).length}
          />
        </div>
      </div>
      <Toast toast={toast} />
    </section>
  );
}
