import { isMockMode } from "@/lib/config/env";
import { mockCreateFavorite, mockDeleteFavorite, mockGetFavorites } from "@/lib/mock/handlers";
import { apiClient } from "./client";
import type { CreateFavoriteInput, Favorite, FavoritesResponse } from "@/lib/types/favorite";

export function getFavorites() {
  if (isMockMode()) return mockGetFavorites();
  return apiClient<FavoritesResponse>("/favorites");
}

export function createFavorite(input: CreateFavoriteInput) {
  if (isMockMode()) return mockCreateFavorite(input);
  return apiClient<Favorite>("/favorites", {
    method: "POST",
    body: input,
  });
}

export function deleteFavorite(id: string) {
  if (isMockMode()) return mockDeleteFavorite(id);
  return apiClient<void>(`/favorites/${id}`, {
    method: "DELETE",
  });
}
