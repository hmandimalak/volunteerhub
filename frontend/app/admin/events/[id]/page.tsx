"use client";

import { EventWorkspace } from "@/components/events/EventWorkspace";

export default function AdminEventDetailsPage() {
  return <EventWorkspace backHref="/admin/events" backLabel="Retour aux événements" mode="oversight" />;
}
