import { Award, CalendarCheck, MapPin, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { HomeRecommendations } from "@/components/HomeRecommendations";
import { HomeStats } from "@/components/HomeStats";

const features = [
  {
    icon: CalendarCheck,
    title: "Missions et planning",
    text: "Publiez des événements, créez des missions et suivez les candidatures depuis un seul espace.",
  },
  {
    icon: MapPin,
    title: "Recherche locale",
    text: "Les bénévoles trouvent les opportunités proches d'eux par catégorie, ville, date et compétences.",
  },
  {
    icon: Award,
    title: "Reconnaissance",
    text: "Badges, points, niveaux et certificats PDF valorisent l'engagement dans le temps.",
  },
  {
    icon: ShieldCheck,
    title: "Modération",
    text: "Validation des organisations, signalements et permissions par rôle protègent la plateforme.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="kicker mb-5">Plateforme web pour associations, ONG et organisateurs d'événements</p>
          <h1 className="text-5xl font-black tracking-tight text-brand-900 md:text-6xl">
            Recrutez, organisez et valorisez vos bénévoles.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            VolunteerHub centralise la découverte des missions, les candidatures, la présence, les certificats et les
            statistiques d'impact pour réduire l'administratif et renforcer l'engagement.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/events" className="btn-primary">
              Je suis bénévole
            </Link>
            <Link href="/organisation" className="btn-secondary">
              Je suis une organisation
            </Link>
          </div>
        </div>
        <div className="card glow-ring">
          <div className="flex items-center gap-3 text-brand-900">
            <Users className="h-8 w-8 text-brand-600" />
            <span className="font-black">Impact en temps réel</span>
          </div>
          <HomeStats />
        </div>
      </section>

      <HomeRecommendations />

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
