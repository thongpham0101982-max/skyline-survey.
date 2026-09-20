# 11. QUARTERLY SYSTEM HEALTH & DESIGN DRIFT AUDIT

---

## 1. KIỂM TOÁN TRÔI DẠT THIẾT KẾ (DESIGN DRIFT CONTROL)
Hàng quý, tiến hành quét mã nguồn giao diện để ngăn chặn tình trạng suy thoái giao diện:
- Có xuất hiện mã màu tùy tiện (arbitrary colors) ngoài bảng màu chuẩn SSM không?
- Có component nào bị clone trùng lặp thay vì dùng chung `src/components/ui/` không?
- Có table nào không sử dụng chuẩn phân trang và responsive baseline không?
- Lập **Quarterly Design Drift Report** để dọn dẹp và đưa về chuẩn chung.
