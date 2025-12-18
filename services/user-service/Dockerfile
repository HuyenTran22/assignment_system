FROM python:3.11-slim

WORKDIR /app

# Install PostgreSQL client for pg_isready
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Create uploads directory
RUN mkdir -p uploads

# Copy and set up entrypoint script
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Use entrypoint script
CMD ["./entrypoint.sh"]
