# Deployment Fix - Final Version

## 🔧 Các Vấn Đề Đã Fix

### 1. Database Password
**Vấn đề:** Password DB trong docker-compose.yml là `postgres123` nhưng trên VPS đang dùng `123456`

**Fix:** Đổi tất cả password về `123456`:
- `POSTGRES_PASSWORD: 123456`
- `DATABASE_URL: postgresql://postgres:123456@db:5432/assignment_management`
- `DB_PASSWORD: 123456`

### 2. Migration Service
**Vấn đề:** Migration không chạy được do password sai

**Fix:** 
- Đã set đầy đủ environment variables cho db-migration:
  - `DATABASE_URL`
  - `DB_HOST: db`
  - `DB_PORT: 5432`
  - `DB_USER: postgres`
  - `DB_PASSWORD: 123456`
  - `DB_NAME: assignment_management`

### 3. 502 Bad Gateway
**Vấn đề:** API Gateway không start được do migration fail

**Fix:** 
- Migration sẽ chạy đúng với password đúng
- API Gateway sẽ start sau khi migration thành công
- Tất cả services đều depend on `db-migration: condition: service_completed_successfully`

## 📋 Cấu Hình Nginx Proxy Manager

### API Gateway
- **Domain:** `api.projectm.io.vn`
- **Forward to:** `http://api_gateway:8000`
- **Network:** `web` (external network)

### Frontend
- **Domain:** `projectm.io.vn` và `www.projectm.io.vn`
- **Forward to:** `http://frontend:80`
- **Network:** `web` (external network)

## 🚀 Deployment Steps

### Trên VPS:

1. **Pull code mới:**
   ```bash
   cd /root/apps/projectm/assignment_system
   git pull
   ```

2. **Stop tất cả services:**
   ```bash
   docker compose down
   ```

3. **Xóa volume database nếu cần (CHỈ KHI MUỐN RESET HOÀN TOÀN):**
   ```bash
   docker volume rm assignment_system_postgres_data
   ```

4. **Rebuild và start:**
   ```bash
   docker compose build --no-cache
   docker compose up -d
   ```

5. **Kiểm tra migration:**
   ```bash
   docker compose logs db-migration
   ```
   Phải thấy: "Migrations completed successfully!"

6. **Kiểm tra API Gateway:**
   ```bash
   docker compose logs api-gateway --tail 50
   ```
   Phải thấy: "Application startup complete"

7. **Kiểm tra tất cả services:**
   ```bash
   docker compose ps
   ```
   Tất cả phải là "Up" và healthy

8. **Test API:**
   ```bash
   curl https://api.projectm.io.vn/health
   ```
   Phải trả về: `{"status":"healthy","gateway":true}`

## 🔍 Troubleshooting

### Nếu migration vẫn fail:

1. **Kiểm tra database đã start chưa:**
   ```bash
   docker compose ps db
   docker compose logs db
   ```

2. **Kiểm tra password có đúng không:**
   ```bash
   docker compose exec db psql -U postgres -d assignment_management -c "SELECT 1;"
   ```
   Nếu hỏi password, nhập `123456`

3. **Kiểm tra migration logs:**
   ```bash
   docker compose logs db-migration --tail 100
   ```

### Nếu 502 Bad Gateway:

1. **Kiểm tra API Gateway:**
   ```bash
   docker compose logs api-gateway --tail 100
   docker compose ps api-gateway
   ```

2. **Kiểm tra Nginx Proxy Manager:**
   - Vào Nginx Proxy Manager UI
   - Kiểm tra proxy host `api.projectm.io.vn`
   - Đảm bảo forward to: `http://api_gateway:8000`
   - Đảm bảo network là `web`

3. **Test từ trong container:**
   ```bash
   docker compose exec api-gateway curl http://localhost:8000/health
   ```

### Nếu frontend không load:

1. **Kiểm tra frontend:**
   ```bash
   docker compose logs frontend --tail 50
   docker compose ps frontend
   ```

2. **Kiểm tra build args:**
   ```bash
   docker compose config | grep VITE_API_BASE_URL
   ```
   Phải là: `https://api.projectm.io.vn`

3. **Kiểm tra browser console:**
   - Mở DevTools (F12)
   - Xem Network tab
   - Kiểm tra API calls có đúng URL không

## ✅ Checklist

- [x] Database password đổi về `123456`
- [x] Tất cả DATABASE_URL đã update
- [x] db-migration có đầy đủ environment variables
- [x] API Gateway có CORS_ORIGINS đúng
- [x] Frontend có VITE_API_BASE_URL đúng
- [x] Tất cả services depend on db-migration
- [x] Network `web` là external (cho Nginx Proxy Manager)

## 📝 Notes

- **Database password:** `123456` (khớp với .env cũ trên VPS)
- **API Gateway:** Chạy trên port 8000, expose qua network `web`
- **Frontend:** Chạy trên port 80, expose qua network `web`
- **Migration:** Chạy một lần khi start, sau đó exit
- **Nginx Proxy Manager:** Kết nối qua Docker network `web`, không cần expose ports

