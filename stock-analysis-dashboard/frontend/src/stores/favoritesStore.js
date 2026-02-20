import { create } from 'zustand';
import { favoritesApi, stockApi } from '../services/api';

const useFavoritesStore = create((set, get) => ({
  favorites: [],
  quotes: {},
  isLoading: false,
  quotesLoading: false,

  fetchFavorites: async () => {
    set({ isLoading: true });
    try {
      const data = await favoritesApi.getAll();
      const tickers = data.map((f) => f.ticker);
      set({ favorites: tickers, isLoading: false });
      // Fetch quotes for all favorites
      get().fetchQuotes(tickers);
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
      set({ isLoading: false });
    }
  },

  fetchQuotes: async (tickers) => {
    if (!tickers || tickers.length === 0) return;
    set({ quotesLoading: true });
    const quotes = { ...get().quotes };
    await Promise.allSettled(
      tickers.map(async (ticker) => {
        try {
          const profile = await stockApi.getQuote(ticker);
          quotes[ticker] = {
            price: profile.price,
            change: profile.change,
            changePercent: profile.changePercent,
            name: profile.name,
          };
        } catch (err) {
          console.error('Failed to fetch quote for ' + ticker + ':', err);
        }
      })
    );
    set({ quotes, quotesLoading: false });
  },

  addFavorite: async (ticker) => {
    const upper = ticker.toUpperCase();
    if (get().favorites.includes(upper)) return;
    // Optimistic update
    set((state) => ({ favorites: [...state.favorites, upper] }));
    try {
      await favoritesApi.add(upper);
      // Fetch quote for new favorite
      get().fetchQuotes([upper]);
    } catch (err) {
      console.error('Failed to add favorite:', err);
      // Rollback
      set((state) => ({ favorites: state.favorites.filter((t) => t !== upper) }));
    }
  },

  removeFavorite: async (ticker) => {
    const upper = ticker.toUpperCase();
    const prev = get().favorites;
    // Optimistic update
    set((state) => ({ favorites: state.favorites.filter((t) => t !== upper) }));
    try {
      await favoritesApi.remove(upper);
    } catch (err) {
      console.error('Failed to remove favorite:', err);
      // Rollback
      set({ favorites: prev });
    }
  },

  isFavorite: (ticker) => get().favorites.includes(ticker.toUpperCase()),
}));

export default useFavoritesStore;
