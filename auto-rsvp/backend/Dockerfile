FROM python:3.12-slim

WORKDIR /app

# Install system deps for asyncpg and Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (chromium only for integrations)
RUN playwright install --with-deps chromium

COPY . .

# Default env vars for Railway internal networking
# These can be overridden by Railway service variables
ENV DATABASE_URL=postgresql+asyncpg://postgres:autorsvp2026@postgres.railway.internal:5432/auto_rsvp
ENV CORS_ORIGINS=["https://auto-rsvp.vercel.app","http://localhost:3000"]

# Run migrations then start server
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]