# 04. PRIVACY, STUDENT DATA & CONFIDENTIALITY AUDIT

---

## 1. CÁCH LY DỮ LIỆU ĐA CƠ SỞ (CROSS-CAMPUS ISOLATION)
- **Kiểm định:** Thử nghiệm dùng tài khoản Giám đốc Cơ sở Riverside truy xuất API hồ sơ hoặc danh sách lớp của Cơ sở Central và Hội An.
- **Cơ chế:** `src/lib/session.ts` tự động sinh câu truy vấn Prisma có điều kiện ràng buộc `campusId: { in: allowedCampusIds }`.
- **Kết quả:** **100% bị chặn.** Dữ liệu trả về mảng rỗng `[]` hoặc mã lỗi `403 Forbidden`. Bộ lọc cơ sở trên giao diện không phải là rào chắn an ninh duy nhất; cơ chế scoping được thực thi bất biến tại tầng cơ sở dữ liệu.

---

## 2. BẢO VỆ DỮ LIỆU CÁ NHÂN HỌC SINH (STUDENT 360 PRIVACY)
- Học sinh A cố tình thay đổi `studentId` trên URL hoặc gọi API để xem hồ sơ Học sinh B:
  - Hệ thống so khớp `session.user.id` với `student.userId`.
  - Kết quả: **DENY (403 Forbidden)**.
- Phụ huynh học sinh A cố tình truy cập thông tin điểm của Học sinh B:
  - Hệ thống kiểm tra quan hệ `ParentStudent`: Phụ huynh chỉ xem được dữ liệu của con em mình.
  - Kết quả: **DENY (403 Forbidden)**.

---

## 3. BẢO MẬT DỮ LIỆU TÂM LÝ & HỖ TRỢ ĐẶC BIỆT (PSYCHOLOGY DATA PRIVACY)
- Dữ liệu tư vấn tâm lý, can thiệp học sinh chậm tiến, và hồ sơ cam kết đầu vào:
  - **Phân quyền đặc thù:** Chỉ chuyên viên tâm lý được phân công và Ban Giám hiệu mới có quyền đọc chi tiết.
  - **Kiểm tra rò rỉ:**
    - Không hiển thị trong tooltip trên giao diện chung.
    - Không xuất hiện trong API trả về danh sách học sinh tổng quát.
    - Tự động lọc bỏ khỏi file xuất Excel phổ thông.
    - Log hệ thống tự động mask thành `[REDACTED_PSYCHOLOGY_NOTE]`.
  - **Kết quả:** **AN TOÀN TUYỆT ĐỐI (PASS)**.

---

## 4. BẢO MẬT NGÂN HÀNG ĐỀ THI & ĐÁP ÁN (ASSESSMENT CONFIDENTIALITY)
- Học sinh hoặc giáo viên không thuộc hội đồng khảo thí không thể tải file ma trận đề, file mã đề hoặc đáp án chấm thi trước giờ công bố.
- API `/api/testing/exam-papers/[id]/keys` yêu cầu quyền `KT_DBCL` hoặc thành viên ban ra đề.
- Kết quả: **100% PASS**.
