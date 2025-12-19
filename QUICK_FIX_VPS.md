# Hướng Dẫn Fix Nhanh Trên VPS

## Bước 1: Pull Code Mới

```bash
cd ~/apps/projectm/assignment_system
git pull
```

## Bước 2: Kiểm Tra và Sửa File `.env`

**Mở file `.env` và đảm bảo:**

```env
# QUAN TRỌNG: KHÔNG set VITE_API_BASE_URL hoặc để trống
# Xóa dòng này nếu có: VITE_API_BASE_URL=/api
# Hoặc để: VITE_API_BASE_URL=

# SMTP Email (bắt buộc để gửi email)
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

# CORS (bắt buộc)
CORS_ORIGINS=https://projectm.io.vn,https://www.projectm.io.vn
```

**Lưu ý:** Nếu bạn đã set `VITE_API_BASE_URL=/api` trong `.env`, hãy **XÓA** dòng đó hoặc để trống.

## Bước 3: Rebuild Frontend

```bash
docker compose build frontend
```

## Bước 4: Restart Tất Cả Services

```bash
docker compose down
docker compose up -d
```

## Bước 5: Kiểm Tra Logs

```bash
# Check frontend logs
docker compose logs frontend --tail 50

# Check API gateway logs
docker compose logs api-gateway --tail 50

# Check course-service logs (dashboard)
docker compose logs course-service --tail 50

# Check user-service logs (email)
docker compose logs user-service --tail 50 | grep -i smtp
```

## Bước 6: Test

1. **Mở browser:** `https://projectm.io.vn/dashboard`
2. **F12 → Console** → Kiểm tra:
   - Không còn lỗi `/api/api/...`
   - API requests thành công
3. **Test email:** Thử forgot password → Kiểm tra email có nhận được không

## Nếu Vẫn Còn Lỗi

### Kiểm tra URL trong Console:
- Nếu thấy `/api/api/...` → Vẫn còn vấn đề với VITE_API_BASE_URL
- Kiểm tra lại `.env` đã xóa `VITE_API_BASE_URL=/api` chưa

### Kiểm tra SMTP:
```bash
# Xem logs chi tiết
docker compose logs user-service | grep -i "smtp\|email"

# Nếu thấy "SMTP not configured" → Kiểm tra lại .env có SMTP_USER và SMTP_PASSWORD chưa
```

### Kiểm tra API Gateway:
```bash
# Test health endpoint
curl https://api.projectm.io.vn/health

# Test với token
curl https://api.projectm.io.vn/api/courses/analytics/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Liên Hệ Nếu Vẫn Fail

Cung cấp:
1. Output của `docker compose logs --tail 100`
2. Screenshot browser console (F12)
3. Nội dung file `.env` (ẩn password)

