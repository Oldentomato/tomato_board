"use client";

import { cn } from "@/lib/utils/cn";
import type { SkyTheme } from "@/lib/weather/skyTheme";

type SkyBackgroundProps = {
  theme: SkyTheme;
  className?: string;
};

export function SkyBackground({ theme, className }: SkyBackgroundProps) {
  return (
    <div className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden sky-enter", className)}>
      <div
        className="absolute inset-0 transition-all duration-700 ease-out"
        style={{ background: theme.gradient }}
      />
      {theme.glow && (
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ background: theme.glow }}
        />
      )}

      <div
        className="sky-cloud sky-cloud-1"
        style={{ opacity: theme.cloudOpacity }}
      />
      <div
        className="sky-cloud sky-cloud-2"
        style={{ opacity: theme.cloudOpacity * 0.85 }}
      />
      <div
        className="sky-cloud sky-cloud-3"
        style={{ opacity: theme.cloudOpacity * 0.65 }}
      />

      {theme.rain && <div className="sky-rain" aria-hidden="true" />}
      {theme.snow && <div className="sky-snow" aria-hidden="true" />}
    </div>
  );
}
