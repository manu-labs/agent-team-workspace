#!/bin/bash
set -e

PG_VERSION=$(ls /etc/postgresql/)
echo "Starting PostgreSQL $PG_VERSION..."

# Start PostgreSQL
pg_ctlcluster $PG_VERSION main start

# Wait for Postgres
for i in $(seq 1 30); do
  if pg_isready -h 127.0.0.1 -p 5432 -q 2>/dev/null; then
    echo "PostgreSQL is ready."
    break
  fi
  echo "Waiting for PostgreSQL ($i/30)..."
  sleep 1
done

# Create database and set password (ignore errors if already exists)
su - postgres -c "psql -c \"ALTER USER postgres PASSWORD 'autorsvp2026';\"" 2>/dev/null || true
su - postgres -c "createdb auto_rsvp" 2>/dev/null || true

# Run Alembic migrations
cd /app
echo "Running database migrations..."
alembic upgrade head

echo "Starting uvicorn on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
