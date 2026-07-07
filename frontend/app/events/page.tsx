import { CalendarDays, MapPin, Search } from "lucide-react";
import { Event, formatDate, getEvents } from "@/lib/api";
import { ApplyButton } from "@/components/ApplyButton";

async function loadEvents(): Promise<{ events: Event[]; error?: string }> {
  try {
    return { events: await getEvents() };
  } catch (error) {
    return {
      events: [],
      error: error instanceof Error ? error.message : "Impossible de charger les evenements."
    };
  }
}

export default async function EventsPage() {
  const { events, error } = await loadEvents();

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="font-bold text-brand-600">Recherche de missions</p>
          <h1 className="mt-2 text-4xl font-black">Evenements ouverts aux benevoles</h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Ces evenements sont charges depuis l'API Django. Ajoutez des donnees dans l'admin Django pour les voir ici.
          </p>
        </div>
        <div className="flex min-w-[280px] items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3">
          <Search className="h-5 w-5 text-slate-400" />
          <span className="text-sm text-slate-500">Mot-cle, ville, association...</span>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {["Social", "Animaux", "Environnement", "Week-end", "Moins de 10 km"].map((filter) => (
          <button key={filter} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">
            {filter}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">
          API indisponible : {error}
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {events.map((event) => (
          <article key={event.id} className="card">
            <div className="mb-4 inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-900">
              {event.category_name ?? "Categorie"}
            </div>
            <h2 className="text-xl font-black">{event.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{event.description}</p>
            <div className="mt-5 space-y-2 text-sm font-semibold text-slate-500">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {event.city}
              </p>
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" /> {formatDate(event.starts_at)}
              </p>
            </div>
            {event.missions?.length ? (
              <div className="mt-6 space-y-3">
                {event.missions.map((mission) => (
                  <div key={mission.id} className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="font-black">{mission.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">{mission.remaining_places} places restantes</p>
                    <ApplyButton missionId={mission.id} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                Aucune mission publiee pour cet evenement.
              </p>
            )}
          </article>
        ))}
      </div>

      {!error && events.length === 0 ? (
        <div className="card mt-10 text-center">
          <h2 className="text-xl font-black">Aucun evenement pour le moment</h2>
          <p className="mt-2 text-slate-600">Cree un evenement dans Django Admin ou via l'API pour alimenter cette page.</p>
        </div>
      ) : null}
    </section>
  );
}
