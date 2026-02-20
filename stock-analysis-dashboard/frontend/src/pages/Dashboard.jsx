import { useEffect } from 'react';
import TrendingBar from '../components/TrendingBar';
import FavoritesSidebar from '../components/FavoritesSidebar';
import NewsFeed from '../components/NewsFeed';
import EarningsCalendar from '../components/EarningsCalendar';
import useFavoritesStore from '../stores/favoritesStore';

export default function Dashboard() {
  const fetchFavorites = useFavoritesStore((s) => s.fetchFavorites);

  // Pre-fetch favorites on dashboard mount so sidebar has data
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return (
    <div className="space-y-6">
      {/* Market overview header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Market Overview</h1>
        <p className="text-sm text-surface-200/50 mt-1">
          Track trending stocks, watchlist, and upcoming earnings
        </p>
      </div>

      {/* Trending stocks carousel */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Trending</h2>
        <TrendingBar />
      </section>

      {/* Main content grid: sidebar + feed */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Favorites sidebar */}
        <aside className="lg:col-span-1 order-2 lg:order-1 space-y-6">
          <FavoritesSidebar />
          <EarningsCalendar />
        </aside>

        {/* News feed */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          <h2 className="text-lg font-semibold text-white mb-3">Latest News</h2>
          <NewsFeed />
        </div>
      </div>
    </div>
  );
}
