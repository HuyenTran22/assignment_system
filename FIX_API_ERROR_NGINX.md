# Fix API Error - Nginx Proxy Manager Configuration

## Vấn Đề
API error do cấu hình sai trong Nginx Proxy Manager.

## Giải Pháp Nhanh

### Bước 1: Kiểm tra Network
```bash
# Kiểm tra network web có tồn tại không
docker network ls | grep web

# Nếu chưa có, tạo network
docker network create web

# Kiểm tra containers có trong network web không
docker network inspect web
```

### Bước 2: Đảm Bảo Containers Trong Network Web
Trong `docker-compose.yml`, cả `api_gateway` và `frontend` phải có:
```yaml
networks:
  - app-network
  - web  # External network
```

Restart containers sau khi thêm network:
```bash
docker-compose down
docker-compose up -d
```

### Bước 3: Cấu Hình Nginx Proxy Manager

#### Proxy Host: `api.projectm.io.vn`

**Tab Details:**
- Domain Names: `api.projectm.io.vn`
- Scheme: `http`
- Forward Hostname/IP: `api_gateway` ⚠️ **Tên container, không phải IP**
- Forward Port: `8000`
- Forward Path: **ĐỂ TRỐNG** ⚠️ **QUAN TRỌNG**
- Cache Assets: ✅
- Block Common Exploits: ✅
- **Websockets Support: ✅ BẬT** ⚠️ **QUAN TRỌNG**

**Tab SSL:**
- SSL Certificate: Let's Encrypt
- Force SSL: ✅ Enabled
- HTTP/2 Support: ✅ Enabled

**Tab Advanced - Copy toàn bộ đoạn này:**
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

**Tab Details:**
- Domain Names: `projectm.io.vn`, `www.projectm.io.vn`
- Scheme: `http`
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

### Bước 4: Kiểm Tra Cấu Hình Docker Compose

Đảm bảo trong `docker-compose.yml`:

1. **CORS_ORIGINS** cho api-gateway:
```yaml
CORS_ORIGINS: https://projectm.io.vn,https://www.projectm.io.vn
```

2. **VITE_API_BASE_URL** cho frontend:
```yaml
VITE_API_BASE_URL: https://api.projectm.io.vn
```

3. **Network** cho cả api-gateway và frontend:
```yaml
networks:
  - app-network
  - web  # External network
```

### Bước 5: Restart và Test

```bash
# Restart containers
docker-compose restart

# Kiểm tra logs
docker logs api_gateway -f

# Test API
curl https://api.projectm.io.vn/health
```

### Bước 6: Test Từ Browser

Mở browser console và chạy:
```javascript
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

## Các Lỗi Thường Gặp

### 502 Bad Gateway
**Nguyên nhân**: Không kết nối được đến container
**Fix**:
1. Kiểm tra container có chạy: `docker ps | grep api_gateway`
2. Kiểm tra network: `docker network inspect web`
3. Đảm bảo Forward Hostname là `api_gateway` (tên container), không phải IP

### CORS Error
**Nguyên nhân**: Headers không được forward đúng
**Fix**:
1. Thêm các `X-Forwarded-*` headers vào Advanced tab
2. Kiểm tra CORS_ORIGINS trong docker-compose.yml
3. Đảm bảo có `proxy_set_header Host $host;`

### 503 Service Unavailable
**Nguyên nhân**: Timeout hoặc service không phản hồi
**Fix**:
1. Tăng timeout trong Advanced tab
2. Kiểm tra logs: `docker logs api_gateway`
3. Kiểm tra service có healthy không: `curl http://api_gateway:8000/health` (từ trong container network)

### Authorization Header Missing
**Nguyên nhân**: Headers không được forward
**Fix**:
1. Đảm bảo có `proxy_set_header Host $host;`
2. Không có `proxy_set_header Host $proxy_host;` (sai)
3. Kiểm tra trong Advanced tab có forward tất cả headers

## Debug Commands

```bash
# Kiểm tra network
docker network inspect web

# Kiểm tra containers
docker ps | grep -E "api_gateway|frontend"

# Test từ trong network
docker run --rm --network web curlimages/curl:latest curl http://api_gateway:8000/health

# Logs
docker logs api_gateway -f --tail 100
docker logs frontend -f --tail 100

# Restart
docker-compose restart api-gateway frontend
```

## Xem Chi Tiết

Xem file `NGINX_PROXY_MANAGER_CONFIG.md` để biết chi tiết đầy đủ.

