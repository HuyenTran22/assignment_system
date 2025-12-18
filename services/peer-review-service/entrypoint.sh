#!/bin/bash
set -e

echo "[Peer Review Service] Waiting for database to be ready..."
until pg_isready -h db -p 5432 -U postgres; do
  echo "[Peer Review Service] Database is unavailable - sleeping"
  sleep 2
done
echo "[Peer Review Service] Database is ready!"

echo "[Peer Review Service] Waiting for migrations..."
sleep 15

echo "[Peer Review Service] Starting application..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8007
