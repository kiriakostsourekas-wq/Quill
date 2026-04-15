import { cn } from "@/lib/utils";

const styles = {
  linkedin: "bg-[#E8F1FC] text-[#0A66C2] dark:bg-[#0A66C2]/15 dark:text-[#7AB0F0]",
  twitter: "bg-black text-white dark:bg-white dark:text-slate-900",
  x: "bg-black text-white dark:bg-white dark:text-slate-900",
};

export function PlatformBadge({ platform }: { platform: string }) {
  const normalized = platform.toLowerCase();
  const label = normalized === "twitter" ? "X" : normalized === "linkedin" ? "in" : platform;

  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-semibold uppercase",
        styles[normalized as keyof typeof styles] ?? "bg-slate-100 text-slate-700 dark:bg-surface-soft dark:text-slate-200"
      )}
    >
      {label}
    </span>
  );
}
