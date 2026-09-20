# 03. ROLE-BASED ACCESS CONTROL (RBAC) & DIRECT URL AUDIT

---

## 1. MA TRẬN PHÂN QUYỀN 4 LỚP (4-LAYER ENFORCEMENT)

Mọi thao tác trong hệ thống SSM được thẩm định qua 4 lớp phòng vệ độc lập:
1. **Lớp 1 — Navigation UI:** Ẩn/hiện menu theo quyền hạn người dùng.
2. **Lớp 2 — Route Level Guard:** Next.js Middleware / Layout chặn điều hướng tới trang không thuộc thẩm quyền.
3. **Lớp 3 — Frontend Action Guard:** Vô hiệu hóa nút bấm/hành động sửa, duyệt, xóa dựa trên quyền.
4. **Lớp 4 — Backend API Guard (`src/lib/session.ts`):** Enforce tuyệt đối tại API handler; nếu cố tình gọi curl trực tiếp sẽ trả về `401 Unauthorized` hoặc `403 Forbidden`.

---

## 2. KẾT QUẢ KIỂM THỬ TRUY CẬP TRỰC TIẾP URL (DIRECT URL TEST MATRIX)

| Kiểm thử truy cập | Học sinh | GV Bộ môn | GVCN | TTCM | GĐCS | Ban KT&ĐBCL | Super Admin |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Route Admin (`/admin/...`)** | DENY | DENY | DENY | DENY | DENY | DENY | **ALLOW** |
| **Route Giám đốc CS (`/gdcs/...`)** | DENY | DENY | DENY | DENY | **ALLOW** (1 CS) | DENY | **ALLOW** (Toàn hệ thống) |
| **Duyệt phiếu dự giờ (`/observation/review`)**| DENY | DENY | DENY | **ALLOW** (Tổ) | **ALLOW** (CS) | **ALLOW** | **ALLOW** |
| **Hồ sơ học sinh cá nhân (`/student/profile`)**| **ALLOW** (Bản thân) | DENY | DENY | DENY | DENY | DENY | **ALLOW** |
| **Hồ sơ học sinh lớp chủ nhiệm** | DENY | DENY | **ALLOW** (Lớp) | DENY | **ALLOW** (CS) | **ALLOW** | **ALLOW** |
| **Ngân hàng đề thi (`/testing/questions`)** | DENY | **ALLOW** (Môn) | **ALLOW** (Môn) | **ALLOW** (Môn) | **ALLOW** (CS) | **ALLOW** | **ALLOW** |
| **Báo cáo chất lượng toàn trường** | DENY | DENY | DENY | DENY | **ALLOW** (CS) | **ALLOW** | **ALLOW** |

---

## 3. NGUYÊN TẮC KIÊM NHIỆM (UNION SCOPE PRINCIPLE)
Khi một cán bộ giáo viên đảm nhiệm nhiều vị trí đồng thời (ví dụ: vừa là GVCN lớp 10A1, vừa là Tổ trưởng Chuyên môn Toán, kiêm nhiệm Trưởng ban Chuyên môn):
- Hệ thống tự động gộp phạm vi quyền (**Union Scope**):
  `Effective_Scope = Scope(GVCN) ∪ Scope(TTCM_Toan) ∪ Scope(Ban_DHCM)`.
- Đảm bảo người dùng có đầy đủ quyền thực thi nhiệm vụ mà không bị xung đột phân quyền.
