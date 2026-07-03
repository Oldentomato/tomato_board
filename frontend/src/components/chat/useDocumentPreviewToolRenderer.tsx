"use client";

import { z } from "zod";
import { useRenderTool } from "@copilotkit/react-core/v2";
import { DocumentPreviewToolCard } from "@/components/chat/DocumentPreviewPanel";

const previewDocumentParams = z.object({
  document_id: z.string(),
});

export function useDocumentPreviewToolRenderer() {
  useRenderTool(
    {
      name: "preview_document",
      parameters: previewDocumentParams,
      render: ({ status, result }) => (
        <DocumentPreviewToolCard status={status} result={result} />
      ),
    },
    [],
  );
}
