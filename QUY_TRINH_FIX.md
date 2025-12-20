# QUY TRÌNH FIX - CHẠY TỪNG BƯỚC

## ⚠️ VẤN ĐỀ HIỆN TẠI

- **Tất cả API calls bị lỗi 503**
- **Course-service đang crash loop** (chỉ Up 3-11 seconds)
- **Frontend unhealthy**

---

## 🎯 QUY TRÌNH FIX - 6 BƯỚC

### BƯỚC 1: XEM LOGS COURSE SERVICE ⭐ QUAN TRỌNG NHẤT

**Chạy trên VPS:**
```bash
docker logs course_service --tail 100
```

**Tìm lỗi cụ thể:**
```bash
docker logs course_service 2>&1 | grep -A 15 -B 5 "error\|Error\|Exception\|Traceback\|failed\|Failed" | tail -50
```

**👉 GỬI KẾT QUẢ NÀY CHO TÔI** - Đây là bước quan trọng nhất!

---

### BƯỚC 2: KIỂM TRA DATABASE VÀ SERVICES

```bash
# Kiểm tra database
docker ps | grep assignment_db
docker exec assignment_db pg_isready -U postgres

# Kiểm tra tất cả services
docker ps

# Kiểm tra network
docker network ls | grep web
docker network inspect app-network | grep -E "course_service|api_gateway"
```

---

### BƯỚC 3: RESTART SERVICES THEO THỨ TỰ

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

### BƯỚC 4: KIỂM TRA KẾT NỐI

```bash
# Test từ API Gateway đến course-service
docker exec api_gateway ping -c 2 course-service

# Test health endpoint
docker run --rm --network app-network curlimages/curl:latest curl http://course-service:8003/health

# Test API Gateway
docker run --rm --network web curlimages/curl:latest curl http://api_gateway:8000/health
```

---

### BƯỚC 5: NẾU VẪN LỖI - REBUILD

```bash
# Rebuild course-service
docker compose build course-service
docker compose up -d course-service

# Đợi và kiểm tra
sleep 20
docker logs course_service --tail 50
```

---

### BƯỚC 6: RESTART TOÀN BỘ (NẾU CẦN)

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

## 🔧 SCRIPT DEBUG TỰ ĐỘNG

**Tạo file trên VPS: `debug_all.sh`**

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

**Chạy:**
```bash
chmod +x debug_all.sh
./debug_all.sh > debug_output.txt 2>&1
cat debug_output.txt
```

---

## 📋 CHECKLIST

- [ ] **Bước 1**: Xem logs course-service và gửi kết quả
- [ ] **Bước 2**: Kiểm tra database và services
- [ ] **Bước 3**: Restart services theo thứ tự
- [ ] **Bước 4**: Kiểm tra kết nối
- [ ] **Bước 5**: Nếu vẫn lỗi, rebuild
- [ ] **Bước 6**: Nếu vẫn không được, restart toàn bộ

---

## 💡 LƯU Ý

1. **Luôn bắt đầu từ Bước 1** - xem logs để biết nguyên nhân
2. **Gửi kết quả logs** - tôi cần logs để fix chính xác
3. **Chạy từng bước** - đừng skip bước nào
4. **Đợi đủ thời gian** - services cần thời gian để start

---

## 🆘 NẾU VẪN KHÔNG ĐƯỢC

Gửi kết quả của:
```bash
docker logs course_service --tail 200 > course_logs.txt
./debug_all.sh > debug_output.txt
```

Và gửi 2 file này cho tôi!

