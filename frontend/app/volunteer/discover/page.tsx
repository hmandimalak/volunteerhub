"use client";

import { EventsBrowser } from "@/components/EventsBrowser";
import { getEvents } from "@/lib/api";
import { useEffect, useState, Suspense } from "react";
import { Event } from "@/lib/api";
import { useSearchParams } from "next/navigation";

function VolunteerDiscoverContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q") ?? "";
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getEvents({ status: "publie", search: initialSearch || undefined })
      .then(setEvents)
      .catch((err) => setError(err instanceof Error ? err.message : "Impossible de charger les événements."));
  }, [initialSearch]);

  return (
    <section>
      <EventsBrowser initialEvents={events} initialError={error} initialSearch={initialSearch} />
    </section>
  );
}

export default function VolunteerDiscoverPage() {
  return (
    <Suspense fallback={<p className="text-slate-600">Chargement des missions...</p>}>
      <VolunteerDiscoverContent />
    </Suspense>
  );
}
