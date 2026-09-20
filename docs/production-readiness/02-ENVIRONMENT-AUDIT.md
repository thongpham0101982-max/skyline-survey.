# 02. PRODUCTION ENVIRONMENT AUDIT & ISOLATION

---

## 1. MA TRẬN PHÂN TÁCH MÔI TRƯỜNG (ENVIRONMENT MATRIX)

Hệ thống SSM tuân thủ nguyên tắc cách ly tuyệt đối 3 môi trường:

```text
[LOCAL / DEV]  ────────>  [STAGING / PRE-PROD]  ────────>  [PRODUCTION]
- Mock/Local SQLite       - Turso Staging Replica          - Turso Production Cluster
- Mock RBAC tokens        - Staging Keycloak / SSO         - Production Identity Provider
- Hot Module Reload       - Production-like Build          - Immutable Locked Builds
```

---

## 2. KIỂM TOÁN BIẾN MÔI TRƯỜNG & BẢO MẬT BÍ MẬT (SECRETS AUDIT)

| Biến môi trường | Mục đích | Phạm vi | Kiểm tra rò rỉ | Đánh giá |
|:---|:---|:---|:---:|:---:|
| `TURSO_URL` | Kết nối CSDL LibSQL phân tán | Server-only | Không xuất hiện trong client bundle | AN TOÀN |
| `TURSO_AUTH_TOKEN` | Token xác thực CSDL production | Server-only | Không hiển thị qua API / logs | AN TOÀN |
| `NEXTAUTH_SECRET` | Secret mã hóa session JWT | Server-only | Độ dài > 256 bits, bảo mật cao | AN TOÀN |
| `NEXTAUTH_URL` | Canonical origin của ứng dụng | Server/Client | Đúng domain production Sky-Line | AN TOÀN |
| `NODE_ENV` | Cấu hình runtime | Global | Giá trị bắt buộc `production` | AN TOÀN |

---

## 3. CHÍNH SÁCH BẢO VỆ CREDENTIALS
- Tuyệt đối không commit file `.env`, `.env.production.local` lên Git.
- Kiểm tra qua pipeline CI/CD: ngăn chặn build nếu phát hiện secret xuất hiện trong client-facing code.
- Tất cả endpoints `/api/health` và `/api/ready` được kiểm toán độc lập: chỉ trả về status, uptime, memory, version; hoàn toàn triệt tiêu connection string và passwords.
