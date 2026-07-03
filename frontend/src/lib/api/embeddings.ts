import { isMockMode } from "@/lib/config/env";
import { ApiError, buildApiUrl } from "./client";
import { handleAuthFailure } from "./authRedirect";
import type {
  EmbedDocumentsInput,
  EmbeddingIndex,
  EmbeddingIndexesResponse,
} from "@/lib/types/embedding";

async function fetchEmbeddings<T>(path: string, init?: RequestInit): Promise<T> {
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

export function getEmbeddingIndexes() {
  if (isMockMode()) {
    return Promise.resolve({ indexes: [] } satisfies EmbeddingIndexesResponse);
  }
  return fetchEmbeddings<EmbeddingIndexesResponse>("/embeddings");
}

export function embedDocuments(input: EmbedDocumentsInput) {
  if (isMockMode()) {
    throw new ApiError(501, "Mock 모드에서는 임베딩 API를 지원하지 않습니다.");
  }
  return fetchEmbeddings<EmbeddingIndex>("/embeddings/embed", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function removeEmbeddedDocument(indexId: string, documentId: string) {
  if (isMockMode()) {
    return Promise.resolve();
  }
  return fetchEmbeddings<void>(`/embeddings/${indexId}/documents/${documentId}`, {
    method: "DELETE",
  });
}
