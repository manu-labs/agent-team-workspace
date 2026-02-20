import { create } from 'zustand';

const useFavoritesStore = create((set, get) => ({
  favorites: [],
  isLoading: false,

  setFavorites: (favorites) => set({ favorites }),

  addFavorite: (ticker) =>
    set((state) => ({
      favorites: state.favorites.includes(ticker)
        ? state.favorites
        : [...state.favorites, ticker],
    })),

  removeFavorite: (ticker) =>
    set((state) => ({
      favorites: state.favorites.filter((t) => t !== ticker),
    })),

  isFavorite: (ticker) => get().favorites.includes(ticker),
}));

export default useFavoritesStore;
