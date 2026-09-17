import { Search } from "lucide-react";

type AdminSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function AdminSearch({ value, onChange, placeholder = "Rechercher..." }: AdminSearchProps) {
  return (
    <label className="flex min-w-[240px] flex-1 items-center gap-3 rounded-full border border-white/40 bg-white/70 px-4 py-3 shadow-lg shadow-purple-500/5 backdrop-blur-md">
      <Search className="h-5 w-5 text-brand-400" />
      <input
        className="w-full border-0 bg-transparent p-0 text-sm shadow-none outline-none focus:shadow-none"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
