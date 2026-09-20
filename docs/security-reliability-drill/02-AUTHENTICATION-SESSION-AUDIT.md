# 02. AUTHENTICATION & SESSION MANAGEMENT AUDIT

---

## 1. KẾT QUẢ KIỂM TOÁN XÁC THỰC (AUTHENTICATION AUDIT)

| Trường hợp kiểm thử | Dữ liệu đầu vào | Phản hồi của hệ thống | Đánh giá |
|:---|:---|:---|:---:|
| **Đăng nhập hợp lệ (Email)** | `admin@skyline.edu.vn` + đúng mk | Đăng nhập thành công, tạo JWT, ghi log `LOGIN_SUCCESS` | **PASS** |
| **Đăng nhập hợp lệ (Mã GV)** | `GV042` + đúng mk | Nhận diện đúng giáo viên, tải campus assignments | **PASS** |
| **Đăng nhập hợp lệ (Mã PH)** | `P2024001` / `2024001` | Nhận diện đúng phụ huynh học sinh | **PASS** |
| **Tài khoản không tồn tại** | `fake_user@skyline.edu.vn` | Trả về thông báo lỗi chung, ghi log `LOGIN_FAILED` kèm IP | **PASS** |
| **Mật khẩu không đúng** | `admin@skyline.edu.vn` + sai mk | Báo lỗi đăng nhập không thành công, không tiết lộ mật khẩu | **PASS** |
| **Tài khoản bị khóa (Inactive)** | `user.status === 'INACTIVE'` | Ném `InactiveUserError` ("Tài khoản bị khóa"), chặn đăng nhập | **PASS** |
| **Brute-force mật khẩu** | Thử sai 5 lần liên tiếp | Kích hoạt rate limiting tạm thời theo IP, ghi log cảnh báo | **PASS** |

### Chính sách thông báo lỗi (Error Message Security)
- Giao diện đăng nhập hiển thị thông báo chung: *"Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu."*
- Triệt tiêu hoàn toàn khả năng dò quét tài khoản (account enumeration).

---

## 2. KIỂM TOÁN PHIÊN ĐĂNG NHẬP & TOKEN (SESSION AUDIT)

```text
[CLIENT BROWSER]                                       [NEXTAUTH SERVER]
       │                                                       │
       ├──── 1. POST /api/auth/signin (credentials) ──────────>│ (Verify bcrypt)
       │                                                       │ (Fetch campusIds)
       │<─── 2. Set-Cookie: __Secure-next-auth.session-token ──┤ (Signed JWT, HttpOnly)
       │                                                       │
       ├──── 3. GET /api/protected (Cookie attached) ─────────>│ (Verify signature)
       │<─── 4. Response 200 OK ───────────────────────────────┤
       │                                                       │
       ├──── 5. POST /api/auth/signout ───────────────────────>│ (Log LOGOUT event)
       │<─── 6. Set-Cookie: Clear session cookie ──────────────┤
       │                                                       │
       ├──── 7. Back Button / Replay request ─────────────────>│ (No cookie/expired)
       │<─── 8. 401 Unauthorized / Redirect to /login ─────────┤
```

### Cấu hình Cookie & Token Storage:
- **Lưu trữ:** Token được lưu trữ trong **HTTP-Only Cookie** (không lưu trong `localStorage` hay `sessionStorage`), loại bỏ hoàn toàn nguy cơ rò rỉ qua tấn công XSS.
- **Flags bắt buộc trên Production:** `HttpOnly=true`, `Secure=true`, `SameSite=Lax`, `Path=/`.
- **Hết hạn phiên (Session Expiry UX):**
  - Khi token hết hạn, client không crash hay rơi vào vòng lặp vô hạn.
  - Giao diện hiển thị cảnh báo: *"Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."*
  - Giữ lại nội dung biểu mẫu đang nhập dở vào bộ nhớ tạm an toàn để người dùng không bị mất dữ liệu sau khi đăng nhập lại.
