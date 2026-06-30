export type DocumentStatus = "uploaded" | "converted" | "failed";

export type Document = {
  id: string;
  title: string;
  originalFilename: string;
  sourceFormat: string;
  outputFormat?: string | null;
  status: DocumentStatus;
  fileSize: number;
  mimeType: string;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentsResponse = {
  documents: Document[];
};

export type ConvertDocumentInput = {
  content: string;
  title?: string;
  target_format?: string;
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: "업로드됨",
  converted: "변환 완료",
  failed: "변환 실패",
};

export const FORMAT_LABELS: Record<string, string> = {
  markdown: "Markdown",
  md: "Markdown",
  txt: "텍스트",
  docx: "Word",
  word: "Word",
  hwpx: "한글",
  hwp: "한글",
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FORMAT_EXTENSIONS: Record<string, string> = {
  docx: ".docx",
  word: ".docx",
  hwpx: ".hwpx",
  hwp: ".hwpx",
};

export function getDocumentDownloadFilename(doc: Document, useOutput: boolean): string {
  if (useOutput && doc.outputFormat) {
    const extension = FORMAT_EXTENSIONS[doc.outputFormat] ?? `.${doc.outputFormat}`;
    return `${doc.title}${extension}`;
  }
  return doc.originalFilename;
}
