import type { DocumentPreviewPayload } from "@/lib/types/document";

export function parsePreviewDocumentToolOutput(
  output: string | null | undefined,
): DocumentPreviewPayload | null {
  if (!output?.trim()) return null;
  try {
    const data = JSON.parse(output) as DocumentPreviewPayload;
    if (!data.document_id) return null;
    return data;
  } catch {
    return null;
  }
}
