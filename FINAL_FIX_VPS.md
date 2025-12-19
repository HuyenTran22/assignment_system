# Hướng Dẫn Fix Cuối Cùng Trên VPS

## Vấn Đề Đã Fix

1. ✅ **Duplicate `/api/api/` URL** - Fixed
2. ✅ **Dashboard 500 Error** - Fixed (empty course_ids queries)
3. ⚠️ **SMTP Email** - Cần config trong `.env`

---

## Bước 1: Pull Code Mới

```bash
cd ~/apps/projectm/assignment_system
git pull
```

## Bước 2: Kiểm Tra File `.env`

**Mở file `.env` và đảm bảo có các config sau:**

```env
# ============================================
# QUAN TRỌNG: VITE_API_BASE_URL
# ============================================
# KHÔNG set hoặc để trống (xóa dòng này nếu có)
# VITE_API_BASE_URL=

# ============================================
# SMTP EMAIL CONFIGURATION (BẮT BUỘC)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password-16-chars
SMTP_FROM=noreply@assignment.com
SMTP_FROM_EMAIL=noreply@assignment.com
SMTP_FROM_NAME=Assignment Management System
SMTP_USE_TLS=true

# ============================================
# FRONTEND URL (cho password reset links)
# ============================================
FRONTEND_URL=https://projectm.io.vn

# ============================================
# CORS CONFIGURATION
# ============================================
CORS_ORIGINS=https://projectm.io.vn,https://www.projectm.io.vn
```

### Lưu Ý Quan Trọng:

1. **VITE_API_BASE_URL**: 
   - ❌ KHÔNG set `VITE_API_BASE_URL=/api` (sẽ gây duplicate `/api/api/`)
   - ✅ Để trống hoặc xóa dòng này

2. **SMTP_PASSWORD**: 
   - Phải là **App Password** (16 ký tự), KHÔNG phải mật khẩu Gmail thông thường
   - Tạo App Password tại: https://myaccount.google.com/apppasswords
   - Format: `abcd efgh ijkl mnop` (có thể có hoặc không có dấu cách)

---

## Bước 3: Rebuild Services

```bash
# Rebuild frontend (quan trọng nếu đã thay đổi VITE_API_BASE_URL)
docker compose build frontend course-service

# Restart tất cả services
docker compose down
docker compose up -d
```

---

## Bước 4: Kiểm Tra Logs

### Kiểm tra Dashboard:
```bash
docker compose logs course-service --tail 100 | grep -i "dashboard\|error"
```

### Kiểm tra SMTP:
```bash
# User service logs
docker compose logs user-service --tail 100 | grep -i "smtp\|email"

# Auth service logs  
docker compose logs auth-service --tail 100 | grep -i "smtp\|email"

# Notification service logs
docker compose logs notification-service --tail 100 | grep -i "smtp\|email"
```

**Nếu thấy:**
- `SMTP not configured` → Kiểm tra lại `.env` có `SMTP_USER` và `SMTP_PASSWORD` chưa
- `Failed to send email` → Kiểm tra App Password có đúng không

---

## Bước 5: Test

### 1. Test Dashboard:
- Mở: `https://projectm.io.vn/dashboard`
- F12 → Console → Không còn lỗi 500
- Dashboard hiển thị data (có thể là 0 nếu chưa có data)

### 2. Test Email:
- Vào Admin → Users → Reset Password cho một user
- Tick "Send email"
- Kiểm tra email inbox
- Hoặc xem logs: `docker compose logs user-service | grep -i email`

---

## Troubleshooting

### Dashboard vẫn lỗi 500:

1. **Kiểm tra logs chi tiết:**
   ```bash
   docker compose logs course-service --tail 200
   ```
   Tìm dòng có `[Dashboard] Error` để xem lỗi cụ thể

2. **Kiểm tra database connection:**
   ```bash
   docker compose exec course-service python -c "from app.db import engine; engine.connect()"
   ```

3. **Kiểm tra service URLs:**
   ```bash
   docker compose exec course-service env | grep -i "ASSIGNMENT_SERVICE_URL\|GRADING_SERVICE_URL"
   ```

### Email không gửi được:

1. **Kiểm tra SMTP config:**
   ```bash
   docker compose exec user-service env | grep -i SMTP
   ```

2. **Test SMTP connection:**
   ```bash
   docker compose exec user-service python -c "
   import smtplib
   server = smtplib.SMTP('smtp.gmail.com', 587)
   server.starttls()
   server.login('YOUR_EMAIL', 'YOUR_APP_PASSWORD')
   print('SMTP OK')
   server.quit()
   "
   ```

3. **Kiểm tra Gmail App Password:**
   - Đảm bảo đã bật 2-Step Verification
   - Tạo App Password mới tại: https://myaccount.google.com/apppasswords
   - Copy App Password (16 ký tự) → Paste vào `.env` (có thể có hoặc không có dấu cách)

### URL vẫn duplicate `/api/api/`:

1. **Kiểm tra VITE_API_BASE_URL:**
   ```bash
   docker compose exec frontend env | grep VITE_API_BASE_URL
   ```
   Nếu thấy `/api` → Xóa trong `.env` và rebuild frontend

2. **Rebuild frontend:**
   ```bash
   docker compose build frontend
   docker compose up -d frontend
   ```

---

## Checklist Cuối Cùng

- [ ] Code đã pull về (`git pull`)
- [ ] `.env` đã xóa `VITE_API_BASE_URL=/api` (hoặc để trống)
- [ ] `.env` đã có đầy đủ SMTP config
- [ ] Frontend đã rebuild
- [ ] Tất cả services đã restart
- [ ] Dashboard load được (không còn 500)
- [ ] Email gửi được (test reset password)

---

## Nếu Vẫn Còn Lỗi

Cung cấp thông tin sau:

1. **Logs:**
   ```bash
   docker compose logs --tail 200 > logs.txt
   ```

2. **Environment variables:**
   ```bash
   docker compose config > docker-config.txt
   ```

3. **Browser console screenshot** (F12 → Console)

4. **File `.env`** (ẩn password, chỉ show tên biến)

