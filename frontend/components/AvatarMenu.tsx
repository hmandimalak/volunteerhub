"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Award, LogOut, Settings, UserRound, ClipboardList } from "lucide-react";
import { User, Volunteer } from "@/lib/api";
import { authedFetch, clearTokens, getCurrentUserFromStorage } from "@/lib/browser-api";
import { labelRole } from "@/lib/labels";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AvatarMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const current = getCurrentUserFromStorage();
    setUser(current);
    if (current?.role === "benevole") {
      authedFetch<Volunteer>("/benevoles/me/")
        .then(setVolunteer)
        .catch(() => setVolunteer(null));
    }
  }, []);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) {
    return null;
  }

  const fullName =
    volunteer ? `${volunteer.first_name} ${volunteer.last_name}`.trim() : user.username || user.email;
  const photo = volunteer?.photo_url;
  const homeHref = user.role === "benevole" ? "/volunteer" : user.role === "organisation" ? "/organisation" : "/admin";

  function logout() {
    clearTokens();
    window.location.href = "/";
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/50 bg-gradient-to-br from-brand-500 to-cyan-400 text-sm font-black text-white shadow-lg shadow-brand-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:scale-105"
        aria-label="Ouvrir le menu du compte"
        aria-expanded={open}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={fullName} className="h-full w-full object-cover" />
        ) : (
          initials(fullName || "B")
        )}
      </button>
      {open ? (
        <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-3xl border border-white/40 bg-white/85 p-3 shadow-2xl shadow-purple-500/20 backdrop-blur-xl dark:bg-[#1a1033]/95">
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-brand-50/70 p-3 dark:bg-white/5">
            <div className="flex h-12 w-12 overflow-hidden rounded-full bg-gradient-to-br from-brand-500 to-cyan-400 text-sm font-black text-white">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center">{initials(fullName || "B")}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-black text-brand-900">{fullName}</p>
              <p className="text-xs font-bold text-brand-500">{labelRole(user.role)}</p>
            </div>
          </div>
          {user.role === "benevole" ? (
            <div className="grid gap-1">
              <Link href="/volunteer/profile" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold hover:bg-white dark:hover:bg-white/10" onClick={() => setOpen(false)}>
                <UserRound className="h-4 w-4" /> Mon Profil
              </Link>
              <Link href="/volunteer/applications" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold hover:bg-white dark:hover:bg-white/10" onClick={() => setOpen(false)}>
                <ClipboardList className="h-4 w-4" /> Mes candidatures
              </Link>
              <Link href="/volunteer/rewards" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold hover:bg-white dark:hover:bg-white/10" onClick={() => setOpen(false)}>
                <Award className="h-4 w-4" /> Mes Badges & Certificats
              </Link>
              <Link href="/volunteer/settings" className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold hover:bg-white dark:hover:bg-white/10" onClick={() => setOpen(false)}>
                <Settings className="h-4 w-4" /> Paramètres
              </Link>
            </div>
          ) : (
            <div className="grid gap-1">
              <Link href={homeHref} className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold hover:bg-white dark:hover:bg-white/10" onClick={() => setOpen(false)}>
                <UserRound className="h-4 w-4" /> {user.role === "admin" ? "Administration" : "Organisation"}
              </Link>
              <Link href={user.role === "admin" ? "/admin" : "/organisation"} className="flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold hover:bg-white dark:hover:bg-white/10" onClick={() => setOpen(false)}>
                <Settings className="h-4 w-4" /> Paramètres
              </Link>
            </div>
          )}
          <button type="button" className="mt-2 flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={logout}>
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      ) : null}
    </div>
  );
}
