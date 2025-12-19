# Hướng Dẫn Fix Các Vấn Đề Production

## Vấn Đề 1: Internal Server Error và Dashboard Không Hoạt Động

### Nguyên nhân:
- Dashboard endpoint (`/api/courses/analytics/dashboard`) có thể fail khi các service khác (assignment-service, grading-service) không khả dụng hoặc timeout
- Error handling chưa đầy đủ, khiến lỗi không được log rõ ràng

### Đã fix:
- ✅ Cải thiện error handling trong `services/course-service/app/api/analytics.py`
- ✅ Thêm timeout handling và error logging chi tiết hơn
- ✅ Dashboard sẽ trả về dữ liệu mặc định (0, null) nếu các service khác không khả dụng, thay vì fail hoàn toàn

### Cách kiểm tra:
```bash
# Check logs của course-service
docker compose logs course-service --tail 100

# Check logs của api-gateway
docker compose logs api-gateway --tail 100

# Test dashboard endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.projectm.io.vn/api/courses/analytics/dashboard
```

---

## Vấn Đề 2: Email Không Hoạt Động

### Nguyên nhân:
- SMTP configuration chưa được set trong docker-compose.yml
- Các service (auth-service, user-service, notification-service) không nhận được SMTP config từ environment

### Đã fix:
- ✅ Thêm SMTP environment variables vào docker-compose.yml cho:
  - `auth-service`
  - `user-service`
  - `notification-service`

### Cách cấu hình:

1. **Thêm vào file `.env` ở thư mục root:**

```env
# SMTP Configuration (cho tất cả services)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password-16-chars
SMTP_FROM=noreply@assignment.com
SMTP_FROM_EMAIL=noreply@assignment.com
SMTP_FROM_NAME=Assignment Management System
SMTP_USE_TLS=true

# Frontend URL (cho password reset links)
FRONTEND_URL=https://projectm.io.vn
```

2. **Nếu dùng Gmail:**
   - Bật 2-Step Verification
   - Tạo App Password tại: https://myaccount.google.com/apppasswords
   - Dùng App Password (16 ký tự) làm `SMTP_PASSWORD`

3. **Rebuild và restart services:**

```bash
docker compose down
docker compose build auth-service user-service notification-service
docker compose up -d
```

4. **Kiểm tra logs:**

```bash
# Check user-service logs
docker compose logs user-service --tail 50 | grep -i smtp

# Check notification-service logs
docker compose logs notification-service --tail 50 | grep -i smtp
```

---

## Vấn Đề 3: Frontend Không Gọi Được API (Domain Khác Nhau)

### Nguyên nhân:
- Frontend ở `https://projectm.io.vn`
- API ở `https://api.projectm.io.vn`
- Frontend đang dùng relative URL `/api` → không hoạt động khi domain khác nhau

### Giải pháp:

**Option 1: Dùng Nginx Proxy trong Frontend Container (Đã có sẵn)**
- Frontend container có nginx proxy `/api/` → `api-gateway:8000`
- Nginx Proxy Manager cần proxy cả 2 domain về cùng một nơi hoặc frontend container
- ✅ Đã có sẵn trong `frontend/nginx.conf`

**Option 2: Set Absolute URL trong Build (Khuyến nghị cho production)**

1. **Thêm vào `.env`:**

```env
# Frontend API Base URL (cho production)
VITE_API_BASE_URL=https://api.projectm.io.vn/api
```

2. **Rebuild frontend:**

```bash
docker compose build frontend
docker compose up -d frontend
```

3. **Kiểm tra:**

```bash
# Check frontend build logs
docker compose logs frontend --tail 50

# Test từ browser console:
# Mở https://projectm.io.vn
# F12 → Console → Check API calls
```

---

## Vấn Đề 4: CORS Vẫn Còn Lỗi

### Đã fix trước đó:
- ✅ API Gateway đã đọc `CORS_ORIGINS` từ env và split thành list

### Kiểm tra lại:

1. **Verify CORS config trong `.env`:**

```env
CORS_ORIGINS=https://projectm.io.vn,https://www.projectm.io.vn
```

2. **Verify trong container:**

```bash
docker compose config | grep CORS_ORIGINS
docker compose exec api-gateway env | grep CORS
```

3. **Test CORS:**

```bash
curl -i -X OPTIONS https://api.projectm.io.vn/api/auth/login \
  -H "Origin: https://projectm.io.vn" \
  -H "Access-Control-Request-Method: POST"
```

Nếu thấy `Access-Control-Allow-Origin: https://projectm.io.vn` → ✅ OK

---

## Checklist Sau Khi Fix

- [ ] Rebuild các service đã sửa:
  ```bash
  docker compose build course-service api-gateway auth-service user-service notification-service frontend
  ```

- [ ] Restart tất cả services:
  ```bash
  docker compose down
  docker compose up -d
  ```

- [ ] Kiểm tra logs:
  ```bash
  docker compose logs --tail 100
  ```

- [ ] Test các chức năng:
  - [ ] Đăng nhập/đăng ký
  - [ ] Dashboard (student và teacher)
  - [ ] Gửi email (forgot password)
  - [ ] Các API endpoints khác

- [ ] Kiểm tra health:
  ```bash
  docker compose ps
  curl https://api.projectm.io.vn/health
  ```

---

## Debugging Tips

### Xem logs real-time:
```bash
docker compose logs -f
```

### Xem logs của service cụ thể:
```bash
docker compose logs -f course-service
docker compose logs -f api-gateway
```

### Vào trong container để debug:
```bash
docker compose exec api-gateway sh
docker compose exec course-service sh
```

### Kiểm tra network:
```bash
docker network inspect assignment_system_app-network
```

### Test API từ trong container:
```bash
docker compose exec api-gateway wget -O- http://course-service:8003/health
```

---

## Liên Hệ Nếu Vẫn Còn Lỗi

Nếu sau khi làm theo hướng dẫn vẫn còn lỗi, cung cấp:
1. Logs của các service liên quan
2. Error message từ browser console
3. Response từ API khi test bằng curl
4. Cấu hình `.env` (ẩn sensitive info)

