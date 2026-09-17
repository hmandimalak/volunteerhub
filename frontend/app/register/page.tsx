"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/browser-api";
import { StatusMessage } from "@/components/StatusMessage";
import { Dropzone } from "@/components/portal/Dropzone";

type RegisterRole = "benevole" | "organisation" | "admin";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<RegisterRole>("benevole");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [organisationDocuments, setOrganisationDocuments] = useState<File[]>([]);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (role === "admin") {
      setError("Les comptes administrateur sont créés uniquement par un administrateur existant.");
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("L'e-mail et le mot de passe sont obligatoires.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const form = new FormData(event.currentTarget);
    for (const key of Array.from(form.keys())) {
      const value = form.get(key);
      if (typeof value === "string" && value.trim() === "") {
        form.delete(key);
      }
    }
    form.set("email", trimmedEmail);
    form.set("password", password);
    form.set("role", role);
    form.delete("password_confirm");
    form.delete("organisation_documents");
    form.delete("profile_picture");
    organisationDocuments.forEach((file) => form.append("organisation_documents", file));
    if (profilePicture) {
      form.append("profile_picture", profilePicture);
    }

    if (role === "organisation" && organisationDocuments.length === 0) {
      setError("Ajoutez au moins un document officiel.");
      setLoading(false);
      return;
    }

    const skills = String(form.get("skills_text") ?? "")
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
    form.delete("skills_text");
    skills.forEach((skill) => form.append("skills", skill));

    try {
      await registerUser(form);
      setMessage(
        role === "organisation"
          ? "Organisation créée. Elle devra être validée par un administrateur."
          : "Compte bénévole créé. Vous pouvez vous connecter.",
      );
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <p className="kicker">Inscription</p>
      <h1 className="mt-4 text-4xl font-black">Créer un compte VolunteerHub</h1>
      <p className="mt-3 text-slate-600">
        Commencez par votre e-mail et votre mot de passe, puis complétez le profil bénévole ou organisation.
      </p>

      <div className="mt-6 grid gap-3">
        <StatusMessage message={message} tone="success" />
        <StatusMessage message={error} tone="error" />
      </div>

      <form onSubmit={handleSubmit} className="card mt-8 grid gap-6">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["benevole", "Bénévole"],
            ["organisation", "Organisation"],
            ["admin", "Administrateur"],
          ].map(([value, label]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-3xl border p-4 text-sm font-black transition-all duration-300 hover:scale-[1.02] ${
                role === value ? "border-brand-500 bg-brand-50 text-brand-900 dark:bg-brand-900/50 dark:text-lilac" : "border-lilac/40 bg-white/70"
              }`}
            >
              <input className="mr-2" type="radio" checked={role === value} onChange={() => setRole(value as RegisterRole)} />
              {label}
            </label>
          ))}
        </div>

        {role === "admin" ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-5 text-sm font-semibold text-amber-800">
            Un administrateur gère toute la plateforme. Pour protéger l'application, ce compte doit être créé dans
            l'administration Django ou par un administrateur existant, pas via le formulaire public.
          </div>
        ) : null}

        <div className="grid gap-4 rounded-3xl border border-lilac/30 bg-white/70 p-5 backdrop-blur-md">
          <h2 className="text-xl font-black">Identifiants de connexion</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
              E-mail
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.fr"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Téléphone
              <input name="phone_number" type="tel" placeholder="06 12 34 56 78" autoComplete="tel" />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Mot de passe
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Au moins 8 caractères"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Confirmer le mot de passe
              <input
                name="password_confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Répétez le mot de passe"
                minLength={8}
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                required
              />
            </label>
          </div>
        </div>

        {role === "organisation" ? (
          <div className="grid gap-5">
            <h2 className="text-xl font-black">Informations organisation</h2>
            <label className="grid gap-2 text-sm font-semibold">
              Nom de l'organisation
              <input name="organisation_name" placeholder="Association solidaire" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Description
              <textarea className="min-h-28" name="organisation_description" placeholder="Présentez votre structure..." />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Catégorie / type
                <input name="organisation_category_type" placeholder="ONG, refuge, caritatif..." />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Site web optionnel
                <input name="organisation_website" placeholder="https://www.exemple.fr" />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-semibold">
                Adresse
                <input name="organisation_address" placeholder="12 rue des Lilas" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Ville
                <input name="organisation_city" placeholder="Paris" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Pays
                <input name="organisation_country" defaultValue="France" />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Documents officiels obligatoires
              <Dropzone
                variant="document"
                multiple
                files={organisationDocuments}
                onFiles={setOrganisationDocuments}
                label="Glissez vos documents officiels ou cliquez pour parcourir"
              />
            </label>
          </div>
        ) : null}

        {role === "benevole" ? (
          <div className="grid gap-5">
            <h2 className="text-xl font-black">Informations bénévole</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-semibold">
                Prénom
                <input name="first_name" placeholder="Léa" required />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Nom
                <input name="last_name" placeholder="Martin" required />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Date de naissance
                <input name="birth_date" type="date" />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Adresse / localisation
                <input name="volunteer_address" placeholder="Ville ou quartier" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Ville
                <input name="volunteer_city" placeholder="Lyon" />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Compétences, séparées par des virgules
              <input name="skills_text" placeholder="Logistique, accueil, animaux..." />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Centres d'intérêt
              <textarea className="min-h-24" name="volunteer_interests" placeholder="Environnement, éducation..." />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Disponibilités
              <textarea className="min-h-24" name="volunteer_availability" placeholder="Soirs et week-ends" />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Photo de profil optionnelle
              <Dropzone
                previewUrl={profilePreview}
                onFile={(file, url) => {
                  setProfilePicture(file);
                  setProfilePreview(url);
                }}
                onClear={() => {
                  setProfilePicture(null);
                  setProfilePreview("");
                }}
                label="Glissez une photo ou cliquez pour parcourir"
              />
            </label>
          </div>
        ) : null}

        <button className="btn-primary" disabled={loading || role === "admin"} type="submit">
          {loading ? "Inscription..." : "Créer le compte"}
        </button>
        <p className="text-sm text-slate-600">
          Déjà inscrit ?{" "}
          <Link className="font-bold text-brand-700" href="/login">
            Se connecter
          </Link>
        </p>
      </form>
    </section>
  );
}
