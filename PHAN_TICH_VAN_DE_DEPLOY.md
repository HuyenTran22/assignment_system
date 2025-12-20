# Phân Tích Kỹ Lưỡng Các Vấn Đề Deploy VPS

## Tổng Quan Kiến Trúc

### Kiến Trúc Hiện Tại (Đã Xác Nhận)
1. **Frontend**: `https://projectm.io.vn` → Nginx Proxy Manager → `frontend:80` container
2. **Backend API**: `https://api.projectm.io.vn` → Nginx Proxy Manager → `api_gateway:8000` container
3. **Network**: Cả 2 containers đều trong network `web` (external) và `app-network` (internal)

### Flow Request
- Browser từ `https://projectm.io.vn` gọi API đến `https://api.projectm.io.vn/api/...`
- Nginx Proxy Manager nhận request và forward đến `api_gateway:8000`
- API Gateway xử lý routing và forward đến các microservices

---

## Vấn Đề 1: Cấu Hình VITE_API_BASE_URL

### Hiện Trạng
```yaml
# docker-compose.yml line 333
VITE_API_BASE_URL: ${VITE_API_BASE_URL:-https://api.projectm.io.vn}
```

### Phân Tích
- ✅ **Đúng**: Frontend sẽ gọi `https://api.projectm.io.vn/api/...` hoặc `https://api.projectm.io.vn/auth/...`
- ✅ **Đúng**: API Gateway có routes cho cả `/api/...` và `/auth/...`
- ⚠️ **Lưu ý**: Frontend nginx.conf có proxy `/api/` và `/auth/` nhưng KHÔNG được dùng vì frontend dùng absolute URL

### Kiểm Tra Cần Thiết
1. **Nginx Proxy Manager** phải forward `api.projectm.io.vn` → `api_gateway:8000` (port 8000)
2. **Forward Path** trong NPM phải ĐỂ TRỐNG (không có `/api` prefix)
3. **Network `web`** phải tồn tại và cả 2 containers phải trong network này

---

## Vấn Đề 2: CORS Configuration

### Hiện Trạng
```yaml
# docker-compose.yml line 68, 100, 132, etc.
CORS_ORIGINS: ${CORS_ORIGINS:-https://projectm.io.vn,https://www.projectm.io.vn}
```

### Phân Tích
- ✅ **Đúng**: CORS_ORIGINS chỉ cần origin của frontend (nơi browser chạy)
- ✅ **Đúng**: API Gateway đã đọc CORS_ORIGINS từ env và split thành list
- ⚠️ **Cần kiểm tra**: `.env` file có set CORS_ORIGINS đúng không?

### Vấn Đề Tiềm Ẩn
- Nếu `.env` không có `CORS_ORIGINS`, sẽ dùng default `https://projectm.io.vn,https://www.projectm.io.vn` ✅
- Nếu `.env` có `CORS_ORIGINS` nhưng sai format → CORS sẽ fail

---

## Vấn Đề 3: API Routing và Path Matching

### Frontend API Calls
Frontend gọi API với các pattern:
- `/api/courses/...` → API Gateway route `/api/courses/{path:path}` ✅
- `/api/auth/...` → API Gateway route `/api/auth/{path:path}` ✅
- `/auth/login` → API Gateway route `/auth/{path:path}` ✅

### Phân Tích
- ✅ **Đúng**: Tất cả routes đều có trong API Gateway
- ⚠️ **Lưu ý**: Một số routes có cả `/api/auth/...` và `/auth/...` (compatibility)

### Vấn Đề Tiềm Ẩn
- Nếu frontend gọi `/api/auth/login` nhưng code gọi `/auth/login` → có thể mismatch
- Cần kiểm tra: Frontend code có gọi đúng path không?

---

## Vấn Đề 4: Network Configuration

### Hiện Trạng
```yaml
# docker-compose.yml
networks:
  app-network:
    driver: bridge
  web:
    external: true
```

