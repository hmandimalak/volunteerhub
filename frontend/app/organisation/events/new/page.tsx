"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Event, EventCategory, PaginatedResponse, unwrapResults } from "@/lib/api";
import { authedFetch } from "@/lib/browser-api";
import { StatusMessage } from "@/components/StatusMessage";
import { RoleGate } from "@/components/RoleGate";

export default function NewEventPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authedFetch<PaginatedResponse<EventCategory> | EventCategory[]>("/categories-evenements/")
      .then((data) => setCategories(unwrapResults(data)))
      .catch(() => setCategories([]));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const category = form.get("category");
    const missionName = String(form.get("missionName") ?? "");
    const missionCapacity = Number(form.get("missionCapacity") ?? 1);

    try {
      const createdEvent = await authedFetch<Event>("/evenements/", {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          category: category ? Number(category) : null,
          starts_at: form.get("starts_at"),
          ends_at: form.get("ends_at"),
          address: form.get("address"),
          city: form.get("city"),
          country: form.get("country"),
          volunteers_needed: Number(form.get("volunteers_needed") ?? 0),
          status: form.get("status")
        })
      });

      if (missionName) {
        await authedFetch(`/evenements/${createdEvent.id}/missions/`, {
          method: "POST",
          body: JSON.stringify({
            name: missionName,
            description: form.get("missionDescription"),
            capacity: missionCapacity,
            starts_at: form.get("missionStartsAt") || form.get("starts_at"),
            ends_at: form.get("missionEndsAt") || form.get("ends_at"),
            status: "ouverte"
          })
        });
      }

      setMessage("Evenement cree avec succes.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <p className="font-bold text-brand-600">Organisation</p>
      <h1 className="mt-2 text-4xl font-black">Creer un evenement</h1>
      <p className="mt-3 text-slate-600">
        Ce formulaire envoie les donnees vers Django. Connectez-vous avec un compte organisation avant de l'utiliser.
      </p>
      <RoleGate allowedRoles={["organisation", "admin"]}>

      <div className="mt-6 grid gap-3">
        <StatusMessage message={message} tone="success" />
        <StatusMessage message={error} tone="error" />
      </div>

      <form onSubmit={handleSubmit} className="card mt-8 grid gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Titre
            <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="title" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Categorie
            <select className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="category">
              <option value="">Sans categorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-2 text-sm font-semibold">
          Description
          <textarea className="min-h-32 rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="description" />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Debut
            <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="starts_at" type="datetime-local" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Fin
            <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="ends_at" type="datetime-local" required />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold">
            Adresse
            <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="address" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Ville
            <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="city" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Pays
            <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="country" defaultValue="France" />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">
            Benevoles recherches
            <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="volunteers_needed" type="number" min="0" defaultValue="1" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Statut
            <select className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="status" defaultValue="publie">
              <option value="brouillon">Brouillon</option>
              <option value="publie">Publie</option>
            </select>
          </label>
        </div>

        <div className="rounded-3xl bg-slate-50 p-5">
          <h2 className="text-lg font-black">Premiere mission</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
              Nom de mission
              <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="missionName" />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Places
              <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="missionCapacity" type="number" min="1" defaultValue="1" />
            </label>
          </div>
          <label className="mt-4 grid gap-2 text-sm font-semibold">
            Description mission
            <textarea className="min-h-24 rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="missionDescription" />
          </label>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
              Debut mission
              <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="missionStartsAt" type="datetime-local" />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Fin mission
              <input className="rounded-2xl border border-slate-300 px-4 py-3 font-normal" name="missionEndsAt" type="datetime-local" />
            </label>
          </div>
        </div>

        <button className="btn-primary" disabled={loading} type="submit">
          {loading ? "Creation..." : "Creer l'evenement"}
        </button>
      </form>
      </RoleGate>
    </section>
  );
}
