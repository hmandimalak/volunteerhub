"use client";

import { CalendarDays, LayoutDashboard, Plus, QrCode, Trophy, Users } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";

const links = [
  { href: "/organisation", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/organisation/events", label: "Événements", icon: CalendarDays },
  { href: "/organisation/events/new", label: "Créer un événement", icon: Plus },
  { href: "/organisation/volunteers", label: "Candidatures", icon: Users },
  { href: "/organisation/attendance/scan", label: "Scanner QR", icon: QrCode },
  { href: "/organisation/rewards", label: "Récompenses", icon: Trophy },
];

export default function OrganisationLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell kicker="Espace organisation" title="Pilotage" links={links} allowedRoles={["organisation"]}>
      {children}
    </PortalShell>
  );
}
