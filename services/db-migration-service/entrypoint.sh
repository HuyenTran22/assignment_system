#!/bin/bash
# Database Migration Service Entrypoint
# This script waits for the database to be ready and runs Alembic migrations

set -e

echo "============================================"
echo "Database Migration Service Starting..."
echo "============================================"

# Database connection parameters from environment
DB_HOST=${DB_HOST:-assignment_db}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-assignment_management}

echo "Waiting for database to be ready..."
echo "Host: $DB_HOST, Port: $DB_PORT, Database: $DB_NAME"

# Wait for PostgreSQL to be ready (max 60 seconds)
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; then
        echo "Database is ready!"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting for database... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "ERROR: Database not ready after $MAX_RETRIES attempts"
    exit 1
fi

# Additional wait to ensure database is fully initialized
sleep 2

echo "============================================"
echo "Running Alembic migrations..."
echo "============================================"

# Check current revision
echo "Current revision:"
alembic current || echo "No current revision (new database)"

# Run migrations
echo ""
echo "Upgrading to head..."
alembic upgrade head

# Verify
echo ""
echo "Migration result:"
alembic current

echo "============================================"
echo "Migrations completed successfully!"
echo "============================================"

# Exit with success code
exit 0
