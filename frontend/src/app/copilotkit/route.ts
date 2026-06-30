import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
  type CopilotRuntimeFetchHandler,
} from "@copilotkit/runtime/v2";
import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";
import type { NextRequest } from "next/server";
import { getAgUiAgentUrl } from "@/lib/config/serverBackend";

function createRuntimeHandler(cookieHeader: string): CopilotRuntimeFetchHandler {
  const backendHeaders: Record<string, string> = {};
  if (cookieHeader) {
    backendHeaders.Cookie = cookieHeader;
  }

  const runtime = new CopilotRuntime({
    agents: {
      general: new LangGraphHttpAgent({
        url: getAgUiAgentUrl("general"),
        headers: backendHeaders,
      }),
      debug: new LangGraphHttpAgent({
        url: getAgUiAgentUrl("debug"),
        headers: backendHeaders,
      }),
      document: new LangGraphHttpAgent({
        url: getAgUiAgentUrl("document"),
        headers: backendHeaders,
      }),
    },
  });

  return createCopilotRuntimeHandler({
    runtime,
    basePath: "/copilotkit",
    mode: "single-route",
  });
}

/**
 * CopilotKit runtime — AG-UI 프로토콜로 FastAPI LangGraph 에이전트에 연결.
 *
 * /api/copilotkit 이 아닌 /copilotkit 을 사용합니다.
 * 배포 시 ingress/nginx가 /api/* 를 FastAPI로 보내기 때문에,
 * Next.js Route Handler는 /api 밖 경로에 두어야 합니다.
 *
 * 브라우저 → /copilotkit 요청의 세션 쿠키를 백엔드 /api/agui/* 로 전달해야
 * GoogleAuthMiddleware 인증을 통과합니다.
 */
async function handle(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  return createRuntimeHandler(cookieHeader)(req);
}

export const GET = handle;
export const POST = handle;
