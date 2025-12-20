#!/bin/bash

# Script kiểm tra cấu hình deployment VPS
# Usage: ./scripts/check_deployment.sh

set -e

echo "=========================================="
echo "KIỂM TRA CẤU HÌNH DEPLOYMENT VPS"
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

# 1. Kiểm tra network web
echo "1. Kiểm tra Network 'web'..."
if docker network ls | grep -q "web"; then
    print_status 0 "Network 'web' tồn tại"
    
    # Kiểm tra containers có trong network không
    if docker network inspect web 2>/dev/null | grep -q "api_gateway\|frontend"; then
        print_status 0 "Containers api_gateway và frontend trong network 'web'"
    else
        print_status 1 "Containers api_gateway và frontend KHÔNG trong network 'web'"
        echo "  → Chạy: docker network create web (nếu chưa có)"
        echo "  → Restart containers: docker compose down && docker compose up -d"
    fi
else
    print_status 1 "Network 'web' KHÔNG tồn tại"
    echo "  → Chạy: docker network create web"
fi
echo ""

# 2. Kiểm tra containers đang chạy
echo "2. Kiểm tra Containers..."
if docker ps | grep -q "api_gateway"; then
    print_status 0 "Container api_gateway đang chạy"
else
    print_status 1 "Container api_gateway KHÔNG chạy"
    echo "  → Chạy: docker compose up -d api-gateway"
fi

if docker ps | grep -q "frontend"; then
    print_status 0 "Container frontend đang chạy"
else
    print_status 1 "Container frontend KHÔNG chạy"
    echo "  → Chạy: docker compose up -d frontend"
fi
echo ""

# 3. Kiểm tra environment variables
echo "3. Kiểm tra Environment Variables..."
if docker exec api_gateway env 2>/dev/null | grep -q "CORS_ORIGINS"; then
    CORS_ORIGINS=$(docker exec api_gateway env | grep CORS_ORIGINS | cut -d'=' -f2)
    if echo "$CORS_ORIGINS" | grep -q "projectm.io.vn"; then
        print_status 0 "CORS_ORIGINS có chứa projectm.io.vn: $CORS_ORIGINS"
    else
        print_status 1 "CORS_ORIGINS không chứa projectm.io.vn: $CORS_ORIGINS"
        echo "  → Sửa trong .env: CORS_ORIGINS=https://projectm.io.vn,https://www.projectm.io.vn"
    fi
else
    print_status 1 "CORS_ORIGINS không được set"
    echo "  → Thêm vào .env: CORS_ORIGINS=https://projectm.io.vn,https://www.projectm.io.vn"
fi
echo ""

# 4. Kiểm tra API Gateway health
echo "4. Kiểm tra API Gateway Health..."
if docker run --rm --network web curlimages/curl:latest curl -s -f http://api_gateway:8000/health > /dev/null 2>&1; then
    print_status 0 "API Gateway health check thành công"
    HEALTH_RESPONSE=$(docker run --rm --network web curlimages/curl:latest curl -s http://api_gateway:8000/health)
    echo "  Response: $HEALTH_RESPONSE"
else
    print_status 1 "API Gateway health check thất bại"
    echo "  → Kiểm tra logs: docker logs api_gateway --tail 50"
fi
echo ""

# 5. Kiểm tra API Gateway có thể kết nối đến services
echo "5. Kiểm tra API Gateway có thể kết nối đến services..."
SERVICES=("auth-service:8001" "user-service:8002" "course-service:8003")
for service in "${SERVICES[@]}"; do
    SERVICE_NAME=$(echo $service | cut -d':' -f1)
    SERVICE_PORT=$(echo $service | cut -d':' -f2)
    
    if docker run --rm --network app-network curlimages/curl:latest curl -s -f --connect-timeout 2 http://${SERVICE_NAME}:${SERVICE_PORT}/health > /dev/null 2>&1; then
        print_status 0 "API Gateway có thể kết nối đến $SERVICE_NAME"
    else
        print_status 1 "API Gateway KHÔNG thể kết nối đến $SERVICE_NAME"
        echo "  → Kiểm tra: docker logs $SERVICE_NAME --tail 50"
    fi
done
echo ""

# 6. Kiểm tra frontend build
echo "6. Kiểm tra Frontend Build..."
if docker exec frontend ls /usr/share/nginx/html/index.html > /dev/null 2>&1; then
    print_status 0 "Frontend đã được build (có index.html)"
    
    # Kiểm tra VITE_API_BASE_URL trong build (nếu có thể)
    if docker exec frontend cat /usr/share/nginx/html/index.html 2>/dev/null | grep -q "api.projectm.io.vn"; then
        print_status 0 "Frontend có reference đến api.projectm.io.vn"
    fi
else
    print_status 1 "Frontend chưa được build hoặc thiếu index.html"
    echo "  → Rebuild: docker compose build frontend && docker compose up -d frontend"
fi
echo ""

# 7. Kiểm tra database connection
echo "7. Kiểm tra Database Connection..."
if docker exec api_gateway ping -c 1 db > /dev/null 2>&1; then
    print_status 0 "API Gateway có thể ping database container"
    
    # Kiểm tra database có chạy không
    if docker ps | grep -q "assignment_db"; then
        print_status 0 "Database container đang chạy"
    else
        print_status 1 "Database container KHÔNG chạy"
        echo "  → Chạy: docker compose up -d db"
    fi
else
    print_status 1 "API Gateway KHÔNG thể ping database"
    echo "  → Kiểm tra network: docker network inspect app-network"
fi
echo ""

# 8. Kiểm tra ports expose
echo "8. Kiểm tra Ports Expose..."
if docker port api_gateway 2>/dev/null | grep -q "8000"; then
    print_status 0 "API Gateway expose port 8000"
else
    print_status 1 "API Gateway KHÔNG expose port 8000 (có thể đúng nếu dùng internal network)"
fi

if docker port frontend 2>/dev/null | grep -q "80"; then
    print_status 0 "Frontend expose port 80"
else
    print_status 1 "Frontend KHÔNG expose port 80 (có thể đúng nếu dùng internal network)"
fi
echo ""

# 9. Tóm tắt
echo "=========================================="
echo "TÓM TẮT"
echo "=========================================="
echo ""
echo "Các bước tiếp theo:"
echo "1. Kiểm tra Nginx Proxy Manager cấu hình:"
echo "   - api.projectm.io.vn → api_gateway:8000"
echo "   - projectm.io.vn → frontend:80"
echo "   - Forward Path: ĐỂ TRỐNG"
echo "   - Advanced headers: Xem PHAN_TICH_VAN_DE_DEPLOY.md"
echo ""
echo "2. Test từ browser:"
echo "   - Mở https://projectm.io.vn"
echo "   - F12 → Console → Test API calls"
echo ""
echo "3. Kiểm tra logs nếu có lỗi:"
echo "   - docker logs api_gateway -f"
echo "   - docker logs frontend -f"
echo ""
echo "Xem chi tiết trong file: PHAN_TICH_VAN_DE_DEPLOY.md"

