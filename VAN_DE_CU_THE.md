# Vấn Đề Cụ Thể: Frontend và Backend Qua Nginx Proxy Manager

## ✅ Cấu Hình Hiện Tại (Đúng)

### Domain Setup
- **Frontend**: `https://projectm.io.vn` → Nginx Proxy Manager → `frontend:80` container
- **Backend API**: `https://api.projectm.io.vn` → Nginx Proxy Manager → `api_gateway:8000` container

### Frontend API Calls
Với `VITE_API_BASE_URL=https://api.projectm.io.vn`:
- Frontend code gọi: `/api/courses/...` 
- → Thành: `https://api.projectm.io.vn/api/courses/...` ✅
- Frontend code gọi: `/auth/login`
- → Thành: `https://api.projectm.io.vn/auth/login` ✅

### Flow Request
```
Browser (projectm.io.vn)
  ↓
Gọi: https://api.projectm.io.vn/api/courses
  ↓
Nginx Proxy Manager (api.projectm.io.vn)
  ↓
Forward đến: api_gateway:8000
  ↓
API Gateway xử lý route /api/courses
  ↓
Forward đến: course-service:8003
```

---

## ⚠️ Vấn Đề Có Thể Xảy Ra

### 1. Nginx Proxy Manager Cấu Hình Sai

#### Proxy Host: `api.projectm.io.vn`
**Cấu hình ĐÚNG cần kiểm tra**:

**Tab Details:**
- Domain Names: `api.projectm.io.vn`
- Scheme: `http` (internal)
- Forward Hostname/IP: `api_gateway` ⚠️ **Tên container, KHÔNG phải IP**
- Forward Port: `8000`
- Forward Path: **ĐỂ TRỐNG** ⚠️ **QUAN TRỌNG - không thêm `/api`**
- Cache Assets: ✅
- Block Common Exploits: ✅
- **Websockets Support: ✅ BẬT**

**Tab SSL:**
- SSL Certificate: Let's Encrypt
- Force SSL: ✅ Enabled
- HTTP/2 Support: ✅ Enabled

**Tab Advanced (Copy toàn bộ):**
```nginx
# Custom headers for API Gateway
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Port $server_port;

# WebSocket support
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

# Timeouts
proxy_connect_timeout 75s;
proxy_send_timeout 300s;
proxy_read_timeout 300s;

# Buffer settings
proxy_buffering off;
proxy_request_buffering off;
```

#### Proxy Host: `projectm.io.vn`
**Cấu hình ĐÚNG cần kiểm tra**:

**Tab Details:**
- Domain Names: `projectm.io.vn`, `www.projectm.io.vn`
- Scheme: `http` (internal)
- Forward Hostname/IP: `frontend` ⚠️ **Tên container**
- Forward Port: `80`
- Forward Path: **ĐỂ TRỐNG**
- Cache Assets: ✅
- Block Common Exploits: ✅
- Websockets Support: ✅

**Tab SSL:**
- SSL Certificate: Let's Encrypt
- Force SSL: ✅ Enabled

**Tab Advanced:**
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

### 2. Network `web` Chưa Tạo Hoặc Containers Không Trong Network

**Triệu chứng**: 502 Bad Gateway từ Nginx Proxy Manager

**Kiểm tra**:
```bash
# Kiểm tra network web có tồn tại
docker network ls | grep web

# Nếu chưa có, tạo network
docker network create web

# Kiểm tra containers có trong network không
docker network inspect web | grep -E "api_gateway|frontend"

# Nếu không có, restart containers
docker compose down
docker compose up -d
```

**Trong docker-compose.yml phải có**:
```yaml
networks:
  app-network:
    driver: bridge
  web:
    external: true  # ⚠️ QUAN TRỌNG: external network
```

Và cả `api-gateway` và `frontend` phải có:
```yaml
networks:
  - app-network
  - web  # ⚠️ QUAN TRỌNG: phải có network web
```

---

### 3. CORS Configuration

**Triệu chứng**: CORS error trong browser console

**Nguyên nhân**: 
- Browser từ `https://projectm.io.vn` gọi API đến `https://api.projectm.io.vn`
- API Gateway phải cho phép origin `https://projectm.io.vn`

**Kiểm tra**:
```bash
# Kiểm tra CORS_ORIGINS trong container
docker exec api_gateway env | grep CORS_ORIGINS

# Phải có: CORS_ORIGINS=https://projectm.io.vn,https://www.projectm.io.vn
```

**Trong docker-compose.yml**:
```yaml
api-gateway:
  environment:
    CORS_ORIGINS: ${CORS_ORIGINS:-https://projectm.io.vn,https://www.projectm.io.vn}
```

**Trong `.env` file** (nếu có):
```env
CORS_ORIGINS=https://projectm.io.vn,https://www.projectm.io.vn
```

**Lưu ý**: 
- ✅ CORS_ORIGINS chỉ cần origin của **frontend** (nơi browser chạy)
- ❌ KHÔNG cần thêm `https://api.projectm.io.vn` vào CORS_ORIGINS

---

### 4. Frontend nginx.conf Không Được Dùng

