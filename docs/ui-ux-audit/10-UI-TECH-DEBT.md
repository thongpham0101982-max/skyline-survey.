# BÁO CÁO AUDIT UI/UX TOÀN DIỆN HỆ THỐNG SSM
## TÀI LIỆU 10: NỢ KỸ THUẬT GIAO DIỆN (UI TECHNICAL DEBT AUDIT)

> **Mục tiêu:** Báo cáo chi tiết các thành phần giao diện thừa thãi, mã nguồn trùng lặp, tệp không sử dụng và các thói quen lập trình (code smells) cản trở việc nâng cấp hệ thống.

---

### 1. Danh sách Thành phần "Bị Lãng Quên" (Dead / Unused UI Primitives)

Trớ trêu thay, thư viện thành phần chuẩn tại \src/components/ui/\ được viết rất bài bản nhưng lại **hoàn toàn không được các trang nghiệp vụ sử dụng**:

| Tệp Thành phần | Tình trạng Mã nguồn | Số trang Sử dụng | Mức độ Lãng phí |
|:---|:---|:---:|:---|
| \src/components/ui/button.tsx\ | Đầy đủ biến thể CVA (skyline, accent, destructive,...), loader, disabled state | **0 trang** (663 nút thô) | **100% lãng phí.** Hệ thống có sẵn nút chuẩn nhưng các lập trình viên đều tự viết lại class cho từng nút. |
| \src/components/ui/data-table.tsx\ | Tích hợp TanStack Table v8, phân trang, thanh tìm kiếm, sắp xếp cột | **0 trang** (225 bảng thô) | **100% lãng phí.** Toàn bộ 225 bảng dữ liệu trong hệ thống đang tự viết thẻ \<table>\ thủ công. |
| \src/components/ui/EmptyState.tsx\ | Có sẵn icon hộp rỗng, tiêu đề, mô tả và nút kêu gọi hành động | **0 trang** (51 thông báo thô) | **100% lãng phí.** Các trang chỉ in dòng chữ xám xịt \"Không có dữ liệu\". |
| \src/components/PageHeader.tsx\ | Hỗ trợ Breadcrumbs, tiêu đề, nhãn phụ và vùng nút tác vụ | **10 trang / 111 trang** | **~91% lãng phí.** Hơn 100 trang tự ghép thẻ \<div>\ tiêu đề riêng lẻ. |

---

### 2. Sự Nhân bản Mã nguồn Nghiêm trọng (Extreme Code Duplication)

#### Trường hợp điển hình: Hồ sơ Học sinh (HSHS)
* Phía Admin: \src/app/admin/ho-so-hoc-sinh/client.tsx\ (**2,577 dòng**).
* Phía Giáo viên: \src/app/teacher/ho-so-hoc-sinh/page.tsx\ (**2,283 dòng**).
* Cả hai tệp này:
  * Khai báo cùng một mảng 9 tab: \cv\, \competencies\, \cademic\, \entrance\, \chievements\, \orientation\, \projects\, \comments\, \support\.
  * Có chung dòng chú thích: \// Tabs matching 100% Admin\.
  * Sao chép nguyên vẹn logic vẽ biểu đồ Radar năng lực, bảng điểm MOET, khung in ấn A4 \html2pdf.js\, và modal tải ảnh đại diện.
* **Hậu quả bảo trì:** Khi có một thay đổi nhỏ về cách tính điểm MOET hoặc thêm một chỉ số năng lực, lập trình viên phải sửa thủ công ở cả 2 tệp trên 5,000 dòng mã. Nếu một bên quên sửa, dữ liệu hiển thị giữa Giáo viên và Admin sẽ lập tức bị lệch pha!

---

### 3. Các "Mùi Mã Nguồn" Giao diện (UI Code Smells)

1. **Lạm dụng \// @ts-nocheck\:**  
   Hơn **80% tệp client components** lớn (\du-gio/client.tsx\, \input-assessments/client.tsx\, \Sidebar.tsx\, \ho-so-hoc-sinh\) đặt cờ \// @ts-nocheck\ ngay dòng đầu tiên.
   * Việc tắt hoàn toàn hệ thống kiểm tra kiểu dữ liệu TypeScript khiến các lỗi chính tả biến (typo props), truyền sai dữ liệu mảng/đối tượng vào component con không được phát hiện lúc build, gây ra lỗi màn hình trắng (white-screen crashes) bất ngờ trong lúc giáo viên đang thao tác.
2. **Kỹ thuật Bẻ Cache Tạm bợ trên URL (\?v=2.1\):**  
   Xuất hiện trong định tuyến chính của \Sidebar.tsx\ và \modules.ts\:
   * \/admin/ktdbcl/import-kqht?v=2.1\
   * \/admin/ho-so-hoc-sinh?v=2.1\
   Đây là tàn tích của việc xử lý lỗi cache trình duyệt trong quá trình phát triển gấp, chưa được dọn dẹp sạch sẽ trước khi đưa vào vận hành.
3. **Hardcode 3,884 mã màu HEX:**  
   Gõ trực tiếp các chuỗi ký tự \#48BFE3\, \#003B3A\, \#00A99D\ thay vì dùng token Tailwind, khiến việc chuyển đổi giao diện (ví dụ hỗ trợ High Contrast Mode hoặc Dark Mode) trở thành nhiệm vụ bất khả thi nếu không có đợt chuẩn hóa tổng thể.
4. **Hỗn loạn Z-Index (\z-[60]\ đến \z-[9999]\):**  
   148 modal và floating bar thi nhau tăng số z-index để tranh quyền hiển thị trên cùng, tạo ra cuộc chạy đua giá trị ma (magic numbers) và gây xung đột hiển thị trên thiết bị di động.

---

> [!NOTE]
> **Cam kết Audit:** Toàn bộ danh mục nợ kỹ thuật trên đây chỉ được lập hồ sơ chi tiết nhằm phục vụ lập kế hoạch tái cấu trúc; **TUYỆT ĐỐI KHÔNG** xóa bỏ hoặc sửa đổi bất kỳ tệp nguồn nào trong giai đoạn này.
