#!/bin/bash

# Script kiểm tra tất cả services
# Usage: ./scripts/check_all_services.sh

set -e

echo "=========================================="
echo "KIỂM TRA TẤT CẢ SERVICES"
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

# 1. Kiểm tra containers
echo "1. Containers đang chạy:"
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}" | head -1
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "api_gateway|frontend|assignment_db|auth_service|course_service|user_service" || echo "  (Không tìm thấy containers)"

# 2. Kiểm tra network
echo ""
echo "2. Network web:"
if docker network ls | grep -q "web"; then
    print_status 0 "Network web tồn tại"
    if docker network inspect web 2>/dev/null | grep -q "api_gateway\|frontend"; then
        print_status 0 "Containers api_gateway và frontend trong network web"
    else
        print_status 1 "Containers KHÔNG trong network web"
        echo "  → Restart: docker compose down && docker compose up -d"
    fi
else
    print_status 1 "Network web KHÔNG tồn tại"
    echo "  → Chạy: docker network create web"
fi

# 3. Kiểm tra API Gateway
echo ""
echo "3. API Gateway:"
if docker ps | grep -q "api_gateway"; then
    print_status 0 "API Gateway đang chạy"
    if docker run --rm --network web curlimages/curl:latest curl -s -f http://api_gateway:8000/health > /dev/null 2>&1; then
        print_status 0 "API Gateway health check OK"
        HEALTH_RESPONSE=$(docker run --rm --network web curlimages/curl:latest curl -s http://api_gateway:8000/health 2>/dev/null || echo "N/A")
        echo "  Response: $HEALTH_RESPONSE"
    else
        print_status 1 "API Gateway health check FAILED"
        echo "  → Kiểm tra logs: docker logs api_gateway --tail 50"
    fi
else
    print_status 1 "API Gateway KHÔNG chạy"
    echo "  → Chạy: docker compose up -d api-gateway"
fi

# 4. Kiểm tra Database
echo ""
echo "4. Database:"
if docker ps | grep -q "assignment_db"; then
    print_status 0 "Database đang chạy"
else
    print_status 1 "Database KHÔNG chạy"
    echo "  → Chạy: docker compose up -d db"
fi

# 5. Kiểm tra Services
echo ""
echo "5. Microservices:"
SERVICES=("auth-service" "course-service" "user-service" "assignment-service" "submission-service")
for service in "${SERVICES[@]}"; do
    SERVICE_NAME="${service}_service"
    if docker ps | grep -q "$SERVICE_NAME"; then
        print_status 0 "$service đang chạy"
    else
        print_status 1 "$service KHÔNG chạy"
        echo "  → Chạy: docker compose up -d $service"
    fi
done

# 6. Kiểm tra CORS
echo ""
echo "6. CORS Configuration:"
CORS_ORIGINS=$(docker exec api_gateway env 2>/dev/null | grep CORS_ORIGINS | cut -d'=' -f2 || echo "N/A")
if echo "$CORS_ORIGINS" | grep -q "projectm.io.vn"; then
    print_status 0 "CORS_ORIGINS có projectm.io.vn: $CORS_ORIGINS"
else
    print_status 1 "CORS_ORIGINS không đúng: $CORS_ORIGINS"
    echo "  → Sửa trong .env: CORS_ORIGINS=https://projectm.io.vn,https://www.projectm.io.vn"
fi

# 7. Logs gần đây
echo ""
echo "7. Logs API Gateway (5 dòng cuối - errors only):"
docker logs api_gateway --tail 20 2>&1 | grep -i "error\|exception\|failed\|503\|502" | tail -5 || echo "  (Không có lỗi gần đây)"

echo ""
echo "=========================================="
echo "TÓM TẮT"
echo "=========================================="
echo ""
echo "Nếu có lỗi:"
echo "1. Restart toàn bộ: docker compose down && docker compose up -d"
echo "2. Kiểm tra logs: docker compose logs --tail 100"
echo "3. Kiểm tra network: docker network inspect web"
echo "4. Kiểm tra NPM cấu hình trong NPM UI"
echo ""
echo "Xem chi tiết trong: FIX_ALL_API_ERRORS.md"

