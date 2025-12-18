#!/bin/bash
set -e

echo "[Grading Service] Waiting for database to be ready..."
until pg_isready -h db -p 5432 -U postgres; do
  echo "[Grading Service] Database is unavailable - sleeping"
  sleep 2
done
echo "[Grading Service] Database is ready!"

echo "[Grading Service] Waiting for migrations..."
sleep 15

echo "[Grading Service] Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8006
