import { LucideIcon, Sparkles } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
};

export function EmptyState({ title, description, icon: Icon = Sparkles }: EmptyStateProps) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-100 to-cyan-100 text-brand-600">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-black text-brand-900">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}
