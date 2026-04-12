import { cn } from "@/lib/utils";

const badgeStyles: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700",
  scheduled: "bg-brand-light text-brand",
  publishing: "bg-amber-50 text-amber-700",
  draft: "bg-slate-100 text-slate-600",
  failed: "bg-red-50 text-red-600",
  free: "bg-slate-100 text-slate-700",
  solo: "bg-brand-light text-brand",
  pro: "bg-emerald-50 text-emerald-700",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        badgeStyles[value] ?? "bg-slate-100 text-slate-700"
      )}
    >
      {value}
    </span>
  );
}
