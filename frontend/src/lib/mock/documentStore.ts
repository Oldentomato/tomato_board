import { ApiError } from "@/lib/api/client";
import type { Document, DocumentsResponse } from "@/lib/types/document";
import { hasMockSession } from "./session";

const STORAGE_KEY = "tomato_mock_documents";

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireSession() {
  if (!hasMockSession()) {
    throw new ApiError(401, "Unauthorized");
  }
}

function readStore(): Document[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Document[]) : [];
  } catch {
    return [];
  }
}

function writeStore(documents: Document[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
}

export async function mockGetDocuments(): Promise<DocumentsResponse> {
  await delay();
  requireSession();
  return { documents: readStore() };
}

export async function mockUploadDocument(file: File, title?: string): Promise<Document> {
  await delay();
  requireSession();

  const now = new Date().toISOString();
  const doc: Document = {
    id: crypto.randomUUID(),
    title: title?.trim() || file.name.replace(/\.[^.]+$/, "") || "문서",
    originalFilename: file.name,
    sourceFormat: file.name.split(".").pop()?.toLowerCase() || "txt",
    outputFormat: null,
    status: "uploaded",
    fileSize: file.size,
    mimeType: file.type || "application/octet-stream",
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  };

  const documents = readStore();
  documents.unshift(doc);
  writeStore(documents);
  return doc;
}

export async function mockDownloadDocument(documentId: string, filename: string): Promise<void> {
  await delay();
  requireSession();
  const doc = readStore().find((item) => item.id === documentId);
  if (!doc) {
    throw new ApiError(404, "문서를 찾을 수 없습니다.");
  }
  const blob = new Blob([`Mock document: ${doc.title}`], { type: "text/plain" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export async function mockDeleteDocument(documentId: string): Promise<void> {
  await delay();
  requireSession();
  writeStore(readStore().filter((item) => item.id !== documentId));
}
