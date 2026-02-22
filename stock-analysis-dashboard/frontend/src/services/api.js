// In production, VITE_API_URL points to the deployed backend (e.g. https://stockpulse-api.up.railway.app/api).
// In development, Vite proxies /api to localhost:3001.
const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
  const url = API_BASE + endpoint;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || body.error || 'Request failed: ' + res.status);
  }

  return res.json();
}

// Normalizes a raw news item from the backend into the shape NewsCard expects.
// The backend uses { title, published_at, symbols } but NewsCard expects
// { headline, publishedAt, tickers }.
function normalizeNewsItem(item) {
  return {
    ...item,
    headline: item.headline || item.title || '',
    publishedAt: item.publishedAt || item.published_at || null,
    tickers: item.tickers || item.symbols || [],
  };
}

// Stock endpoints
export const stockApi = {
  search: (query) =>
    request('/stocks/search?q=' + encodeURIComponent(query)).then((d) => d.results),
  getQuote: (ticker) => request('/stocks/' + ticker),
  getChart: (ticker, range = '1M') =>
    request('/stocks/' + ticker + '/prices?range=' + range).then((d) => d.prices),
  getTrending: () => request('/stocks/trending').then((d) => d.trending),
};

// Earnings endpoints
export const earningsApi = {
  getHistory: (ticker) =>
    request('/earnings/' + ticker).then((d) => d.earnings),
  getReport: (ticker, date) =>
    request('/earnings/' + ticker + '/' + date).then((d) => d.report),
  getTranscript: (ticker, date) =>
    request('/earnings/' + ticker + '/' + date + '/transcript').then((d) => d.transcript),
  getUpcoming: () => request('/earnings/upcoming').then((d) => d.upcoming),
};

// News endpoints
export const newsApi = {
  getFeed: (limit = 20) =>
    request('/news?limit=' + limit).then((d) => (d.news || []).map(normalizeNewsItem)),
  getForStock: (ticker) =>
    request('/news/' + ticker).then((d) => (d.news || []).map(normalizeNewsItem)),
};

// Favorites endpoints
export const favoritesApi = {
  getAll: () => request('/favorites').then((d) => d.favorites),
  add: (ticker) => request('/favorites/' + ticker, { method: 'POST' }),
  remove: (ticker) => request('/favorites/' + ticker, { method: 'DELETE' }),
};

// AI endpoints
export const aiApi = {
  getInsights: (ticker, date) => request('/ai/insights/' + ticker + '/' + date),
  chat: (ticker, question, contextType = 'general') =>
    fetch(API_BASE + '/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, question, context_type: contextType }),
    }),
};


