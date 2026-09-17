"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { User } from "@/lib/api";
import { getCurrentUserFromStorage } from "@/lib/browser-api";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AvatarMenu } from "@/components/AvatarMenu";
import { NotificationBell } from "@/components/NotificationBell";

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setUser(getCurrentUserFromStorage());
  }, []);

  const logoHref = user?.role === "benevole" ? "/volunteer" : user?.role === "organisation" ? "/organisation" : user?.role === "admin" ? "/admin" : "/";

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    const encoded = value ? `?q=${encodeURIComponent(value)}` : "";
    if (user?.role === "benevole") {
      router.push(`/volunteer/discover${encoded}`);
      return;
    }
    if (user?.role === "organisation") {
      router.push("/organisation/events");
      return;
    }
    if (user?.role === "admin") {
      router.push("/admin/events");
      return;
    }
    router.push(`/events${encoded}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/55 backdrop-blur-xl dark:border-white/10 dark:bg-[#1a1033]/70">
      <nav className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
        <Link href={logoHref} className="group inline-flex shrink-0 items-center gap-2 text-xl font-black text-brand-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-glow text-white shadow-lg shadow-brand-500/30 transition-transform duration-300 group-hover:scale-110">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">VolunteerHub</span>
        </Link>
        {user ? (
          <>
            <form onSubmit={onSearch} className="mx-auto min-w-0 flex-1">
              <label className="relative mx-auto block max-w-xl">
                <span className="sr-only">Rechercher</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher une mission..."
                  className="w-full rounded-full border border-white/50 bg-white/70 py-2.5 pl-11 pr-4 text-sm font-semibold shadow-inner outline-none backdrop-blur-md placeholder:text-slate-400"
                />
              </label>
            </form>
            <div className="ml-auto flex items-center gap-2">
              <NotificationBell />
              <AvatarMenu />
            </div>
          </>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
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
