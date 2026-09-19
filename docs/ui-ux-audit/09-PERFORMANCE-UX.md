# BÁO CÁO AUDIT UI/UX TOÀN DIỆN HỆ THỐNG SSM
## TÀI LIỆU 09: HIỆU NĂNG TRẢI NGHIỆM NGƯỜI DÙNG (PERFORMANCE UX AUDIT)

> **Mục tiêu:** Phát hiện các điểm nghẽn giao diện gây giật lag, đơ khung hình, tiêu tốn bộ nhớ và ảnh hưởng trực tiếp đến tốc độ thao tác nhập liệu của người dùng.

---

### 1. Hiện tượng "Đơ Bàn Phím" khi Tìm kiếm (Un-debounced Search Lag)

* **Phát hiện:** Có hơn 95% ô tìm kiếm trong 111 trang được viết theo mô hình:
  \\\	sx
  <input 
    type=\"text\" 
    value={searchQuery} 
    onChange={(e) => setSearchQuery(e.target.value)} 
    placeholder=\"Tìm kiếm học sinh...\"
  />
  \\\
* **Cơ chế gây lỗi:**
  * Mỗi khi người dùng gõ 1 ký tự, React lập tức kích hoạt hàm lọc đồng bộ trên mảng từ **500 đến 2,000 đối tượng học sinh** có cấu trúc phức tạp (kèm điểm số, lớp, cơ sở, năng lực).
  * Khi gõ một từ như *"Nguyễn Văn A"* (12 ký tự), cây DOM bị xóa và vẽ lại **12 lần liên tiếp trong chưa đầy 1 giây**.
* **Hậu quả trên thiết bị người dùng:**
  * Trên các laptop văn phòng hoặc máy tính bảng của giáo viên, con trỏ gõ phím bị khựng lại (freeze), chữ xuất hiện giật cục sau khi tay đã rời bàn phím.
* **Giải pháp chuẩn hóa:** Bắt buộc áp dụng hook \useDebounce(query, 300)\ cho toàn bộ thanh tìm kiếm; chỉ kích hoạt lọc sau khi người dùng ngừng gõ 300 mili-giây.

---

### 2. Tệp Đơn Khối "Khổng Lồ" Gây Tắc Nghẽn Re-render (Monolithic Re-rendering Bottlenecks)

Ba tệp giao diện lớn nhất hệ thống:
1. \src/app/admin/input-assessments/client.tsx\: **9,320 dòng**
2. \src/app/teacher/du-gio/client.tsx\: **7,385 dòng**
3. \src/app/admin/tong-hop-du-gio/client.tsx\: **5,931 dòng**

* **Cơ chế gây chậm:**
  * Toàn bộ state của trang (bộ lọc năm học, trạng thái modal, danh sách tiết dạy, dữ liệu form 11 tiêu chí, trạng thái đang in, gợi ý AI,...) đều được khai báo chung ở cấp component cha cao nhất.
  * Khi giáo viên nhấp vào một nút radio chấm 1.5 điểm cho tiêu chí Y1, **toàn bộ 7,385 dòng mã lệnh bị tính toán lại từ đầu**, bao gồm cả các bảng dữ liệu ẩn bên dưới.
* **Hậu quả:** Form chấm điểm phản hồi chậm, có độ trễ nhận cảm giác nhấn nút (Interaction to Next Paint - INP > 350ms, không đạt chuẩn trải nghiệm mượt mà của Google).
* **Giải pháp:** Phân rã (decouple) thành các sub-components độc lập có \React.memo\, cô lập state của form chấm điểm vào một context riêng để khi nhập điểm chỉ có form đó render lại.

---

### 3. Cây DOM Quá Tải trong Bảng Dữ liệu Lớn (Huge DOM Nodes in Big Tables)

* Tại trang \dmin/ho-so-hoc-sinh\ và \dmin/ktdbcl/results\, danh sách hàng trăm học sinh được render cùng lúc vào một thẻ \<table>\ duy nhất mà không có phân trang ảo (Virtualization).
* Mỗi hàng học sinh chứa trung bình 15 ô \<td>\, trong mỗi ô lại có các thẻ \div\, \span\, \adge\, \utton\. Tổng số phần tử DOM của một trang vượt quá **4,500 DOM nodes** (gấp 3 lần ngưỡng khuyến nghị 1,500 nodes của Lighthouse).
* **Hậu quả:** Bộ nhớ trình duyệt Chrome/Edge của máy tính tăng vọt lên 400MB - 600MB cho một tab làm việc, gây nóng máy và nhanh tụt pin laptop khi giáo viên chấm bài.
* **Giải pháp:** Cố định kích thước trang mặc định ở mức **20 hoặc 50 bản ghi/trang**, tích hợp cơ chế phân trang phía client mượt mà hoặc ảo hóa hàng (windowing) đối với các bảng ma trận lớn.

---

### 4. Tối ưu Hóa Tải Tài nguyên Hình ảnh (Image & Icon Optimization)

* Nhiều nơi sử dụng trực tiếp thẻ \<img src=\"/logo.png\" />\ hoặc ảnh đại diện học sinh qua thẻ \<img src={student.avatarUrl} />\ thô thay vì component tối ưu \<Image />\ của Next.js.
* Thiếu thuộc tính \loading=\"lazy\"\ và kích thước \width\ / \height\ tường minh, gây hiện tượng giật nhảy layout (Cumulative Layout Shift - CLS) khi ảnh tải về chậm.
* Mỗi trang import trực tiếp 20-35 icons từ \lucide-react\. Mặc dù bundler hỗ trợ tree-shaking, việc import quá nhiều icon phân tán trong cùng một file làm tăng kích thước bundle JavaScript ban đầu của trang.
