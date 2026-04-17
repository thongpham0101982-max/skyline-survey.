const fs = require('fs');

// =====================================================
// MAP: ASCII -> Vietnamese with diacritics
// =====================================================
const replacements = [
  // weekly-reports/client.tsx - PROGRESS labels
  ["Chua bat dau", "Chưa bắt đầu"],
  ["Dang thuc hien", "Đang thực hiện"],
  ["Hoan thanh", "Hoàn thành"],
  ["Chua hoan thanh", "Chưa hoàn thành"],
  // Weekly report
  ["Bao cao Tuan", "Báo cáo Tuần"],
  ["Tong hop", "Tổng hợp"],
  ["Ca nhan", "Cá nhân"],
  // Filters
  [">Thang<", ">Tháng<"],
  [">Nam<", ">Năm<"],
  [">Nam hoc<", ">Năm học<"],
  [">Tuan<", ">Tuần<"],
  ["Thang {m}", "Tháng {m}"],
  // Dashboard
  ["Tong dau viec", "Tổng đầu việc"],
  ["Dang thuc hien", "Đang thực hiện"],
  ["Chua thuc hien", "Chưa thực hiện"],
  ["Tre han", "Trễ hạn"],
  ["Tien do cong viec theo tuan", "Tiến độ công việc theo tuần"],
  ["Chua co du lieu bao cao", "Chưa có dữ liệu báo cáo"],
  [" muc\"", " mục\""],
  [" muc<", " mục<"],
  // Consolidated
  ["Tong hop bao cao Tuan", "Tổng hợp báo cáo Tuần"],
  [" bao cao<", " báo cáo<"],
  [">Ma NV<", ">Mã NV<"],
  [">Ho va Ten<", ">Họ và Tên<"],
  [">Task chinh<", ">Task chính<"],
  [">Noi dung cong viec<", ">Nội dung công việc<"],
  [">Tien do<", ">Tiến độ<"],
  [">De xuat giai phap<", ">Đề xuất giải pháp<"],
  [">Nhan xet cua QL<", ">Nhận xét của QL<"],
  [">Nhan xet QL<", ">Nhận xét QL<"],
  ["Chua co bao cao nao cho tuan nay", "Chưa có báo cáo nào cho tuần này"],
  // Personal
  ["Da duyet", "Đã duyệt"],
  ["Da nop", "Đã nộp"],
  ["Nhap\"", "Nháp\""],
  ["Nhan vien chua nop bao cao", "Nhân viên chưa nộp báo cáo"],
  ["Nhan '+ Them dong' de bat dau!", "Nhấn '+ Thêm dòng' để bắt đầu!"],
  ["Nhap task...", "Nhập task..."],
  ["Mo ta...", "Mô tả..."],
  ["De xuat...", "Đề xuất..."],
  [">Luu<", ">Lưu<"],
  [">Huy<", ">Hủy<"],
  ["Click de nhan xet...", "Nhấn để nhận xét..."],
  [">Chua co<", ">Chưa có<"],
  [" Them dong<", " Thêm dòng<"],
  ["Dang luu...", "Đang lưu..."],
  ["Luu bao cao", "Lưu báo cáo"],
  ["Nhan xet tong the", "Nhận xét tổng thể"],
  ["Nhap nhan xet...", "Nhập nhận xét..."],
  ["Gui nhan xet", "Gửi nhận xét"],
  ["Xem bao cao cua", "Xem báo cáo của"],
  ["Nhom quyen", "Nhóm quyền"],
  ["-- Tat ca nhom --", "-- Tất cả nhóm --"],
  // Week labels
  ["\"Tuan \" + weekNum", "\"Tuần \" + weekNum"],
  // Alerts
  ["Vui long them it nhat 1 dong!", "Vui lòng thêm ít nhất 1 dòng!"],
  ["Vui long dien day du!", "Vui lòng điền đầy đủ!"],
  ["Luu thanh cong!", "Lưu thành công!"],
  ["\"Loi: \"", "\"Lỗi: \""],
];

// =====================================================
// FILE 1: weekly-reports/client.tsx
// =====================================================
let client = fs.readFileSync('src/app/admin/weekly-reports/client.tsx', 'utf8');
for (const [from, to] of replacements) {
  while (client.includes(from)) client = client.replace(from, to);
}
fs.writeFileSync('src/app/admin/weekly-reports/client.tsx', client);
console.log('OK: weekly-reports/client.tsx Vietnamized');

