"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMemo, deleteMemo, getMemos, moveMemo, updateMemo } from "@/lib/api/memos";
import type { CreateMemoInput, MemoPositionInput, UpdateMemoInput } from "@/lib/types/memo";

export function useMemos() {
  const queryClient = useQueryClient();
  const queryKey = ["memos"];

  const memosQuery = useQuery({
    queryKey,
    queryFn: getMemos,
    staleTime: 30 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: (input: CreateMemoInput) => createMemo(input),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMemoInput }) =>
      updateMemo(id, input),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMemo(id),
    onSuccess: invalidate,
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: MemoPositionInput }) =>
      moveMemo(id, input),
    onSuccess: invalidate,
  });

  return {
    memos: memosQuery.data?.memos ?? [],
    isLoading: memosQuery.isLoading,
    isError: memosQuery.isError,
    refetch: memosQuery.refetch,
    createMemo: createMutation.mutateAsync,
    updateMemo: updateMutation.mutateAsync,
    deleteMemo: deleteMutation.mutateAsync,
    moveMemo: moveMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isMoving: moveMutation.isPending,
  };
}
