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
import { LayoutDashboard, LogOut, MessageSquare } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

function DashboardHeader() {
  const { user, logout, isLoggingOut } = useAuth();
  const { today } = useWeather();
  const pathname = usePathname();
  const theme = getSkyTheme(today?.icon);
  const mock = isMockMode();
  const isChatPage = pathname.startsWith("/dashboard/chat");

  return (
    <EnterAnimation variant="down" delay={0}>
      <header className="mb-4 flex shrink-0 items-center justify-between lg:mb-5">
      <div className="flex items-center gap-3">
        <h1 className={cn("text-2xl font-extrabold tracking-[0.08em]", theme.text)}>WORKSPACE</h1>
        {mock && (
          <span className={cn("text-xs font-medium", theme.faint)}>Mock</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {isChatPage ? (
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm transition hover:bg-black/5",
              theme.sidebarBorder,
              theme.muted,
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">대시보드</span>
          </Link>
        ) : (
          <Link
            href="/dashboard/chat"
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm transition hover:bg-black/5",
              theme.sidebarBorder,
              theme.muted,
            )}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">AI 채팅</span>
          </Link>
        )}
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
      <div className="relative flex min-h-screen flex-col overflow-x-hidden px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="mx-auto flex w-full max-w-screen-2xl min-h-0 flex-1 flex-col overflow-hidden">
          <DashboardHeader />
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
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
