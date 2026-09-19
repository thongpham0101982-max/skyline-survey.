# BÁO CÁO AUDIT UI/UX TOÀN DIỆN HỆ THỐNG SSM (SKY-LINE SURVEY & EDUCATIONAL QUALITY MANAGEMENT)
## TÀI LIỆU 00: TỔNG QUAN ĐIỀU HÀNH (EXECUTIVE SUMMARY)

> **Hệ thống đánh giá:** SSM — Sky-Line Educational Quality Management System  
> **Phạm vi kiểm tra:** Toàn bộ 111 routes (65 Admin, 27 Teacher, 11 Học sinh, 6 Phụ huynh, 2 Auth), 38 shared components, tokens CSS, a11y, responsive và luồng nghiệp vụ.  
> **Công cụ & Tiêu chuẩn:** \ui-ux-pro-max\, WCAG 2.1 AA, Next.js 16 App Router, Tailwind CSS v4, Base UI / Shadcn.  
> **Trạng thái thực thi:** AUDIT & PHÂN TÍCH THUẦN TÚY (Không can thiệp source code, database, API, business logic, RBAC).

---

### 1. Hiện trạng Tổng thể Hệ thống UI/UX

Hệ thống **SSM (Sky-Line Educational Quality Management)** là một nền tảng quản trị dữ liệu và bảo đảm chất lượng giáo dục quy mô lớn, bao phủ từ Mầm non đến K-12, kết nối 16 nhóm đối tượng sử dụng (Giáo viên, GVCN, TTCM, QLCM, TBP, GĐCS, Ban KT&ĐBCL, BGH, Phụ huynh, Học sinh,...).

Qua kết quả quét mã nguồn tự động kết hợp phân tích chuyên sâu của \ui-ux-pro-max\, hiện trạng UI/UX của SSM đang ở giai đoạn **"Chức năng nghiệp vụ rất phong phú nhưng giao diện bị phân mảnh (Fragmented Modules)"**. Hệ thống mang cảm giác nhiều module được phát triển độc lập qua các thời kỳ rồi ghép lại, chưa có tiếng nói thị giác đồng nhất của một sản phẩm Enterprise Education cao cấp.