// =====================================================
// FILE 2: tasks/client.tsx
// =====================================================
let tasksClient = fs.readFileSync('src/app/admin/tasks/client.tsx', 'utf8');
const taskReplacements = [
  ["Dieu hanh Cong viec", "Điều hành Công việc"],
  ["Giao viec moi", "Giao việc mới"],
  ["Chua thuc hien", "Chưa thực hiện"],
  ["Dang thuc hien", "Đang thực hiện"],
  ["Hoan thanh", "Hoàn thành"],
  ["Tre han", "Trễ hạn"],
  ["Khao Sat", "Khảo Sát"],
  ["Dao Tao", "Đào Tạo"],
  ["He Thong", "Hệ Thống"],
  ["Nhan Su", "Nhân Sự"],
  ["Khac", "Khác"],
  ["Loc tien do", "Lọc tiến độ"],
  [">DANH MUC<", ">DANH MỤC<"],
  [">NOI DUNG<", ">NỘI DUNG<"],
  [">NGUOI NHAN<", ">NGƯỜI NHẬN<"],
  [">HAN CHOT<", ">HẠN CHÓT<"],
  [">TIEN DO<", ">TIẾN ĐỘ<"],
  [">THAO TAC<", ">THAO TÁC<"],
  ["Chua co cong viec", "Chưa có công việc"],
  ["Nhac viec", "Nhắc việc"],
  ["Tieu de cong viec", "Tiêu đề công việc"],
  ["Danh muc", "Danh mục"],
  ["Nhom quyen", "Nhóm quyền"],
  ["Nhan vien cu the", "Nhân viên cụ thể"],
  ["Giao cho ca nhom", "Giao cho cả nhóm"],
  ["Nam hoc", "Năm học"],
  ["Ngay bat dau", "Ngày bắt đầu"],
  ["Han chot", "Hạn chót"],
  ["Tao cong viec", "Tạo công việc"],
  ["Cap nhat", "Cập nhật"],
  [">Huy<", ">Hủy<"],
  ["Phan hoi cong viec", "Phản hồi công việc"],
  ["Tien do", "Tiến độ"],
  ["Ghi chu phan hoi", "Ghi chú phản hồi"],
  ["Gui phan hoi", "Gửi phản hồi"],
  ["Dang gui...", "Đang gửi..."],
  ["-- Tat ca --", "-- Tất cả --"],
  ["Dang tai...", "Đang tải..."],
];
for (const [from, to] of taskReplacements) {
  while (tasksClient.includes(from)) tasksClient = tasksClient.replace(from, to);
}
fs.writeFileSync('src/app/admin/tasks/client.tsx', tasksClient);
console.log('OK: tasks/client.tsx Vietnamized');

// =====================================================
// FILE 3: tasks/TaskDetailPanel.tsx
// =====================================================
let panel = fs.readFileSync('src/app/admin/tasks/TaskDetailPanel.tsx', 'utf8');
const panelReplacements = [
  ["Vua xong", "Vừa xong"],
  ["phut truoc", "phút trước"],
  ["gio truoc", "giờ trước"],
  ["Binh luan", "Bình luận"],
  ["File dinh kem", "File đính kèm"],
  ["Chua co binh luan nao", "Chưa có bình luận nào"],
  ["Hay la nguoi dau tien binh luan!", "Hãy là người đầu tiên bình luận!"],
  ["Chua co file dinh kem", "Chưa có file đính kèm"],
  ["Tai len file de chia se voi nhom", "Tải lên file để chia sẻ với nhóm"],
  ["Nhap binh luan... (Enter de gui)", "Nhập bình luận... (Enter để gửi)"],
  ["Dang tai len...", "Đang tải lên..."],
  ["Tai file len", "Tải file lên"],
  ["Toi da 5MB / file", "Tối đa 5MB / file"],
  ["Xoa binh luan nay?", "Xóa bình luận này?"],
  ["Khong tim thay", "Không tìm thấy"],
  ["Khong co quyen", "Không có quyền"],
  ["Xoa file nay?", "Xóa file này?"],
  ["Tai xuong", "Tải xuống"],
  [">Xoa<", ">Xóa<"],
];
for (const [from, to] of panelReplacements) {
  while (panel.includes(from)) panel = panel.replace(from, to);
}
fs.writeFileSync('src/app/admin/tasks/TaskDetailPanel.tsx', panel);
console.log('OK: TaskDetailPanel.tsx Vietnamized');

// =====================================================
// FILE 4: tasks/collab_actions.ts
// =====================================================
let collabActions = fs.readFileSync('src/app/admin/tasks/collab_actions.ts', 'utf8');
const collabReplacements = [
  ["Chua dang nhap", "Chưa đăng nhập"],
  ["Khong tim thay", "Không tìm thấy"],
  ["Khong co quyen", "Không có quyền"],
  ["[Binh luan] ", "[Bình luận] "],
  ["Nhan vien", "Nhân viên"],
];
for (const [from, to] of collabReplacements) {
  while (collabActions.includes(from)) collabActions = collabActions.replace(from, to);
}
fs.writeFileSync('src/app/admin/tasks/collab_actions.ts', collabActions);
console.log('OK: collab_actions.ts Vietnamized');

// =====================================================
// FILE 5: weekly-reports/actions.ts
// =====================================================
let wrActions = fs.readFileSync('src/app/admin/weekly-reports/actions.ts', 'utf8');
const wrReplacements = [
  ["Chua dang nhap", "Chưa đăng nhập"],
  ["Chi quan ly moi co quyen", "Chỉ quản lý mới có quyền"],
  ["[Nhan xet BC] Tuan ", "[Nhận xét BC] Tuần "],
  [" Thang ", " Tháng "],
  ["Quan ly da nhan xet bao cao cua ban: ", "Quản lý đã nhận xét báo cáo của bạn: "],
];
for (const [from, to] of wrReplacements) {
  while (wrActions.includes(from)) wrActions = wrActions.replace(from, to);
}
fs.writeFileSync('src/app/admin/weekly-reports/actions.ts', wrActions);
console.log('OK: weekly-reports/actions.ts Vietnamized');

// =====================================================
// FILE 6: Sidebar.tsx
// =====================================================
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
const sidebarReplacements = [
  ["\"Manage Surveys\"", "\"Quản lý Khảo sát\""],
  ["\"Manage Classes\"", "\"Quản lý Lớp học\""],
  ["\"Academic Years\"", "\"Năm học\""],
  ["\"Admin Portal\"", "\"Cổng Quản trị\""],
  ["Dang xuat", "Đăng xuất"],
];
for (const [from, to] of sidebarReplacements) {
  while (sidebar.includes(from)) sidebar = sidebar.replace(from, to);
}
fs.writeFileSync('src/components/Sidebar.tsx', sidebar);
console.log('OK: Sidebar.tsx Vietnamized');

console.log('\n=== ALL FILES VIETNAMIZED ===');
