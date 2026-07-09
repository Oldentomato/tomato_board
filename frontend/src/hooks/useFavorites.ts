"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFavorite, deleteFavorite, getFavorites } from "@/lib/api/favorites";
import type { CreateFavoriteInput } from "@/lib/types/favorite";

export function useFavorites() {
  const queryClient = useQueryClient();
  const queryKey = ["favorites"];

  const favoritesQuery = useQuery({
    queryKey,
    queryFn: getFavorites,
    staleTime: 30 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const createMutation = useMutation({
    mutationFn: (input: CreateFavoriteInput) => createFavorite(input),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFavorite(id),
    onSuccess: invalidate,
  });

  return {
    favorites: favoritesQuery.data?.favorites ?? [],
    isLoading: favoritesQuery.isLoading,
    isError: favoritesQuery.isError,
    error: favoritesQuery.error,
    createFavorite: createMutation.mutateAsync,
    deleteFavorite: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