**Lưu ý quan trọng**:
- Frontend container có `nginx.conf` với proxy `/api/` → `api-gateway:8000`
- **NHƯNG** vì `VITE_API_BASE_URL=https://api.projectm.io.vn`, frontend dùng **absolute URL**
- → Frontend nginx.conf **KHÔNG được dùng** cho API calls
- → API calls đi trực tiếp qua Nginx Proxy Manager đến `api.projectm.io.vn`

**Điều này là ĐÚNG** vì:
- Frontend ở domain khác (`projectm.io.vn`)
- API ở domain khác (`api.projectm.io.vn`)
- Browser phải gọi cross-origin → cần absolute URL

**Frontend nginx.conf chỉ dùng khi**:
- `VITE_API_BASE_URL` không set hoặc empty
- Frontend dùng relative URL `/api/...`
- → Nginx trong frontend container sẽ proxy đến api-gateway

---

## 🔍 Checklist Kiểm Tra

### Bước 1: Kiểm Tra Network
```bash
# Tạo network nếu chưa có
docker network create web

# Kiểm tra containers có trong network
docker network inspect web | grep -E "api_gateway|frontend"
```

### Bước 2: Kiểm Tra Containers
```bash
# Kiểm tra containers đang chạy
docker ps | grep -E "api_gateway|frontend"

# Kiểm tra logs nếu có lỗi
docker logs api_gateway --tail 50
docker logs frontend --tail 50
```

### Bước 3: Kiểm Tra Nginx Proxy Manager
- Vào NPM UI → Proxy Hosts
- Kiểm tra `api.projectm.io.vn`:
  - Forward Hostname: `api_gateway` (tên container)
  - Forward Port: `8000`
  - Forward Path: **ĐỂ TRỐNG**
  - Advanced headers: Có đầy đủ như trên không?
- Kiểm tra `projectm.io.vn`:
  - Forward Hostname: `frontend`
  - Forward Port: `80`
  - Forward Path: **ĐỂ TRỐNG**

### Bước 4: Kiểm Tra CORS
```bash
# Kiểm tra CORS_ORIGINS
docker exec api_gateway env | grep CORS_ORIGINS

# Phải có: CORS_ORIGINS=https://projectm.io.vn,https://www.projectm.io.vn
```

### Bước 5: Test API Gateway Từ Trong Network
```bash
# Test health endpoint
docker run --rm --network web curlimages/curl:latest curl http://api_gateway:8000/health

# Phải trả về: {"status":"healthy","gateway":true}
```

### Bước 6: Test Từ Browser
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

## 🐛 Các Lỗi Thường Gặp

### Lỗi 1: 502 Bad Gateway
**Nguyên nhân**: Nginx Proxy Manager không thể kết nối đến container

**Giải pháp**:
1. Kiểm tra container có chạy: `docker ps | grep api_gateway`
2. Kiểm tra network: `docker network inspect web`
3. Đảm bảo Forward Hostname là `api_gateway` (tên container), không phải IP
4. Kiểm tra containers có trong network `web` không

### Lỗi 2: CORS Error
**Nguyên nhân**: CORS_ORIGINS không đúng hoặc headers không được forward

**Giải pháp**:
1. Kiểm tra CORS_ORIGINS: `docker exec api_gateway env | grep CORS`
2. Đảm bảo có `proxy_set_header Host $host;` trong Advanced tab
3. Kiểm tra API Gateway logs: `docker logs api_gateway | grep CORS`

### Lỗi 3: 404 Not Found
**Nguyên nhân**: Route không tồn tại hoặc Forward Path sai

**Giải pháp**:
1. Kiểm tra Forward Path trong NPM có để trống không
2. Kiểm tra API Gateway routes: `docker logs api_gateway | grep "Forwarding"`
3. Kiểm tra frontend code gọi đúng path không

### Lỗi 4: 503 Service Unavailable
**Nguyên nhân**: Timeout hoặc service không phản hồi

**Giải pháp**:
1. Tăng timeout trong Advanced tab
2. Kiểm tra logs: `docker logs api_gateway`
3. Kiểm tra services có healthy không

---

## 💡 Lưu Ý Quan Trọng

1. **Forward Path trong NPM phải ĐỂ TRỐNG** - API Gateway đã xử lý routing
2. **Forward Hostname phải là tên container** (`api_gateway`, `frontend`), không phải IP
3. **Network `web` phải là external** và containers phải trong network này
4. **CORS_ORIGINS chỉ cần origin của frontend**, không cần origin của API
5. **Frontend nginx.conf không được dùng** khi dùng absolute URL (VITE_API_BASE_URL set)

---

## 📋 Tóm Tắt

Với cấu hình hiện tại:
- ✅ Frontend: `https://projectm.io.vn` → `frontend:80`
- ✅ Backend: `https://api.projectm.io.vn` → `api_gateway:8000`
- ✅ Frontend gọi API: `https://api.projectm.io.vn/api/...` hoặc `https://api.projectm.io.vn/auth/...`

Vấn đề thường gặp:
1. Network `web` chưa tạo hoặc containers không trong network
2. Nginx Proxy Manager cấu hình sai (Forward Hostname, Forward Path, Headers)
3. CORS_ORIGINS không đúng
4. API Gateway không thể kết nối đến services

Kiểm tra từng bước một và test kỹ lưỡng!

