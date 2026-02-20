const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10);

const clients = new Map();

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of clients) {
    if (now - entry.windowStart > windowMs) {
      clients.delete(key);
    }
  }
}, 60_000);

export function rateLimiter(req, res, next) {
  const key = req.ip || "unknown";
  const now = Date.now();

  let entry = clients.get(key);
  if (\!entry || now - entry.windowStart > windowMs) {
    entry = { windowStart: now, count: 0 };
    clients.set(key, entry);
  }

  entry.count++;

  res.set("X-RateLimit-Limit", String(maxRequests));
  res.set("X-RateLimit-Remaining", String(Math.max(0, maxRequests - entry.count)));

  if (entry.count > maxRequests) {
    return res.status(429).json({
      error: { message: "Too many requests. Please try again later." },
    });
  }

  next();
}
