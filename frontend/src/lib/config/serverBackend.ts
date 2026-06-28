import { API_BASE_URL } from "@/lib/config/api";

/**
 * Next.js 서버(Route Handler, SSR)에서 FastAPI 백엔드에 접속할 때 쓰는 base URL.
 *
 * 브라우저는 같은 origin의 /api/* 를 호출하지만,
 * /copilotkit Route Handler는 Node.js 프로세스 안에서 직접 백엔드 AG-UI를 fetch 합니다.
 * 컨테이너 안에서 localhost:8080 은 백엔드가 아니므로 ECONNREFUSED 가 납니다.
 */
export function getServerBackendBaseUrl(): string {
  const fromEnv =
    process.env.API_PROXY_TARGET?.trim() ||
    process.env.BACKEND_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();

  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    return API_BASE_URL.replace(/\/$/, "");
  }

  return "http://localhost:8080";
}

export function getAgUiAgentUrl(agentId = "general"): string {
  return `${getServerBackendBaseUrl()}/api/agui/${agentId}`;
}
