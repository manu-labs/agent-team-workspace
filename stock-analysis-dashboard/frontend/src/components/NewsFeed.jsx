import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { newsApi } from '../services/api';

const PLACEHOLDER_NEWS = [
  { id: 1, headline: 'NVIDIA beats Q4 earnings expectations, AI demand surges', source: 'Reuters', timeAgo: '2h ago', tickers: ['NVDA'], url: null },
  { id: 2, headline: 'Federal Reserve signals potential rate hold through Q2', source: 'Bloomberg', timeAgo: '4h ago', tickers: [], url: null },
  { id: 3, headline: 'Apple announces new AI features for iPhone 17 lineup', source: 'CNBC', timeAgo: '5h ago', tickers: ['AAPL'], url: null },
  { id: 4, headline: 'Tesla Cybertruck deliveries exceed analyst expectations', source: 'MarketWatch', timeAgo: '6h ago', tickers: ['TSLA'], url: null },
  { id: 5, headline: 'Microsoft Azure revenue grows 30% as cloud demand remains strong', source: 'WSJ', timeAgo: '8h ago', tickers: ['MSFT'], url: null },
];

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return diffMins + 'm ago';
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return diffHrs + 'h ago';
    const diffDays = Math.floor(diffHrs / 24);
    return diffDays + 'd ago';
  } catch {
    return dateStr;
  }
}

function NewsCard({ headline, source, timeAgo, publishedAt, tickers, imageUrl, url }) {
  const displayTime = timeAgo || formatTimeAgo(publishedAt);

  const content = (
    <>
      {imageUrl && (
        <div className="shrink-0 w-24 h-24 rounded-lg bg-surface-700 overflow-hidden">
          <img src={imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-white text-sm leading-snug mb-1 line-clamp-2">
          {headline}
        </h3>
        <div className="flex items-center gap-2 text-xs text-surface-200/50">
          <span>{source}</span>
          {displayTime && (
            <>
              <span>\u00b7</span>
              <span>{displayTime}</span>
            </>
          )}
        </div>
        {tickers && tickers.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {tickers.map((t) => (
              <Link
                key={t}
                to={'/stock/' + t}
                onClick={(e) => e.stopPropagation()}
                className="px-1.5 py-0.5 text-xs rounded bg-surface-700 text-brand-400 hover:bg-brand-600/20 transition-colors"
              >
                {t}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="card-hover flex gap-4">
        {content}
      </a>
    );
  }

  return <article className="card-hover flex gap-4">{content}</article>;
}

export default function NewsFeed({ ticker }) {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const data = ticker ? await newsApi.getForStock(ticker) : await newsApi.getFeed();
      if (data && data.length > 0) {
        setNews(data);
      } else {
        // API returned empty (service not implemented yet) — use placeholders
        setNews(PLACEHOLDER_NEWS);
      }
    } catch (err) {
      console.error('Failed to load news:', err);
      setNews(PLACEHOLDER_NEWS);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card animate-pulse h-24" />
        ))}
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-surface-200/50 text-sm">No news available{ticker ? ' for ' + ticker : ''}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {news.map((item) => (
        <NewsCard key={item.id} {...item} />
      ))}
    </div>
  );
}
