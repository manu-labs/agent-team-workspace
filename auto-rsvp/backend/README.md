# Auto-RSVP Backend

FastAPI backend for the Auto-RSVP app — automatic event discovery and RSVP for Austin events.

## Setup

```bash
cd auto-rsvp/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your database URL and API keys

# Run database migrations
alembic upgrade head

# Start the dev server
uvicorn app.main:app --reload --port 8000
```

## API Docs

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health

## Project Structure

```
app/
  main.py          - FastAPI app entry point
  config.py        - Settings / env vars
  database.py      - SQLAlchemy async engine + session
  models/          - SQLAlchemy ORM models (User, Event, RSVP)
  schemas/         - Pydantic request/response schemas
  routers/         - API route handlers
  services/        - Business logic (scraper, matcher, integrations)
  tasks/           - Background job runner
alembic/           - Database migrations
```
