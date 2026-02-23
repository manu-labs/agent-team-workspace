# Stage 1 — Build Next.js frontend static export
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY auto-rsvp/frontend/package*.json ./
RUN npm ci
COPY auto-rsvp/frontend/ .
ARG NEXT_PUBLIC_API_URL=https://auto-rsvp-production.up.railway.app
RUN npm run build

# Stage 2 — Backend + serve frontend static files
FROM python:3.12-slim

# Install system deps + PostgreSQL
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev postgresql postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Configure PostgreSQL - auto-detect version
RUN PG_VERSION=$(ls /etc/postgresql/) && \
    echo "local all all trust" > /etc/postgresql/$PG_VERSION/main/pg_hba.conf && \
    echo "host all all 127.0.0.1/32 md5" >> /etc/postgresql/$PG_VERSION/main/pg_hba.conf && \
    echo "host all all ::1/128 md5" >> /etc/postgresql/$PG_VERSION/main/pg_hba.conf && \
    echo "listen_addresses = '127.0.0.1'" >> /etc/postgresql/$PG_VERSION/main/postgresql.conf

WORKDIR /app

# Install Python deps
COPY auto-rsvp/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY auto-rsvp/backend/ .

# Copy frontend static files from builder stage
COPY --from=frontend-builder /frontend/out /app/static/frontend

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Python path for imports
ENV PYTHONPATH=/app

CMD ["/start.sh"]
