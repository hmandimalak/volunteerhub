import { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "lilac" | "cyan" | "pink" | "mint";
};

const tones = {
  lilac: "from-violet-400/25 to-fuchsia-200/20 text-brand-700",
  cyan: "from-cyan-300/30 to-sky-100/40 text-cyan-700",
  pink: "from-pink-300/30 to-rose-100/40 text-rose-600",
  mint: "from-emerald-300/30 to-teal-100/40 text-emerald-700",
};

export function StatCard({ label, value, hint, icon: Icon, tone = "lilac" }: StatCardProps) {
  return (
    <article className="glow-border rounded-3xl border border-white/40 bg-white/70 p-5 shadow-xl shadow-purple-500/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-cyan-400/20">
      <div className={`inline-flex rounded-2xl bg-gradient-to-br p-3 ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-brand-900">{value}</p>
      {hint ? <p className="mt-1 text-xs font-semibold text-slate-400">{hint}</p> : null}
    </article>
  );
}
