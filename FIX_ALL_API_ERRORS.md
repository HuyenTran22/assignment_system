# Fix Tất Cả Lỗi API - Hệ Thống Tổng Thể

## 🔍 Vấn Đề

**Tất cả các trang đều bị lỗi API**, không chỉ riêng một tính năng. Điều này cho thấy vấn đề ở **tầng hệ thống**, không phải code.

## 🎯 Các Nguyên Nhân Có Thể

### 1. API Gateway Không Chạy Hoặc Lỗi
**Triệu chứng**: Tất cả API calls đều fail

**Kiểm tra**:
```bash
# Kiểm tra API Gateway có chạy không
docker ps | grep api_gateway

# Kiểm tra logs
docker logs api_gateway --tail 100

# Test health endpoint
curl http://localhost:8000/health
# Hoặc từ trong network
docker run --rm --network web curlimages/curl:latest curl http://api_gateway:8000/health
```

**Giải pháp**:
```bash
# Restart API Gateway
docker compose restart api-gateway

# Hoặc rebuild nếu cần
docker compose up -d --build api-gateway
```

### 2. Network `web` Không Tồn Tại Hoặc Containers Không Trong Network
**Triệu chứng**: Nginx Proxy Manager không thể kết nối đến containers

**Kiểm tra**:
```bash
# Kiểm tra network web
docker network ls | grep web

# Kiểm tra containers có trong network không
docker network inspect web | grep -E "api_gateway|frontend"

# Nếu không có, tạo network
docker network create web
```

**Giải pháp**:
```bash
# Tạo network nếu chưa có
docker network create web

# Restart containers để join network
docker compose down
docker compose up -d
```

### 3. Nginx Proxy Manager Cấu Hình Sai
**Triệu chứng**: 502 Bad Gateway hoặc 503 Service Unavailable từ NPM

**Kiểm tra**:
- Vào NPM UI → Proxy Hosts
- Kiểm tra `api.projectm.io.vn`:
  - Forward Hostname: `api_gateway` (tên container)
  - Forward Port: `8000`
  - Forward Path: **ĐỂ TRỐNG**
  - Advanced headers: Có đầy đủ không?

**Giải pháp**:
- Sửa cấu hình trong NPM theo `VAN_DE_CU_THE.md`
- Restart proxy host trong NPM

### 4. CORS Configuration Sai
**Triệu chứng**: CORS errors trong browser console

**Kiểm tra**:
```bash
# Kiểm tra CORS_ORIGINS
docker exec api_gateway env | grep CORS_ORIGINS

# Phải có: CORS_ORIGINS=https://projectm.io.vn,https://www.projectm.io.vn
```

**Giải pháp**:
```bash
# Kiểm tra .env file
cat .env | grep CORS_ORIGINS

# Nếu sai, sửa và restart
docker compose restart api-gateway
```

### 5. Database Connection Issues
**Triệu chứng**: Services không thể kết nối database

**Kiểm tra**:
```bash
# Kiểm tra database có chạy không
docker ps | grep assignment_db

# Kiểm tra logs services
docker logs auth-service --tail 20 | grep -i database
docker logs course-service --tail 20 | grep -i database
```

**Giải pháp**:
```bash
# Restart database
docker compose restart db

# Restart tất cả services
docker compose restart
```

### 6. Tất Cả Services Không Chạy
**Triệu chứng**: Không có service nào phản hồi

**Kiểm tra**:
```bash
# Kiểm tra tất cả services
docker ps

# Kiểm tra services nào không chạy
docker compose ps
```

**Giải pháp**:
```bash
# Start tất cả services
docker compose up -d

# Kiểm tra logs
docker compose logs --tail 50
```

## 🚀 Giải Pháp Nhanh - Step by Step

### Bước 1: Kiểm Tra Tổng Thể
```bash
# Kiểm tra tất cả containers
docker ps

# Kiểm tra network
docker network ls
docker network inspect web

# Kiểm tra logs API Gateway
docker logs api_gateway --tail 50
```

### Bước 2: Restart Toàn Bộ Hệ Thống
```bash
# Stop tất cả
docker compose down

# Start lại
docker compose up -d

# Kiểm tra logs
docker compose logs --tail 100
```

### Bước 3: Kiểm Tra Network
```bash
# Tạo network web nếu chưa có
docker network create web

# Kiểm tra containers có trong network không
docker network inspect web | grep -E "api_gateway|frontend"

# Nếu không có, restart
docker compose down
docker compose up -d
```

### Bước 4: Kiểm Tra Nginx Proxy Manager
- Vào NPM UI
- Kiểm tra cả 2 proxy hosts có cấu hình đúng không
- Restart proxy hosts nếu cần

