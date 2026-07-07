"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { User } from "@/lib/api";
import { clearTokens, getCurrentUserFromStorage } from "@/lib/browser-api";

const roleNav: Record<User["role"], { href: string; label: string }[]> = {
  benevole: [
    { href: "/events", label: "Evenements" },
    { href: "/volunteer", label: "Benevole" },
    { href: "/volunteer/applications", label: "Mes candidatures" }
  ],
  organisation: [
    { href: "/events", label: "Evenements" },
    { href: "/organisation", label: "Organisation" },
    { href: "/organisation/events", label: "Mes evenements" },
    { href: "/organisation/volunteers", label: "Candidatures" },
    { href: "/organisation/events/new", label: "Creer evenement" },
  ],
  admin: [
    { href: "/admin", label: "Admin" },
    { href: "/admin/organisations", label: "Organisations" },
    { href: "/admin/events", label: "Events" },
    { href: "/admin/reports", label: "Reports" }
  ]
};

export function Header() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getCurrentUserFromStorage());
  }, []);

  function logout() {
    clearTokens();
    setUser(null);
    window.location.href = "/";
  }

  const navItems = user ? roleNav[user.role] : [{ href: "/events", label: "Evenements" }];

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-black text-brand-900">
          VolunteerHub
        </Link>
        <div className="hidden gap-6 text-sm font-semibold text-slate-600 md:flex">
          {navItems.map((item) => (
            <Link key={`${item.href}-${item.label}`} href={item.href} className="hover:text-brand-900">
              {item.label}
            </Link>
          ))}
        </div>
        {user ? (
          <button className="btn-secondary px-4 py-2 text-sm" onClick={logout} type="button">
            Deconnexion
          </button>
        ) : (
          <div className="flex gap-2">
            <Link href="/login" className="btn-secondary px-4 py-2 text-sm">
              Connexion
            </Link>
            <Link href="/register" className="btn-primary px-4 py-2 text-sm">
              Inscription
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
