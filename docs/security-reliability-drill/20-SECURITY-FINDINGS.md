# 20. SECURITY FINDINGS & VULNERABILITY REGISTER

---

## 1. PHÂN LOẠI MỨC ĐỘ NGUY HIỂM THEO CHUẨN OWASP
- **Critical (Nghiêm trọng):** 0
- **High (Cao):** 0
- **Medium (Trung bình):** 0
- **Low (Thấp):** 1 (Đã được khắc phục)
- **Informational (Thông tin):** 2 (Ghi nhận hướng dẫn vận hành)

---

## 2. CHI TIẾT CÁC PHÁT HIỆN & BIỆN PHÁP XỬ LÝ

| Mã phát hiện | Thành phần | Mức độ | Mô tả chi tiết | Biện pháp khắc phục đã áp dụng | Trạng thái |
|:---|:---|:---:|:---|:---|:---:|
| **SEC-01** | Client Cache | Low | Trình duyệt lưu cache form nháp khi đăng xuất trên máy dùng chung | Đã bổ sung cơ chế xóa sạch form state trong bộ nhớ khi sự kiện `signOut` được kích hoạt | **RESOLVED** |
| **INFO-01** | HTTP Headers | Info | Đảm bảo header `X-Content-Type-Options: nosniff` và `X-Frame-Options: SAMEORIGIN` luôn được bật | Đã cấu hình cố định trong Next.js config | **RESOLVED** |
| **INFO-02** | Rate Limiting | Info | Theo dõi tần suất gọi API từ các IP trường học để điều chỉnh whitelist | Ghi nhận vào tài liệu vận hành mạng | **DOCUMENTED** |

---

## 3. KẾT LUẬN CỔNG AN NINH
Không có bất kỳ lỗ hổng bảo mật nghiêm trọng nào tồn tại trên hệ thống. **Cổng Security Gate: PASS 100%**.
