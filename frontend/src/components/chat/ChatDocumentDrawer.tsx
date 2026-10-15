"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Check,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { chatUiTheme } from "@/lib/weather/skyTheme";
import { useDocuments } from "@/hooks/useDocuments";
import { useEmbeddings } from "@/hooks/useEmbeddings";
import type { Document } from "@/lib/types/document";
import {
  DOCUMENT_STATUS_LABELS,
  FORMAT_LABELS,
  formatFileSize,
  getDocumentDownloadFilename,
} from "@/lib/types/document";
import type { EmbeddedDocument } from "@/lib/types/embedding";
import { EMBED_STATUS_LABELS } from "@/lib/types/embedding";
import { parseUtcIso } from "@/lib/utils/datetime";
import { cn } from "@/lib/utils/cn";

const ACCEPTED_TYPES = ".md,.txt,.markdown,.docx,.hwpx,.hwp,.pdf";

type DrawerTab = "documents" | "embeddings";

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

function EmbedStatusBadge({ status }: { status: EmbeddedDocument["status"] }) {
  const styles = {
    pending: "bg-amber-100 text-amber-700",
    indexed: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
  } as const;

  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", styles[status])}>
      {EMBED_STATUS_LABELS[status]}
    </span>
  );
}

function DocumentRow({
  doc,
  onDownload,
  onDelete,
  isDownloading,
  isDeleting,
  selectable,
  selected,
  onToggleSelect,
}: {
  doc: Document;
  onDownload: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  isDownloading: boolean;
  isDeleting: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const theme = chatUiTheme;
  const formatLabel = doc.outputFormat
    ? FORMAT_LABELS[doc.outputFormat] ?? doc.outputFormat
    : FORMAT_LABELS[doc.sourceFormat] ?? doc.sourceFormat;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-2.5 py-2.5 transition hover:bg-black/[0.02]",
        theme.sidebarBorder,
        selectable && selected && "border-[#E74C3C]/55",
      )}
    >
      {selectable && (
        <button
          type="button"
          onClick={onToggleSelect}
          className={cn(
            "mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
            selected
              ? "border-[#E74C3C] bg-[#E74C3C] text-white"
              : "border-gray-300 bg-transparent",
          )}
          aria-label={selected ? "선택 해제" : "선택"}
        >
          {selected && <Check className="h-2.5 w-2.5" />}
        </button>
      )}

      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-transparent",
          theme.sidebarBorder,
        )}
      >
        <FileText className="h-4 w-4 text-[#E74C3C]" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className={cn("truncate text-xs font-medium", theme.text)}>{doc.title}</p>
          {!selectable && <StatusBadge status={doc.status} />}
        </div>
        <p className={cn("mt-0.5 truncate text-[11px]", theme.muted)}>
          {formatLabel} · {formatFileSize(doc.fileSize)}
        </p>
        {!selectable && (
          <time className={cn("text-[10px]", theme.faint)}>
            {format(parseUtcIso(doc.createdAt), "M/d HH:mm", { locale: ko })}
          </time>
        )}
      </div>

      {!selectable && (
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
      )}
    </div>
  );
}

