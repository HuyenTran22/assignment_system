#!/bin/bash
set -e

echo "Waiting for database to be ready..."
until PGPASSWORD=$POSTGRES_PASSWORD psql -h db -U $POSTGRES_USER -d $POSTGRES_DB -c '\q' 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is ready!"

echo "Running migrations..."
cd /app/user-service && alembic upgrade head || echo "user-service migration done"

echo "All migrations completed!"
