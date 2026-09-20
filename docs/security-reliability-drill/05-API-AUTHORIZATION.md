# 05. BACKEND API AUTHORIZATION & ACCESS CONTROL AUDIT

---

## 1. MA TRẬN KIỂM ĐỊNH TẤT CẢ ENDPOINTS TRỌNG YẾU

| Nhóm API Endpoint | Token hợp lệ & đúng Role | Role thấp hơn (VD: HS) | Token hết hạn / Giả mạo | Resource ngoài Campus |
|:---|:---:|:---:|:---:|:---:|
| **`/api/profile-360/[id]`** | `200 OK` | `403 Forbidden` | `401 Unauthorized` | `403 Forbidden` |
| **`/api/observations/[id]/grade`** | `200 OK` | `403 Forbidden` | `401 Unauthorized` | `403 Forbidden` |
| **`/api/advisory/goals`** | `200 OK` | Scoped cá nhân | `401 Unauthorized` | Scoped cơ sở |
| **`/api/support-tracking/[id]`** | `200 OK` | `403 Forbidden` | `401 Unauthorized` | `403 Forbidden` |
| **`/api/experiential-activities`**| `200 OK` | Chỉ xem hoạt động của lớp | `401 Unauthorized` | Scoped cơ sở |
| **`/api/testing/question-bank`** | `200 OK` | `403 Forbidden` | `401 Unauthorized` | Scoped phân quyền |
| **`/api/admin/users`** | `200 OK` | `403 Forbidden` | `401 Unauthorized` | `403 Forbidden` |

---

## 2. XỬ LÝ TRƯỜNG HỢP RESOURCE KHÔNG TỒN TẠI HOẶC BỊ TRUY CẬP TRÁI QUYỀN
- Khi người dùng gửi request truy xuất một `id` không thuộc cơ sở của họ:
  - Hệ thống trả về `404 Not Found` hoặc `403 Forbidden` mà **không tiết lộ** xem tài nguyên đó có thực sự tồn tại ở cơ sở khác hay không.
  - Ngăn chặn nguy cơ thám sát ID (Resource ID Scanning / Enumeration Attack).
