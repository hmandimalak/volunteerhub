import { getEvents } from "@/lib/api";
import { EventsBrowser } from "@/components/EventsBrowser";

async function loadEvents() {
  try {
    return { events: await getEvents({ status: "publie" }) };
  } catch (error) {
    return {
      events: [],
      error: error instanceof Error ? error.message : "Impossible de charger les événements.",
    };
  }
}

export default async function EventsPage() {
  const { events, error } = await loadEvents();

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <EventsBrowser initialEvents={events} initialError={error} />
    </section>
  );
}
