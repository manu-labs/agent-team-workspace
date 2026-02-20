import { useState, useEffect } from 'react';
import useFavoritesStore from '../stores/favoritesStore';
import StockCard from './StockCard';

export default function FavoritesSidebar() {
  const { favorites } = useFavoritesStore();

  // Placeholder quote data (will come from API when backend is ready)
  const placeholderQuotes = {
    AAPL: { price: 189.84, change: -0.96, changePercent: -0.50 },
    MSFT: { price: 415.60, change: 3.20, changePercent: 0.78 },
    NVDA: { price: 875.42, change: 12.34, changePercent: 1.43 },
    TSLA: { price: 248.50, change: 18.90, changePercent: 8.23 },
  };

  // Show some defaults when favorites is empty (for demo)
  const displayTickers = favorites.length > 0 ? favorites : ['AAPL', 'MSFT', 'NVDA', 'TSLA'];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white text-sm">Watchlist</h3>
        <span className="text-xs text-surface-200/50">{displayTickers.length} stocks</span>
      </div>
      <div className="space-y-1">
        {displayTickers.map((ticker) => {
          const q = placeholderQuotes[ticker] || { price: 0, change: 0, changePercent: 0 };
          return <StockCard key={ticker} ticker={ticker} compact {...q} />;
        })}
      </div>
    </div>
  );
}
