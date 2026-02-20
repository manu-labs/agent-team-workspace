import { useState, useEffect, useCallback } from 'react';
import { stockApi } from '../services/api';
import StockCard from './StockCard';

const REFRESH_INTERVAL = 60000; // 60 seconds

export default function TrendingBar() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrending = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const data = await stockApi.getTrending();
      if (data && data.length > 0) {
        setStocks(data);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to load trending:', err);
      setError(err.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending(true);
    const interval = setInterval(() => fetchTrending(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTrending]);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card animate-pulse min-w-[160px] h-24 shrink-0" />
        ))}
      </div>
    );
  }

  if (error || stocks.length === 0) {
    return (
      <div className="text-sm text-surface-200/40 py-4">
        Market data unavailable.
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
      {stocks.map((stock) => (
        <StockCard key={stock.ticker} {...stock} />
      ))}
    </div>
  );
}
