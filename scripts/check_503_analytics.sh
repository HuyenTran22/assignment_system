#!/bin/bash

# Script kiểm tra lỗi 503 - Analytics System
# Usage: ./scripts/check_503_analytics.sh

set -e

echo "=========================================="
echo "KIỂM TRA LỖI 503 - ANALYTICS SYSTEM"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

# 1. Kiểm tra course-service có chạy không
echo "1. Kiểm tra course-service..."
if docker ps | grep -q "course_service"; then
    print_status 0 "course-service đang chạy"
else
    print_status 1 "course-service KHÔNG chạy"
    echo "  → Chạy: docker compose up -d course-service"
    exit 1
fi

# 2. Kiểm tra database có chạy không
echo ""
echo "2. Kiểm tra database..."
if docker ps | grep -q "assignment_db"; then
    print_status 0 "database đang chạy"
else
    print_status 1 "database KHÔNG chạy"
    echo "  → Chạy: docker compose up -d db"
    exit 1
fi

# 3. Kiểm tra course-service health
echo ""
echo "3. Kiểm tra course-service health..."
if docker run --rm --network app-network curlimages/curl:latest curl -s -f http://course-service:8003/health > /dev/null 2>&1; then
    print_status 0 "course-service health check OK"
    HEALTH_RESPONSE=$(docker run --rm --network app-network curlimages/curl:latest curl -s http://course-service:8003/health)
    echo "  Response: $HEALTH_RESPONSE"
else
    print_status 1 "course-service health check FAILED"
    echo "  → Kiểm tra logs: docker logs course_service --tail 50"
fi

# 4. Kiểm tra API Gateway có thể kết nối course-service
echo ""
echo "4. Kiểm tra API Gateway → course-service..."
if docker run --rm --network app-network curlimages/curl:latest curl -s -f http://course-service:8003/courses > /dev/null 2>&1; then
    print_status 0 "API Gateway có thể kết nối course-service"
else
    print_status 1 "API Gateway KHÔNG thể kết nối course-service"
    echo "  → Kiểm tra network: docker network inspect app-network"
fi

# 5. Kiểm tra logs gần đây
echo ""
echo "5. Logs course-service (10 dòng cuối):"
docker logs course_service --tail 10 2>&1 | head -10

echo ""
echo "6. Logs api-gateway liên quan đến course-service (10 dòng cuối):"
docker logs api_gateway --tail 50 2>&1 | grep -i "course\|analytics\|503" | tail -10 || echo "  (Không có log liên quan)"

echo ""
echo "=========================================="
echo "TÓM TẮT"
echo "=========================================="
echo ""
echo "Nếu vẫn còn lỗi 503:"
echo "1. Kiểm tra logs chi tiết: docker logs course_service -f"
echo "2. Kiểm tra logs API Gateway: docker logs api_gateway -f"
echo "3. Kiểm tra database connection: docker logs course_service | grep -i database"
echo "4. Restart services: docker compose restart course-service api-gateway"

