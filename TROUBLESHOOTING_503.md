# Troubleshooting 503 Service Unavailable

## 🔍 Nguyên Nhân 503 Error

503 Service Unavailable từ API Gateway có nghĩa là:
- API Gateway không thể kết nối đến microservice (course-service, assignment-service, etc.)
- Microservice không chạy hoặc không accessible
- Network issue giữa API Gateway và microservices

## 🚨 Các Bước Kiểm Tra Trên VPS

### 1. Kiểm Tra Tất Cả Services Đang Chạy

```bash
cd /root/apps/projectm/assignment_system
docker compose ps
```

**Kết quả mong đợi:** Tất cả services phải là "Up" và healthy

**Nếu có service nào "Exit" hoặc "Restarting":**
```bash
# Xem logs của service đó
docker compose logs course-service --tail 100
docker compose logs api-gateway --tail 100
```

### 2. Kiểm Tra Migration Đã Chạy Thành Công

```bash
docker compose logs db-migration
```

**Phải thấy:** "Migrations completed successfully!"

**Nếu migration fail:**
```bash
# Xem chi tiết lỗi
docker compose logs db-migration --tail 200

# Kiểm tra database
docker compose exec db psql -U postgres -d assignment_management -c "\dt"
```

### 3. Kiểm Tra API Gateway Có Thể Kết Nối Đến Services

```bash
# Test từ trong API Gateway container
docker compose exec api-gateway curl http://course-service:8003/health
docker compose exec api-gateway curl http://auth-service:8001/health
```

**Nếu không kết nối được:**
- Kiểm tra network: `docker network inspect assignment_system_app-network`
- Kiểm tra service URLs trong docker-compose.yml

### 4. Kiểm Tra Course Service Logs

```bash
docker compose logs course-service --tail 200
```

**Tìm các lỗi:**
- Database connection errors
- Import errors
- Startup errors

### 5. Kiểm Tra API Gateway Logs

```bash
docker compose logs api-gateway --tail 200
```

**Tìm các lỗi:**
- Connection errors
- Service unavailable messages
- Timeout errors

## 🔧 Các Fix Thường Gặp

### Fix 1: Restart Tất Cả Services

```bash
docker compose down
docker compose up -d
```

### Fix 2: Rebuild Services

```bash
docker compose down
docker compose build --no-cache course-service api-gateway
docker compose up -d
```

### Fix 3: Kiểm Tra Database Connection

```bash
# Test database connection
docker compose exec db psql -U postgres -d assignment_management -c "SELECT 1;"

# Nếu hỏi password, nhập: 123456
```

### Fix 4: Kiểm Tra Network

```bash
# Xem network configuration
docker network inspect assignment_system_app-network

# Kiểm tra services có trong network không
docker network inspect assignment_system_app-network | grep -A 5 "course_service"
docker network inspect assignment_system_app-network | grep -A 5 "api_gateway"
```

### Fix 5: Kiểm Tra Service URLs

Đảm bảo trong docker-compose.yml:
- `COURSE_SERVICE_URL: http://course-service:8003` (trong api-gateway)
- Course-service expose port 8003
- Cả hai đều ở network `app-network`

## 📋 Checklist Debugging

- [ ] Tất cả services đang chạy (`docker compose ps`)
- [ ] Migration đã chạy thành công (`docker compose logs db-migration`)
- [ ] Database có thể kết nối (`docker compose exec db psql ...`)
- [ ] API Gateway có thể kết nối đến course-service (`docker compose exec api-gateway curl ...`)
- [ ] Course-service logs không có lỗi (`docker compose logs course-service`)
- [ ] API Gateway logs không có connection errors (`docker compose logs api-gateway`)
- [ ] Network configuration đúng (`docker network inspect ...`)
- [ ] Service URLs đúng trong docker-compose.yml

## 🎯 Quick Fix Commands

```bash
# 1. Stop tất cả
docker compose down

# 2. Xóa volumes nếu cần (CHỈ KHI MUỐN RESET)
# docker volume rm assignment_system_postgres_data

# 3. Rebuild và start
docker compose build --no-cache
docker compose up -d

# 4. Kiểm tra logs
docker compose logs -f

# 5. Test API Gateway
curl https://api.projectm.io.vn/health
```

## 🔍 Debug Chi Tiết

### Xem Logs Real-time

```bash
# Tất cả services
docker compose logs -f

# Chỉ course-service
docker compose logs -f course-service

# Chỉ api-gateway
docker compose logs -f api-gateway
```

### Test Từ Container

```bash
# Test course-service từ api-gateway
docker compose exec api-gateway curl -v http://course-service:8003/courses

# Test database từ course-service
docker compose exec course-service python -c "from app.db import engine; print(engine.connect())"
```

### Kiểm Tra Environment Variables

```bash
# Xem env vars của api-gateway
docker compose exec api-gateway env | grep SERVICE_URL

# Xem env vars của course-service
docker compose exec course-service env | grep DATABASE_URL
```

## 📞 Nếu Vẫn Không Fix Được

1. **Gửi logs:**
   ```bash
   docker compose logs > all_logs.txt
   docker compose ps > services_status.txt
   ```

2. **Kiểm tra:**
   - Database password có đúng không (123456)
   - Network `web` có tồn tại không (`docker network ls | grep web`)
   - Ports có bị conflict không (`netstat -tulpn | grep 8000`)

3. **Restart Docker:**
   ```bash
   sudo systemctl restart docker
   docker compose up -d
   ```

