import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import useFavoritesStore from '../stores/favoritesStore';

const PLACEHOLDER_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'TSLA'];
const PLACEHOLDER_QUOTES = {
  AAPL: { price: 189.84, change: -0.96, changePercent: -0.50, name: 'Apple Inc' },
  MSFT: { price: 415.60, change: 3.20, changePercent: 0.78, name: 'Microsoft Corp' },
  NVDA: { price: 875.42, change: 12.34, changePercent: 1.43, name: 'NVIDIA Corp' },
  TSLA: { price: 248.50, change: 18.90, changePercent: 8.23, name: 'Tesla Inc' },
};

export default function FavoritesSidebar() {
  const { favorites, quotes, isLoading, quotesLoading, fetchFavorites } = useFavoritesStore();

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const displayTickers = favorites.length > 0 ? favorites : PLACEHOLDER_TICKERS;
  const isPlaceholder = favorites.length === 0;

  if (isLoading) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white text-sm">Watchlist</h3>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse h-12 rounded-lg bg-surface-700" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white text-sm">Watchlist</h3>
        <span className="text-xs text-surface-200/50">
          {isPlaceholder ? 'Demo' : displayTickers.length + ' stocks'}
        </span>
      </div>
      {isPlaceholder && (
        <p className="text-xs text-surface-200/40 mb-3">
          Add stocks to your watchlist from any stock page.
        </p>
      )}
      <div className="space-y-1">
        {displayTickers.map((ticker) => {
          const q = quotes[ticker] || PLACEHOLDER_QUOTES[ticker] || {};
          const isGain = (q.change || 0) >= 0;
          return (
            <Link
              key={ticker}
              to={'/stock/' + ticker}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-700/50 transition-colors group"
            >
              <div>
                <span className="font-semibold text-white text-sm group-hover:text-brand-400 transition-colors">
                  {ticker}
                </span>
              </div>
              <div className="text-right">
                {q.price ? (
                  <>
                    <div className="text-sm font-mono text-white">${q.price.toFixed(2)}</div>
                    <div className={'text-xs font-mono ' + (isGain ? 'text-gain' : 'text-loss')}>
                      {isGain ? '+' : ''}{(q.changePercent || 0).toFixed(2)}%
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-surface-200/40">--</div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
