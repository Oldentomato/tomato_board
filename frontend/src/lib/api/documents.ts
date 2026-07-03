import { isMockMode } from "@/lib/config/env";
import {
  mockDeleteDocument,
  mockDownloadDocument,
  mockGetDocuments,
  mockUploadDocument,
} from "@/lib/mock/documentStore";
import { ApiError, buildApiUrl } from "./client";
import { handleAuthFailure } from "./authRedirect";
import type {
  ConvertDocumentInput,
  Document,
  DocumentContent,
  DocumentsResponse,
} from "@/lib/types/document";

export function getDocuments() {
  if (isMockMode()) return mockGetDocuments();
  return fetchDocuments<DocumentsResponse>("/documents");
}

export async function downloadDocument(documentId: string, filename: string, useOutput = true) {
  if (isMockMode()) return mockDownloadDocument(documentId, filename);

  const url = buildApiUrl(`/documents/${documentId}/file`, {
    use_output: useOutput ? "true" : "false",
  });
  const response = await fetch(url, { credentials: "include" });

  if (response.status === 401) {
    const errorText = await response.text().catch(() => "Unauthorized");
    handleAuthFailure(401, errorText);
    throw new ApiError(401, errorText || "Unauthorized");
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Download failed");
    throw new ApiError(response.status, errorText || response.statusText);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export function convertDocument(input: ConvertDocumentInput) {
  if (isMockMode()) {
    throw new ApiError(501, "Mock 모드에서는 변환 API를 지원하지 않습니다.");
  }
  return fetchDocuments<Document>("/documents/convert", {
    method: "POST",
    body: JSON.stringify({
      content: input.content,
      title: input.title ?? "문서",
      target_format: input.target_format ?? "docx",
    }),
  });
}

export async function uploadDocument(file: File, title?: string) {
  if (isMockMode()) return mockUploadDocument(file, title);

  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);

  const response = await fetch(buildApiUrl("/documents"), {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (response.status === 401) {
    const errorText = await response.text().catch(() => "Unauthorized");
    handleAuthFailure(401, errorText);
    throw new ApiError(401, errorText || "Unauthorized");
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Upload failed");
    throw new ApiError(response.status, errorText || response.statusText);
  }

  return response.json() as Promise<Document>;
}

export function deleteDocument(documentId: string) {
  if (isMockMode()) return mockDeleteDocument(documentId);
  return fetchDocuments<void>(`/documents/${documentId}`, { method: "DELETE" });
}

export function fetchDocumentContent(documentId: string) {
  if (isMockMode()) {
    throw new ApiError(501, "Mock 모드에서는 문서 내용 API를 지원하지 않습니다.");
  }
  return fetchDocuments<DocumentContent>(`/documents/${documentId}/content`);
}

export async function fetchDocumentBlob(documentId: string, useOutput: boolean) {
  if (isMockMode()) {
    throw new ApiError(501, "Mock 모드에서는 파일 API를 지원하지 않습니다.");
  }

  const url = buildApiUrl(`/documents/${documentId}/file`, {
    use_output: useOutput ? "true" : "false",
  });
  const response = await fetch(url, { credentials: "include" });

  if (response.status === 401) {
    const errorText = await response.text().catch(() => "Unauthorized");
    handleAuthFailure(401, errorText);
    throw new ApiError(401, errorText || "Unauthorized");
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Request failed");
    throw new ApiError(response.status, errorText || response.statusText);
  }

  return {
    blob: await response.blob(),
    mimeType: response.headers.get("content-type") ?? "application/octet-stream",
  };
}

async function fetchDocuments<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });

  if (response.status === 401) {
    const errorText = await response.text().catch(() => "Unauthorized");
    handleAuthFailure(401, errorText);
    throw new ApiError(401, errorText || "Unauthorized");
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Request failed");
    throw new ApiError(response.status, errorText || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
