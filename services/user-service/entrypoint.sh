#!/bin/bash
set -e

echo "[User Service] Waiting for database to be ready..."
until pg_isready -h db -p 5432 -U postgres; do
  echo "[User Service] Database is unavailable - sleeping"
  sleep 2
done
echo "[User Service] Database is ready!"

echo "[User Service] Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8002
