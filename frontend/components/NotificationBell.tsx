"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { AppNotification, PaginatedResponse, User, unwrapResults } from "@/lib/api";
import { authedFetch, getCurrentUserFromStorage } from "@/lib/browser-api";
import { formatDate } from "@/lib/api";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const data = await authedFetch<PaginatedResponse<AppNotification> | AppNotification[]>("/notifications/");
      setItems(unwrapResults(data));
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    setUser(getCurrentUserFromStorage());
    load();
    const timer = window.setInterval(load, 25000);
    return () => window.clearInterval(timer);
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

  const unread = items.filter((item) => !item.read).length;

  async function markRead(id: number) {
    try {
      await authedFetch(`/notifications/${id}/lue/`, { method: "PATCH" });
      setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
    } catch {
      /* ignore */
    }
  }

  async function markAll() {
    try {
      await authedFetch("/notifications/tout-lire/", { method: "PATCH" });
      setItems((current) => current.map((item) => ({ ...item, read: true })));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-white/70 text-brand-700 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 ${
          unread ? "shadow-[0_0_22px_rgba(139,92,246,0.45)]" : "shadow-purple-500/10"
        }`}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className={`h-4 w-4 ${unread ? "animate-pulse" : ""}`} />
        {unread ? (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-r from-brand-500 to-cyan-400 px-1 text-[10px] font-black text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-3xl border border-white/40 bg-white/90 shadow-2xl shadow-purple-500/20 backdrop-blur-xl dark:bg-[#1a1033]/95">
          <div className="flex items-center justify-between border-b border-lilac/20 px-4 py-3">
            <p className="text-sm font-black">Notifications</p>
            {unread ? (
              <button type="button" className="text-xs font-bold text-brand-600" onClick={markAll}>
                Tout marquer lu
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">Aucune notification pour le moment.</p>
            ) : null}
            {items.slice(0, 12).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mb-1 w-full rounded-2xl px-3 py-3 text-left transition hover:bg-brand-50/80 ${item.read ? "opacity-70" : "bg-brand-50/50"}`}
                onClick={() => markRead(item.id)}
              >
                <p className="text-sm font-bold text-brand-900">{item.content}</p>
                <p className="mt-1 text-[11px] text-slate-500">{formatDate(item.created_at)}</p>
              </button>
            ))}
          </div>
          {user?.role === "benevole" ? (
            <Link href="/volunteer/rewards" className="block border-t border-lilac/20 px-4 py-3 text-center text-xs font-bold text-brand-600" onClick={() => setOpen(false)}>
              Voir badges et certificats
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
