"use client";

import { cn } from "@/lib/utils";

export function KeyboardHint({
  keys,
  className,
}: {
  keys: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md border border-line bg-surface px-1.5 text-[11px] font-medium tracking-wide text-muted",
        className
      )}
      aria-hidden="true"
    >
      {keys}
    </span>
  );
}
