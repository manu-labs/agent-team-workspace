import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import useFavoritesStore from '../stores/favoritesStore';

export default function FavoritesSidebar() {
  const { favorites, quotes, isLoading, fetchFavorites } = useFavoritesStore();

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

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
        {favorites.length > 0 && (
          <span className="text-xs text-surface-200/50">{favorites.length} stocks</span>
        )}
      </div>
      {favorites.length === 0 ? (
        <p className="text-xs text-surface-200/40">
          Add stocks to your watchlist from any stock page.
        </p>
      ) : (
        <div className="space-y-1">
          {favorites.map((ticker) => {
            const q = quotes[ticker] || {};
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
      )}
    </div>
  );
}
