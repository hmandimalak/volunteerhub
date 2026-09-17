"use client";

import { useEffect, useState } from "react";

type ToastState = { message: string; tone: "success" | "error" } | null;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);

  function showToast(message: string, tone: "success" | "error" = "success") {
    setToast({ message, tone });
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timeout);
  }, [toast]);

  return { toast, showToast };
}

export function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[70]">
      <p
        className={`rounded-full px-5 py-3 text-sm font-bold shadow-xl backdrop-blur-md ${
          toast.tone === "success" ? "bg-emerald-500/90 text-white" : "bg-rose-500/90 text-white"
        }`}
      >
        {toast.message}
      </p>
    </div>
  );
}
