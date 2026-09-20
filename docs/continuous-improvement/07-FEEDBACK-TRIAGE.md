# 07. USER FEEDBACK TRIAGE & DEDUPLICATION

---

## 1. QUY TRÌNH KHỬ TRÙNG LẶP PHẢN HỒI (DEDUPLICATION)
- Khi 25 giáo viên cùng gửi phản hồi về khó khăn khi tìm kiếm mã học sinh trong danh sách:
  - Hệ thống gom nhóm thành **1 Issue duy nhất** gắn nhãn: `USABILITY - Tìm kiếm học sinh theo tên không dấu`.
  - Ghi nhận số lượng người dùng bị ảnh hưởng (25 GV từ 3 cơ sở).
  - Tránh làm loãng danh mục công việc bằng 25 ticket trùng lặp.

---

## 2. NGUYÊN TẮC: KHÔNG CODE NGAY KHI NHẬN PHẢN HỒI
Trước khi chuyển phản hồi thành việc lập trình:
1. Đã xác nhận vấn đề trên môi trường thực tế chưa?
2. Căn nguyên gốc rễ là do đâu (Giao diện, dữ liệu, phân quyền hay chưa tập huấn)?
3. Mức độ ảnh hưởng nghiệp vụ có đủ lớn để thay đổi mã nguồn không?
