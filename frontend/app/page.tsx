import { Award, CalendarCheck, MapPin, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

const stats = [
  ["12k+", "benevoles actifs"],
  ["38k", "heures realisees"],
  ["840", "evenements publies"]
];

const features = [
  {
    icon: CalendarCheck,
    title: "Missions et planning",
    text: "Publiez des evenements, creez des missions et suivez les candidatures depuis un seul espace."
  },
  {
    icon: MapPin,
    title: "Recherche locale",
    text: "Les benevoles trouvent les opportunites proches d'eux par categorie, ville, date et competences."
  },
  {
    icon: Award,
    title: "Reconnaissance",
    text: "Badges, points, niveaux et certificats PDF valorisent l'engagement dans le temps."
  },
  {
    icon: ShieldCheck,
    title: "Moderation",
    text: "Validation des organisations, signalements et permissions par role protegent la plateforme."
  }
];

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-brand-100 px-4 py-2 text-sm font-bold text-brand-900">
            Plateforme web pour associations, ONG et organisateurs d'evenements
          </p>
          <h1 className="text-5xl font-black tracking-tight text-slate-950 md:text-6xl">
            Recrutez, organisez et valorisez vos benevoles.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            VolunteerHub centralise la decouverte des missions, les candidatures, la presence, les certificats et les
            statistiques d'impact pour reduire l'administratif et renforcer l'engagement.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/events" className="btn-primary">
              Je suis benevole
            </Link>
            <Link href="/organisation" className="btn-secondary">
              Je suis une organisation
            </Link>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-brand-50 to-white">
          <div className="flex items-center gap-3 text-brand-900">
            <Users className="h-8 w-8" />
            <span className="font-black">Impact en temps reel</span>
          </div>
          <div className="mt-8 grid gap-4">
            {stats.map(([value, label]) => (
              <div key={label} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-3xl font-black text-slate-950">{value}</div>
                <div className="text-sm font-semibold text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="card">
              <feature.icon className="h-8 w-8 text-brand-600" />
              <h2 className="mt-5 text-lg font-black">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
