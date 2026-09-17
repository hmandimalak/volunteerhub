"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, Volunteer } from "@/lib/api";
import { authedFetch, getCurrentUserFromStorage } from "@/lib/browser-api";
import { AdminPageHeader, GlassCard } from "@/components/admin";
import { StatusMessage } from "@/components/StatusMessage";

export function VolunteerProfileHub() {
  const [profile, setProfile] = useState<Volunteer | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setUser(getCurrentUserFromStorage());
    authedFetch<User>("/users/me/")
      .then(setUser)
      .catch(() => undefined);
    authedFetch<Volunteer>("/benevoles/me/")
      .then(setProfile)
      .catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger le profil."));
  }, []);

  return (
    <section>
      <AdminPageHeader
        kicker="Mon profil"
        title="Informations personnelles"
        subtitle="Votre identité, vos compétences et vos disponibilités, visibles par les organisations."
        actions={
          <Link href="/volunteer/profile/edit" className="btn-primary">
            Éditer mon profil
          </Link>
        }
      />
      <div className="mt-6">
        <StatusMessage message={error} tone="error" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <GlassCard className="glow-border" hover={false}>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-cyan-400 text-lg font-black text-white">
              {profile?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center">
                  {(profile?.first_name?.[0] ?? "B").toUpperCase()}
                  {(profile?.last_name?.[0] ?? "").toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-black">Identité</h2>
              <p className="text-xs font-bold text-brand-500">Bénévole</p>
            </div>
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-slate-500">Nom</dt>
              <dd className="font-bold">{profile ? `${profile.first_name} ${profile.last_name}` : user?.username ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">E-mail</dt>
              <dd className="font-bold">{user?.email ?? profile?.user?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Téléphone</dt>
              <dd className="font-bold">{profile?.phone_number || user?.phone_number || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Ville</dt>
              <dd className="font-bold">{profile?.city || "—"}</dd>
            </div>
          </dl>
        </GlassCard>
        <GlassCard hover={false}>
          <h2 className="text-lg font-black">À propos</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">{profile?.bio || "Aucune biographie renseignée pour le moment."}</p>
          <p className="mt-4 text-sm">
            <strong>Centres d'intérêt :</strong> {profile?.interests || "—"}
          </p>
          <p className="mt-2 text-sm">
            <strong>Disponibilité :</strong> {profile?.availability_notes || "—"}
          </p>
          <p className="mt-2 text-sm">
            <strong>Points d'impact :</strong> {profile?.total_points ?? 0}
          </p>
          <p className="mt-2 text-sm">
            <strong>Contact d'urgence :</strong>{" "}
            {profile?.emergency_contact_name || profile?.emergency_contact_phone
              ? `${profile.emergency_contact_name || "—"} · ${profile.emergency_contact_phone || "—"}`
              : "—"}
          </p>
          {profile?.skills_summary?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.skills_summary.map((skill) => (
                <span key={skill.name} className="chip">
                  {skill.name}
                </span>
              ))}
            </div>
          ) : null}
        </GlassCard>
      </div>
    </section>
  );
}
