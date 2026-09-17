import { ReactNode } from "react";
import { EmptyState } from "./EmptyState";

type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

type AdminTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function AdminTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyTitle = "Aucun résultat",
  emptyDescription = "Essayez un autre filtre ou une autre recherche.",
}: AdminTableProps<T>) {
  if (loading) {
    return <p className="px-6 py-10 text-sm font-semibold text-slate-500">Chargement...</p>;
  }

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={`px-5 py-3 font-bold text-slate-400 ${column.className ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-t border-lilac/20 transition-colors duration-300 hover:bg-brand-50/50">
              {columns.map((column) => (
                <td key={column.key} className={`px-5 py-4 align-middle ${column.className ?? ""}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
