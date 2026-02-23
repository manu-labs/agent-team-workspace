#!/bin/bash
set -e

# Start PostgreSQL
pg_ctlcluster 16 main start

# Wait for Postgres to be ready
until pg_isready -h localhost -p 5432 -q; do
  echo "Waiting for PostgreSQL..."
  sleep 1
done

# Create database and set password
su - postgres -c "psql -c \"ALTER USER postgres PASSWORD 'autorsvp2026';\"" 2>/dev/null || true
su - postgres -c "createdb auto_rsvp" 2>/dev/null || true

# Run migrations
cd /app
alembic upgrade head

# Start the server
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
