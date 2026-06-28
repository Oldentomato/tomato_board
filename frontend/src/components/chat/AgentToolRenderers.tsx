"use client";

import { useDefaultRenderTool } from "@copilotkit/react-core/v2";

/**
 * CopilotKit 기본 도구 호출 렌더러 등록.
 * AG-UI 프로토콜로 수신한 tool call 이벤트를 상태 카드로 표시합니다.
 */
export function AgentToolRenderers() {
  useDefaultRenderTool();
  return null;
}
