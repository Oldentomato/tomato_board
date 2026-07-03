"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  embedDocuments,
  getEmbeddingIndexes,
  removeEmbeddedDocument,
} from "@/lib/api/embeddings";
import type { EmbedDocumentsInput } from "@/lib/types/embedding";

export const EMBEDDINGS_QUERY_KEY = ["embeddings"] as const;

export function useEmbeddings() {
  const queryClient = useQueryClient();

  const indexesQuery = useQuery({
    queryKey: EMBEDDINGS_QUERY_KEY,
    queryFn: getEmbeddingIndexes,
    staleTime: 15 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: EMBEDDINGS_QUERY_KEY });

  const embedMutation = useMutation({
    mutationFn: (input: EmbedDocumentsInput) => embedDocuments(input),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: ({ indexId, documentId }: { indexId: string; documentId: string }) =>
      removeEmbeddedDocument(indexId, documentId),
    onSuccess: invalidate,
  });

  return {
    indexes: indexesQuery.data?.indexes ?? [],
    isLoading: indexesQuery.isLoading,
    isError: indexesQuery.isError,
    refetch: indexesQuery.refetch,
    embedDocuments: embedMutation.mutateAsync,
    removeEmbeddedDocument: removeMutation.mutateAsync,
    isEmbedding: embedMutation.isPending,
    isRemoving: removeMutation.isPending,
  };
}
