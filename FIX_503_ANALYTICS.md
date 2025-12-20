# Fix Lỗi 503 Service Unavailable - Analytics System

## 🔍 Vấn Đề

Frontend gọi `/api/courses/analytics/system` nhưng nhận lỗi **503 Service Unavailable**.

### Flow Request:
```
Frontend: /api/courses/analytics/system
  ↓
API Gateway: /api/courses/{path:path} → forward đến course-service
  ↓
Course Service: /courses/analytics/system
```

## 🔧 Các Nguyên Nhân Có Thể

### 1. Course Service Không Chạy
**Kiểm tra**:
```bash
docker ps | grep course_service
```

**Giải pháp**:
```bash
# Start course-service
docker compose up -d course-service

# Kiểm tra logs
docker logs course_service --tail 50
```

### 2. Course Service Không Thể Kết Nối Database
**Kiểm tra**:
```bash
# Kiểm tra database có chạy không
docker ps | grep assignment_db

# Kiểm tra logs course-service
docker logs course_service | grep -i "database\|connection\|error"
```

**Giải pháp**:
```bash
# Restart database
docker compose restart db

# Restart course-service
docker compose restart course-service
```

### 3. Network Issue - API Gateway Không Thể Kết Nối Course Service
**Kiểm tra**:
```bash
# Test từ trong network
docker run --rm --network app-network curlimages/curl:latest curl http://course-service:8003/health

# Hoặc test từ api-gateway container
docker exec api_gateway curl http://course-service:8003/health
```

**Giải pháp**:
- Đảm bảo cả api-gateway và course-service đều trong network `app-network`
- Kiểm tra docker-compose.yml có đúng cấu hình không

### 4. Timeout - Service Quá Tải
**Kiểm tra**:
```bash
# Kiểm tra logs api-gateway
docker logs api_gateway --tail 100 | grep -i "timeout\|503\|course-service"

# Kiểm tra logs course-service
docker logs course_service --tail 100 | grep -i "error\|timeout"
```

**Giải pháp**:
- Tăng timeout trong API Gateway
- Kiểm tra database query có chậm không
- Kiểm tra service có đang xử lý quá nhiều request không

### 5. Database Query Lỗi
**Kiểm tra**:
```bash
# Kiểm tra logs course-service chi tiết
docker logs course_service --tail 200 | grep -A 10 -B 10 "analytics/system\|error\|exception"
```

**Giải pháp**:
- Kiểm tra database schema có đúng không
- Kiểm tra migration có chạy đúng không
- Kiểm tra database connection string

## 🛠️ Script Kiểm Tra Tự Động

Tạo file `scripts/check_503_analytics.sh`:

```bash
#!/bin/bash

echo "=========================================="
echo "KIỂM TRA LỖI 503 - ANALYTICS SYSTEM"
echo "=========================================="
echo ""

# 1. Kiểm tra course-service có chạy không
echo "1. Kiểm tra course-service..."
if docker ps | grep -q "course_service"; then
    echo "✓ course-service đang chạy"
else
    echo "✗ course-service KHÔNG chạy"
    echo "  → Chạy: docker compose up -d course-service"
    exit 1
fi

# 2. Kiểm tra database có chạy không
echo ""
echo "2. Kiểm tra database..."
if docker ps | grep -q "assignment_db"; then
    echo "✓ database đang chạy"
else
    echo "✗ database KHÔNG chạy"
    echo "  → Chạy: docker compose up -d db"
    exit 1
fi

# 3. Kiểm tra course-service health
echo ""
echo "3. Kiểm tra course-service health..."
if docker run --rm --network app-network curlimages/curl:latest curl -s -f http://course-service:8003/health > /dev/null 2>&1; then
    echo "✓ course-service health check OK"
else
    echo "✗ course-service health check FAILED"
    echo "  → Kiểm tra logs: docker logs course_service --tail 50"
fi

# 4. Kiểm tra API Gateway có thể kết nối course-service
echo ""
echo "4. Kiểm tra API Gateway → course-service..."
if docker run --rm --network app-network curlimages/curl:latest curl -s -f http://course-service:8003/courses/analytics/system > /dev/null 2>&1; then
    echo "✓ API Gateway có thể kết nối course-service"
else
    echo "✗ API Gateway KHÔNG thể kết nối course-service"
    echo "  → Kiểm tra network: docker network inspect app-network"
fi

# 5. Kiểm tra logs gần đây
echo ""
echo "5. Logs course-service (10 dòng cuối):"
docker logs course_service --tail 10

echo ""
echo "6. Logs api-gateway liên quan đến course-service (10 dòng cuối):"
docker logs api_gateway --tail 20 | grep -i "course" | tail -10
```

## 🔍 Debug Chi Tiết

### Bước 1: Kiểm Tra Logs API Gateway
```bash
docker logs api_gateway -f | grep -i "course\|analytics\|503"
```

Khi frontend gọi `/api/courses/analytics/system`, bạn sẽ thấy trong logs:
```
[Gateway] Forwarding GET /courses/analytics/system to course at http://course-service:8003/courses/analytics/system
```

Nếu thấy lỗi:
- `Connection error` → course-service không chạy hoặc network issue
- `Timeout error` → course-service quá chậm
- `Service unavailable` → course-service không phản hồi

### Bước 2: Kiểm Tra Logs Course Service
```bash
docker logs course_service -f
```

Khi API Gateway forward request, bạn sẽ thấy trong logs course-service:
- Request đến endpoint `/courses/analytics/system`
- Database queries
- Lỗi nếu có

### Bước 3: Test Trực Tiếp Course Service
```bash
# Test health endpoint
docker exec api_gateway curl http://course-service:8003/health

# Test analytics endpoint (cần auth token)
docker exec api_gateway curl -H "Authorization: Bearer YOUR_TOKEN" http://course-service:8003/courses/analytics/system
```

### Bước 4: Kiểm Tra Database Connection
```bash
# Vào course-service container
docker exec -it course_service bash

# Test database connection (nếu có script)
# Hoặc kiểm tra env vars
env | grep DATABASE
```

## 🚀 Giải Pháp Nhanh

### Nếu Course Service Không Chạy:
```bash
docker compose up -d course-service
docker logs course_service --tail 50
```

### Nếu Database Connection Issue:
```bash
# Restart database và course-service
docker compose restart db
docker compose restart course-service

# Kiểm tra logs
docker logs course_service --tail 50 | grep -i database
```

### Nếu Network Issue:
```bash
# Kiểm tra network
docker network inspect app-network | grep -E "course_service|api_gateway"

# Restart cả 2 services
docker compose restart api-gateway course-service
```

### Nếu Timeout:
```bash
# Tăng timeout trong API Gateway (nếu cần)
# Hoặc kiểm tra database query performance
docker logs course_service | grep -i "slow\|timeout"
```

## 📋 Checklist

- [ ] Course-service đang chạy
- [ ] Database đang chạy
- [ ] Course-service có thể kết nối database
- [ ] API Gateway có thể kết nối course-service
- [ ] Network `app-network` đúng cấu hình
- [ ] Logs không có lỗi nghiêm trọng
- [ ] Database migration đã chạy

## 🔗 Xem Thêm

- `VAN_DE_CU_THE.md` - Vấn đề cụ thể về deployment
- `TROUBLESHOOTING_503.md` - Troubleshooting 503 chung
- `PHAN_TICH_VAN_DE_DEPLOY.md` - Phân tích chi tiết

