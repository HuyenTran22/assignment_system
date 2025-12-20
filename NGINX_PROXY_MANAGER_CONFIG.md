# Hướng Dẫn Cấu Hình Nginx Proxy Manager

## Vấn Đề
API error có thể do cấu hình sai trong Nginx Proxy Manager. File này hướng dẫn cấu hình đúng cho cả Frontend và API Gateway.

## Cấu Hình Proxy Hosts

### 1. Proxy Host cho API Gateway (`api.projectm.io.vn`)

#### Tab "Details"
- **Domain Names**: `api.projectm.io.vn`
- **Scheme**: `http`
- **Forward Hostname/IP**: `api_gateway` (tên container trong docker-compose)
- **Forward Port**: `8000`
- **Cache Assets**: ✅ Enabled (tùy chọn)
- **Block Common Exploits**: ✅ Enabled
- **Websockets Support**: ✅ **QUAN TRỌNG: Bật WebSocket support**

#### Tab "SSL"
- **SSL Certificate**: Chọn Let's Encrypt certificate
- **Force SSL**: ✅ Enabled
- **HTTP/2 Support**: ✅ Enabled
- **HSTS Enabled**: ✅ Enabled
- **HSTS Subdomains**: ✅ Enabled (nếu có subdomain)

#### Tab "Advanced" - QUAN TRỌNG NHẤT
Thêm các custom headers sau vào phần **Custom Nginx Configuration**:

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

# CORS headers (nếu cần)
add_header Access-Control-Allow-Origin "$http_origin" always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
add_header Access-Control-Allow-Credentials "true" always;

# Handle preflight requests
if ($request_method = 'OPTIONS') {
    add_header Access-Control-Allow-Origin "$http_origin" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials "true" always;
    add_header Access-Control-Max-Age 1728000;
    add_header Content-Type 'text/plain; charset=utf-8';
    add_header Content-Length 0;
    return 204;
}
```

### 2. Proxy Host cho Frontend (`projectm.io.vn` và `www.projectm.io.vn`)

#### Tab "Details"
- **Domain Names**: `projectm.io.vn`, `www.projectm.io.vn` (cả hai domain)
- **Scheme**: `http`
- **Forward Hostname/IP**: `frontend` (tên container trong docker-compose)
- **Forward Port**: `80`
- **Cache Assets**: ✅ Enabled
- **Block Common Exploits**: ✅ Enabled
- **Websockets Support**: ✅ Enabled (nếu có WebSocket trong frontend)

#### Tab "SSL"
- **SSL Certificate**: Chọn Let's Encrypt certificate
- **Force SSL**: ✅ Enabled
- **HTTP/2 Support**: ✅ Enabled
- **HSTS Enabled**: ✅ Enabled
- **HSTS Subdomains**: ✅ Enabled

#### Tab "Advanced"
Thêm các custom headers sau:

```nginx
# Custom headers for Frontend
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

## Kiểm Tra Cấu Hình

### 1. Kiểm tra Network trong Docker Compose
Đảm bảo cả `api_gateway` và `frontend` đều nằm trong network `web` (external network):

```yaml
networks:
  - app-network
  - web  # External network để Nginx Proxy Manager có thể truy cập
```

**QUAN TRỌNG**: Tạo network `web` nếu chưa có:
```bash
docker network create web
```

### 2. Kiểm tra CORS trong API Gateway
Đảm bảo `CORS_ORIGINS` trong docker-compose.yml bao gồm:
- `https://projectm.io.vn`
- `https://www.projectm.io.vn`

### 3. Kiểm tra Frontend API Base URL
Trong docker-compose.yml, frontend được build với:
```yaml
VITE_API_BASE_URL: https://api.projectm.io.vn
```

**Lưu ý về API Paths**:
- Frontend gọi `/auth/login` → `https://api.projectm.io.vn/auth/login` ✅
- Frontend gọi `/api/users/me/profile` → `https://api.projectm.io.vn/api/users/me/profile` ✅
- API Gateway có routes cho cả `/auth/{path}` và `/api/{service}/{path}`

### 4. Kiểm tra Forward Path trong Nginx Proxy Manager
**QUAN TRỌNG**: Trong tab "Details" của proxy host `api.projectm.io.vn`:
- **Forward Path**: Để TRỐNG (không điền gì)
- **Forward Scheme**: `http`
- **Forward Hostname/IP**: `api_gateway` (tên container)
- **Forward Port**: `8000`

**KHÔNG** thêm `/api` vào Forward Path vì API Gateway đã xử lý routing.

## Các Lỗi Thường Gặp và Cách Khắc Phục

### Lỗi 502 Bad Gateway
**Nguyên nhân**: Nginx Proxy Manager không thể kết nối đến container
**Giải pháp**:
1. Kiểm tra container có đang chạy không: `docker ps`
2. Kiểm tra network `web` có tồn tại không: `docker network ls`
3. Tạo network `web` nếu chưa có: `docker network create web`
4. Đảm bảo container nằm trong network `web`

