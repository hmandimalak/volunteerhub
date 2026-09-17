type Step = { id: string; label: string };

type StepIndicatorProps = {
  steps: Step[];
  current: number;
};

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  const progress = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;

  return (
    <div className="rounded-3xl border border-white/40 bg-white/70 p-5 shadow-xl shadow-purple-500/5 backdrop-blur-md">
      <div className="relative mb-5 h-2 overflow-hidden rounded-full bg-brand-50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 via-fuchsia-400 to-cyan-400 shadow-[0_0_16px_rgba(139,92,246,0.55)] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {steps.map((step, index) => {
          const active = index === current;
          const done = index < current;
          return (
            <div key={step.id} className="text-center">
              <div
                className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-black transition-all duration-300 ${
                  active
                    ? "scale-110 bg-gradient-to-br from-brand-500 to-cyan-400 text-white shadow-lg shadow-brand-500/40"
                    : done
                      ? "bg-mint text-emerald-900"
                      : "bg-white/80 text-slate-400 dark:bg-white/10"
                }`}
              >
                {index + 1}
              </div>
              <p className={`mt-2 text-xs font-bold ${active ? "text-brand-700 dark:text-lilac" : "text-slate-500"}`}>{step.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
