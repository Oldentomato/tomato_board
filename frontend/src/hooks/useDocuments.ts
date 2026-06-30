"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteDocument,
  downloadDocument,
  getDocuments,
  uploadDocument,
} from "@/lib/api/documents";

export const DOCUMENTS_QUERY_KEY = ["documents"] as const;

const DOCUMENT_MUTATING_TOOLS = new Set([
  "convert_content_to_document",
  "convert_uploaded_document",
]);

export function shouldRefreshDocumentsForTool(toolName: string): boolean {
  return DOCUMENT_MUTATING_TOOLS.has(toolName);
}

export function useDocuments() {
  const queryClient = useQueryClient();
  const queryKey = DOCUMENTS_QUERY_KEY;

  const documentsQuery = useQuery({
    queryKey,
    queryFn: getDocuments,
    staleTime: 30 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const uploadMutation = useMutation({
    mutationFn: ({ file, title }: { file: File; title?: string }) =>
      uploadDocument(file, title),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) => deleteDocument(documentId),
    onSuccess: invalidate,
  });

  const downloadMutation = useMutation({
    mutationFn: ({
      documentId,
      filename,
      useOutput,
    }: {
      documentId: string;
      filename: string;
      useOutput?: boolean;
    }) => downloadDocument(documentId, filename, useOutput),
  });

  return {
    documents: documentsQuery.data?.documents ?? [],
    isLoading: documentsQuery.isLoading,
    isError: documentsQuery.isError,
    refetch: documentsQuery.refetch,
    uploadDocument: uploadMutation.mutateAsync,
    deleteDocument: deleteMutation.mutateAsync,
    downloadDocument: downloadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDownloading: downloadMutation.isPending,
  };
}
