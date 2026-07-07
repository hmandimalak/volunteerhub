type StatusMessageProps = {
  message: string;
  tone?: "info" | "success" | "warning" | "error";
};

const styles = {
  info: "border-slate-200 bg-slate-50 text-slate-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-red-200 bg-red-50 text-red-700"
};

export function StatusMessage({ message, tone = "info" }: StatusMessageProps) {
  if (!message) {
    return null;
  }

  return <p className={`rounded-3xl border p-4 text-sm font-semibold ${styles[tone]}`}>{message}</p>;
}
