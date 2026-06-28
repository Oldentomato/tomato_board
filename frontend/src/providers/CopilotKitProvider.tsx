"use client";

import { CopilotKit } from "@copilotkit/react-core/v2";

/**
 * CopilotKit v2 + AG-UI 프로토콜 기반 Provider.
 * 추후 HttpAgent 등 AG-UI 호환 에이전트를 runtime route에 연결하면
 * 동일한 Provider 구조로 백엔드를 교체할 수 있습니다.
 */
export function CopilotKitProvider({ children }: { children: React.ReactNode }) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit" agent="general">
      {children}
    </CopilotKit>
  );
}
