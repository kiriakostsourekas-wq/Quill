import { cn } from "@/lib/utils";

const badgeStyles: Record<string, string> = {
  published:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300",
  scheduled: "border-line bg-surface-muted text-ink dark:text-slate-200",
  publishing:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300",
  draft: "border-line bg-surface-muted text-muted dark:text-slate-300",
  failed:
    "border-red-200 bg-red-50 text-red-600 dark:border-red-500/25 dark:bg-red-500/15 dark:text-red-300",
  free: "border-line bg-surface-muted text-ink dark:text-slate-200",
  beta: "border-line bg-surface-muted text-ink dark:text-slate-200",
  solo: "border-line bg-surface-muted text-ink dark:text-slate-200",
  pro:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300",
  admin: "border-line bg-surface-muted text-ink dark:text-slate-200",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
        badgeStyles[value] ??
          "border-line bg-surface-muted text-ink dark:text-slate-200"
      )}
    >
      {value}
    </span>
  );
}
