import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
  BuiltInAgent,
} from "@copilotkit/runtime/v2";
import type { NextRequest } from "next/server";

/**
 * CopilotKit runtime — AG-UI 프로토콜 기반.
 *
 * 현재: BuiltInAgent (OpenAI) 스텁. OPENAI_API_KEY 설정 시 실제 응답 가능.
 * 추후: HttpAgent({ url: "..." }) 로 AG-UI 백엔드(FastAPI 등) 교체 예정.
 *
 * @example
 * import { HttpAgent } from "@ag-ui/client";
 * agents: { default: new HttpAgent({ url: process.env.AG_UI_AGENT_URL }) }
 */
const runtime = new CopilotRuntime({
  agents: {
    default: new BuiltInAgent({
      model: "openai:gpt-4o-mini",
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
