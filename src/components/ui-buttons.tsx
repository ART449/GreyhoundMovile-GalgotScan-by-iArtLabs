import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

const base =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 font-display text-[15px] font-semibold tracking-[0.12em] uppercase transition-transform duration-150 ease-out active:not-disabled:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-40";

export function PrimaryButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, "bg-crimson text-fg shadow-[var(--shadow-border)]", className)}
      {...props}
    />
  );
}

export function SecondaryButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, "bg-surface text-fg shadow-[var(--shadow-border)]", className)}
      {...props}
    />
  );
}

export function DangerButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, "bg-bad text-fg", className)}
      {...props}
    />
  );
}
