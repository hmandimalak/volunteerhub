"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, LucideIcon, Menu, X } from "lucide-react";
import { ReactNode, useEffect, useState } from "react";
import { RoleGate } from "@/components/RoleGate";
import { User } from "@/lib/api";

export type PortalLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: string[];
};

type PortalShellProps = {
  kicker: string;
  title: string;
  links: PortalLink[];
  allowedRoles: User["role"][];
  children: ReactNode;
};

function isPortalLinkActive(pathname: string, link: PortalLink, links: PortalLink[]) {
  const { href, match = [] } = link;
  if (match.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true;
  }
  const moreSpecific = links.some(
    (other) => other.href !== href && other.href.startsWith(`${href}/`) && pathname.startsWith(other.href)
  );
  if (pathname === href) {
    return true;
  }
  if (href === "/volunteer" || href === "/organisation" || href === "/admin" || moreSpecific) {
    return false;
  }
  return pathname.startsWith(href);
}

export function PortalShell({ kicker, title, links, allowedRoles, children }: PortalShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("volunteerhub.portalSidebarCollapsed") === "true");
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapse() {
    setCollapsed((value) => {
      window.localStorage.setItem("volunteerhub.portalSidebarCollapsed", String(!value));
      return !value;
    });
  }

  function renderNav(onNavigate?: () => void, compact = false) {
    return (
      <nav className="mt-4 grid gap-1">
        {links.map((link) => {
          const active = isPortalLinkActive(pathname, link, links);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              title={link.label}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-full px-3 py-3 text-sm font-bold transition-all duration-300 ${
                compact ? "justify-center px-2" : ""
              } ${
                active
                  ? "bg-gradient-to-r from-brand-500 via-lilac to-cyan-400 text-white shadow-[0_0_24px_rgba(139,92,246,0.45)]"
                  : "text-slate-600 hover:-translate-y-0.5 hover:bg-white dark:hover:bg-white/10"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {compact ? null : <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <RoleGate allowedRoles={allowedRoles}>
      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-8 md:px-6">
        <aside className={`hidden shrink-0 lg:block ${collapsed ? "w-[4.75rem]" : "w-64"}`}>
          <div className="sticky top-24 rounded-3xl border border-white/40 bg-white/70 p-4 shadow-xl shadow-purple-500/5 backdrop-blur-md">
            {collapsed ? (
              <p className="px-1 text-center text-[10px] font-black uppercase tracking-wide text-brand-400">{kicker}</p>
            ) : (
              <>
                <p className="px-2 text-xs font-bold uppercase tracking-wide text-brand-400">{kicker}</p>
                <p className="mt-1 px-2 text-sm font-black text-brand-900">{title}</p>
              </>
            )}
            {renderNav(undefined, collapsed)}
            <button
              type="button"
              onClick={toggleCollapse}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-white/50 bg-white/80 px-3 py-2 text-xs font-bold text-brand-600 transition hover:-translate-y-0.5"
              aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
            >
              {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
              {collapsed ? null : "Replier"}
            </button>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-2 text-sm font-bold text-brand-700 backdrop-blur-md lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" /> Menu
          </button>
          {children}
        </div>
      </div>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-brand-900/30 backdrop-blur-sm" aria-label="Fermer le menu" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-80 max-w-[86vw] border-r border-white/40 bg-white/85 p-5 shadow-2xl backdrop-blur-xl dark:bg-[#1a1033]/95">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-400">{kicker}</p>
                <p className="text-sm font-black text-brand-900">{title}</p>
              </div>
              <button type="button" className="btn-secondary px-3 py-2" onClick={() => setMobileOpen(false)} aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
            </div>
            {renderNav(() => setMobileOpen(false))}
          </aside>
        </div>
      ) : null}
    </RoleGate>
  );
}
