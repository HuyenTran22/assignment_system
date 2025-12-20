#!/bin/bash
# Script to check all services status and connectivity

echo "=========================================="
echo "Checking Docker Services Status"
echo "=========================================="
docker compose ps

echo ""
echo "=========================================="
echo "Checking Database Migration"
echo "=========================================="
docker compose logs db-migration --tail 20 | grep -i "completed\|error\|fail"

echo ""
echo "=========================================="
echo "Checking API Gateway Logs (last 20 lines)"
echo "=========================================="
docker compose logs api-gateway --tail 20

echo ""
echo "=========================================="
echo "Checking Course Service Logs (last 20 lines)"
echo "=========================================="
docker compose logs course-service --tail 20

echo ""
echo "=========================================="
echo "Testing API Gateway -> Course Service Connection"
echo "=========================================="
docker compose exec -T api-gateway curl -s http://course-service:8003/health || echo "FAILED: Cannot connect to course-service"

echo ""
echo "=========================================="
echo "Testing API Gateway -> Auth Service Connection"
echo "=========================================="
docker compose exec -T api-gateway curl -s http://auth-service:8001/health || echo "FAILED: Cannot connect to auth-service"

echo ""
echo "=========================================="
echo "Testing Database Connection"
echo "=========================================="
docker compose exec -T db psql -U postgres -d assignment_management -c "SELECT 1;" 2>&1 | head -5

echo ""
echo "=========================================="
echo "Checking Network Configuration"
echo "=========================================="
docker network inspect assignment_system_app-network --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || echo "Network not found"

echo ""
echo "=========================================="
echo "Done!"
echo "=========================================="

