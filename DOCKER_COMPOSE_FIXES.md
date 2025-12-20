# Docker Compose Fixes - Complete Configuration

## Tổng Hợp Các Fix Đã Thực Hiện

### 1. Course Service
**Thiếu:**
- `ASSIGNMENT_SERVICE_URL` - Cần để gọi assignment-service từ dashboard
- `GRADING_SERVICE_URL` - Cần để lấy grades cho students
- `NOTIFICATION_SERVICE_URL` - Cần để gửi notifications (discussions, quizzes)
- `JWT_SECRET_KEY` - Cần để verify JWT tokens
- `CORS_ORIGINS` - Cần để xử lý CORS

**Đã thêm:**
```yaml
ASSIGNMENT_SERVICE_URL: http://assignment-service:8004
GRADING_SERVICE_URL: http://grading-service:8006
NOTIFICATION_SERVICE_URL: http://notification-service:8009
JWT_SECRET_KEY: ${JWT_SECRET_KEY:-...}
CORS_ORIGINS: ${CORS_ORIGINS:-...}
```

### 2. Assignment Service
**Thiếu:**
- `NOTIFICATION_SERVICE_URL` - Cần để gửi notification khi tạo assignment mới
- `JWT_SECRET_KEY` - Cần để verify JWT tokens
- `CORS_ORIGINS` - Cần để xử lý CORS

**Đã thêm:**
```yaml
NOTIFICATION_SERVICE_URL: http://notification-service:8009
JWT_SECRET_KEY: ${JWT_SECRET_KEY:-...}
CORS_ORIGINS: ${CORS_ORIGINS:-...}
```

### 3. Submission Service
**Thiếu:**
- `PLAGIARISM_SERVICE_URL` - Cần để gọi plagiarism check khi submit
- `JWT_SECRET_KEY` - Cần để verify JWT tokens
- `CORS_ORIGINS` - Cần để xử lý CORS

**Đã thêm:**
```yaml
PLAGIARISM_SERVICE_URL: http://plagiarism-service:8008
JWT_SECRET_KEY: ${JWT_SECRET_KEY:-...}
CORS_ORIGINS: ${CORS_ORIGINS:-...}
```

### 4. Grading Service
**Thiếu:**
- `JWT_SECRET_KEY` - Cần để verify JWT tokens
- `CORS_ORIGINS` - Cần để xử lý CORS

**Đã thêm:**
```yaml
JWT_SECRET_KEY: ${JWT_SECRET_KEY:-...}
CORS_ORIGINS: ${CORS_ORIGINS:-...}
```

### 5. Peer Review Service
**Thiếu:**
- `JWT_SECRET_KEY` - Cần để verify JWT tokens
- `CORS_ORIGINS` - Cần để xử lý CORS

**Đã thêm:**
```yaml
JWT_SECRET_KEY: ${JWT_SECRET_KEY:-...}
CORS_ORIGINS: ${CORS_ORIGINS:-...}
```

### 6. Plagiarism Service
**Thiếu:**
- `JWT_SECRET_KEY` - Cần để verify JWT tokens
- `CORS_ORIGINS` - Cần để xử lý CORS

**Đã thêm:**
```yaml
JWT_SECRET_KEY: ${JWT_SECRET_KEY:-...}
CORS_ORIGINS: ${CORS_ORIGINS:-...}
```

### 7. Notification Service
**Thiếu:**
- `JWT_SECRET_KEY` - Cần để verify JWT tokens
- `CORS_ORIGINS` - Cần để xử lý CORS

**Đã thêm:**
```yaml
JWT_SECRET_KEY: ${JWT_SECRET_KEY:-...}
CORS_ORIGINS: ${CORS_ORIGINS:-...}
```

### 8. Auth Service
**Thiếu:**
- `JWT_SECRET_KEY` - Cần để tạo và verify JWT tokens
- `CORS_ORIGINS` - Cần để xử lý CORS

**Đã thêm:**
```yaml
JWT_SECRET_KEY: ${JWT_SECRET_KEY:-...}
CORS_ORIGINS: ${CORS_ORIGINS:-...}
```

### 9. User Service
**Thiếu:**
- `JWT_SECRET_KEY` - Cần để verify JWT tokens
- `CORS_ORIGINS` - Cần để xử lý CORS

**Đã thêm:**
```yaml
JWT_SECRET_KEY: ${JWT_SECRET_KEY:-...}
CORS_ORIGINS: ${CORS_ORIGINS:-...}
```

## Service URLs Mapping

| Service | Port | Internal URL | Used By |
|---------|------|--------------|---------|
| auth-service | 8001 | http://auth-service:8001 | All services |
| user-service | 8002 | http://user-service:8002 | All services |
| course-service | 8003 | http://course-service:8003 | API Gateway |
| assignment-service | 8004 | http://assignment-service:8004 | course-service, API Gateway |
| submission-service | 8005 | http://submission-service:8005 | API Gateway |
| grading-service | 8006 | http://grading-service:8006 | course-service, API Gateway |
| peer-review-service | 8007 | http://peer-review-service:8007 | API Gateway |
| plagiarism-service | 8008 | http://plagiarism-service:8008 | submission-service |
| notification-service | 8009 | http://notification-service:8009 | course-service, assignment-service |

## Environment Variables Checklist

Tất cả services cần:
- ✅ `DATABASE_URL` - Database connection
- ✅ `JWT_SECRET_KEY` - JWT token signing (phải giống nhau cho tất cả services)
- ✅ `CORS_ORIGINS` - CORS allowed origins

Services cần SMTP:
- ✅ `auth-service` - Password reset emails
- ✅ `user-service` - Welcome emails, password reset
- ✅ `notification-service` - Notification emails

Services cần Service URLs:
- ✅ `course-service` - ASSIGNMENT_SERVICE_URL, GRADING_SERVICE_URL, NOTIFICATION_SERVICE_URL
- ✅ `assignment-service` - NOTIFICATION_SERVICE_URL
- ✅ `submission-service` - PLAGIARISM_SERVICE_URL

## Testing

Sau khi apply các fixes:

1. **Validate docker-compose.yml:**
   ```bash
   docker compose config --quiet
   ```

2. **Rebuild và restart:**
   ```bash
   docker compose down
   docker compose build
   docker compose up -d
   ```

3. **Kiểm tra logs:**
   ```bash
   docker compose logs course-service --tail 50
   docker compose logs assignment-service --tail 50
   docker compose logs submission-service --tail 50
   ```

4. **Test dashboard:**
   - Mở `https://projectm.io.vn/dashboard`
   - Không còn lỗi 500
   - Dashboard load được data

5. **Test notifications:**
   - Tạo assignment mới → Kiểm tra notification được tạo
   - Tạo discussion → Kiểm tra notification được tạo

