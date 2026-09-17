import { LucideIcon } from "lucide-react";

export type AdminTab = {
  id: string;
  label: string;
  count?: number;
  icon?: LucideIcon;
};

type AdminTabsProps = {
  tabs: AdminTab[];
  value: string;
  onChange: (id: string) => void;
};

export function AdminTabs({ tabs, value, onChange }: AdminTabsProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-full border border-white/40 bg-white/55 p-1.5 backdrop-blur-md">
      {tabs.map((tab) => {
        const active = tab.id === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all duration-300 ${
              active
                ? "bg-gradient-to-r from-brand-500 via-lilac to-cyan-400 text-white shadow-[0_0_22px_rgba(139,92,246,0.4)]"
                : "text-slate-600 hover:-translate-y-0.5 hover:bg-white/80 hover:text-brand-700"
            }`}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/25" : "bg-brand-50 text-brand-700"}`}>
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