function EmbeddedDocumentRow({
  doc,
  indexId,
  onRemove,
  isRemoving,
}: {
  doc: EmbeddedDocument;
  indexId: string;
  onRemove: (indexId: string, documentId: string) => void;
  isRemoving: boolean;
}) {
  const theme = chatUiTheme;

  return (
    <div className={cn("flex items-start gap-2 rounded-lg border bg-transparent px-2 py-1.5", theme.sidebarBorder)}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1">
          <p className={cn("truncate text-[11px] font-medium", theme.text)}>{doc.title}</p>
          <EmbedStatusBadge status={doc.status} />
        </div>
        {doc.status === "indexed" && (
          <p className={cn("text-[10px]", theme.muted)}>{doc.chunkCount}개 청크</p>
        )}
        {doc.status === "failed" && doc.errorMessage && (
          <p className="text-[10px] text-red-500">{doc.errorMessage}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(indexId, doc.documentId)}
        disabled={isRemoving}
        className="shrink-0 rounded p-1 text-red-500 transition hover:bg-red-50 disabled:opacity-40"
        aria-label="임베딩 제거"
        title="임베딩 제거"
      >
        <Trash2 className="h-3 w-3" />
      </button>
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
  const theme = chatUiTheme;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<DrawerTab>("documents");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  const {
    documents,
    isLoading: docsLoading,
    isError: docsError,
    isUploading,
    refetch: refetchDocs,
    uploadDocument,
    deleteDocument,
    downloadDocument,
  } = useDocuments();

  const {
    indexes,
    isLoading: embedLoading,
    isError: embedError,
    refetch: refetchEmbeddings,
    embedDocuments,
    removeEmbeddedDocument,
    isEmbedding,
    isRemoving,
  } = useEmbeddings();

  const embeddingIndex = indexes[0] ?? null;
  const embeddedDocuments = embeddingIndex?.documents ?? [];

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await uploadDocument({ file });
      if (activeTab === "embeddings") {
        await refetchDocs();
      }
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
      setSelectedDocIds((prev) => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleEmbed = async () => {
    if (selectedDocIds.size === 0) {
      window.alert("임베딩할 문서를 선택해 주세요.");
      return;
    }
    await embedDocuments({
      documentIds: Array.from(selectedDocIds),
    });
    setSelectedDocIds(new Set());
  };

  const handleRemoveEmbedding = async (indexId: string, documentId: string) => {
    if (!window.confirm("이 문서의 임베딩을 제거할까요?")) return;
    await removeEmbeddedDocument({ indexId, documentId });
  };

  const handleRefresh = () => {
    refetchDocs();
    refetchEmbeddings();
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
          "my-2 mr-1 flex h-[calc(100%-1rem)] w-80 flex-col rounded-3xl border bg-white/70 backdrop-blur-xl transition-[transform,opacity] duration-300 ease-in-out",
          theme.sidebarBorder,
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
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRefresh}
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

        <div className={cn("flex shrink-0 border-b px-2 py-2", theme.sidebarBorder)}>
          <div className={cn("flex w-full rounded-lg border bg-transparent p-0.5", theme.sidebarBorder)}>
            <button
              type="button"
              onClick={() => setActiveTab("documents")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-md border py-1.5 text-[11px] font-medium transition",
                activeTab === "documents"
                  ? "border-[#E74C3C]/50 text-[#E74C3C]"
                  : "border-transparent",
                activeTab !== "documents" && theme.muted,
              )}
            >
              <FileText className="h-3 w-3" />
              목록
              {documents.length > 0 && (
                <span className="opacity-70">{documents.length}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("embeddings")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-md border py-1.5 text-[11px] font-medium transition",
                activeTab === "embeddings"
                  ? "border-violet-400/60 text-violet-600"
                  : "border-transparent",
                activeTab !== "embeddings" && theme.muted,
              )}
            >
              <Sparkles className="h-3 w-3" />
              임베딩
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
            {activeTab === "documents"
              ? "업로드한 문서는 문서관리 에이전트로 Word/한글 파일로 변환할 수 있습니다."
              : "문서를 선택해 Qdrant에 임베딩하면 문서관리 에이전트가 내용을 검색합니다."}
          </p>
        </div>

        {activeTab === "documents" && (
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 scrollbar-subtle">
            {docsLoading &&
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className={cn("h-14 animate-pulse rounded-xl opacity-20", theme.text, "bg-current")}
                />
              ))}

            {docsError && (
              <p className={cn("text-xs", theme.muted)}>문서 목록을 불러올 수 없습니다.</p>
            )}

            {!docsLoading && !docsError && documents.length === 0 && (
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

            {!docsLoading &&
              !docsError &&
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
        )}

        {activeTab === "embeddings" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b px-3 py-3">
              <button
                type="button"
                onClick={handleEmbed}
                disabled={isEmbedding || selectedDocIds.size === 0}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
              >
                {isEmbedding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {selectedDocIds.size > 0
                  ? `${selectedDocIds.size}개 문서 임베딩`
                  : "문서 선택 후 임베딩"}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 scrollbar-subtle">
              <p className={cn("mb-2 text-[11px] font-medium", theme.text)}>
                임베딩할 문서 선택
              </p>

              {docsLoading && (
                <div className={cn("mb-3 h-10 animate-pulse rounded-xl opacity-20", theme.text, "bg-current")} />
              )}

              {!docsLoading && documents.length === 0 && (
                <p className={cn("mb-3 text-[11px]", theme.muted)}>
                  업로드된 문서가 없습니다. 위에서 문서를 추가하세요.
                </p>
              )}

              <div className="mb-4 space-y-1.5">
                {documents.map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onDownload={handleDownload}
                    onDelete={handleDelete}
                    isDownloading={downloadingId === doc.id}
                    isDeleting={deletingId === doc.id}
                    selectable
                    selected={selectedDocIds.has(doc.id)}
                    onToggleSelect={() => toggleDocSelection(doc.id)}
                  />
                ))}
              </div>

              <p className={cn("mb-2 text-[11px] font-medium", theme.text)}>
                임베딩된 문서
              </p>

              {embedLoading && (
                <div className={cn("h-16 animate-pulse rounded-xl opacity-20", theme.text, "bg-current")} />
              )}

              {embedError && (
                <p className={cn("text-[11px]", theme.muted)}>임베딩 현황을 불러올 수 없습니다.</p>
              )}

              {!embedLoading && !embedError && embeddedDocuments.length === 0 && (
                <p className={cn("text-[11px]", theme.muted)}>
                  아직 임베딩된 문서가 없습니다.
                </p>
              )}

              <div className="space-y-1.5">
                {embeddingIndex &&
                  embeddedDocuments.map((doc) => (
                    <EmbeddedDocumentRow
                      key={doc.id}
                      doc={doc}
                      indexId={embeddingIndex.id}
                      onRemove={handleRemoveEmbedding}
                      isRemoving={isRemoving}
                    />
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
