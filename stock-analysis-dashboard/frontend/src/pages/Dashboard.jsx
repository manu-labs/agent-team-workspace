import { useState, useEffect } from 'react';
import TrendingBar from '../components/TrendingBar';
import FavoritesSidebar from '../components/FavoritesSidebar';
import NewsFeed from '../components/NewsFeed';
import EarningsCalendar from '../components/EarningsCalendar';

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Trending stocks carousel */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Trending Stocks</h2>
        <TrendingBar />
      </section>

      {/* Main content grid: sidebar + feed */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Favorites sidebar */}
        <aside className="lg:col-span-1 order-2 lg:order-1">
          <FavoritesSidebar />
          <div className="mt-6">
            <EarningsCalendar />
          </div>
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
