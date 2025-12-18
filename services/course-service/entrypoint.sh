#!/bin/bash
set -e

echo "[Course Service] Waiting for database to be ready..."
until pg_isready -h db -p 5432 -U postgres; do
  echo "[Course Service] Database is unavailable - sleeping"
  sleep 2
done
echo "[Course Service] Database is ready!"

echo "[Course Service] Waiting for user-service to complete migrations..."
sleep 15

echo "[Course Service] Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8003
