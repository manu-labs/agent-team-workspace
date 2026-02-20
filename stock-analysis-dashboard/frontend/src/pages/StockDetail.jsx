import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { stockApi } from '../services/api';
import PriceChart from '../components/PriceChart';
import KeyStats from '../components/KeyStats';
import EarningsHistory from '../components/EarningsHistory';
import NewsFeed from '../components/NewsFeed';
import AiChat from '../components/AiChat';
import useFavoritesStore from '../stores/favoritesStore';

const TABS = ['Earnings', 'News', 'AI Insights', 'About'];

export default function StockDetail() {
  const { ticker } = useParams();
  const [activeTab, setActiveTab] = useState('Earnings');
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore();

  const fetchQuote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await stockApi.getQuote(ticker);
      setQuote(data);
    } catch (err) {
      console.error('Failed to load quote:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    fetchQuote();
    setActiveTab('Earnings');
  }, [fetchQuote]);

  const fav = isFavorite(ticker);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-surface-200/50 hover:text-white transition-colors">
            &larr; Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {ticker}
              {quote && <span className="text-surface-200/70 font-normal ml-2">{quote.name}</span>}
            </h1>
            {quote?.sector && (
              <p className="text-xs text-surface-200/40 mt-0.5">
                {quote.sector}{quote.industry ? ' \u00b7 ' + quote.industry : ''}{quote.exchange ? ' \u00b7 ' + quote.exchange : ''}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => fav ? removeFavorite(ticker) : addFavorite(ticker)}
          className={"rounded-lg px-4 py-2 text-sm font-medium transition-colors " + (fav ? 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30' : 'bg-surface-800 text-surface-200/70 hover:text-white')}
        >
          {fav ? "\u2605 Favorited" : "\u2606 Add to Favorites"}
        </button>
      </div>

      {error && !quote && !loading && (
        <div className="card bg-surface-800 border border-surface-700 flex items-center justify-between">
          <p className="text-surface-200/50 text-sm">
            Could not load quote data for <span className="font-mono text-white">{ticker}</span>. Other sections may still work.
          </p>
          <button onClick={fetchQuote} className="shrink-0 ml-4 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs hover:bg-brand-700 transition-colors">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="card animate-pulse h-64" />
      ) : (
        <>
          {quote && (
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold font-mono text-white">
                ${quote.price != null ? quote.price.toFixed(2) : '--'}
              </span>
              {quote.change != null && (
                <span className={quote.change >= 0 ? 'badge-gain' : 'badge-loss'}>
                  {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent != null ? quote.changePercent.toFixed(2) : '0.00'}%)
                </span>
              )}
            </div>
          )}
          <PriceChart ticker={ticker} />
        </>
      )}

      <KeyStats quote={quote} />

      <div className="border-b border-surface-700">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={"px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap " + (activeTab === tab ? 'border-brand-500 text-brand-400' : 'border-transparent text-surface-200/50 hover:text-white')}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === 'Earnings' && <EarningsHistory ticker={ticker} />}
        {activeTab === 'News' && <NewsFeed ticker={ticker} />}
        {activeTab === 'AI Insights' && <AiChat ticker={ticker} />}
        {activeTab === 'About' && <AboutSection quote={quote} quoteError={error} quoteLoading={loading} />}
      </div>
    </div>
  );
}

function AboutSection({ quote, quoteError, quoteLoading }) {
  if (!quote) {
    const message = quoteLoading
      ? 'Loading company information...'
      : quoteError
        ? 'Company information unavailable.'
        : 'No company information available.';
    return (
      <div className="card text-center py-8">
        <p className="text-surface-200/50 text-sm">{message}</p>
      </div>
    );
  }

  const info = [
    { label: 'Company', value: quote.name },
    { label: 'Ticker', value: quote.ticker },
    { label: 'Sector', value: quote.sector },
    { label: 'Industry', value: quote.industry },
    { label: 'Exchange', value: quote.exchange },
  ].filter((i) => i.value);

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-white mb-4">Company Information</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        {info.map((item) => (
          <div key={item.label} className="flex justify-between sm:block">
            <dt className="text-xs text-surface-200/50">{item.label}</dt>
            <dd className="text-sm text-white font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}