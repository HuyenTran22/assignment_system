#!/bin/bash
set -e

echo "[Submission Service] Waiting for database to be ready..."
until pg_isready -h db -p 5432 -U postgres; do
  echo "[Submission Service] Database is unavailable - sleeping"
  sleep 2
done
echo "[Submission Service] Database is ready!"

echo "[Submission Service] Waiting for migrations..."
sleep 15

echo "[Submission Service] Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8005
