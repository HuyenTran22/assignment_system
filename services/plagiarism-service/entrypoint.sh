#!/bin/bash
set -e

echo "[Plagiarism Service] Waiting for database to be ready..."
until pg_isready -h db -p 5432 -U postgres; do
  echo "[Plagiarism Service] Database is unavailable - sleeping"
  sleep 2
done
echo "[Plagiarism Service] Database is ready!"

echo "[Plagiarism Service] Waiting for migrations..."
sleep 15

echo "[Plagiarism Service] Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8008
