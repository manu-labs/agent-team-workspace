import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { stockApi, earningsApi } from '../services/api';
import PriceChart from '../components/PriceChart';
import KeyStats from '../components/KeyStats';
import EarningsHistory from '../components/EarningsHistory';
import AiChat from '../components/AiChat';
import useFavoritesStore from '../stores/favoritesStore';

const TABS = ['Earnings', 'News', 'AI Insights', 'About'];

export default function StockDetail() {
  const { ticker } = useParams();
  const [activeTab, setActiveTab] = useState('Earnings');
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore();

  useEffect(() => {
    setLoading(true);
    stockApi.getQuote(ticker)
      .then(setQuote)
      .catch((err) => console.error('Failed to load quote:', err))
      .finally(() => setLoading(false));
  }, [ticker]);

  const fav = isFavorite(ticker);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-surface-200/50 hover:text-white transition-colors">
            &larr; Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {ticker}
              {quote && <span className="text-surface-200/70 font-normal ml-2">{quote.name}</span>}
            </h1>
          </div>
        </div>
        <button
          onClick={() => fav ? removeFavorite(ticker) : addFavorite(ticker)}
          className={"rounded-lg px-4 py-2 text-sm font-medium transition-colors " +
            (fav
              ? "bg-brand-500/20 text-brand-400 hover:bg-brand-500/30"
              : "bg-surface-800 text-surface-200/70 hover:text-white")}
        >
          {fav ? "\u2605 Favorited" : "\u2606 Add to Favorites"}
        </button>
      </div>

      {/* Price + Chart */}
      {loading ? (
        <div className="card animate-pulse h-64" />
      ) : (
        <>
          {quote && (
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold font-mono">${quote.price?.toFixed(2)}</span>
              {quote.change != null && (
                <span className={quote.change >= 0 ? 'badge-gain' : 'badge-loss'}>
                  {quote.change >= 0 ? '+' : ''}{quote.change?.toFixed(2)} ({quote.changePercent?.toFixed(2)}%)
                </span>
              )}
            </div>
          )}
          <PriceChart ticker={ticker} />
        </>
      )}

      {/* Key Stats */}
      <KeyStats quote={quote} />

      {/* Tabs */}
      <div className="border-b border-surface-700">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={"px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px " +
                (activeTab === tab
                  ? "border-brand-500 text-brand-400"
                  : "border-transparent text-surface-200/50 hover:text-white")}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'Earnings' && <EarningsHistory ticker={ticker} />}
        {activeTab === 'News' && <p className="text-surface-200/50">News feed for {ticker} coming soon.</p>}
        {activeTab === 'AI Insights' && <AiChat ticker={ticker} />}
        {activeTab === 'About' && <p className="text-surface-200/50">Company info for {ticker} coming soon.</p>}
      </div>
    </div>
  );
}