### Phân Tích
- ✅ **Đúng**: `web` network là external (Nginx Proxy Manager có thể truy cập)
- ✅ **Đúng**: Cả `api-gateway` và `frontend` đều trong network `web`
- ⚠️ **Cần kiểm tra**: Network `web` có tồn tại trên VPS không?

### Vấn Đề Tiềm Ẩn
- Nếu network `web` chưa tạo → containers không thể join → NPM không thể kết nối
- Nếu containers không trong network `web` → NPM không thể resolve container names

---

## Vấn Đề 5: Nginx Proxy Manager Configuration

### Cấu Hình Cần Thiết

#### Proxy Host: `api.projectm.io.vn`
- **Forward Hostname/IP**: `api_gateway` (tên container, KHÔNG phải IP)
- **Forward Port**: `8000`
- **Forward Path**: **ĐỂ TRỐNG** (quan trọng!)
- **Scheme**: `http` (internal)
- **Websockets Support**: ✅ BẬT

#### Proxy Host: `projectm.io.vn`
- **Forward Hostname/IP**: `frontend` (tên container)
- **Forward Port**: `80`
- **Forward Path**: **ĐỂ TRỐNG**
- **Scheme**: `http` (internal)
- **Websockets Support**: ✅ BẬT

### Advanced Headers (cho cả 2)
```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Port $server_port;

proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

proxy_connect_timeout 75s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;
```

---

## Vấn Đề 6: Environment Variables

### Các Biến Môi Trường Quan Trọng

#### Trong `.env` file (cần kiểm tra):
```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres123
POSTGRES_DB=assignment_management

# CORS
CORS_ORIGINS=https://projectm.io.vn,https://www.projectm.io.vn

# Frontend URL (cho password reset, email links)
FRONTEND_URL=https://projectm.io.vn

# JWT
JWT_SECRET_KEY=super-secret-key-change-in-production-min-32-chars
JWT_ALGORITHM=HS256

# SMTP (nếu dùng email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@assignment.com

# Frontend API Base URL (optional, có default trong docker-compose.yml)
VITE_API_BASE_URL=https://api.projectm.io.vn
```

### Vấn Đề Tiềm Ẩn
- Nếu `.env` không tồn tại → dùng defaults từ docker-compose.yml
- Nếu `.env` có giá trị sai → có thể gây lỗi

---

## Checklist Kiểm Tra

### 1. Kiểm Tra Network
```bash
# Kiểm tra network web có tồn tại
docker network ls | grep web

# Nếu chưa có, tạo network
docker network create web

# Kiểm tra containers có trong network web không
docker network inspect web | grep -E "api_gateway|frontend"
```

### 2. Kiểm Tra Containers
```bash
# Kiểm tra containers có chạy không
docker ps | grep -E "api_gateway|frontend"

# Kiểm tra logs
docker logs api_gateway --tail 50
docker logs frontend --tail 50
```

### 3. Kiểm Tra Environment Variables
```bash
# Kiểm tra env vars trong container
docker exec api_gateway env | grep CORS
docker exec api_gateway env | grep AUTH_SERVICE_URL

# Kiểm tra docker-compose config
docker compose config | grep CORS
docker compose config | grep VITE_API_BASE_URL
```

### 4. Kiểm Tra API Gateway Health
```bash
# Test từ trong network
docker run --rm --network web curlimages/curl:latest curl http://api_gateway:8000/health

# Test từ host (nếu expose port)
curl http://localhost:8000/health
```

### 5. Kiểm Tra Nginx Proxy Manager
- Vào NPM UI → Proxy Hosts
- Kiểm tra `api.projectm.io.vn` có forward đúng không
- Kiểm tra `projectm.io.vn` có forward đúng không
- Kiểm tra SSL certificates có valid không