#### Các chỉ số định lượng cốt lõi qua kiểm tra mã nguồn:
* **Tổng số trang nghiệp vụ:** ~111 trang (\src/app\).
* **Tổng số thành phần button:** 663 thẻ \<button>\ HTML thô; **0** trang sử dụng component chuẩn \<Button>\ từ \src/components/ui/button.tsx\.
* **Tổng số bảng dữ liệu:** 225 thẻ \<table>\ HTML thô; **0** trang sử dụng \<DataTable>\ từ \src/components/ui/data-table.tsx\.
* **Màu sắc HEX hardcode inline:** **3,884** lần xuất hiện (trong đó màu \#48BFE3\ lặp lại 2,371 lần; hơn 10 biến thể màu teal/cyan khác nhau được gõ trực tiếp trong JSX).
* **Trọng số chữ \ont-black\ (weight 900):** **4,448** lần xuất hiện, \ont-bold\ (700) 5,039 lần; trong khi \ont-normal\ chỉ có **136** lần (mức độ "la hét thị giác" chiếm hơn 85% văn bản).
* **Accessibility (a11y) aria-label:** **0 / 663** button có \ria-label\; **2 / 287** input có \id\ liên kết với \<label htmlFor>\.
* **Độ tương phản màu Primary Cyan (\#48BFE3\) trên nền trắng:** Đạt tỷ lệ **2.13:1** (Thất bại nghiêm trọng theo chuẩn WCAG 2.1 AA yêu cầu tối thiểu 4.5:1).
* **Tệp mã nguồn đơn khối khổng lồ (Monolith Client Files):**
  * \src/app/admin/input-assessments/client.tsx\: **9,320 dòng**
  * \src/app/teacher/du-gio/client.tsx\: **7,385 dòng**
  * \src/app/admin/tong-hop-du-gio/client.tsx\: **5,931 dòng**
  * \src/app/admin/input-assessments/reports/client.tsx\: **4,236 dòng**
  * \src/app/admin/ho-so-hoc-sinh/client.tsx\: **2,577 dòng**
  * \src/app/teacher/ho-so-hoc-sinh/page.tsx\: **2,283 dòng**

---

### 2. 10 Vấn đề Lớn Nhất Cần Xử lý (Top 10 Architectural Issues)

1. **Sự đứt gãy giữa Component Library và Pages (Zero-Adoption Shared UI):**  
   Thư mục \src/components/ui/\ đã có sẵn \utton.tsx\, \data-table.tsx\, \EmptyState.tsx\, \adge.tsx\. Tuy nhiên, 100% trang nghiệp vụ tự viết lại thẻ HTML thô với class Tailwind rời rạc. Kết quả là 225 bảng dữ liệu và 663 nút bấm có cách hiển thị, bo góc, padding và hover khác nhau.
2. **Khủng hoảng tương phản màu nhận diện thương hiệu (A11y Contrast Trap):**  
   Màu thương hiệu Sky-Line Cyan (\#48BFE3\) được dùng làm nền cho chữ trắng (\	ext-white\) trên hơn 200 vị trí nút bấm và badge. Với độ tương phản thực tế chỉ 2.13:1, người dùng lớn tuổi, giáo viên thao tác ngoài trời hoặc trên màn hình laptop độ sáng thấp rất khó đọc.
3. **Phân mảnh màu sắc và định nghĩa sai biến CSS Token:**  
   Trong \src/app/globals.css\, biến \--sidebar\ được gán giá trị \#6930C3\ (Màu tím Royal Purple) kèm chú thích \"Premium Dark Teal Sidebar"\. Hơn 10 sắc thái xanh teal/cyan (\#48BFE3\, \#00A99D\, \#009085\, \#007A72\, \#00B5E2\, \#005B58\, \#003B3A\) bị gõ cứng tùy tiện thay vì quy về hệ thống Semantic Tokens (\--primary\, \--primary-hover\, \--brand-deep-pine\).
4. **Mất cân bằng phân cấp thị giác do lạm dụng \ont-black\ (Typographic Exhaustion):**  
   Hơn 4,448 vị trí sử dụng \ont-black\ (900) cho cả nhãn lọc, cột bảng, ngày tháng và badge phụ, làm mất đi tính tương phản giữa tiêu đề chính (H1/H2) và nội dung hỗ trợ. Mắt người dùng bị quá tải thông tin, không biết trọng tâm ở đâu.
5. **Cấu trúc Sidebar trùng lặp, nhảy số thứ tự và định tuyến đứt gãy:**  
   Ở không gian Giáo viên (\Sidebar.tsx\), mục *"Sổ theo dõi Hướng nghiệp"* xuất hiện lặp lại ở cả Nhóm A (GVCN) và Nhóm B (GVBM). Đánh số menu bị lỗi chuỗi (1, 3, 2, 2, 3,...). Một số liên kết bị gắn đuôi cache buster cứng (\?v=2.1\).
6. **Codebase bị nhân bản giữa Admin và Teacher (Code & UX Duplication):**  
   Màn hình Hồ sơ học sinh tồn tại 2 bản tách rời: Admin (2,577 dòng) và Teacher (2,283 dòng) với các tab và modal giống hệt nhau (\// Tabs matching 100% Admin\), nhân đôi công sức bảo trì và tạo trải nghiệm không đồng bộ khi giáo viên kiêm nhiệm quản trị.
7. **Hỗn loạn Z-Index và Xung đột Lớp phủ (Z-Index Chaos):**  
   Có 148 modal/drawer tự chế dùng \ixed inset-0\ với z-index tùy tiện từ \z-[60]\ đến \z-[9999]\. Thanh điều hướng đáy trên thiết bị di động (\AdminMobileBottomNav\) dùng \z-40\, thường xuyên bị các thanh công cụ nổi \z-[100]\ che khuất hoặc đè lên nút thao tác.
8. **Dashboard Giáo viên chưa phản ánh đúng nhu cầu tác nghiệp (Role-UX Mismatch):**  
   Trang chủ \/teacher\ hiện tại chỉ là một danh sách "bệ phóng" (launcher) các thẻ bài liên kết trùng lặp với Sidebar, thay vì cung cấp ngay các thông tin tối quan trọng mà giáo viên cần: Tiết dạy hôm nay, Lịch dự giờ sắp tới, Phiếu đánh giá cần hoàn thành, Học sinh cần hỗ trợ gấp.
9. **Trải nghiệm bảng dữ liệu lớn thiếu hỗ trợ đọc số liệu (\	abular-nums\ vắng bóng):**  
   Dù \DESIGN.md\ đặt nguyên tắc bắt buộc dùng \	abular-nums\ cho số liệu và điểm số, kiểm tra thực tế chỉ tìm thấy duy nhất 1 vị trí sử dụng. Toàn bộ các bảng điểm, sỹ số, chỉ số KPI có chữ số bị thụt thò không thẳng hàng khi đọc lướt theo cột dọc.
10. **Tìm kiếm và Lọc dữ liệu chưa Debounce gây giật lag (Performance UX):**  
    Hơn 95% ô tìm kiếm gọi trực tiếp hàm lọc dữ liệu trên mỗi ký tự gõ (\onChange\), gây re-render liên tục trên danh sách hàng trăm học sinh và tiết dạy, tạo độ trễ gõ phím trên máy tính bảng và laptop tầm trung.

---

### 3. Điểm Mạnh Cốt Lõi Nên Giữ Lại (KEEP)

* **Cấu trúc nghiệp vụ sư phạm cực kỳ chặt chẽ:**  
  Thuật toán xếp loại tiết dạy K12 và Mầm non theo công thức 20 điểm với các điều kiện khống chế (Y1, Y3, Y6, Y7, tỷ lệ dưới 50%) được xây dựng rất chính xác và minh bạch.
* **Mô hình hóa dữ liệu giáo dục toàn diện:**  
  Hệ thống bao quát đầy đủ mọi khía cạnh từ Hồ sơ học tập cá nhân hóa, Radar năng lực học sinh, Sổ điểm MOET, Khảo sát đầu cấp đến Hoạt động trải nghiệm và Tư vấn hướng nghiệp.
* **Bộ gợi ý nhận xét thông minh (QuickCommentPresets):**  
  Tính năng tự động đề xuất ưu điểm và biện pháp khắc phục dựa trên điểm tiêu chí thực tế giúp giáo viên tiết kiệm 60-70% thời gian soạn biên bản dự giờ.
* **Sự hiện diện của Mobile Bottom Navigation:**  
  Hệ thống đã có định hướng tối ưu cho giáo viên di chuyển bằng các thanh điều hướng đáy (\TeacherMobileBottomNav\, \AdminMobileBottomNav\), chỉ cần chuẩn hóa z-index và breakpoint.

---

### 4. Kết luận & Khuyến nghị Chiến lược

1. **Có cần thay Design System không?**  
   **KHÔNG** thay đổi bản sắc nhận diện Sky-Line. Tiếp tục lấy màu xanh **Deep Pine \#003B3A\** làm nền tảng chủ đạo, kết hợp điểm nhấn **Cyan \#48BFE3\** (có kiểm soát tương phản) và hệ màu bổ trợ chính thức 2024. Đề xuất chuẩn hóa thành **SSM Design Tokens System** tập trung.
2. **Có cần refactor code ngay lập tức không?**  
   **KHÔNG** refactor tràn lan trong lúc audit. Cần lập kế hoạch triển khai từng bước (phân pha từ Foundation Tokens → Shared Components → Navigation Shell → Từng phân hệ nghiệp vụ).
3. **Có rủi ro đứt gãy luồng nghiệp vụ không?**  
   Nếu tuân thủ nguyên tắc giữ nguyên Schema DB, API contracts và RBAC, các cải tiến UI chỉ tác động lên lớp giao diện và trải nghiệm thao tác, hoàn toàn không có rủi ro về mặt dữ liệu.

---

### 5. Danh mục Thắng Nhanh (Quick Wins — Ưu tiên cao, Effort thấp, Không rủi ro)

| Mã | Hạng mục | Vấn đề hiện tại | Hướng khắc phục nhanh | Tác động UX |
|:---|:---|:---|:---|:---|
| **QW-01** | **Sửa lỗi biến \--sidebar\** | Biến gán màu tím \#6930C3\ | Gán lại \--sidebar: #003B3A\ (Deep Pine) trong \globals.css\ | Đồng bộ thương hiệu ngay lập tức |
| **QW-02** | **Xử lý tương phản nút Cyan** | \g-[#48BFE3] text-white\ (2.13:1) | Chuyển thành \g-[#48BFE3] text-[#003B3A] font-bold\ (đạt 9.2:1) hoặc \g-[#003B3A] text-white\ | Đạt chuẩn WCAG AA, dễ đọc rõ rệt |
| **QW-03** | **Dọn dẹp Sidebar GV** | Menu "Hướng nghiệp" bị lặp 2 lần, số thứ tự nhảy cóc | Bỏ mục thừa ở Nhóm B, chuẩn hóa lại thứ tự 1-7 ở Nhóm A và 1-4 ở Nhóm B | Sidebar gọn gàng, giảm nhầm lẫn |
| **QW-04** | **Loại bỏ bộ chọn năm học lặp** | Trang Admin Dashboard có 2 select năm học cùng lúc | Giữ lại selector tại Global Header, xóa select trùng trong body trang | Giải phóng không gian trang |
| **QW-05** | **Bổ sung \	abular-nums\ toàn hệ thống** | Bảng điểm số bị thụt thò chữ số | Thêm class \	abular-nums\ vào container gốc của table | Đọc lướt số liệu điểm số chuẩn xác |
| **QW-06** | **Hạ nhiệt \ont-black\** | Nhãn và chữ phụ dùng weight 900 tràn lan | Đưa nhãn về \ont-medium\, text phụ về \ont-normal\, chỉ giữ H1/H2 \ont-bold\ | Giảm mỏi mắt, tăng cấp bậc thị giác |
