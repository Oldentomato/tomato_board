export type EmbedStatus = "pending" | "indexed" | "failed";

export type EmbeddedDocument = {
  id: string;
  documentId: string;
  title: string;
  chunkCount: number;
  status: EmbedStatus;
  errorMessage?: string | null;
  embeddedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmbeddingIndex = {
  id: string;
  embeddingModel: string;
  qdrantCollection: string;
  documents: EmbeddedDocument[];
  documentCount: number;
  indexedCount: number;
  createdAt: string;
  updatedAt: string;
};

export type EmbeddingIndexesResponse = {
  indexes: EmbeddingIndex[];
};

export type EmbedDocumentsInput = {
  documentIds: string[];
};

export const EMBED_STATUS_LABELS: Record<EmbedStatus, string> = {
  pending: "대기 중",
  indexed: "임베딩 완료",
  failed: "실패",
};
