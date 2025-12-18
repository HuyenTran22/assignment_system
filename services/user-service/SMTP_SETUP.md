# SMTP Email Configuration

Để gửi email (welcome email, password reset email), bạn cần cấu hình SMTP.

## Cách 1: Sử dụng file .env (Khuyến nghị)

Tạo file `.env` trong thư mục `services/user-service/` với nội dung:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com
FRONTEND_URL=http://localhost:3000
```

### Gmail Setup:

1. **Bật 2-Step Verification** cho tài khoản Gmail của bạn
2. **Tạo App Password:**
   - Vào: https://myaccount.google.com/apppasswords
   - Chọn "Mail" và "Other (Custom name)"
   - Nhập tên: "Assignment Management System"
   - Copy App Password (16 ký tự)
   - Dùng App Password này làm `SMTP_PASSWORD` (KHÔNG dùng mật khẩu Gmail thông thường)

### Ví dụ .env:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=kyquangnguyen123@gmail.com
SMTP_PASSWORD=abcd efgh ijkl mnop
SMTP_FROM=noreply@assignment.com
FRONTEND_URL=http://localhost:3000
```

## Cách 2: Set Environment Variables

Trong PowerShell:

```powershell
$env:SMTP_HOST="smtp.gmail.com"
$env:SMTP_PORT="587"
$env:SMTP_USER="your-email@gmail.com"
$env:SMTP_PASSWORD="your-app-password"
$env:SMTP_FROM="noreply@yourdomain.com"
$env:FRONTEND_URL="http://localhost:3000"
```

## Các SMTP Providers khác:

### Outlook/Hotmail:
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
```

### Yahoo:
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
```

### Custom SMTP Server:
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASSWORD=your-password
```

## Lưu ý:

- **KHÔNG commit file `.env` vào Git** (đã có trong `.gitignore`)
- Nếu không cấu hình SMTP, hệ thống vẫn hoạt động nhưng sẽ không gửi email
- Reset link vẫn được tạo và hiển thị trong UI, chỉ email không được gửi
- Kiểm tra logs để xem email có được gửi thành công không

## Test Email:

Sau khi cấu hình, test bằng cách:
1. Tạo user mới từ CSV import (tick "Send welcome email")
2. Hoặc reset password cho user (tick "Send email")

Nếu thành công, bạn sẽ thấy log: `Email sent successfully to {email}`
Nếu thất bại, bạn sẽ thấy log: `Failed to send email to {email}: {error}`

