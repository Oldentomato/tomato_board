import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";
import type { NextRequest } from "next/server";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/**
 * CopilotKit runtime — AG-UI 프로토콜로 FastAPI LangGraph 에이전트에 연결.
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
  basePath: "/api/copilotkit",
  mode: "single-route",
});

export async function POST(req: NextRequest) {
  return handler(req);
}
