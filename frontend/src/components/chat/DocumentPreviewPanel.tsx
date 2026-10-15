"use client";

import { useEffect, useState } from "react";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
import { chatUiTheme } from "@/lib/weather/skyTheme";
import { fetchDocumentBlob, fetchDocumentContent } from "@/lib/api/documents";
import type { DocumentPreviewPayload } from "@/lib/types/document";
import { FORMAT_LABELS, formatFileSize } from "@/lib/types/document";
import { cn } from "@/lib/utils/cn";

function formatLabel(format?: string) {
  if (!format) return "문서";
  return FORMAT_LABELS[format] ?? format.toUpperCase();
}

function parsePreviewPayload(result: string | undefined): DocumentPreviewPayload | null {
  if (!result?.trim()) return null;
  try {
    return JSON.parse(result) as DocumentPreviewPayload;
  } catch {
    return null;
  }
}

export function DocumentPreviewPanel({ payload }: { payload: DocumentPreviewPayload }) {
  const theme = chatUiTheme;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  const previewMode = payload.preview_mode ?? "extracted_text";
  const documentId = payload.document_id;
  const useOutput = payload.use_output ?? false;

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function loadPreview() {
      if (!documentId || payload.error) {
        setError(payload.error ?? "문서 정보를 불러올 수 없습니다.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setPdfUrl(null);
      setTextContent(null);

      try {
        if (previewMode === "pdf") {
          const { blob } = await fetchDocumentBlob(documentId, useOutput);
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setPdfUrl(objectUrl);
        } else if (previewMode === "text") {
          const { blob } = await fetchDocumentBlob(documentId, useOutput);
          if (cancelled) return;
          setTextContent(await blob.text());
        } else {
          const content = await fetchDocumentContent(documentId);
          if (cancelled) return;
          setTextContent(content.content);
        }
      } catch (exc) {
        if (!cancelled) {
          setError(exc instanceof Error ? exc.message : "문서 미리보기를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [documentId, payload.error, previewMode, useOutput]);

  if (payload.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        {payload.error}
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-transparent", theme.sidebarBorder)}>
      <div className={cn("flex items-center gap-2 border-b px-3 py-2", theme.sidebarBorder)}>
        <FileText className="h-4 w-4 shrink-0 text-[#E74C3C]" />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-semibold", theme.text)}>{payload.title ?? "문서"}</p>
          <p className={cn("text-[11px]", theme.muted)}>
            {formatLabel(payload.preview_format)}
            {payload.file_size ? ` · ${formatFileSize(payload.file_size)}` : ""}
          </p>
        </div>
      </div>

      {loading && (
        <div className={cn("flex items-center justify-center gap-2 px-3 py-10 text-xs", theme.muted)}>
          <Loader2 className="h-4 w-4 animate-spin" />
          문서 불러오는 중…
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-2 px-3 py-4 text-xs text-red-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && pdfUrl && (
        <iframe
          title={payload.title ?? "문서 미리보기"}
          src={pdfUrl}
          className="h-[min(70vh,560px)] w-full border-0 bg-white"
        />
      )}

      {!loading && !error && textContent !== null && (
        <pre
          className={cn(
            "max-h-[min(70vh,560px)] overflow-auto whitespace-pre-wrap break-words px-3 py-3 text-xs leading-relaxed",
            theme.text,
          )}
        >
          {textContent}
        </pre>
      )}
    </div>
  );
}

export function DocumentPreviewToolCard({
  status,
  result,
}: {
  status: string;
  result?: string;
}) {
  const theme = chatUiTheme;

  if (status !== "complete") {
    return (
      <div className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-xs", theme.sidebarBorder)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" />
        <span className={theme.muted}>문서 미리보기 준비 중…</span>
      </div>
    );
  }

  const payload = parsePreviewPayload(result);
  if (!payload?.document_id) {
    return (
      <div className={cn("rounded-xl border px-3 py-2 text-xs text-red-600", theme.sidebarBorder)}>
        문서 미리보기 정보를 해석할 수 없습니다.
      </div>
    );
  }

  return <DocumentPreviewPanel payload={payload} />;
}
