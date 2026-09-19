# BÁO CÁO AUDIT UI/UX TOÀN DIỆN HỆ THỐNG SSM
## TÀI LIỆU 11: DANH MỤC TỒN ĐỌNG ƯU TIÊN (PRIORITY BACKLOG)

> **Mục tiêu:** Phân loại toàn bộ các vấn đề phát hiện theo mức độ nghiêm trọng (P0, P1, P2, P3), đánh giá tác động thực tế, độ phức tạp triển khai (Effort) và mức độ rủi ro (Risk) để làm căn cứ lập kế hoạch thực hiện.

---

### Bảng Danh mục Tồn đọng Chi tiết (Actionable Priority Backlog)

| ID | Phân hệ (Module) | Vấn đề Cụ thể (Specific Issue) | Mức độ (Priority) | Tác động (Impact) | Độ phức tạp (Effort) | Rủi ro (Risk) | Hướng Đề xuất Khắc phục (Recommendation) |
|:---|:---|:---|:---:|:---|:---:|:---:|:---|
| **ISSUE-01** | **Toàn hệ thống (A11y)** | Nút bấm Cyan \#48BFE3\ nền sáng với chữ trắng tương phản chỉ 2.13:1 | **P0** | Người dùng mờ mắt, khó đọc, dễ bấm nhầm nút thao tác quan trọng | Thấp | Không | Chuyển chữ sang Deep Pine \#003B3A\ (9.2:1) hoặc nền Deep Pine chữ trắng |
| **ISSUE-02** | **Dự giờ & PTCM** | Modal chấm điểm 11 tiêu chí K12 bị tràn khung nhìn, che mất nút Lưu trên laptop | **P0** | Giáo viên không lưu được phiếu đánh giá, nguy cơ mất biên bản dự giờ | Trung bình | Thấp | Chuyển sang Full-screen Workspace hoặc Drawer có header/footer cố định |
| **ISSUE-03** | **Khảo sát đầu vào** | Thanh tác vụ nổi (\z-[100]\) đè kín Bottom Navigation và hàng dữ liệu cuối trên mobile/tablet | **P0** | Người dùng bị kẹt màn hình, không thể chuyển trang trên thiết bị di động | Thấp | Không | Nâng khoảng cách nổi \ottom-16\ khi ở màn hình nhỏ \< md\ |
| **ISSUE-04** | **Sổ điểm & Nhận xét** | Bảng nhập điểm không có \stickyHeader\ và \stickyFirstColumn\, không có highlight dòng | **P0** | Giáo viên nhập nhầm điểm của học sinh này sang học sinh khác khi cuộn ngang/dọc | Trung bình | Thấp | Bổ sung thanh cố định cột Tên học sinh và cố định hàng môn học |
| **ISSUE-05** | **Thao tác nguy hiểm** | Các nút Xóa học sinh, Hủy tiết dạy, Reset điểm dùng \window.confirm\ thô | **P0** | Nguy cơ mất dữ liệu do người dùng bấm nhanh không đọc kỹ | Thấp | Không | Chuẩn hóa hộp thoại \<ConfirmDialog>\ có nhãn đối tượng rõ ràng và độ trễ nút đỏ |
| **ISSUE-06** | **Hiệu năng tìm kiếm** | Tìm kiếm học sinh và tiết dạy không debounce, kích hoạt lọc trên từng phím gõ | **P1** | Giật lag đơ máy tính bảng và laptop khi gõ tìm kiếm | Thấp | Không | Tích hợp hook \useDebounce(300)\ cho toàn bộ thanh tìm kiếm |
| **ISSUE-07** | **Dự giờ & PTCM** | File đơn khối \ObservationClient\ 7,385 dòng gây chậm toàn bộ thao tác chấm điểm | **P1** | Đơ giao diện, độ trễ tương tác INP cao (> 350ms) | Cao | Thấp | Tách các component con (K12Form, PreschoolForm, Presets, Summary) và memoize |
| **ISSUE-08** | **Hồ sơ học sinh** | Nhân bản hơn 4,800 dòng mã giữa \dmin/ho-so-hoc-sinh\ và \	eacher/ho-so-hoc-sinh\ | **P1** | Gấp đôi chi phí bảo trì, nguy cơ lệch logic hiển thị hồ sơ năng lực | Cao | Thấp | Hợp nhất thành 1 component dùng chung \<StudentProfileViewer role={...} />\ |
| **ISSUE-09** | **Typography** | Lạm dụng \ont-black\ (900) hơn 4,448 vị trí, mất toàn bộ phân cấp thị giác | **P1** | Mỏi mắt, quá tải nhận thức, người dùng không biết đâu là thông tin chính | Trung bình | Không | Chuẩn hóa Type Scale: H1/H2 \ont-bold\, nhãn \ont-medium\, nội dung \ont-normal\ |
| **ISSUE-10** | **Bảng dữ liệu** | Toàn bộ 225 bảng dữ liệu không có \	abular-nums\, chữ số điểm lệch hàng | **P1** | Khó đối chiếu điểm số và số liệu học tập theo chiều dọc | Rất thấp | Không | Thêm class \	abular-nums\ vào lớp vỏ bọc bảng |
| **ISSUE-11** | **Dashboard Giáo viên** | Trang chủ Teacher chỉ có các thẻ launcher, không có lịch dạy và việc cần làm | **P1** | Giáo viên mất thêm 2-3 bước chuyển trang mới tìm thấy việc của ngày | Trung bình | Không | Tái cấu trúc thành Teacher Workbench: Đưa lịch dạy và danh sách chờ lên đầu |
| **ISSUE-12** | **Trợ năng (A11y)** | 0 / 663 nút bấm có \ria-label\, 285 input thiếu id liên kết label | **P1** | Người dùng trợ năng và khiếm thị hoàn toàn bị cô lập khỏi hệ thống | Trung bình | Không | Bổ sung \ria-label\ cho icon button và \htmlFor\ cho form nhãn |
| **ISSUE-13** | **Thanh bên (Sidebar)** | Mục Hướng nghiệp bị lặp 2 lần; đánh số menu bị nhảy chuỗi sai thứ tự | **P2** | Nhầm lẫn phân quyền giữa GVCN và GVBM, tạo cảm giác hệ thống cẩu thả | Thấp | Không | Xóa mục thừa ở Nhóm B, chuẩn hóa thứ tự hiển thị |
| **ISSUE-14** | **Toàn hệ thống (Header)** | Trùng lặp bộ chọn năm học ở Header và trong thân trang Dashboard | **P2** | Rối mắt, thừa thãi thông tin, chiếm diện tích | Rất thấp | Không | Bỏ select năm học trong trang, tập trung duy nhất tại Header |
| **ISSUE-15** | **Breadcrumbs** | Nút Home trong \PageHeader\ hardcode link về \/admin\ | **P2** | Giáo viên và phụ huynh bấm vào bị redirect hoặc báo lỗi quyền truy cập | Rất thấp | Không | Gán link Home động theo ngữ cảnh vai trò đăng nhập |
| **ISSUE-16** | **Design Tokens** | Hardcode hơn 10 biến thể màu xanh teal/cyan (\#00A99D\, \#009085\, \#0284C7\) | **P2** | Màu sắc lộn xộn, thiếu đồng nhất thương hiệu | Trung bình | Không | Quy về hệ thống biến \--primary\, \--brand-deep-pine\, \--brand-cyan\ |
| **ISSUE-17** | **Trạng thái rỗng** | 51 vị trí chỉ in dòng chữ xám \"Không có dữ liệu\" | **P2** | Cụt luồng trải nghiệm, người dùng không biết phải làm gì tiếp | Thấp | Không | Thay bằng component \<EmptyState>\ có nút tạo mới hoặc nút xóa bộ lọc |
| **ISSUE-18** | **Bo góc & Đổ bóng** | Hỗn hợp 7 cấp độ bo góc từ \ounded-none\ đến \ounded-3xl\ | **P3** | Giao diện trông chắp vá, nhiều khối bóng đổ nặng nề | Thấp | Không | Quy định trần bo góc tối đa: \ounded-xl\ cho card, \ounded-2xl\ cho modal |
| **ISSUE-19** | **Nhật ký hệ thống** | Chuỗi JSON log thô không được format, khó đọc | **P3** | Chuyên viên quản trị mất thời gian tra cứu sự cố | Thấp | Không | Tích hợp trình xem cú pháp JSON có định dạng màu và nút copy nhanh |
