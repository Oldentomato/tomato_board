import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
  type CopilotRuntimeFetchHandler,
} from "@copilotkit/runtime/v2";
import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";
import type { NextRequest } from "next/server";
import { getAgUiAgentUrl, getServerBackendBaseUrl } from "@/lib/config/serverBackend";

type RuntimeBundle = {
  backendBase: string;
  handler: CopilotRuntimeFetchHandler;
};

let cached: RuntimeBundle | null = null;

function getRuntimeHandler(): RuntimeBundle {
  const backendBase = getServerBackendBaseUrl();
  if (cached?.backendBase === backendBase) {
    return cached;
  }

  const runtime = new CopilotRuntime({
    agents: {
      general: new LangGraphHttpAgent({
        url: getAgUiAgentUrl("general"),
      }),
    },
  });

  cached = {
    backendBase,
    handler: createCopilotRuntimeHandler({
      runtime,
      basePath: "/copilotkit",
      mode: "single-route",
    }),
  };

  return cached;
}

/**
 * CopilotKit runtime — AG-UI 프로토콜로 FastAPI LangGraph 에이전트에 연결.
 *
 * /api/copilotkit 이 아닌 /copilotkit 을 사용합니다.
 * 배포 시 ingress/nginx가 /api/* 를 FastAPI로 보내기 때문에,
 * Next.js Route Handler는 /api 밖 경로에 두어야 합니다.
 */
async function handle(req: NextRequest) {
  return getRuntimeHandler().handler(req);
}

export const GET = handle;
export const POST = handle;