### Bước 5: Test Từ Browser
```javascript
// Mở https://projectm.io.vn
// F12 → Console → Chạy:

// Test health
fetch('https://api.projectm.io.vn/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

## 🔧 Script Kiểm Tra Tổng Thể

Tạo file `scripts/check_all_services.sh`:

```bash
#!/bin/bash

echo "=========================================="
echo "KIỂM TRA TẤT CẢ SERVICES"
echo "=========================================="
echo ""

# 1. Kiểm tra containers
echo "1. Containers đang chạy:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "api_gateway|frontend|assignment_db|auth_service|course_service"

# 2. Kiểm tra network
echo ""
echo "2. Network web:"
if docker network ls | grep -q "web"; then
    echo "✓ Network web tồn tại"
    docker network inspect web | grep -E "api_gateway|frontend" || echo "✗ Containers không trong network web"
else
    echo "✗ Network web KHÔNG tồn tại"
    echo "  → Chạy: docker network create web"
fi

# 3. Kiểm tra API Gateway
echo ""
echo "3. API Gateway:"
if docker ps | grep -q "api_gateway"; then
    echo "✓ API Gateway đang chạy"
    if docker run --rm --network web curlimages/curl:latest curl -s -f http://api_gateway:8000/health > /dev/null 2>&1; then
        echo "✓ API Gateway health check OK"
    else
        echo "✗ API Gateway health check FAILED"
    fi
else
    echo "✗ API Gateway KHÔNG chạy"
fi

# 4. Kiểm tra Database
echo ""
echo "4. Database:"
if docker ps | grep -q "assignment_db"; then
    echo "✓ Database đang chạy"
else
    echo "✗ Database KHÔNG chạy"
fi

# 5. Kiểm tra Services
echo ""
echo "5. Microservices:"
SERVICES=("auth-service:8001" "course-service:8003" "user-service:8002")
for service in "${SERVICES[@]}"; do
    SERVICE_NAME=$(echo $service | cut -d':' -f1)
    if docker ps | grep -q "$SERVICE_NAME"; then
        echo "✓ $SERVICE_NAME đang chạy"
    else
        echo "✗ $SERVICE_NAME KHÔNG chạy"
    fi
done

# 6. Logs gần đây
echo ""
echo "6. Logs API Gateway (5 dòng cuối):"
docker logs api_gateway --tail 5 2>&1

echo ""
echo "=========================================="
echo "TÓM TẮT"
echo "=========================================="
```

## 📋 Checklist Khắc Phục

- [ ] Tất cả containers đang chạy (`docker ps`)
- [ ] Network `web` tồn tại và containers trong network
- [ ] API Gateway health check OK
- [ ] Database đang chạy
- [ ] Nginx Proxy Manager cấu hình đúng
- [ ] CORS_ORIGINS đúng
- [ ] Không có lỗi trong logs

## 🔍 Debug Chi Tiết

### Xem Logs Tất Cả Services:
```bash
# Logs tất cả services
docker compose logs --tail 100

# Logs API Gateway
docker logs api_gateway -f

# Logs từng service
docker logs auth-service --tail 50
docker logs course-service --tail 50
docker logs user-service --tail 50
```

### Test Từng Service:
```bash
# Test API Gateway
curl http://api_gateway:8000/health

# Test từ trong network
docker run --rm --network web curlimages/curl:latest curl http://api_gateway:8000/health
docker run --rm --network app-network curlimages/curl:latest curl http://auth-service:8001/health
docker run --rm --network app-network curlimages/curl:latest curl http://course-service:8003/health
```

## 💡 Lưu Ý Quan Trọng

1. **Nếu trước đó deploy thành công** → Có thể do:
   - Cấu hình bị thay đổi
   - Services bị restart và không start lại đúng
   - Network bị mất
   - NPM cấu hình bị thay đổi

2. **Restart toàn bộ hệ thống** thường giải quyết được nhiều vấn đề:
   ```bash
   docker compose down
   docker compose up -d
   ```

3. **Kiểm tra logs** để tìm nguyên nhân cụ thể:
   ```bash
   docker compose logs --tail 200 | grep -i "error\|exception\|failed"
   ```

## 🆘 Nếu Vẫn Không Được

1. **Kiểm tra .env file** có đúng không
2. **Kiểm tra docker-compose.yml** có đúng không
3. **Kiểm tra NPM logs** trong NPM UI
4. **Kiểm tra VPS resources** (RAM, CPU, Disk)
5. **Restart Docker daemon** nếu cần:
   ```bash
   sudo systemctl restart docker
   ```

