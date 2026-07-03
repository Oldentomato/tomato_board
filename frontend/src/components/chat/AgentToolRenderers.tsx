"use client";

import { useDefaultRenderTool } from "@copilotkit/react-core/v2";
import { useDocumentPreviewToolRenderer } from "@/components/chat/useDocumentPreviewToolRenderer";

/**
 * CopilotKit 도구 호출 UI.
 * preview_document는 문서 미리보기 패널, 나머지는 기본 카드로 표시합니다.
 */
export function AgentToolRenderers() {
  useDocumentPreviewToolRenderer();
  useDefaultRenderTool();
  return null;
}