### 6. Test Từ Browser
```javascript
// Mở https://projectm.io.vn
// F12 → Console → Chạy:

// Test health endpoint
fetch('https://api.projectm.io.vn/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Test với auth (sẽ fail nhưng kiểm tra CORS)
fetch('https://api.projectm.io.vn/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({email: 'test', password: 'test'})
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

## Các Lỗi Thường Gặp và Giải Pháp

### Lỗi 1: 502 Bad Gateway
**Nguyên nhân**: Nginx Proxy Manager không thể kết nối đến container

**Giải pháp**:
1. Kiểm tra container có chạy: `docker ps | grep api_gateway`
2. Kiểm tra network: `docker network inspect web`
3. Đảm bảo Forward Hostname là `api_gateway` (tên container), không phải IP
4. Kiểm tra containers có trong network `web` không

### Lỗi 2: CORS Error
**Nguyên nhân**: Headers không được forward đúng hoặc CORS_ORIGINS sai

**Giải pháp**:
1. Thêm các `X-Forwarded-*` headers vào Advanced tab trong NPM
2. Kiểm tra CORS_ORIGINS trong `.env` hoặc docker-compose.yml
3. Đảm bảo có `proxy_set_header Host $host;` trong Advanced tab
4. Kiểm tra API Gateway logs: `docker logs api_gateway | grep CORS`

### Lỗi 3: 503 Service Unavailable
**Nguyên nhân**: Timeout hoặc service không phản hồi

**Giải pháp**:
1. Tăng timeout trong Advanced tab (proxy_read_timeout, proxy_connect_timeout)
2. Kiểm tra logs: `docker logs api_gateway`
3. Kiểm tra service có healthy không: `curl http://api_gateway:8000/health` (từ trong network)
4. Kiểm tra database connection: `docker logs api_gateway | grep -i database`

### Lỗi 4: Authorization Header Missing
**Nguyên nhân**: Headers không được forward

**Giải pháp**:
1. Đảm bảo có `proxy_set_header Host $host;` trong Advanced tab
2. KHÔNG có `proxy_set_header Host $proxy_host;` (sai)
3. Kiểm tra trong Advanced tab có forward tất cả headers
4. Kiểm tra browser console → Network tab → xem request headers

### Lỗi 5: 404 Not Found
**Nguyên nhân**: Route không tồn tại hoặc path sai

**Giải pháp**:
1. Kiểm tra API Gateway routes: `docker logs api_gateway | grep "Forwarding"`
2. Kiểm tra frontend code gọi đúng path không
3. Kiểm tra Forward Path trong NPM có để trống không (không có `/api` prefix)

---

## Giải Pháp Tổng Thể

### Bước 1: Tạo Network (nếu chưa có)
```bash
docker network create web
```

### Bước 2: Kiểm Tra và Sửa `.env` File
Tạo hoặc cập nhật `.env` với các giá trị đúng:
```env
CORS_ORIGINS=https://projectm.io.vn,https://www.projectm.io.vn
FRONTEND_URL=https://projectm.io.vn
VITE_API_BASE_URL=https://api.projectm.io.vn
```

### Bước 3: Rebuild và Restart
```bash
docker compose down
docker compose build
docker compose up -d
```

### Bước 4: Kiểm Tra Nginx Proxy Manager
- Vào NPM UI
- Kiểm tra cả 2 proxy hosts có cấu hình đúng không
- Kiểm tra Advanced tab có headers đúng không

### Bước 5: Test
- Test từ browser console
- Kiểm tra logs: `docker logs api_gateway -f`
- Kiểm tra network: `docker network inspect web`

---

## Kết Luận

Các vấn đề chính có thể xuất phát từ:
1. **Network `web` chưa tạo hoặc containers không trong network**
2. **Nginx Proxy Manager cấu hình sai** (Forward Hostname, Forward Path, Headers)
3. **Environment variables sai** (CORS_ORIGINS, VITE_API_BASE_URL)
4. **API Gateway không đọc đúng env vars**
5. **SSL certificates không valid hoặc chưa cấu hình**

Cần kiểm tra từng bước một và test kỹ lưỡng.

