# Deployment Troubleshooting Guide

## 🔍 Vấn Đề Hiện Tại

**Tất cả API calls bị lỗi 503 Service Unavailable**

### Triệu Chứng:
- Frontend: `unhealthy`
- Course-service: Chỉ `Up 3-11 seconds` (crash loop)
- API Gateway: `Connection error to course-service:8003`
- Tất cả API endpoints trả về 503

---

## 🚀 QUY TRÌNH FIX - TỪNG BƯỚC

### BƯỚC 1: Kiểm Tra Logs Course Service (QUAN TRỌNG NHẤT)

**Chạy trên VPS:**
```bash
# Xem logs chi tiết
docker logs course_service --tail 100

# Tìm lỗi cụ thể
docker logs course_service 2>&1 | grep -A 15 -B 5 "error\|Error\|Exception\|Traceback\|failed\|Failed" | tail -50
```

**Gửi kết quả này** - đây là bước quan trọng nhất để tìm nguyên nhân!

---

### BƯỚC 2: Kiểm Tra Database và Services

```bash
# 1. Kiểm tra database
docker ps | grep assignment_db
docker exec assignment_db pg_isready -U postgres

# 2. Kiểm tra tất cả services
docker ps

# 3. Kiểm tra network
docker network ls | grep web
docker network inspect app-network | grep -E "course_service|api_gateway"
```

---

### BƯỚC 3: Restart Services Theo Thứ Tự

```bash
# 1. Restart database
docker compose restart db
sleep 10

# 2. Restart user-service (để migrations chạy)
docker compose restart user-service
sleep 15

# 3. Restart course-service
docker compose restart course-service
sleep 15

# 4. Kiểm tra status
docker ps | grep -E "course_service|user_service|assignment_db"
docker logs course_service --tail 50
```

---

### BƯỚC 4: Kiểm Tra Kết Nối

```bash
# Test từ API Gateway đến course-service
docker exec api_gateway ping -c 2 course-service

# Test health endpoint
docker run --rm --network app-network curlimages/curl:latest curl http://course-service:8003/health

# Test API Gateway health
docker run --rm --network web curlimages/curl:latest curl http://api_gateway:8000/health
```

---

### BƯỚC 5: Nếu Vẫn Lỗi - Rebuild

```bash
# Rebuild course-service
docker compose build course-service
docker compose up -d course-service

# Đợi và kiểm tra
sleep 20
docker logs course_service --tail 50
```

---

### BƯỚC 6: Restart Toàn Bộ (Nếu Cần)

```bash
# Stop tất cả
docker compose down

# Start lại
docker compose up -d

# Đợi 30 giây
sleep 30

# Kiểm tra
docker ps
docker compose logs --tail 50
```

---

## 🔧 Script Debug Tự Động

Tạo file trên VPS: `debug_all.sh`

```bash
#!/bin/bash

echo "=========================================="
echo "DEBUG TẤT CẢ SERVICES"
echo "=========================================="
echo ""

echo "1. Containers Status:"
docker ps --format "table {{.Names}}\t{{.Status}}"
echo ""

echo "2. Course Service Logs (50 dòng):"
docker logs course_service --tail 50
echo ""

echo "3. Course Service Errors:"
docker logs course_service 2>&1 | grep -i "error\|exception" | tail -20
echo ""

echo "4. Database Check:"
docker exec assignment_db pg_isready -U postgres 2>&1
echo ""

echo "5. Network Check:"
docker network inspect app-network | grep -E "course_service|api_gateway" || echo "Not in network"
echo ""

echo "6. API Gateway → Course Service:"
docker exec api_gateway ping -c 2 course-service 2>&1 | head -5
echo ""

echo "7. Health Checks:"
echo "  - API Gateway:"
docker run --rm --network web curlimages/curl:latest curl -s http://api_gateway:8000/health 2>&1 || echo "FAILED"
echo "  - Course Service:"
docker run --rm --network app-network curlimages/curl:latest curl -s http://course-service:8003/health 2>&1 || echo "FAILED"
```

Chạy:
```bash
chmod +x debug_all.sh
./debug_all.sh > debug_output.txt 2>&1
cat debug_output.txt
```

---

## 📋 Các Lỗi Thường Gặp và Giải Pháp

### Lỗi 1: Database Connection Error
**Triệu chứng**: Logs có `database`, `connection`, `postgres`

**Giải pháp**:
```bash
docker compose restart db
sleep 10
docker compose restart course-service
```

### Lỗi 2: Course Service Crash Loop
**Triệu chứng**: Container chỉ "Up 3-11 seconds"

**Giải pháp**:
```bash
# Xem logs để tìm lỗi
docker logs course_service --tail 200

# Rebuild nếu cần
docker compose build course-service
docker compose up -d course-service
```

### Lỗi 3: Network Issue
**Triệu chứng**: `Connection error`, `All connection attempts failed`

**Giải pháp**:
```bash
# Kiểm tra network
docker network inspect app-network

# Restart services để join network
docker compose restart api-gateway course-service
```

### Lỗi 4: Missing Environment Variables
**Triệu chứng**: `DATABASE_URL`, `JWT_SECRET_KEY` not found

**Giải pháp**:
```bash
# Kiểm tra .env
cat .env | grep -E "DATABASE|JWT"

# Kiểm tra docker-compose.yml
docker compose config | grep -A 5 course-service
```

---

## 🎯 Checklist Fix

- [ ] **Bước 1**: Xem logs course-service và tìm lỗi cụ thể
- [ ] **Bước 2**: Kiểm tra database và services đang chạy
- [ ] **Bước 3**: Restart services theo thứ tự
- [ ] **Bước 4**: Kiểm tra kết nối giữa services
- [ ] **Bước 5**: Nếu vẫn lỗi, rebuild course-service
- [ ] **Bước 6**: Nếu vẫn không được, restart toàn bộ

---

## 📚 Tài Liệu Tham Khảo

- `PRODUCTION_CONFIG.md` - Cấu hình production
- `NGINX_PROXY_MANAGER_CONFIG.md` - Cấu hình NPM
- `FIX_API_ERROR_NGINX.md` - Fix lỗi Nginx

---

## 🆘 Nếu Vẫn Không Được

1. **Kiểm tra resources**:
   ```bash
   docker stats --no-stream
   free -h
   df -h
   ```

2. **Kiểm tra Docker logs**:
   ```bash
   sudo journalctl -u docker.service --tail 50
   ```

3. **Kiểm tra .env file**:
   ```bash
   cat .env
   ```

4. **Gửi thông tin debug**:
   ```bash
   ./debug_all.sh > debug_output.txt
   # Gửi file debug_output.txt
   ```

---

## 💡 Lưu Ý Quan Trọng

1. **Luôn xem logs trước** - logs sẽ cho biết nguyên nhân chính xác
2. **Restart theo thứ tự** - database → user-service → course-service
3. **Đợi đủ thời gian** - services cần thời gian để start
4. **Kiểm tra network** - services phải trong cùng network

**Bước quan trọng nhất: Chạy `docker logs course_service --tail 100` và gửi kết quả!**

