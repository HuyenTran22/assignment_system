# Tóm Tắt Các Vấn Đề Deploy VPS

## 🔍 Phân Tích Tổng Quan

Sau khi kiểm tra kỹ lưỡng, đây là các vấn đề có thể xảy ra và cách khắc phục:

---

## ✅ Các Cấu Hình ĐÚNG

1. **docker-compose.yml**:
   - ✅ VITE_API_BASE_URL được set: `https://api.projectm.io.vn`
   - ✅ CORS_ORIGINS được set đúng: `https://projectm.io.vn,https://www.projectm.io.vn`
   - ✅ Network `web` được khai báo là external
   - ✅ Cả api-gateway và frontend đều trong network `web`

2. **API Gateway**:
   - ✅ Đã đọc CORS_ORIGINS từ env và split thành list
   - ✅ Có routes cho cả `/api/...` và `/auth/...`
   - ✅ Service URLs được cấu hình đúng

3. **Frontend**:
   - ✅ Code gọi API với prefix `/api/...` hoặc `/auth/...`
   - ✅ API client sử dụng VITE_API_BASE_URL đúng cách

---

## ⚠️ Các Vấn Đề Có Thể Xảy Ra

### 1. Network `web` Chưa Tạo Hoặc Containers Không Trong Network

**Triệu chứng**:
- Nginx Proxy Manager không thể kết nối đến containers
- Lỗi 502 Bad Gateway

**Giải pháp**:
```bash
# Tạo network nếu chưa có
docker network create web

# Kiểm tra containers có trong network không
docker network inspect web

# Nếu không có, restart containers
docker compose down
docker compose up -d
```

---

### 2. Nginx Proxy Manager Cấu Hình Sai

**Triệu chứng**:
- 502 Bad Gateway
- 404 Not Found
- CORS errors

**Cấu hình đúng cần kiểm tra**:

#### Proxy Host: `api.projectm.io.vn`
- **Forward Hostname/IP**: `api_gateway` (tên container, KHÔNG phải IP)
- **Forward Port**: `8000`
- **Forward Path**: **ĐỂ TRỐNG** ⚠️ QUAN TRỌNG
- **Scheme**: `http`
- **Websockets Support**: ✅ BẬT

#### Proxy Host: `projectm.io.vn`
- **Forward Hostname/IP**: `frontend` (tên container)
- **Forward Port**: `80`
- **Forward Path**: **ĐỂ TRỐNG**
- **Scheme**: `http`
- **Websockets Support**: ✅ BẬT

#### Advanced Headers (cho cả 2):
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

### 3. Environment Variables Không Được Set Đúng

**Triệu chứng**:
- CORS errors
- API không hoạt động

**Kiểm tra**:
```bash
# Kiểm tra env vars trong container
docker exec api_gateway env | grep CORS
docker exec api_gateway env | grep AUTH_SERVICE_URL

# Kiểm tra docker-compose config
docker compose config | grep CORS
```

**File `.env` cần có**:
```env
CORS_ORIGINS=https://projectm.io.vn,https://www.projectm.io.vn
FRONTEND_URL=https://projectm.io.vn
VITE_API_BASE_URL=https://api.projectm.io.vn
```

---

### 4. API Gateway Không Thể Kết Nối Đến Services

**Triệu chứng**:
- 503 Service Unavailable
- Timeout errors

**Kiểm tra**:
```bash
# Test từ trong network
docker run --rm --network app-network curlimages/curl:latest curl http://auth-service:8001/health

# Kiểm tra logs
docker logs api_gateway | grep -i "connection\|timeout\|error"
```

**Giải pháp**:
- Đảm bảo tất cả services đang chạy: `docker ps`
- Kiểm tra services có trong network `app-network` không
- Kiểm tra database connection

---

### 5. Frontend Build Không Có VITE_API_BASE_URL

**Triệu chứng**:
- Frontend gọi API với relative URL thay vì absolute URL
- CORS errors hoặc 404

**Kiểm tra**:
```bash
# Kiểm tra frontend build
docker exec frontend cat /usr/share/nginx/html/index.html | grep -i "api"

# Rebuild nếu cần
docker compose build frontend
docker compose up -d frontend
```

---

## 🔧 Checklist Khắc Phục

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
docker ps | grep -E "api_gateway|frontend|assignment_db"

# Nếu không chạy, start lại
docker compose up -d
```

### Bước 3: Kiểm Tra Environment Variables
```bash
# Kiểm tra CORS_ORIGINS
docker exec api_gateway env | grep CORS

# Kiểm tra docker-compose config
docker compose config | grep CORS
```

### Bước 4: Kiểm Tra API Gateway
```bash
# Test health endpoint
docker run --rm --network web curlimages/curl:latest curl http://api_gateway:8000/health

# Kiểm tra logs
docker logs api_gateway --tail 50
```

### Bước 5: Kiểm Tra Nginx Proxy Manager
- Vào NPM UI → Proxy Hosts
- Kiểm tra cấu hình đúng như trên
- Kiểm tra SSL certificates

### Bước 6: Test Từ Browser
```javascript
// Mở https://projectm.io.vn
// F12 → Console → Chạy:

// Test health
fetch('https://api.projectm.io.vn/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

---

## 📋 Script Kiểm Tra Tự Động

Chạy script để kiểm tra tự động:
```bash
./scripts/check_deployment.sh
```

Script sẽ kiểm tra:
- ✅ Network `web` có tồn tại không
- ✅ Containers có trong network không
- ✅ Containers có đang chạy không
- ✅ Environment variables có đúng không
- ✅ API Gateway health check
- ✅ Database connection
- ✅ Frontend build

---

## 🎯 Các Lỗi Thường Gặp

### Lỗi 502 Bad Gateway
→ Nginx Proxy Manager không thể kết nối đến container
→ Kiểm tra: Network `web`, Forward Hostname, Containers đang chạy

### Lỗi CORS
→ Headers không được forward hoặc CORS_ORIGINS sai
→ Kiểm tra: Advanced headers trong NPM, CORS_ORIGINS trong env

### Lỗi 503 Service Unavailable
→ Timeout hoặc service không phản hồi
→ Kiểm tra: Services đang chạy, Database connection, Timeout settings

### Lỗi 404 Not Found
→ Route không tồn tại hoặc path sai
→ Kiểm tra: API Gateway routes, Frontend code gọi đúng path không

---

## 📚 Tài Liệu Tham Khảo

- **Chi tiết phân tích**: `PHAN_TICH_VAN_DE_DEPLOY.md`
- **Cấu hình Nginx Proxy Manager**: `NGINX_PROXY_MANAGER_CONFIG.md`
- **Fix API Error**: `FIX_API_ERROR_NGINX.md`
- **Production Config**: `PRODUCTION_CONFIG.md`

---

## 💡 Lưu Ý Quan Trọng

1. **Forward Path trong NPM phải ĐỂ TRỐNG** - không thêm `/api` prefix
2. **Forward Hostname phải là tên container** (`api_gateway`, `frontend`), không phải IP
3. **Network `web` phải là external** và containers phải trong network này
4. **CORS_ORIGINS chỉ cần origin của frontend**, không cần origin của API
5. **VITE_API_BASE_URL không có `/api` ở cuối** vì code đã có prefix `/api`

---

Nếu vẫn còn vấn đề sau khi kiểm tra các điểm trên, xem logs chi tiết:
```bash
docker logs api_gateway -f
docker logs frontend -f
docker logs auth-service -f
```

