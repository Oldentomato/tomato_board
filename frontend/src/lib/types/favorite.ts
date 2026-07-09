export type Favorite = {
  id: string;
  name: string;
  url: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type FavoritesResponse = {
  favorites: Favorite[];
};

export type CreateFavoriteInput = {
  name: string;
  url: string;
};
