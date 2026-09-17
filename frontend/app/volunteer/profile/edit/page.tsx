"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PaginatedResponse, Skill, Volunteer, unwrapResults } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { AdminPageHeader, GlassCard } from "@/components/admin";
import { Dropzone } from "@/components/portal/Dropzone";
import { Toast, useToast } from "@/components/portal/Toast";
import { StatusMessage } from "@/components/StatusMessage";

const SUGGESTED_SKILLS = ["Logistique", "Animation", "Accueil", "Secourisme", "Traduction", "Cuisine", "Communication", "Encadrement"];
const AVAILABILITY_OPTIONS = ["Week-ends", "Soirs", "Journées", "Semaine", "Flexible"];

export default function EditVolunteerProfilePage() {
  const { toast, showToast } = useToast();
  const [profile, setProfile] = useState<Volunteer | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [availability, setAvailability] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<Skill[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    authedFetch<Volunteer>("/benevoles/me/")
      .then((data) => {
        setProfile(data);
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setPhone(data.phone_number ?? data.user?.phone_number ?? "");
        setCity(data.city ?? "");
        setBio(data.bio ?? "");
        setInterests(data.interests ?? "");
        setAvailability(
          (data.availability_notes ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        );
        setSkills((data.skills_summary ?? []).map((item) => item.name));
        setEmergencyName(data.emergency_contact_name ?? "");
        setEmergencyPhone(data.emergency_contact_phone ?? "");
        setPhotoPreview(data.photo_url ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger le profil."));
    authedFetch<PaginatedResponse<Skill> | Skill[]>("/competences/")
      .then((data) => setCatalog(unwrapResults(data)))
      .catch(() => setCatalog([]));
  }, []);

  const skillOptions = useMemo(() => {
    const names = new Set([...SUGGESTED_SKILLS, ...catalog.map((skill) => skill.name), ...skills]);
    return Array.from(names);
  }, [catalog, skills]);

  function toggleValue(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setLoading(true);
    setError("");
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        city,
        bio,
        interests,
        availability_notes: availability.join(", "),
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
        skill_names: skills,
      };
      let updated = await authedFetch<Volunteer>("/benevoles/me/", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (photoFile) {
        const form = new FormData();
        form.append("photo", photoFile);
        updated = await authedFetch<Volunteer>("/benevoles/me/", {
          method: "PATCH",
          body: form,
          headers: {},
        });
      }
      setProfile(updated);
      setPhotoPreview(updated.photo_url ?? photoPreview);
      showToast("Profil mis à jour avec succès !");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <AdminPageHeader
        kicker="Bénévole"
        title="Éditer mon profil"
        subtitle="Photo, compétences, disponibilités et contact d'urgence, dans un espace lumineux."
        actions={
          <Link href="/volunteer/profile" className="btn-secondary">
            Retour au profil
          </Link>
        }
      />
      <div className="mt-6">
        <StatusMessage message={error} tone="error" />
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <GlassCard className="glow-border" hover={false}>
          <h2 className="text-xl font-black">Aperçu du profil</h2>
          <div className="mt-5 grid place-items-center">
            <div className="glow-ring h-36 w-36 overflow-hidden rounded-full border-4 border-white/70 bg-gradient-to-br from-brand-400 to-cyan-300 shadow-xl shadow-brand-500/30">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Aperçu de l'avatar" className="h-full w-full object-cover" />
              ) : (
                <p className="grid h-full place-items-center text-3xl font-black text-white">
                  {(firstName[0] ?? "B").toUpperCase()}
                  {(lastName[0] ?? "").toUpperCase()}
                </p>
              )}
            </div>
            <p className="mt-4 text-center text-lg font-black">
              {firstName || "Prénom"} {lastName || "Nom"}
            </p>
            <p className="text-sm text-slate-500">{city || "Ville à renseigner"}</p>
          </div>
          <div className="mt-6">
            <Dropzone
              previewUrl={photoPreview}
              onFile={(file, url) => {
                setPhotoFile(file);
                setPhotoPreview(url);
              }}
              onClear={() => {
                setPhotoFile(null);
                setPhotoPreview(profile?.photo_url ?? "");
              }}
              label="Glissez votre photo ou cliquez pour parcourir"
              hint="Aperçu en direct autour de l'avatar lumineux"
            />
          </div>
        </GlassCard>

        <div className="grid gap-6">
          <GlassCard hover={false}>
            <h2 className="text-xl font-black">Informations personnelles</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Prénom
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Léa" required />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Nom
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Martin" required />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Téléphone
                <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="06 12 34 56 78" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Ville
                <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Lyon" />
              </label>
            </div>
            <label className="mt-4 grid gap-2 text-sm font-semibold">
              Bio / Présentation
              <textarea className="min-h-28" value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Parlez de vous en quelques phrases..." />
            </label>
            <p className="mt-4 text-sm font-bold">Disponibilités</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVAILABILITY_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={availability.includes(option) ? "chip chip-active" : "chip"}
                  onClick={() => setAvailability((current) => toggleValue(current, option))}
                >
                  {option}
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard hover={false}>
            <h2 className="text-xl font-black">Compétences et intérêts</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {skillOptions.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  className={skills.includes(skill) ? "chip chip-active" : "chip"}
                  onClick={() => setSkills((current) => toggleValue(current, skill))}
                >
                  {skill}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input value={customSkill} onChange={(event) => setCustomSkill(event.target.value)} placeholder="Ajouter une compétence..." />
              <button
                type="button"
                className="btn-secondary px-4"
                onClick={() => {
                  const value = customSkill.trim();
                  if (!value) return;
                  setSkills((current) => (current.includes(value) ? current : [...current, value]));
                  setCustomSkill("");
                }}
              >
                Ajouter
              </button>
            </div>
            <label className="mt-4 grid gap-2 text-sm font-semibold">
              Centres d'intérêt
              <textarea className="min-h-20" value={interests} onChange={(event) => setInterests(event.target.value)} placeholder="Nature, solidarité, sport..." />
            </label>
          </GlassCard>

          <GlassCard hover={false}>
            <h2 className="text-xl font-black">Contact d'urgence</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Nom
                <input value={emergencyName} onChange={(event) => setEmergencyName(event.target.value)} placeholder="Nom du contact" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Téléphone
                <input value={emergencyPhone} onChange={(event) => setEmergencyPhone(event.target.value)} placeholder="06 98 76 54 32" />
              </label>
            </div>
            <button className="btn-primary glow-ring mt-6 w-full" disabled={loading} type="submit">
              {loading ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>
          </GlassCard>
        </div>
      </form>
      <Toast toast={toast} />
    </section>
  );
}
