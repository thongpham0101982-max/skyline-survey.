# QUY CHUẨN CHUYỂN TIẾP NĂM HỌC (YEAR TRANSITION)
## Cơ Chế Tự Động Kế Thừa Hồ Sơ và Xử Lý Học Sinh Chuyển Trường

---

### 1. QUY TẮC BẤT BIẾN (CORE BUSINESS RULE)

> **"Học sinh còn theo dõi (ACTIVE) khi kết thúc năm học được tự động chuyển tiếp sang năm học mới, TRỪ học sinh làm thủ tục chuyển trường."**

---

### 2. MA TRẬN XỬ LÝ CHUYỂN TIẾP CUỐI NĂM

| Trạng thái cuối năm cũ | Tình trạng chuyển trường | Hành vi chuyển tiếp sang năm mới | Ghi chú & Nhãn hiển thị |
| :--- | :---: | :---: | :--- |
| **Đang theo dõi (`ACTIVE`)** | Không |  **Tự động tạo hồ sơ năm mới** | Gắn nhãn `Chuyển tiếp từ năm trước` |
| **Đang theo dõi (`ACTIVE`)** | **Có chuyển trường** | ❌ **LOẠI TRỪ (Không chuyển tiếp)** | Giữ nguyên hồ sơ năm cũ, trạng thái `Chuyển trường` |
| **Đã chấm dứt (`TERMINATED`)**| Không | ❌ **Không chuyển tiếp** | Hồ sơ năm cũ hoàn tất thành công |
| **Chờ duyệt kết thúc** | Không | ⚠️ **Cần quyết định trước khi chuyển** | GVCN/BGH phê duyệt dứt điểm trước khi đóng năm |

---

### 3. NGUYÊN TẮC BẢO LƯU LỊCH SỬ

* Tuyệt đối không xóa hồ sơ năm cũ hoặc ghi đè năm học.
* Khi học sinh sang năm học mới, hồ sơ mới được liên kết với hồ sơ năm cũ qua `previousTargetId` để bảo đảm tính liên tục của dữ liệu theo suốt năm tháng học sinh học tại Sky-Line.\n