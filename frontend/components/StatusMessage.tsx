type StatusMessageProps = {
  message: string;
  tone?: "info" | "success" | "warning" | "error";
};

const styles = {
  info: "border-lilac/40 bg-white/70 text-brand-900 dark:text-lilac",
  success: "border-mint/50 bg-emerald-50/80 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
  warning: "border-amber-200 bg-amber-50/80 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  error: "border-pink-200 bg-rose-50/80 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
};

export function StatusMessage({ message, tone = "info" }: StatusMessageProps) {
  if (!message) {
    return null;
  }

  return <p className={`rounded-3xl border p-4 text-sm font-semibold backdrop-blur ${styles[tone]}`}>{message}</p>;
}
