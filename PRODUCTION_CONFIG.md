# Hướng Dẫn Cấu Hình Production

## Vấn Đề URL Duplicate `/api/api/`

### Nguyên nhân:
- Frontend code gọi API với prefix `/api/` (ví dụ: `/api/courses/analytics/dashboard`)
- Nếu `VITE_API_BASE_URL=/api` → URL thành `/api/api/courses/...` (SAI)

### Giải pháp:

**Option 1: Dùng Nginx Proxy (Khuyến nghị - Đã có sẵn)**

Frontend container đã có nginx proxy `/api/` → `api-gateway:8000`

**Cấu hình `.env`:**
```env
# KHÔNG set VITE_API_BASE_URL hoặc để trống
# VITE_API_BASE_URL=
```

**Hoặc không có dòng này trong .env**

Frontend sẽ dùng relative URL `/api/...` → nginx proxy → api-gateway

---

**Option 2: Dùng Absolute URL (Nếu frontend và API ở domain khác nhau)**

Nếu frontend ở `projectm.io.vn` và API ở `api.projectm.io.vn`:

**Cấu hình `.env`:**
```env
# Set base URL KHÔNG có /api ở cuối (code đã có /api prefix)
VITE_API_BASE_URL=https://api.projectm.io.vn
```

Frontend sẽ gọi: `https://api.projectm.io.vn` + `/api/courses/...` = `https://api.projectm.io.vn/api/courses/...` ✅

---

## Cấu Hình SMTP Email

Thêm vào `.env`:

```env
# SMTP Configuration
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

**Lưu ý Gmail:**
- Bật 2-Step Verification
- Tạo App Password tại: https://myaccount.google.com/apppasswords
- Dùng App Password (16 ký tự) làm `SMTP_PASSWORD`

---

## Cấu Hình CORS

Thêm vào `.env`:

```env
CORS_ORIGINS=https://projectm.io.vn,https://www.projectm.io.vn
```

---

## Checklist Deploy

1. **Kiểm tra `.env` có đúng config:**
   ```bash
   # Không set VITE_API_BASE_URL (hoặc để trống) nếu dùng nginx proxy
   # Hoặc set VITE_API_BASE_URL=https://api.projectm.io.vn nếu domain khác nhau
   
   # SMTP config đã có
   # CORS_ORIGINS đã có
   # FRONTEND_URL đã có
   ```

2. **Rebuild frontend (nếu thay đổi VITE_API_BASE_URL):**
   ```bash
   docker compose build frontend
   ```

3. **Restart tất cả services:**
   ```bash
   docker compose down
   docker compose up -d
   ```

4. **Kiểm tra logs:**
   ```bash
   docker compose logs frontend --tail 50
   docker compose logs api-gateway --tail 50
   docker compose logs course-service --tail 50
   ```

5. **Test API:**
   ```bash
   # Test từ browser console hoặc curl
   curl https://api.projectm.io.vn/api/courses/analytics/dashboard \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## Debugging

### Kiểm tra URL trong browser:
1. Mở `https://projectm.io.vn`
2. F12 → Console
3. Xem log `[API Request]` → check `fullURL`
4. Nếu thấy `/api/api/...` → VITE_API_BASE_URL đang set sai

### Kiểm tra nginx proxy:
```bash
docker compose exec frontend cat /etc/nginx/conf.d/default.conf | grep -A 10 "location /api"
```

### Test nginx proxy từ trong container:
```bash
docker compose exec frontend wget -O- http://api-gateway:8000/health
```

