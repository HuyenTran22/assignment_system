# 🤝 Hướng Dẫn Đóng Góp (Contributing Guide)

Cảm ơn bạn đã quan tâm đến việc đóng góp cho dự án LMS Platform! Chúng tôi hoan nghênh mọi đóng góp từ cộng đồng.

## 📋 Mục Lục

- [Code of Conduct](#code-of-conduct)
- [Cách Bắt Đầu](#cách-bắt-đầu)
- [Quy Trình Đóng Góp](#quy-trình-đóng-góp)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Báo Lỗi](#báo-lỗi)
- [Đề Xuất Tính Năng](#đề-xuất-tính-năng)

## 📜 Code of Conduct

Dự án này tuân theo Code of Conduct để tạo môi trường thân thiện và chuyên nghiệp. Bằng việc tham gia, bạn đồng ý tuân thủ các quy tắc này.

### Những Điều Nên Làm

- ✅ Tôn trọng quan điểm và kinh nghiệm khác nhau
- ✅ Đưa ra và nhận phản hồi mang tính xây dựng
- ✅ Tập trung vào điều tốt nhất cho cộng đồng
- ✅ Thể hiện sự đồng cảm với các thành viên khác

### Những Điều Không Nên Làm

- ❌ Ngôn ngữ hoặc hình ảnh khiêu dâm
- ❌ Trolling, bình luận xúc phạm
- ❌ Quấy rối công khai hoặc riêng tư
- ❌ Hành vi không chuyên nghiệp khác

## 🚀 Cách Bắt Đầu

### 1. Fork Repository

Click nút "Fork" ở góc trên bên phải của trang GitHub.

### 2. Clone Repository

```bash
git clone https://github.com/your-username/lms-platform.git
cd lms-platform
```

### 3. Thêm Upstream Remote

```bash
git remote add upstream https://github.com/original-owner/lms-platform.git
```

### 4. Tạo Branch Mới

```bash
git checkout -b feature/your-feature-name
```

### 5. Cài Đặt Dependencies

```bash
# Chạy Docker
docker compose up -d

# Hoặc cài đặt local
cd services/auth-service
pip install -r requirements.txt

cd ../../frontend
npm install
```

## 🔄 Quy Trình Đóng Góp

### 1. Tìm Hoặc Tạo Issue

- Kiểm tra [Issues](https://github.com/HuyenTran22/assignment_system/issues) để xem có ai đang làm việc trên feature/bug đó chưa
- Nếu chưa có, tạo issue mới mô tả chi tiết

### 2. Làm Việc Trên Branch

```bash
# Luôn cập nhật từ main
git checkout main
git pull upstream main

# Tạo branch mới
git checkout -b feature/amazing-feature
```

### 3. Viết Code

- Viết code sạch, dễ đọc
- Follow coding standards (xem bên dưới)
- Thêm comments khi cần thiết
- Viết tests cho code mới

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add amazing feature"
```

### 5. Push to Fork

```bash
git push origin feature/amazing-feature
```

### 6. Tạo Pull Request

- Vào GitHub và tạo Pull Request từ branch của bạn
- Điền đầy đủ thông tin trong PR template
- Link đến issue liên quan

## 💻 Coding Standards

### Python (Backend)

- **Style Guide**: PEP 8
- **Formatter**: Black
- **Linter**: Flake8, Pylint
- **Type Hints**: Luôn sử dụng type hints

```python
# Good
def calculate_total(price: float, quantity: int) -> float:
    """Calculate total price."""
    return price * quantity

# Bad
def calculate_total(price, quantity):
    return price * quantity
```

### TypeScript/React (Frontend)

- **Style Guide**: Airbnb JavaScript Style Guide
- **Formatter**: Prettier
- **Linter**: ESLint

```typescript
// Good
interface UserProps {
  name: string;
  age: number;
}

const User: React.FC<UserProps> = ({ name, age }) => {
  return <div>{name} - {age}</div>;
};

// Bad
const User = (props) => {
  return <div>{props.name} - {props.age}</div>;
};
```

### Naming Conventions

- **Python**:
  - Functions/Variables: `snake_case`
  - Classes: `PascalCase`
  - Constants: `UPPER_SNAKE_CASE`

- **TypeScript**:
  - Functions/Variables: `camelCase`
  - Classes/Components: `PascalCase`
  - Constants: `UPPER_SNAKE_CASE`

## 📝 Commit Messages

Sử dụng [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: Tính năng mới
- `fix`: Sửa bug
- `docs`: Thay đổi documentation
- `style`: Formatting, missing semi colons, etc
- `refactor`: Refactoring code
- `test`: Thêm tests
- `chore`: Cập nhật build tasks, package manager configs, etc

### Examples

```bash
feat(auth): add password reset functionality

- Add forgot password endpoint
- Implement email sending
- Add reset password page

Closes #123
```

```bash
fix(course): resolve video upload issue

The video upload was failing due to incorrect file size limit.
Increased limit from 10MB to 50MB.

Fixes #456
```

## 🔀 Pull Request Process

### 1. Checklist Trước Khi Submit

- [ ] Code build thành công (`docker compose build`)
- [ ] All tests pass (`pytest` / `npm test`)
- [ ] Code theo coding standards
- [ ] Đã thêm tests cho features mới
- [ ] Đã update documentation nếu cần
- [ ] Commit messages theo format
- [ ] Branch updated với latest main

### 2. PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issue
Closes #issue_number

## Testing
Describe how you tested your changes

## Screenshots (if applicable)
Add screenshots

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests
- [ ] New and existing tests pass
```

### 3. Review Process

1. Ít nhất 1 maintainer phải review và approve
2. All CI checks phải pass
3. Không có conflicts với main branch
4. All conversations resolved

### 4. Merge

- Maintainer sẽ merge PR sau khi approved
- Squash commits nếu có nhiều commits nhỏ
- Delete branch sau khi merge

## 🧪 Testing

### Backend Testing

```bash
# Chạy tests
cd services/auth-service
pytest

# Với coverage
pytest --cov=app tests/

# Chạy specific test
pytest tests/test_auth.py::test_login
```

### Frontend Testing

```bash
# Chạy tests
cd frontend
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```

### Integration Testing

```bash
# Chạy tất cả services
docker compose up -d

# Chạy integration tests
pytest tests/integration/
```

## 🐛 Báo Lỗi

### Trước Khi Báo Lỗi

1. Kiểm tra [Issues](https://github.com/HuyenTran22/assignment_system/issues) xem đã có ai report chưa
2. Cập nhật lên version mới nhất
3. Đọc documentation

### Tạo Bug Report

Sử dụng [Bug Report Template](https://github.com/HuyenTran22/assignment_system/issues/new):

```markdown
## Bug Description
Clear description of the bug

## To Reproduce
Steps to reproduce:
1. Go to '...'
2. Click on '....'
3. See error

## Expected Behavior
What should happen

## Screenshots
If applicable

## Environment
- OS: [e.g. Windows 10]
- Browser: [e.g. Chrome 120]
- Version: [e.g. 1.0.0]

## Additional Context
Any other information
```

## 💡 Đề Xuất Tính Năng

### Trước Khi Đề Xuất

1. Kiểm tra roadmap và existing features
2. Search trong Issues xem đã có ai suggest chưa

### Tạo Feature Request

Sử dụng [Feature Request Template](https://github.com/HuyenTran22/assignment_system/issues/new):

```markdown
## Feature Description
Clear description of the feature

## Problem It Solves
What problem does this solve?

## Proposed Solution
How should this work?

## Alternatives Considered
What alternatives have you considered?

## Additional Context
Mockups, examples, etc.
```

## 📚 Documentation

### Cập Nhật Documentation

- README.md: Overview và getting started
- API docs: In-code docstrings (auto-generated)
- Wiki: Detailed guides và tutorials

### Writing Style

- Sử dụng tiếng Việt hoặc tiếng Anh
- Clear và concise
- Thêm examples khi có thể
- Sử dụng code blocks với syntax highlighting

## 🎯 Priority Labels

- `priority: critical` - Security issues, data loss
- `priority: high` - Major features, important bugs
- `priority: medium` - Nice to have features
- `priority: low` - Minor improvements

## 🏆 Recognition

Contributors sẽ được thêm vào:
- [CONTRIBUTORS.md](CONTRIBUTORS.md)
- GitHub contributors page
- Release notes (cho major contributions)

## 📞 Liên Hệ

- **GitHub Issues**: [Create an issue](https://github.com/HuyenTran22/assignment_system/issues)
- **GitHub**: [@HuyenTran22](https://github.com/HuyenTran22)

---

Cảm ơn bạn đã đóng góp cho LMS Platform! 🎉

