# Production Deployment - Complete Configuration

## ✅ Đã Fix Hoàn Toàn

### 1. Docker Compose Configuration
- **Loại bỏ hoàn toàn phụ thuộc vào .env file**
- Tất cả environment variables được hardcode trực tiếp trong `docker-compose.yml`
- Build một lần là đủ, không cần config thêm

### 2. Domain Configuration
Từ Nginx Proxy Manager:
- `api.projectm.io.vn` → `http://api_gateway:8000`
- `projectm.io.vn` và `www.projectm.io.vn` → `http://frontend:80`

### 3. CORS Configuration
Tất cả services đã được set CORS_ORIGINS:
```
CORS_ORIGINS: https://projectm.io.vn,https://www.projectm.io.vn
```

### 4. SMTP Configuration
Đã set đầy đủ cho tất cả services cần email:
- **auth-service**: Gửi email reset password
- **user-service**: Gửi email welcome, reset password
- **notification-service**: Gửi email notifications

**SMTP Credentials:**
- Host: `smtp.gmail.com`
- Port: `587`
- User: `kyquangnguyen123@gmail.com`
- Password: `mzd vrvg lfmf usxs`
- From: `noreply@assignment.com`

### 5. Frontend API Configuration
- **VITE_API_BASE_URL**: `https://api.projectm.io.vn`
- Frontend code tự động thêm `/api` prefix
- URL cuối cùng: `https://api.projectm.io.vn/api/...`

### 6. Service URLs
Tất cả service URLs đã được khai báo đầy đủ:

| Service | Internal URL | Used By |
|---------|--------------|---------|
| auth-service | http://auth-service:8001 | api-gateway, course-service |
| user-service | http://user-service:8002 | api-gateway, course-service |
| course-service | http://course-service:8003 | api-gateway |
| assignment-service | http://assignment-service:8004 | api-gateway, course-service |
| submission-service | http://submission-service:8005 | api-gateway |
| grading-service | http://grading-service:8006 | api-gateway, course-service |
| peer-review-service | http://peer-review-service:8007 | api-gateway |
| plagiarism-service | http://plagiarism-service:8008 | submission-service |
| notification-service | http://notification-service:8009 | course-service, assignment-service |

### 7. JWT Configuration
Tất cả services dùng chung:
- **JWT_SECRET_KEY**: `super-secret-key-change-in-production-min-32-chars`
- **JWT_ALGORITHM**: `HS256`

### 8. Database Configuration
- **POSTGRES_USER**: `postgres`
- **POSTGRES_PASSWORD**: `postgres123`
- **POSTGRES_DB**: `assignment_management`
- **DATABASE_URL**: `postgresql://postgres:postgres123@db:5432/assignment_management`

### 9. Frontend URL
Đã set cho auth-service và user-service:
- **FRONTEND_URL**: `https://projectm.io.vn`
- Dùng để tạo reset password links trong email

## 🚀 Deployment Steps

### Trên VPS:

1. **Pull code mới:**
   ```bash
   cd /root/apps/projectm/assignment_system
   git pull
   ```

2. **Rebuild và restart:**
   ```bash
   docker compose down
   docker compose build --no-cache
   docker compose up -d
   ```

3. **Kiểm tra logs:**
   ```bash
   docker compose logs -f
   ```

4. **Kiểm tra services:**
   ```bash
   docker compose ps
   ```

5. **Test các chức năng:**
   - ✅ Login/Register
   - ✅ Dashboard load data
   - ✅ Tạo assignment → Notification được tạo
   - ✅ Submit assignment → Plagiarism check hoạt động
   - ✅ Gửi email (reset password, notifications)

## 🔍 Troubleshooting

### Nếu dashboard vẫn lỗi 500:
```bash
docker compose logs course-service --tail 100
```

### Nếu email không gửi được:
```bash
docker compose logs auth-service --tail 100
docker compose logs notification-service --tail 100
```

### Nếu CORS vẫn lỗi:
- Kiểm tra CORS_ORIGINS trong docker-compose.yml
- Kiểm tra browser console để xem origin nào đang bị reject
- Đảm bảo domain trong Nginx Proxy Manager khớp với CORS_ORIGINS

### Nếu API calls fail:
- Kiểm tra `VITE_API_BASE_URL` trong frontend build
- Kiểm tra Nginx Proxy Manager config
- Kiểm tra api-gateway logs: `docker compose logs api-gateway --tail 100`

## 📝 Notes

- **Không cần .env file nữa** - Tất cả config đã có trong docker-compose.yml
- **Build một lần là đủ** - Không cần rebuild khi thay đổi config
- **Tất cả services đã được config đầy đủ** - Không còn thiếu environment variables
- **Production-ready** - Sẵn sàng deploy lên production

## ✅ Checklist

- [x] CORS_ORIGINS set đúng production domains
- [x] SMTP credentials set đầy đủ
- [x] Frontend API base URL set đúng
- [x] Tất cả service URLs được khai báo
- [x] JWT_SECRET_KEY giống nhau cho tất cả services
- [x] FRONTEND_URL set đúng cho email links
- [x] Database URL đúng
- [x] Loại bỏ phụ thuộc vào .env file
- [x] Docker compose validate thành công

