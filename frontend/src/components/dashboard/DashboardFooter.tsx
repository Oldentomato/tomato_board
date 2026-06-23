"use client";

import { useSkyTheme } from "@/components/dashboard/SkyThemeContext";
import { cn } from "@/lib/utils/cn";

export function DashboardFooter() {
  const theme = useSkyTheme();
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "mt-3 shrink-0 border-t pt-2.5 lg:mt-2",
        theme.sidebarBorder,
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center justify-between gap-1.5 text-[11px] sm:flex-row sm:text-xs",
          theme.faint,
        )}
      >
        <p className={cn("font-medium", theme.muted)}>Tomato Board</p>
        <p>© {year}</p>
      </div>
    </footer>
  );
}
