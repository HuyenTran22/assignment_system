# Hướng Dẫn Git - Commit và Push Code

## 📚 Các Lệnh Git Cơ Bản

### 1. Kiểm Tra Trạng Thái
```bash
git status
```
- Xem file nào đã thay đổi
- File nào đã được add vào staging area
- File nào chưa được track

### 2. Xem Thay Đổi Chi Tiết
```bash
git diff
```
- Xem chi tiết những thay đổi trong các file
- Xem code nào đã thêm/xóa/sửa

### 3. Add File Vào Staging Area
```bash
# Add một file cụ thể
git add docker-compose.yml

# Add nhiều file
git add file1.txt file2.txt file3.txt

# Add tất cả file đã thay đổi
git add .

# Add tất cả file (bao gồm cả file đã xóa)
git add -A
```

### 4. Commit (Lưu Thay Đổi)
```bash
# Commit với message ngắn
git commit -m "Fix database password to 123456"

# Commit với message dài (mở editor)
git commit

# Commit với message nhiều dòng
git commit -m "Fix database password" -m "Changed from postgres123 to 123456 to match VPS database"
```

**Lưu ý:** Message commit nên:
- Ngắn gọn, rõ ràng
- Mô tả được thay đổi gì
- Dùng tiếng Anh (chuẩn)
- Ví dụ: "Fix migration service", "Add SMTP config", "Update docker-compose.yml"

### 5. Push Lên GitHub
```bash
# Push lên branch hiện tại (thường là main)
git push

# Push lên branch cụ thể
git push origin main

# Push lần đầu (set upstream)
git push -u origin main
```

### 6. Pull Code Từ GitHub
```bash
# Pull code mới nhất
git pull

# Pull và merge
git pull origin main
```

## 🔄 Quy Trình Thông Thường

### Khi Muốn Commit Code:

```bash
# Bước 1: Kiểm tra thay đổi
git status

# Bước 2: Xem chi tiết thay đổi (tùy chọn)
git diff

# Bước 3: Add file vào staging
git add docker-compose.yml
# hoặc
git add .

# Bước 4: Commit
git commit -m "Mô tả thay đổi"

# Bước 5: Push lên GitHub
git push
```

## 📝 Ví Dụ Cụ Thể

### Ví Dụ 1: Commit File docker-compose.yml
```bash
git status
git add docker-compose.yml
git commit -m "Fix database password in docker-compose.yml"
git push
```

### Ví Dụ 2: Commit Nhiều File
```bash
git add docker-compose.yml DEPLOYMENT_FIX_FINAL.md
git commit -m "Fix deployment issues and add documentation"
git push
```

### Ví Dụ 3: Commit Tất Cả Thay Đổi
```bash
git add .
git commit -m "Update configuration files"
git push
```

## ⚠️ Lưu Ý Quan Trọng

### 1. Luôn Kiểm Tra Trước Khi Commit
```bash
git status  # Xem file nào sẽ commit
git diff    # Xem thay đổi gì
```

### 2. Commit Message Nên Rõ Ràng
❌ **SAI:**
```bash
git commit -m "fix"
git commit -m "update"
git commit -m "changes"
```

✅ **ĐÚNG:**
```bash
git commit -m "Fix database password to match VPS configuration"
git commit -m "Add SMTP credentials for email service"
git commit -m "Update docker-compose.yml with production settings"
```

### 3. Không Commit File Nhạy Cảm
- File `.env` (chứa password, API keys)
- File có thông tin cá nhân
- File tạm thời, cache

### 4. Commit Thường Xuyên
- Commit sau mỗi fix nhỏ
- Không để quá nhiều thay đổi trong một commit
- Mỗi commit nên là một thay đổi logic

## 🛠️ Các Lệnh Hữu Ích Khác

### Xem Lịch Sử Commit
```bash
git log
git log --oneline
git log -5  # Xem 5 commit gần nhất
```

### Xem Chi Tiết Một Commit
```bash
git show HEAD
git show <commit-hash>
```

### Undo (Hoàn Tác)

**Chưa commit:**
```bash
# Bỏ thay đổi trong file (chưa add)
git checkout -- docker-compose.yml

# Bỏ add (nhưng giữ thay đổi)
git reset HEAD docker-compose.yml
```

**Đã commit nhưng chưa push:**
```bash
# Undo commit nhưng giữ thay đổi
git reset --soft HEAD~1

# Undo commit và bỏ thay đổi
git reset --hard HEAD~1
```

**Đã push:**
```bash
# Tạo commit mới để fix
git commit --amend -m "New message"
git push --force  # Cẩn thận!
```

### Tạo Branch Mới
```bash
# Tạo và chuyển sang branch mới
git checkout -b feature/new-feature

# Chuyển branch
git checkout main

# Xem tất cả branch
git branch
```

### Merge Branch
```bash
git checkout main
git merge feature/new-feature
git push
```

## 🎯 Checklist Trước Khi Push

- [ ] Đã test code hoạt động đúng
- [ ] Đã kiểm tra `git status`
- [ ] Đã xem `git diff` để đảm bảo đúng thay đổi
- [ ] Commit message rõ ràng, mô tả đúng thay đổi
- [ ] Không commit file nhạy cảm (.env, passwords)
- [ ] Đã pull code mới nhất (nếu làm việc nhóm)

## 📖 Tài Liệu Tham Khảo

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)

## 💡 Tips

1. **Luôn pull trước khi push** (nếu làm việc nhóm):
   ```bash
   git pull
   git push
   ```

2. **Commit message theo format:**
   ```
   <type>: <subject>
   
   <body>
   ```
   Ví dụ:
   ```
   fix: Change database password to 123456
   
   Updated docker-compose.yml to match existing VPS database configuration
   ```

3. **Sử dụng `.gitignore`** để bỏ qua file không cần commit:
   ```
   .env
   node_modules/
   *.log
   .DS_Store
   ```

4. **Xem thay đổi trước khi commit:**
   ```bash
   git diff --staged  # Xem thay đổi đã add
   ```

