"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { MissionRecommendation, formatDate, getFeaturedRecommendations } from "@/lib/api";
import { authedFetch, getCurrentUserFromStorage } from "@/lib/browser-api";

export function HomeRecommendations() {
  const [recommendations, setRecommendations] = useState<MissionRecommendation[]>([]);

  useEffect(() => {
    const user = getCurrentUserFromStorage();
    if (user?.role === "benevole") {
      authedFetch<MissionRecommendation[]>("/recommendations/missions/?limit=3")
        .then(setRecommendations)
        .catch(() => setRecommendations([]));
      return;
    }
    getFeaturedRecommendations(3)
      .then(setRecommendations)
      .catch(() => setRecommendations([]));
  }, []);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-6 pb-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="kicker">Recommandé pour vous</p>
          <h2 className="mt-3 text-3xl font-black">Missions qui pourraient vous plaire</h2>
        </div>
        <Link href="/events" className="btn-secondary px-4 py-2 text-sm">
          Voir tous les événements
        </Link>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {recommendations.map((item) => (
          <article key={item.mission.id} className="card">
            <h3 className="text-lg font-black">{item.mission.name}</h3>
            <p className="mt-1 text-sm font-semibold text-brand-700">{item.event.title}</p>
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <MapPin className="h-4 w-4" />
              {item.event.city || "Lieu à confirmer"} - {formatDate(item.mission.starts_at)}
            </p>
            {item.score > 0 ? (
              <span className="mt-4 inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">
                {item.score} % compatible
              </span>
            ) : null}
            <p className="mt-3 text-sm text-slate-600">{item.reasons.join(" · ")}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
