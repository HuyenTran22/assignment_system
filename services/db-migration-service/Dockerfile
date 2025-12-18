FROM python:3.11-slim

WORKDIR /app

# Install PostgreSQL client for pg_isready health check
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Labels
LABEL maintainer="DB Migration Service"
LABEL description="Centralized database migration service using Alembic"

# Run migrations on startup
CMD ["./entrypoint.sh"]
