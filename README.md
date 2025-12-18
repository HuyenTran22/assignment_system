# 🎓 Hệ Thống Quản Lý Khóa Học Trực Tuyến (LMS)

<div align="center">

![Python](https://img.shields.io/badge/Python-3.11-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)
![React](https://img.shields.io/badge/React-18.2-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-blue.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

**Nền tảng học tập trực tuyến hiện đại với kiến trúc Microservices**

[Tính Năng](#-tính-năng) • [Công Nghệ](#-công-nghệ) • [Cài Đặt](#-cài-đặt) • [Sử Dụng](#-sử-dụng) • [API](#-api-documentation)

</div>

---

## 📋 Mục Lục

- [Giới Thiệu](#-giới-thiệu)
- [Tính Năng](#-tính-năng)
- [Công Nghệ](#-công-nghệ)
- [Kiến Trúc](#-kiến-trúc)
- [Yêu Cầu Hệ Thống](#-yêu-cầu-hệ-thống)
- [Cài Đặt](#-cài-đặt)
- [Cấu Hình](#-cấu-hình)
- [Sử Dụng](#-sử-dụng)
- [API Documentation](#-api-documentation)
- [Troubleshooting](#-troubleshooting)
- [Đóng Góp](#-đóng-góp)
- [License](#-license)

---

## 🎯 Giới Thiệu

Hệ thống Quản lý Khóa học Trực tuyến (LMS - Learning Management System) là một nền tảng học tập hiện đại được xây dựng dựa trên kiến trúc **Microservices**, giúp tổ chức và cá nhân quản lý khóa học, học viên, và tương tác học tập một cách hiệu quả.

Dự án được thiết kế với mục tiêu:
- ✅ **Mở rộng dễ dàng**: Kiến trúc microservices cho phép scale từng service độc lập
- ✅ **Hiệu suất cao**: Sử dụng FastAPI và React để đảm bảo tốc độ xử lý nhanh
- ✅ **Bảo mật tốt**: Xác thực JWT, phân quyền role-based (RBAC)
- ✅ **Dễ triển khai**: Docker & Docker Compose cho deployment nhanh chóng
- ✅ **Tương tác thời gian thực**: Video call với Jitsi Meet integration

---

## ✨ Tính Năng

### 🔐 Quản Lý Người Dùng & Xác Thực
- Đăng ký, đăng nhập với JWT Authentication
- Phân quyền theo vai trò: Admin, Giảng viên, Học viên
- Quản lý thông tin cá nhân và avatar
- Forgot password & reset password

### 📚 Quản Lý Khóa Học
- Tạo và quản lý khóa học với thông tin chi tiết
- Upload thumbnail và tài liệu khóa học
- Tổ chức khóa học theo danh mục (categories)
- Quản lý bài học (lessons) và nội dung
- Đánh giá khóa học (rating & review)

### 🎓 Quản Lý Học Viên
- Đăng ký tham gia khóa học
- Theo dõi tiến độ học tập
- Hoàn thành bài học và đánh dấu progress
- Nhận chứng chỉ sau khi hoàn thành khóa học

### 📹 Video Call & Live Session
- Tích hợp **Jitsi Meet** cho video call trực tiếp
- Tạo phòng học trực tuyến cho khóa học
- Quản lý danh sách tham gia
- Hỗ trợ camera, microphone, chia sẻ màn hình
- Tương thích với nhiều trình duyệt (Chrome, Firefox, Edge, Cốc Cốc)

### 💳 Quản Lý Thanh Toán
- Thanh toán trực tuyến (VNPay, MoMo integration ready)
- Lịch sử giao dịch
- Quản lý đơn hàng và hoàn tiền

### 📊 Thống Kê & Báo Cáo
- Dashboard quản trị viên
- Thống kê doanh thu, học viên, khóa học
- Báo cáo chi tiết về hoạt động hệ thống

---

## 🚀 Công Nghệ

### Backend
- **FastAPI** (Python 3.11) - Modern web framework với hiệu suất cao
- **PostgreSQL 14** - Cơ sở dữ liệu quan hệ mạnh mẽ
- **SQLAlchemy** - ORM cho Python
- **Alembic** - Database migration tool
- **Pydantic** - Data validation
- **JWT** - Token-based authentication
- **Uvicorn** - ASGI server

### Frontend
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Material-UI (MUI)** - Component library
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Vite** - Build tool

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **Nginx** - Reverse proxy & load balancing
- **Jitsi Meet** - Video conferencing

### DevOps
- **Git** - Version control
- **Docker Hub** - Container registry
- **GitHub Actions** (ready) - CI/CD

---

## 🏗️ Kiến Trúc

```
┌─────────────────────────────────────────────────────────┐
│                      NGINX (Gateway)                     │
│                    Port 80 / 443                         │
└────────────┬────────────────────────────────────────────┘
             │
             ├──────────────┬──────────────┬───────────────┐
             │              │              │               │
             ▼              ▼              ▼               ▼
   ┌─────────────┐  ┌─────────────┐ ┌─────────────┐ ┌──────────┐
   │   Frontend  │  │    Auth     │ │   Course    │ │ Enrollment│
   │   (React)   │  │   Service   │ │   Service   │ │  Service │
   │  Port 3000  │  │  Port 8001  │ │  Port 8002  │ │ Port 8003│
   └─────────────┘  └──────┬──────┘ └──────┬──────┘ └─────┬────┘
                           │                │              │
                           └────────────────┴──────────────┘
                                          │
                                          ▼
                              ┌────────────────────┐
                              │   PostgreSQL 14    │
                              │     Port 5432      │
                              └────────────────────┘
```

### Microservices

1. **Auth Service** (`auth-service`) - Port 8001
   - Xác thực người dùng (JWT)
   - Quản lý vai trò và quyền hạn
   - Quản lý thông tin người dùng

2. **Course Service** (`course-service`) - Port 8002
   - Quản lý khóa học và bài học
   - Quản lý danh mục
   - Video call rooms (Jitsi integration)
   - Upload file và media

3. **Enrollment Service** (`enrollment-service`) - Port 8003
   - Quản lý đăng ký khóa học
   - Theo dõi tiến độ học tập
   - Quản lý chứng chỉ
   - Xử lý thanh toán

---

## 💻 Yêu Cầu Hệ Thống

### Development
- **Docker Desktop** (Windows/Mac) hoặc **Docker Engine** (Linux)
- **Docker Compose** v2.0+
- **Git**
- **Node.js 18+** (nếu develop frontend riêng)
- **Python 3.11+** (nếu develop backend riêng)

### Production
- **VPS/Server** với ít nhất:
  - 2 CPU cores
  - 4GB RAM
  - 20GB disk space
- **Domain name** và **SSL certificate** (khuyến nghị)
- **Docker & Docker Compose**

---

## 📦 Cài Đặt

### 1. Clone Repository

```bash
git clone https://github.com/HuyenTran22/assignment_system.git
cd assignment_system
```

### 2. Tạo File Môi Trường

Tạo file `.env` trong thư mục root:

```bash
cp .env.example .env
```

Chỉnh sửa file `.env` với thông tin của bạn:

```env
# Database
POSTGRES_USER=lms_user
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=lms_db

# JWT
SECRET_KEY=your_super_secret_jwt_key_here_min_32_chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Jitsi (Optional - defaults to meet.jit.si)
JITSI_DOMAIN=meet.jit.si
JITSI_APP_ID=
JITSI_APP_SECRET=

# CORS (adjust for production)
CORS_ORIGINS=["http://localhost:3000", "http://localhost"]
```

### 3. Build và Chạy Services

```bash
# Build tất cả services
docker compose build

# Chạy tất cả services
docker compose up -d
```

### 4. Khởi Tạo Database

```bash
# Chạy migrations cho từng service
docker compose exec auth-service alembic upgrade head
docker compose exec course-service alembic upgrade head
docker compose exec enrollment-service alembic upgrade head
```

### 5. Tạo Admin User (Optional)

```bash
docker compose exec auth-service python -m app.scripts.create_admin
```

### 6. Truy Cập Hệ Thống

- **Frontend**: http://localhost
- **API Gateway**: http://localhost/api
- **Auth API Docs**: http://localhost/api/auth/docs
- **Course API Docs**: http://localhost/api/courses/docs
- **Enrollment API Docs**: http://localhost/api/enrollment/docs

> **Note**: This project simulates course management functionality similar to Google Classroom with integrated live video capabilities using Jitsi platform.

---

## ⚙️ Cấu Hình

### Cấu Hình Jitsi (Video Call)

#### Sử Dụng Server Công Cộng (meet.jit.si)
Mặc định, hệ thống sử dụng server miễn phí của Jitsi. Không cần cấu hình thêm.

```env
JITSI_DOMAIN=meet.jit.si
```

#### Sử Dụng Self-Hosted Jitsi
Nếu bạn có Jitsi server riêng:

```env
JITSI_DOMAIN=jitsi.yourdomain.com
JITSI_APP_ID=your_app_id
JITSI_APP_SECRET=your_app_secret
```

### Cấu Hình HTTPS (Production)

1. Cập nhật `nginx/nginx.conf` với SSL certificates
2. Thêm SSL configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # ... rest of config
}
```

3. Rebuild và restart:

```bash
docker compose up -d --build nginx
```

### Cấu Hình Database Backup

```bash
# Backup database
docker compose exec postgres pg_dump -U lms_user lms_db > backup.sql

# Restore database
docker compose exec -T postgres psql -U lms_user lms_db < backup.sql
```

---

## 🎮 Sử Dụng

### Đăng Ký Tài Khoản

1. Truy cập http://localhost
2. Click "Đăng ký" và điền thông tin
3. Xác nhận email (nếu có cấu hình)

### Tạo Khóa Học (Giảng Viên)

1. Đăng nhập với tài khoản giảng viên
2. Vào "Khóa học của tôi" → "Tạo khóa học mới"
3. Điền thông tin khóa học và upload thumbnail
4. Thêm bài học và nội dung

### Tham Gia Khóa Học (Học Viên)

1. Duyệt danh sách khóa học
2. Xem chi tiết và đánh giá
3. Click "Đăng ký" để tham gia
4. Thanh toán (nếu là khóa học trả phí)
5. Bắt đầu học

### Video Call / Live Session

1. Giảng viên tạo phòng học trong khóa học
2. Học viên join vào phòng từ danh sách
3. Cho phép truy cập camera/microphone khi được hỏi
4. Tương tác trong phòng học trực tuyến

**Lưu ý về Camera/Microphone:**
- Đảm bảo trình duyệt có quyền truy cập camera/mic
- Với Cốc Cốc: Vào Settings → Privacy → Site settings → Camera/Microphone
- Whitelist `meet.jit.si` trong browser settings
- HTTPS là bắt buộc cho production

---

## 📖 API Documentation

Mỗi service cung cấp interactive API documentation (Swagger UI):

### Auth Service
- **URL**: http://localhost/api/auth/docs
- **Endpoints**:
  - `POST /api/auth/register` - Đăng ký người dùng mới
  - `POST /api/auth/login` - Đăng nhập
  - `GET /api/auth/me` - Lấy thông tin user hiện tại
  - `PUT /api/auth/profile` - Cập nhật profile

### Course Service
- **URL**: http://localhost/api/courses/docs
- **Endpoints**:
  - `GET /api/courses/courses` - Danh sách khóa học
  - `POST /api/courses/courses` - Tạo khóa học mới
  - `GET /api/courses/courses/{id}` - Chi tiết khóa học
  - `POST /api/courses/video-call/rooms` - Tạo phòng video call
  - `GET /api/courses/categories` - Danh sách danh mục

### Enrollment Service
- **URL**: http://localhost/api/enrollment/docs
- **Endpoints**:
  - `POST /api/enrollment/enrollments` - Đăng ký khóa học
  - `GET /api/enrollment/enrollments/my` - Khóa học của tôi
  - `PUT /api/enrollment/progress/{enrollment_id}` - Cập nhật tiến độ
  - `GET /api/enrollment/certificates/{enrollment_id}` - Lấy chứng chỉ

### Authentication

Hầu hết endpoints yêu cầu JWT token trong header:

```bash
Authorization: Bearer <your_jwt_token>
```

---

## 🔧 Troubleshooting

### Lỗi Khi Build Docker

```bash
# Xóa cache và rebuild
docker compose down -v
docker system prune -a
docker compose build --no-cache
docker compose up -d
```

### Database Connection Error

```bash
# Kiểm tra database container
docker compose ps postgres
docker compose logs postgres

# Restart database
docker compose restart postgres
```

### Frontend Không Load

```bash
# Kiểm tra logs
docker compose logs frontend

# Rebuild frontend
docker compose up -d --build frontend
```

### Video Call Không Hoạt Động

1. **Kiểm tra quyền Camera/Microphone**: Browser phải có quyền truy cập
2. **HTTPS Required**: Production cần HTTPS để camera/mic hoạt động
3. **Firewall**: Đảm bảo ports 80, 443 mở
4. **Browser Compatibility**: Test với Chrome/Firefox/Edge trước

### Port Conflicts

Nếu port đã được sử dụng, sửa trong `docker-compose.yml`:

```yaml
services:
  nginx:
    ports:
      - "8080:80"  # Change from 80 to 8080
```

---

## 🤝 Đóng Góp

Chúng tôi hoan nghênh mọi đóng góp! Để contribute:

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

### Coding Standards

- **Backend**: Follow PEP 8 (Python)
- **Frontend**: Follow Airbnb JavaScript Style Guide
- **Commits**: Use conventional commits format
- **Testing**: Viết tests cho features mới

---

## 📝 License

Dự án này được phân phối dưới giấy phép **MIT License**. Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

## 👥 Tác Giả & Liên Hệ

- **Developer**: HuyenTran22
- **GitHub**: [@HuyenTran22](https://github.com/HuyenTran22)
- **Repository**: [assignment_system](https://github.com/HuyenTran22/assignment_system)

---

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Amazing Python web framework
- [React](https://react.dev/) - UI library
- [Material-UI](https://mui.com/) - React component library
- [Jitsi Meet](https://jitsi.org/) - Open source video conferencing
- [Docker](https://www.docker.com/) - Containerization platform

---

<div align="center">

**⭐ Nếu bạn thấy dự án hữu ích, hãy cho một star nhé! ⭐**

Made with ❤️ for education and learning

[View on GitHub](https://github.com/HuyenTran22/assignment_system)

</div>

