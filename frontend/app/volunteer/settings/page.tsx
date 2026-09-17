"use client";

import Link from "next/link";
import { AdminPageHeader, GlassCard } from "@/components/admin";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function VolunteerSettingsPage() {
  return (
    <section>
      <AdminPageHeader
        kicker="Bénévole"
        title="Paramètres"
        subtitle="Apparence du compte et accès rapide à l'édition du profil."
      />
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <GlassCard className="glow-border">
          <h2 className="text-xl font-black">Apparence</h2>
          <p className="mt-2 text-sm text-slate-600">Passez du mode clair au mode sombre à tout moment.</p>
          <div className="mt-5">
            <ThemeToggle />
          </div>
        </GlassCard>
        <GlassCard>
          <h2 className="text-xl font-black">Profil</h2>
          <p className="mt-2 text-sm text-slate-600">Mettez à jour votre photo, vos compétences et vos disponibilités.</p>
          <Link href="/volunteer/profile/edit" className="btn-primary mt-5">
            Éditer mon profil
          </Link>
        </GlassCard>
      </div>
    </section>
  );
}
