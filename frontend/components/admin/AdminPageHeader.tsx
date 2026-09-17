import { ReactNode } from "react";

type AdminPageHeaderProps = {
  kicker?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function AdminPageHeader({ kicker = "Administration", title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        <p className="kicker">{kicker}</p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-brand-900">{title}</h1>
        {subtitle ? <p className="mt-3 max-w-2xl text-slate-600">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
