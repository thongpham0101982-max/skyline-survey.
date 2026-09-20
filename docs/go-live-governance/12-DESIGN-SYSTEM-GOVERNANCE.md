# 12. DESIGN SYSTEM EVOLUTION & UI COMPONENT PROMOTION

---

## 1. QUY TRÌNH THAY ĐỔI DESIGN SYSTEM (DS CHANGE REQUEST)
Mọi đề xuất thay đổi về màu sắc, font chữ, spacing, hoặc mẫu tương tác (interaction pattern) phải:
1. Đánh giá tác động xuyên suốt toàn bộ 6 Waves đã hoàn thành.
2. Không phá vỡ 17 Shared UI Primitives đã được chuẩn hóa tại `src/components/ui/`.
3. Được sự phê duyệt chính thức của Lead UI/UX Designer trước khi đưa vào mã nguồn.

---

## 2. ĐIỀU KIỆN ĐỂ NÂNG CẤP COMPONENT LÊN CẤP DÙNG CHUNG (SHARED PROMOTION)
Một component chỉ được phép đưa vào thư mục `src/components/ui/` dùng chung khi thỏa mãn đồng thời 4 tiêu chí:
- Được sử dụng bởi ít nhất **2 phân hệ nghiệp vụ độc lập**.
- API props được thiết kế ổn định, có TypeScript interface rõ ràng.
- Đã kiểm thử responsive hoàn hảo trên Mobile, Tablet và Desktop.
- Đạt chuẩn tiếp cận (Accessibility) về độ tương phản màu sắc và hỗ trợ phím điều hướng.
