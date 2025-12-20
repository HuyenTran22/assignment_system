# Fix Course Service Crash - Connection Error

## 🔍 Vấn Đề Từ Logs

Từ logs API Gateway:
```
[Gateway] Connection error to course at http://course-service:8003/courses/analytics/system: All connection attempts failed
503 Service Unavailable
```

Và từ `docker ps`:
- `course-service`: `Up 3 seconds` (vừa restart)
- `frontend`: `unhealthy`

## 🎯 Nguyên Nhân Có Thể

### 1. Course Service Đang Crash Loop
**Triệu chứng**: Container chỉ "Up 3 seconds" sau khi restart

**Kiểm tra**:
```bash
# Xem logs course-service để tìm lỗi
docker logs course_service --tail 100

# Kiểm tra có crash không
docker logs course_service | grep -i "error\|exception\|traceback\|failed"
```

**Nguyên nhân thường gặp**:
- Database connection error
- Missing environment variables
- Code error trong service
- Port conflict

### 2. Database Connection Issue
**Kiểm tra**:
```bash
# Kiểm tra database có chạy không
docker ps | grep assignment_db

# Kiểm tra course-service có thể kết nối database không
docker logs course_service | grep -i "database\|connection\|postgres"
```

**Giải pháp**:
```bash
# Restart database
docker compose restart db

# Đợi database ready
sleep 10

# Restart course-service
docker compose restart course-service

# Kiểm tra logs
docker logs course_service --tail 50
```

### 3. Network Issue - Course Service Không Trong Network
**Kiểm tra**:
```bash
# Kiểm tra course-service có trong app-network không
docker network inspect app-network | grep course_service

# Test kết nối từ api-gateway đến course-service
docker exec api_gateway ping -c 2 course-service
```

**Giải pháp**:
```bash
# Restart để join network
docker compose restart course-service api-gateway
```

### 4. Course Service Không Start Đúng
**Kiểm tra**:
```bash
# Xem entrypoint script
docker exec course_service cat /app/entrypoint.sh

# Kiểm tra environment variables
docker exec course_service env | grep -E "DATABASE|SERVICE"
```

## 🚀 Giải Pháp Nhanh

### Bước 1: Kiểm Tra Logs Course Service
```bash
# Xem logs chi tiết
docker logs course_service --tail 200

# Tìm lỗi cụ thể
docker logs course_service 2>&1 | grep -A 10 -B 10 "error\|exception\|traceback\|failed"
```

### Bước 2: Kiểm Tra Database Connection
```bash
# Test database connection từ course-service
docker exec course_service python -c "
import os
from sqlalchemy import create_engine
db_url = os.getenv('DATABASE_URL')
print(f'Database URL: {db_url}')
try:
    engine = create_engine(db_url)
    with engine.connect() as conn:
        print('Database connection OK')
except Exception as e:
    print(f'Database connection FAILED: {e}')
"
```

### Bước 3: Restart Course Service
```bash
# Stop course-service
docker compose stop course-service

# Start lại
docker compose up -d course-service

# Đợi và kiểm tra
sleep 10
docker ps | grep course_service
docker logs course_service --tail 50
```

### Bước 4: Kiểm Tra Health Check
```bash
# Test health endpoint
docker run --rm --network app-network curlimages/curl:latest curl http://course-service:8003/health

# Hoặc từ api-gateway
docker exec api_gateway curl http://course-service:8003/health
```

## 🔧 Script Debug Trực Tiếp

Tạo file trên VPS: `debug_course_service.sh`

```bash
#!/bin/bash

echo "=========================================="
echo "DEBUG COURSE SERVICE"
echo "=========================================="
echo ""

echo "1. Container Status:"
docker ps | grep course_service

echo ""
echo "2. Logs (50 dòng cuối):"
docker logs course_service --tail 50

echo ""
echo "3. Errors trong logs:"
docker logs course_service 2>&1 | grep -i "error\|exception\|traceback\|failed" | tail -20

echo ""
echo "4. Database Connection Test:"
docker exec course_service env | grep DATABASE_URL

echo ""
echo "5. Network Test:"
docker exec api_gateway ping -c 2 course-service 2>&1 | head -5

echo ""
echo "6. Health Check:"
docker run --rm --network app-network curlimages/curl:latest curl -s http://course-service:8003/health || echo "FAILED"
```

Chạy:
```bash
chmod +x debug_course_service.sh
./debug_course_service.sh
```

## 📋 Checklist

- [ ] Course-service logs không có lỗi nghiêm trọng
- [ ] Database connection OK
- [ ] Course-service trong network `app-network`
- [ ] Health check endpoint trả về OK
- [ ] API Gateway có thể ping course-service
- [ ] Course-service không crash sau khi restart

## 🆘 Nếu Vẫn Crash

1. **Kiểm tra database migration**:
   ```bash
   docker logs db_migration
   ```

2. **Kiểm tra environment variables**:
   ```bash
   docker exec course_service env | grep -E "DATABASE|SERVICE|JWT"
   ```

3. **Rebuild course-service**:
   ```bash
   docker compose build course-service
   docker compose up -d course-service
   ```

4. **Kiểm tra resources**:
   ```bash
   docker stats course_service --no-stream
   ```

