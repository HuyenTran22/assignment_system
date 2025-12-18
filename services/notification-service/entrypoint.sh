#!/bin/bash
set -e

echo "[Notification Service] Waiting for database to be ready..."
until pg_isready -h db -p 5432 -U postgres; do
  echo "[Notification Service] Database is unavailable - sleeping"
  sleep 2
done
echo "[Notification Service] Database is ready!"

echo "[Notification Service] Waiting for migrations..."
sleep 15

echo "[Notification Service] Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8009
