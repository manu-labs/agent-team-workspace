import { useState, useEffect } from 'react';
import { stockApi } from '../services/api';
import StockCard from './StockCard';

export default function TrendingBar() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    stockApi.getTrending()
      .then(setStocks)
      .catch((err) => {
        console.error('Failed to load trending:', err);
        // Show placeholder data on API failure
        setStocks([
          { ticker: 'NVDA', name: 'NVIDIA Corp', price: 875.42, change: 12.34, changePercent: 1.43 },
          { ticker: 'AAPL', name: 'Apple Inc', price: 189.84, change: -0.96, changePercent: -0.50 },
          { ticker: 'TSLA', name: 'Tesla Inc', price: 248.50, change: 18.90, changePercent: 8.23 },
          { ticker: 'META', name: 'Meta Platforms', price: 502.30, change: 6.80, changePercent: 1.37 },
          { ticker: 'MSFT', name: 'Microsoft Corp', price: 415.60, change: 3.20, changePercent: 0.78 },
          { ticker: 'AMZN', name: 'Amazon.com', price: 186.50, change: -1.20, changePercent: -0.64 },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card animate-pulse min-w-[160px] h-24 shrink-0" />
        ))}
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
