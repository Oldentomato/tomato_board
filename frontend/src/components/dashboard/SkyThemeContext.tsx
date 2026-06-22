"use client";

import { createContext, useContext } from "react";
import type { SkyTheme } from "@/lib/weather/skyTheme";
import { getSkyTheme } from "@/lib/weather/skyTheme";

const SkyThemeContext = createContext<SkyTheme>(getSkyTheme());

export function SkyThemeProvider({
  icon,
  children,
}: {
  icon?: string;
  children: React.ReactNode;
}) {
  const theme = getSkyTheme(icon);
  return (
    <SkyThemeContext.Provider value={theme}>{children}</SkyThemeContext.Provider>
  );
}

export function useSkyTheme() {
  return useContext(SkyThemeContext);
}
