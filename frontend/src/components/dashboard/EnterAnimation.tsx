"use client";

import { cn } from "@/lib/utils/cn";

type EnterVariant = "up" | "down" | "left" | "right" | "fade" | "unfold";

type EnterAnimationProps = {
  children: React.ReactNode;
  variant?: EnterVariant;
  delay?: number;
  className?: string;
};

export function EnterAnimation({
  children,
  variant = "up",
  delay = 0,
  className,
}: EnterAnimationProps) {
  return (
    <div
      className={cn("enter-animate", `enter-${variant}`, className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
