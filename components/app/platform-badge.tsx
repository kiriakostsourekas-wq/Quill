import { cn } from "@/lib/utils";

const styles = {
  linkedin: "bg-[#E8F1FC] text-[#0A66C2]",
  twitter: "bg-black text-white",
  x: "bg-black text-white",
};

export function PlatformBadge({ platform }: { platform: string }) {
  const normalized = platform.toLowerCase();
  const label = normalized === "twitter" ? "X" : normalized === "linkedin" ? "in" : platform;

  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-semibold uppercase",
        styles[normalized as keyof typeof styles] ?? "bg-slate-100 text-slate-700"
      )}
    >
      {label}
    </span>
  );
}
