import { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
};

export function GlassCard({ children, className = "", hover = true, padding = true }: GlassCardProps) {
  return (
    <div
      className={`rounded-3xl border border-white/40 bg-white/70 shadow-xl shadow-purple-500/5 backdrop-blur-md ${
        padding ? "p-6" : ""
      } ${hover ? "transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-cyan-400/15" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
