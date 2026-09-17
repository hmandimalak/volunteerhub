"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, CalendarDays, LayoutDashboard } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const mobileLinks = [
  { href: "/admin", label: "Aperçu", icon: LayoutDashboard },
  { href: "/admin/organisations", label: "Organisations", icon: Building2 },
  { href: "/admin/events", label: "Événements", icon: CalendarDays },
  { href: "/admin/reports", label: "Rapports", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-8 md:px-6">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {mobileLinks.map((link) => {
              const active = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-all duration-300 ${
                    active ? "bg-gradient-to-r from-brand-500 to-cyan-400 text-white" : "bg-white/70 text-slate-600"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
          {children}
        </div>
      </div>
    </RoleGate>
  );
}
