import { cn } from "@/lib/utils";

const badgeStyles: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  scheduled: "bg-brand-light text-brand dark:bg-brand-light/70 dark:text-white",
  publishing: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  draft: "bg-slate-100 text-slate-600 dark:bg-surface-soft dark:text-slate-300",
  failed: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
  free: "bg-slate-100 text-slate-700 dark:bg-surface-soft dark:text-slate-200",
  beta: "bg-brand-light text-brand dark:bg-brand-light/70 dark:text-white",
  solo: "bg-brand-light text-brand dark:bg-brand-light/70 dark:text-white",
  pro: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  admin: "bg-brand-light text-brand dark:bg-brand-light/70 dark:text-white",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        badgeStyles[value] ?? "bg-slate-100 text-slate-700 dark:bg-surface-soft dark:text-slate-200"
      )}
    >
      {value}
    </span>
  );
}
