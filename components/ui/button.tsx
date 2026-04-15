import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-brand text-white hover:bg-brand/90",
        variant === "outline" &&
          "border border-brand/20 bg-surface text-brand hover:bg-brand-light dark:hover:bg-brand-light/30",
        variant === "ghost" &&
          "bg-transparent text-ink hover:bg-black/5 dark:hover:bg-white/5",
        variant === "danger" &&
          "bg-red-50 text-red-600 hover:bg-red-100 dark:border dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20",
        className
      )}
      {...props}
    />
  );
}
