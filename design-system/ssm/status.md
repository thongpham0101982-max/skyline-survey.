# SSM STATUS SEMANTICS SPECIFICATION
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Phạm vi:** Quy chuẩn hiển thị trạng thái nghiệp vụ và màu sắc ngữ nghĩa  

---

## 1. BẢNG ÁNH XẠ TRẠNG THÁI NGHIỆP VỤ CHUẨN HÓA

Tuyệt đối không sử dụng màu sắc tùy hứng. Mọi trạng thái nghiệp vụ phải ánh xạ về một trong 5 nhóm ngữ nghĩa:

| Nhóm Ngữ nghĩa | Mã Màu | Trạng thái Nghiệp vụ Đại diện |
|---|---|---|
| **Neutral (Trung tính / Khởi tạo)** | Nền: `bg-slate-100`<br>Chữ: `text-slate-700`<br>Chấm: `bg-slate-400` | Chưa bắt đầu, Bản nháp (Draft), Chưa phân công, Chờ thiết lập |
| **Information (Đang diễn ra)** | Nền: `bg-sky-50`<br>Chữ: `text-sky-700`<br>Chấm: `bg-sky-500` | Đang thực hiện, Đang giảng dạy, Đang mở đợt cố vấn, Đang khảo sát |
| **Warning (Cần chú ý / Chờ duyệt)** | Nền: `bg-amber-50`<br>Chữ: `text-amber-700`<br>Chấm: `bg-amber-500` | Chờ duyệt lịch, Chờ ký biên bản, Sắp hết hạn nộp sổ điểm, Cần theo dõi |
| **Success (Thành công / Đạt chuẩn)** | Nền: `bg-emerald-50`<br>Chữ: `text-emerald-700`<br>Chấm: `bg-emerald-500` | Hoàn thành, Đã phê duyệt, Tiết dạy Tốt/Khá, Đã ký duyệt hai chiều |
| **Error / Critical (Từ chối / Khẩn cấp)** | Nền: `bg-rose-50`<br>Chữ: `text-rose-700`<br>Chấm: `bg-rose-500` | Quá hạn, Từ chối phê duyệt, Chưa đạt, Cảnh báo khẩn cấp SOS |

---

## 2. NGUYÊN TẮC THIẾT KẾ TRỢ NĂNG CHO STATUS

1. **Không dùng màu sắc là tín hiệu duy nhất:** Mọi Badge trạng thái đều phải có chữ nhãn rõ ràng (Label Text) đi kèm chấm tròn phân cách.
2. **Text contrast:** Độ tương phản chữ trên nền màu trạng thái luôn đảm bảo `>= 4.5:1` theo chuẩn WCAG 2.1 AA.
