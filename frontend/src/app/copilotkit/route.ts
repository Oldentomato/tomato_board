import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";
import type { NextRequest } from "next/server";

/**
 * 서버 런타임에서 백엔드 AG-UI에 접근할 URL.
 * 배포 환경에서는 클러스터 내부 주소(API_PROXY_TARGET)를 우선 사용합니다.
 */
const apiBase =
  process.env.API_PROXY_TARGET ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8080";

/**
 * CopilotKit runtime — AG-UI 프로토콜로 FastAPI LangGraph 에이전트에 연결.
 *
 * /api/copilotkit 이 아닌 /copilotkit 을 사용합니다.
 * 배포 시 ingress/nginx가 /api/* 를 FastAPI로 보내기 때문에,
 * Next.js Route Handler는 /api 밖 경로에 두어야 합니다.
 */
const runtime = new CopilotRuntime({
  agents: {
    general: new LangGraphHttpAgent({
      url: `${apiBase}/api/agui/general`,
    }),
  },
});

const handler = createCopilotRuntimeHandler({
  runtime,
  basePath: "/copilotkit",
  mode: "single-route",
});

async function handle(req: NextRequest) {
  return handler(req);
}

export const GET = handle;
export const POST = handle;
