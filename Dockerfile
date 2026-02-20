FROM node:20-slim

WORKDIR /app

# Install build tools for better-sqlite3 native addon
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY stock-analysis-dashboard/backend/package*.json ./
RUN npm ci

# Copy backend source
COPY stock-analysis-dashboard/backend/ .

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3001

CMD ["node", "server.js"]
