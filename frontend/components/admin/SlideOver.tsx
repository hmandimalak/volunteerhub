"use client";

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

type SlideOverProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function SlideOver({ open, title, subtitle, onClose, children, footer }: SlideOverProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-brand-900/25 backdrop-blur-sm" aria-label="Fermer" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-white/40 bg-white/90 shadow-2xl shadow-purple-500/20 backdrop-blur-xl dark:bg-[#1a1033]/95">
        <header className="flex items-start justify-between gap-4 border-b border-lilac/20 px-6 py-5">
          <div>
            <h2 className="text-2xl font-black text-brand-900">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" className="btn-secondary px-3 py-2" onClick={onClose} aria-label="Fermer le panneau">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {footer ? <footer className="border-t border-lilac/20 px-6 py-4">{footer}</footer> : null}
      </aside>
    </div>
  );
}
