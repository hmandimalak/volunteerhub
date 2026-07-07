"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/browser-api";
import { StatusMessage } from "@/components/StatusMessage";

type RegisterRole = "benevole" | "organisation" | "admin";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<RegisterRole>("benevole");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (role === "admin") {
      setError("Les comptes administrateur sont crees uniquement par un administrateur existant.");
      return;
    }

    setLoading(true);
    const form = new FormData(event.currentTarget);
    form.set("role", role);
    ["organisation_documents", "profile_picture"].forEach((fieldName) => {
      const file = form.get(fieldName);
      if (file instanceof File && !file.name) {
        form.delete(fieldName);
      }
    });

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
          ? "Organisation creee. Elle devra etre validee par un administrateur."
          : "Compte benevole cree. Vous pouvez vous connecter.",
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
      <p className="font-bold text-brand-600">Inscription</p>
      <h1 className="mt-2 text-4xl font-black">Creer un compte VolunteerHub</h1>
      <p className="mt-3 text-slate-600">
        Le formulaire change selon le role. Les administrateurs ne peuvent pas etre crees publiquement pour des raisons
        de securite.
      </p>

      <div className="mt-6 grid gap-3">
        <StatusMessage message={message} tone="success" />
        <StatusMessage message={error} tone="error" />
      </div>

      <form onSubmit={handleSubmit} className="card mt-8 grid gap-6">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["benevole", "Benevole"],
            ["organisation", "Organisation"],
            ["admin", "Administrateur"]
          ].map(([value, label]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-3xl border p-4 text-sm font-black ${
                role === value ? "border-brand-600 bg-brand-50 text-brand-900" : "border-slate-200 bg-white"
              }`}
            >
              <input className="mr-2" type="radio" checked={role === value} onChange={() => setRole(value as RegisterRole)} />
              {label}
            </label>
          ))}
        </div>

        {role === "admin" ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
            Un administrateur gere toute la plateforme. Pour proteger l'application, ce compte doit etre cree dans Django
            Admin ou par un administrateur existant, pas via le formulaire public.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Email
            <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="email" type="email" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Mot de passe
            <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="password" type="password" minLength={8} required />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Telephone
            <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="phone_number" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Identifiant optionnel
            <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="username" />
          </label>
        </div>

        {role === "organisation" ? (
          <div className="grid gap-5">
            <h2 className="text-xl font-black">Informations organisation</h2>
            <label className="grid gap-2 text-sm font-semibold">
              Nom de l'organisation
              <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="organisation_name" required />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Description
              <textarea className="min-h-28 rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="organisation_description" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Categorie / type
                <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="organisation_category_type" placeholder="ONG, refuge, caritatif..." />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Site web optionnel
                <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="organisation_website" type="url" />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-semibold">
                Adresse
                <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="organisation_address" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Ville
                <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="organisation_city" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Pays
                <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="organisation_country" defaultValue="France" />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Documents officiels obligatoires
              <input
                className="rounded-2xl border border-slate-300 px-4 py-3 font-normal"
                name="organisation_documents"
                type="file"
                multiple
                required
              />
            </label>
          </div>
        ) : null}

        {role === "benevole" ? (
          <div className="grid gap-5">
            <h2 className="text-xl font-black">Informations benevole</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-semibold">
                Prenom
                <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="first_name" required />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Nom
                <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="last_name" required />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Date de naissance
                <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="birth_date" type="date" />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Adresse / localisation
                <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="volunteer_address" />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Ville
                <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="volunteer_city" />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Competences, separees par des virgules
              <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="skills_text" placeholder="Logistique, accueil, animaux..." />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Centres d'interet
              <textarea className="min-h-24 rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="volunteer_interests" />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Disponibilites
              <textarea className="min-h-24 rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="volunteer_availability" />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Photo de profil optionnelle
              <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="profile_picture" type="file" accept="image/*" />
            </label>
          </div>
        ) : null}

        <button className="btn-primary" disabled={loading || role === "admin"} type="submit">
          {loading ? "Inscription..." : "Creer le compte"}
        </button>
        <p className="text-sm text-slate-600">
          Deja inscrit ? <Link className="font-bold text-brand-900" href="/login">Se connecter</Link>
        </p>
      </form>
    </section>
  );
}
