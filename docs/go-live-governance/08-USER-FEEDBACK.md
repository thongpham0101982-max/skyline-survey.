# 08. USER FEEDBACK CLASSIFICATION & SUPPORT MODEL

---

## 1. MÔ HÌNH HỖ TRỢ NGƯỜI DÙNG 4 CẤP (4-TIER SUPPORT MODEL)

```text
[NGƯỜI DÙNG: GV / HS / PHHS]
              │
              ▼
[LEVEL 1: IT SUPPORT TẠI CƠ SỞ]
  └─ Hướng dẫn sử dụng giao diện, cấp lại mật khẩu, kiểm tra kết nối mạng máy trạm.
              │ (Nếu liên quan phân quyền hoặc dữ liệu học sinh)
              ▼
[LEVEL 2: BỘ PHẬN ĐÀO TẠO & ĐBCL]
  └─ Xử lý sai lệch danh sách lớp, điều chỉnh phân công chuyên môn, gán cơ sở.
              │ (Nếu phát hiện lỗi hệ thống, giao diện hoặc tính toán sai)
              ▼
[LEVEL 3: ĐỘI NGŨ PHÁT TRIỂN ỨNG DỤNG (DEV/QA)]
  └─ Điều tra lỗi, tái hiện bug trên staging, phát hành bản vá theo quy trình.
              │ (Nếu lỗi hạ tầng mạng, sập server hoặc rò rỉ bảo mật)
              ▼
[LEVEL 4: HẠ TẦNG CLOUD & GIÁM ĐỐC KỸ THUẬT (INFRA/CTO)]
  └─ Xử lý sự cố khẩn cấp P0, điều phối failover và phục hồi thảm họa.
```

---

## 2. PHÂN LOẠI PHẢN HỒI (FEEDBACK CLASSIFICATION)
Trước khi chuyển phản hồi thành yêu cầu sửa code, đội ngũ phân tích bắt buộc phải xác định đúng căn nguyên gốc rễ:
- **Bug:** Phần mềm chạy sai thiết kế ban đầu $ightarrow$ Chuyển Dev sửa.
- **Usability Issue:** Giao diện khó thao tác $ightarrow$ Ghi nhận vào UX Backlog để tối ưu hóa component.
- **Training Issue:** Do người dùng chưa nắm quy trình trường học $ightarrow$ Tổ chức tập huấn, bổ sung hướng dẫn nhanh.
- **Data/Permission Issue:** Do dữ liệu nhân sự chưa được phân công đúng $ightarrow$ Bộ phận Đào tạo cập nhật quyền.
