import { useState, useEffect } from 'react';
import { newsApi } from '../services/api';

function NewsCard({ headline, source, timeAgo, tickers, imageUrl }) {
  return (
    <article className="card-hover flex gap-4">
      {imageUrl && (
        <div className="shrink-0 w-24 h-24 rounded-lg bg-surface-700 overflow-hidden">
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-white text-sm leading-snug mb-1 line-clamp-2">
          {headline}
        </h3>
        <div className="flex items-center gap-2 text-xs text-surface-200/50">
          <span>{source}</span>
          <span>\u00b7</span>
          <span>{timeAgo}</span>
        </div>
        {tickers && tickers.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {tickers.map((t) => (
              <span key={t} className="px-1.5 py-0.5 text-xs rounded bg-surface-700 text-brand-400">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default function NewsFeed() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    newsApi.getFeed()
      .then(setNews)
      .catch((err) => {
        console.error('Failed to load news:', err);
        // Placeholder news
        setNews([
          { id: 1, headline: 'NVIDIA beats Q4 earnings expectations, AI demand surges', source: 'Reuters', timeAgo: '2h ago', tickers: ['NVDA'] },
          { id: 2, headline: 'Federal Reserve signals potential rate hold through Q2', source: 'Bloomberg', timeAgo: '4h ago', tickers: [] },
          { id: 3, headline: 'Apple announces new AI features for iPhone 17 lineup', source: 'CNBC', timeAgo: '5h ago', tickers: ['AAPL'] },
          { id: 4, headline: 'Tesla Cybertruck deliveries exceed analyst expectations', source: 'MarketWatch', timeAgo: '6h ago', tickers: ['TSLA'] },
          { id: 5, headline: 'Microsoft Azure revenue grows 30% as cloud demand remains strong', source: 'WSJ', timeAgo: '8h ago', tickers: ['MSFT'] },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card animate-pulse h-24" />
        ))}
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
