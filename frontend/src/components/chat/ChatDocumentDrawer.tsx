"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useSkyTheme } from "@/components/dashboard/SkyThemeContext";
import { useDocuments } from "@/hooks/useDocuments";
import type { Document } from "@/lib/types/document";
import {
  DOCUMENT_STATUS_LABELS,
  FORMAT_LABELS,
  formatFileSize,
  getDocumentDownloadFilename,
} from "@/lib/types/document";
import { parseUtcIso } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/cn";

const ACCEPTED_TYPES = ".md,.txt,.markdown,.docx,.hwpx,.hwp";

function StatusBadge({ status }: { status: Document["status"] }) {
  const styles = {
    uploaded: "bg-blue-100 text-blue-700",
    converted: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
  } as const;

  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", styles[status])}>
      {DOCUMENT_STATUS_LABELS[status]}
    </span>
  );
}

function DocumentRow({
  doc,
  onDownload,
  onDelete,
  isDownloading,
  isDeleting,
}: {
  doc: Document;
  onDownload: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  isDownloading: boolean;
  isDeleting: boolean;
}) {
  const theme = useSkyTheme();
  const formatLabel = doc.outputFormat
    ? FORMAT_LABELS[doc.outputFormat] ?? doc.outputFormat
    : FORMAT_LABELS[doc.sourceFormat] ?? doc.sourceFormat;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-2.5 py-2.5 transition hover:bg-black/[0.02]",
        theme.sidebarBorder,
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E74C3C]/10">
        <FileText className="h-4 w-4 text-[#E74C3C]" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className={cn("truncate text-xs font-medium", theme.text)}>{doc.title}</p>
          <StatusBadge status={doc.status} />
        </div>
        <p className={cn("mt-0.5 truncate text-[11px]", theme.muted)}>
          {formatLabel} · {formatFileSize(doc.fileSize)}
        </p>
        <time className={cn("text-[10px]", theme.faint)}>
          {format(parseUtcIso(doc.createdAt), "M/d HH:mm", { locale: ko })}
        </time>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={() => onDownload(doc)}
          disabled={isDownloading}
          className={cn(
            "rounded-lg p-1.5 transition hover:bg-black/5 disabled:opacity-40",
            theme.muted,
          )}
          aria-label="다운로드"
          title="다운로드"
        >
          {isDownloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onDelete(doc)}
          disabled={isDeleting}
          className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50 disabled:opacity-40"
          aria-label="삭제"
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

export function ChatDocumentDrawer({
  open,
  onClose,
  className,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
}) {
  const theme = useSkyTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    documents,
    isLoading,
    isError,
    isUploading,
    refetch,
    uploadDocument,
    deleteDocument,
    downloadDocument,
  } = useDocuments();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await uploadDocument({ file });
    } finally {
      event.target.value = "";
    }
  };

  const handleDownload = async (doc: Document) => {
    const useOutput = doc.status === "converted";
    setDownloadingId(doc.id);
    try {
      await downloadDocument({
        documentId: doc.id,
        filename: getDocumentDownloadFilename(doc, useOutput),
        useOutput,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!window.confirm(`'${doc.title}' 문서를 삭제할까요?`)) return;
    setDeletingId(doc.id);
    try {
      await deleteDocument(doc.id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside
      className={cn(
        "shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
        open ? "w-80" : "w-0",
        className,
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          "flex h-full w-80 flex-col border-l shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.12)] transition-[transform,opacity] duration-300 ease-in-out",
          theme.sidebarBorder,
          "bg-white/80 backdrop-blur-xl",
          open ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-between border-b px-3 py-3",
            theme.sidebarBorder,
          )}
        >
          <div className="flex items-center gap-2">
            <FileText className={cn("h-4 w-4", theme.text)} />
            <h3 className={cn("text-sm font-semibold", theme.text)}>문서</h3>
            {documents.length > 0 && (
              <span className={cn("text-[11px]", theme.muted)}>{documents.length}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => refetch()}
              className={cn("rounded-lg p-1.5 transition hover:bg-black/5", theme.muted)}
              aria-label="새로고침"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className={cn("rounded-lg p-1.5 transition hover:bg-black/5", theme.muted)}
              aria-label="문서 패널 닫기"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="shrink-0 border-b px-3 py-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#E74C3C] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#c0392b] disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            문서 업로드
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={handleFileChange}
          />
          <p className={cn("mt-2 text-[11px] leading-relaxed", theme.muted)}>
            업로드한 문서는 문서 변환 에이전트로 Word/한글 파일로 변환할 수 있습니다.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 scrollbar-subtle">
          {isLoading &&
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className={cn("h-14 animate-pulse rounded-xl opacity-20", theme.text, "bg-current")}
              />
            ))}

          {isError && (
            <p className={cn("text-xs", theme.muted)}>문서 목록을 불러올 수 없습니다.</p>
          )}

          {!isLoading && !isError && documents.length === 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-[11px] transition hover:bg-black/[0.02]",
                theme.sidebarBorder,
                theme.muted,
              )}
            >
              <Upload className="h-5 w-5 opacity-60" />
              파일 업로드
            </button>
          )}

          {!isLoading &&
            !isError &&
            documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                onDownload={handleDownload}
                onDelete={handleDelete}
                isDownloading={downloadingId === doc.id}
                isDeleting={deletingId === doc.id}
              />
            ))}
        </div>
      </div>
    </aside>
  );
}
