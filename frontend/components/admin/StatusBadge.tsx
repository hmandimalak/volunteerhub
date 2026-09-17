type StatusBadgeProps = {
  label: string;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
};

const tones = {
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-400/20 dark:text-amber-200",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  info: "bg-cyan-100 text-cyan-800 dark:bg-cyan-400/20 dark:text-cyan-200",
  neutral: "bg-violet-100 text-brand-800 dark:bg-violet-500/20 dark:text-lilac",
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${tones[tone]}`}>{label}</span>;
}