### Lỗi CORS
**Nguyên nhân**: Headers CORS không được forward đúng
**Giải pháp**:
1. Thêm các headers `X-Forwarded-*` vào Advanced tab
2. Kiểm tra CORS_ORIGINS trong docker-compose.yml
3. Đảm bảo API Gateway có cấu hình CORS đúng

### Lỗi 503 Service Unavailable
**Nguyên nhân**: Timeout hoặc service không phản hồi
**Giải pháp**:
1. Tăng timeout trong Advanced tab:
   - `proxy_connect_timeout 75s;`
   - `proxy_send_timeout 300s;`
   - `proxy_read_timeout 300s;`
2. Kiểm tra logs của API Gateway: `docker logs api_gateway`

### Lỗi Authorization Header bị mất
**Nguyên nhân**: Headers không được forward đúng
**Giải pháp**:
1. Đảm bảo có `proxy_set_header Host $host;`
2. Không có `proxy_set_header Host $proxy_host;` (sai)
3. Kiểm tra trong Advanced tab có forward tất cả headers

## Debugging

### 1. Kiểm tra logs của Nginx Proxy Manager
```bash
docker logs <nginx-proxy-manager-container-name>
```

### 2. Kiểm tra logs của API Gateway
```bash
docker logs api_gateway
```

### 3. Test API trực tiếp từ container
```bash
# Test từ trong container
docker exec -it api_gateway curl http://localhost:8000/health

# Test từ host
curl http://localhost:8000/health
```

### 4. Test từ browser console
Mở browser console và kiểm tra:
- Network tab để xem request/response
- Console để xem lỗi CORS hoặc API errors

## Lưu Ý Quan Trọng

1. **WebSocket Support**: Phải bật WebSocket support cho cả frontend và API gateway nếu có sử dụng WebSocket
2. **X-Forwarded-* Headers**: Các headers này rất quan trọng để API Gateway biết được request đến từ đâu
3. **Network**: Đảm bảo cả frontend và api_gateway đều nằm trong network `web` (external)
4. **SSL**: Sử dụng Let's Encrypt để có SSL certificate tự động
5. **Timeout**: Tăng timeout nếu có các request lớn hoặc chậm

## Checklist Cấu Hình

Trước khi test, đảm bảo:

- [ ] Network `web` đã được tạo: `docker network create web`
- [ ] Containers đã được restart sau khi thêm vào network `web`
- [ ] Proxy host `api.projectm.io.vn` đã được cấu hình với:
  - [ ] Forward Hostname: `api_gateway`
  - [ ] Forward Port: `8000`
  - [ ] Forward Path: **TRỐNG** (không điền)
  - [ ] WebSocket Support: **BẬT**
  - [ ] SSL Certificate: Let's Encrypt
  - [ ] Force SSL: **BẬT**
  - [ ] Advanced tab: Đã thêm custom headers
- [ ] Proxy host `projectm.io.vn` đã được cấu hình với:
  - [ ] Forward Hostname: `frontend`
  - [ ] Forward Port: `80`
  - [ ] Forward Path: **TRỐNG**
  - [ ] SSL Certificate: Let's Encrypt
  - [ ] Force SSL: **BẬT**
- [ ] CORS_ORIGINS trong docker-compose.yml đã đúng
- [ ] VITE_API_BASE_URL trong docker-compose.yml = `https://api.projectm.io.vn`

## Sau Khi Cấu Hình

1. Lưu cấu hình trong Nginx Proxy Manager
2. Restart Nginx Proxy Manager (nếu cần)
3. Restart containers: `docker-compose restart`
4. Test lại API từ browser console:
   ```javascript
   // Test trong browser console
   fetch('https://api.projectm.io.vn/health')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error);
   ```
5. Kiểm tra logs nếu vẫn còn lỗi:
   ```bash
   docker logs api_gateway -f
   docker logs <nginx-proxy-manager-container> -f
   ```

## Test API Endpoints

Sau khi cấu hình, test các endpoints sau:

1. **Health Check**:
   ```bash
   curl https://api.projectm.io.vn/health
   ```

2. **API Gateway Root**:
   ```bash
   curl https://api.projectm.io.vn/
   ```

3. **Auth Endpoint** (không cần auth):
   ```bash
   curl -X POST https://api.projectm.io.vn/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test"}'
   ```

4. **Từ Browser Console**:
   ```javascript
   // Test với fetch
   fetch('https://api.projectm.io.vn/health', {
     method: 'GET',
     headers: {
       'Content-Type': 'application/json'
     }
   })
   .then(response => response.json())
   .then(data => console.log('Success:', data))
   .catch(error => console.error('Error:', error));
   ```

