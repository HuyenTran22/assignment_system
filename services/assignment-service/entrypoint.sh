#!/bin/bash
set -e

echo "[Assignment Service] Waiting for database to be ready..."
until pg_isready -h db -p 5432 -U postgres; do
  echo "[Assignment Service] Database is unavailable - sleeping"
  sleep 2
done
echo "[Assignment Service] Database is ready!"

echo "[Assignment Service] Waiting for user-service to complete migrations..."
sleep 15

echo "[Assignment Service] Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8004
