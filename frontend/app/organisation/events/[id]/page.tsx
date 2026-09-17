"use client";

import { EventWorkspace } from "@/components/events/EventWorkspace";

export default function OrganisationEventDetailsPage() {
  return <EventWorkspace backHref="/organisation/events" backLabel="Retour aux événements" mode="manage" />;
}
