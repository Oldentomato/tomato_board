import type { CreateFavoriteInput, Favorite } from "@/lib/types/favorite";

const STORAGE_KEY = "tomato_board_mock_favorites";

function loadFavorites(): Favorite[] {
  if (typeof window === "undefined") {
    return [];
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as Favorite[];
  } catch {
    return [];
  }
}

function saveFavorites(favorites: Favorite[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }
}

export function getMockFavorites(): Favorite[] {
  return loadFavorites().sort((a, b) => a.sortOrder - b.sortOrder);
}

export function createMockFavorite(input: CreateFavoriteInput): Favorite {
  const now = new Date().toISOString();
  const favorites = loadFavorites();
  const url = input.url.trim();
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const created: Favorite = {
    id: `fav-${Date.now()}`,
    name: input.name.trim(),
    url: normalized,
    sortOrder: favorites.length,
    createdAt: now,
    updatedAt: now,
  };
  favorites.unshift(created);
  saveFavorites(favorites.map((item, index) => ({ ...item, sortOrder: index })));
  return created;
}

export function deleteMockFavorite(id: string): void {
  const favorites = loadFavorites().filter((item) => item.id !== id);
  saveFavorites(favorites.map((item, index) => ({ ...item, sortOrder: index })));
}
