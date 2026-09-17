"use client";

import { Award, ClipboardList, LayoutDashboard, Search, UserRound } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";

const links = [
  { href: "/volunteer", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/volunteer/discover", label: "Missions", icon: Search },
  { href: "/volunteer/applications", label: "Mes Candidatures", icon: ClipboardList },
  {
    href: "/volunteer/rewards",
    label: "Mes Badges & Certificats",
    icon: Award,
    match: ["/volunteer/badges", "/volunteer/certificates", "/benevole/certificats"],
  },
  { href: "/volunteer/profile", label: "Mon Profil", icon: UserRound, match: ["/volunteer/profile/edit", "/volunteer/settings"] },
];

export default function VolunteerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell kicker="Espace bénévole" title="Mon parcours" links={links} allowedRoles={["benevole"]}>
      {children}
    </PortalShell>
  );
}
