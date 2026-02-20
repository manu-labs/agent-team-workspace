const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const url = API_BASE + endpoint;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed: ' + res.status);
  }

  return res.json();
}

// Stock endpoints
export const stockApi = {
  search: (query) => request('/stocks/search?q=' + encodeURIComponent(query)),
  getQuote: (ticker) => request('/stocks/' + ticker),
  getChart: (ticker, range = '1M') => request('/stocks/' + ticker + '/chart?range=' + range),
  getTrending: () => request('/stocks/trending'),
};

// Earnings endpoints
export const earningsApi = {
  getHistory: (ticker) => request('/earnings/' + ticker),
  getReport: (ticker, date) => request('/earnings/' + ticker + '/' + date),
  getUpcoming: () => request('/earnings/upcoming'),
};

// News endpoints
export const newsApi = {
  getFeed: (limit = 20) => request('/news?limit=' + limit),
  getForStock: (ticker) => request('/news/' + ticker),
};

// Favorites endpoints
export const favoritesApi = {
  getAll: () => request('/favorites'),
  add: (ticker) => request('/favorites', { method: 'POST', body: JSON.stringify({ ticker }) }),
  remove: (ticker) => request('/favorites/' + ticker, { method: 'DELETE' }),
};

// AI endpoints
export const aiApi = {
  getSummary: (ticker) => request('/ai/' + ticker + '/summary'),
  chat: (ticker, message, history = []) =>
    fetch(API_BASE + '/ai/' + ticker + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    }),
};
