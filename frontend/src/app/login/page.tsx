"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { WorkspaceIcon } from "@/components/brand/WorkspaceIcon";
import { useAuth } from "@/hooks/useAuth";
import { consumeReloginMessage } from "@/lib/api/authRedirect";
import { isMockMode } from "@/lib/config/env";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const mock = isMockMode();
  const [reloginMessage] = useState(() => consumeReloginMessage());

  useEffect(() => {
    if (!isLoading && isAuthenticated && !reloginMessage) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router, reloginMessage]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E74C3C] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-800">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 ring-1 ring-sky-500/15">
            <WorkspaceIcon className="h-9 w-9" />
          </div>
          <h1 className="text-2xl font-bold">Tomato Board</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {mock ? (
              <>
                Mock 모드입니다.
                <br />
                로그인 없이 대시보드 UI를 미리볼 수 있습니다.
              </>
            ) : (
              <>
                Google 계정으로 로그인하고
                <br />
                날씨, 메일, 캘린더를 한눈에 확인하세요.
              </>
            )}
          </p>
        </div>
        {reloginMessage && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-center text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {reloginMessage}
          </p>
        )}
        <GoogleLoginButton />
      </div>
    </div>
  );
}
