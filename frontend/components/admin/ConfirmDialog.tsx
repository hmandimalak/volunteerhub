"use client";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center px-4">
      <button type="button" className="absolute inset-0 bg-brand-900/30 backdrop-blur-sm" aria-label="Fermer" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-3xl border border-white/50 bg-white/90 p-6 shadow-2xl shadow-purple-500/20 backdrop-blur-xl dark:bg-[#1a1033]/95">
        <h3 className="text-xl font-black text-brand-900">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === "danger" ? "rounded-full bg-rose-500 px-5 py-3 font-bold text-white transition-all duration-300 hover:scale-105" : "btn-primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
