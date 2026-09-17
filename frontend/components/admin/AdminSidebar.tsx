"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, CalendarDays, LayoutDashboard, Sparkles } from "lucide-react";

const links = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/organisations", label: "Organisations", icon: Building2 },
  { href: "/admin/events", label: "Événements", icon: CalendarDays },
  { href: "/admin/reports", label: "Rapports", icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-24 rounded-3xl border border-white/40 bg-white/70 p-4 shadow-xl shadow-purple-500/5 backdrop-blur-md">
        <div className="mb-4 flex items-center gap-2 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-400 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-400">Espace admin</p>
            <p className="text-sm font-black text-brand-900">Pilotage</p>
          </div>
        </div>
        <nav className="grid gap-1">
          {links.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-full px-3 py-3 text-sm font-bold transition-all duration-300 ${
                  active
                    ? "bg-gradient-to-r from-brand-500 via-lilac to-cyan-400 text-white shadow-[0_0_22px_rgba(139,92,246,0.4)]"
                    : "text-slate-600 hover:-translate-y-0.5 hover:bg-white dark:hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
