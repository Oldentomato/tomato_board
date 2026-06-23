"use client";

import { EnterAnimation } from "@/components/dashboard/EnterAnimation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { DashboardFooter } from "@/components/dashboard/DashboardFooter";
import { SkyBackground } from "@/components/dashboard/SkyBackground";
import { SkyThemeProvider } from "@/components/dashboard/SkyThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { useWeather } from "@/hooks/useWeather";
import { isMockMode } from "@/lib/config/env";
import { WeatherProvider } from "@/providers/WeatherProvider";
import { getSkyTheme } from "@/lib/weather/skyTheme";
import { cn } from "@/lib/utils/cn";
import { LogOut } from "lucide-react";
import Image from "next/image";

function DashboardHeader() {
  const { user, logout, isLoggingOut } = useAuth();
  const { today } = useWeather();
  const theme = getSkyTheme(today?.icon);
  const mock = isMockMode();

  return (
    <EnterAnimation variant="down" delay={0}>
      <header className="mb-4 flex shrink-0 items-center justify-between lg:mb-5">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🍅</span>
        <h1 className={cn("text-xl font-bold", theme.text)}>Tomato Board</h1>
        {mock && (
          <span className={cn("text-xs font-medium", theme.faint)}>Mock</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {user?.picture && (
          <Image
            src={user.picture}
            alt={user.name}
            width={36}
            height={36}
            className="rounded-full"
          />
        )}
        <span className={cn("hidden text-sm sm:block", theme.muted)}>{user?.name}</span>
        <button
          type="button"
          onClick={() => logout()}
          disabled={isLoggingOut}
          className={cn(
            "flex items-center gap-1.5 text-sm transition hover:opacity-70 disabled:opacity-40",
            theme.muted,
          )}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">로그아웃</span>
        </button>
      </div>
      </header>
    </EnterAnimation>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { today } = useWeather();
  const theme = getSkyTheme(today?.icon);

  return (
    <SkyThemeProvider icon={today?.icon}>
      <SkyBackground theme={theme} />
      <div className="relative flex min-h-screen flex-col px-4 py-4 sm:px-6 sm:py-5 lg:h-dvh lg:max-h-dvh lg:overflow-hidden lg:px-8">
        <div className="mx-auto flex w-full max-w-screen-2xl min-h-0 flex-1 flex-col">
          <DashboardHeader />
          <div className="min-h-0 flex-1">{children}</div>
          <DashboardFooter />
        </div>
      </div>
    </SkyThemeProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <WeatherProvider>
        <DashboardShell>{children}</DashboardShell>
      </WeatherProvider>
    </AuthGuard>
  );
}
