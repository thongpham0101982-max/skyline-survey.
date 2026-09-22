# MA TRẬN PHÂN QUYỀN & KIỂM SOÁT PHẠM VI TRUY CẬP AI (SSM AI RBAC & SBAC PERMISSION MATRIX)
**Dự án**: Hệ thống Quản trị Chất lượng Giáo dục SSM — Sky-Line Education Group  
**Tác giả**: Senior AI Architect, Senior Security Engineer, Senior Full-Stack Engineer  
**Thời gian**: 2026-09-22  
**Trạng thái**: Hoàn thành Giai đoạn 3 (Phase 3: AI Permission Matrix)

---

## 1. NGUYÊN TẮC BẢO MẬT & PHÂN QUYỀN CỐT LÕI

Mọi truy cập dữ liệu của **SSM AI Assistant** bắt buộc tuân thủ 5 nguyên tắc vàng:
1. **Kế thừa Tuyệt đối Quyền Người dùng (User Impersonation Principle)**: AI không có quyền hạn riêng độc lập. Quyền hạn của AI chính là tập con (subset) của quyền hạn tài khoản đang đăng nhập.
2. **Kiểm tra Phân quyền Hai Lớp (Two-Tier Permission Verification)**:
   - *Lớp 1 (Role-Based Access Control - RBAC)*: Người dùng có được phép thực hiện chức năng/công cụ này hay không?
   - *Lớp 2 (Scope-Based Access Control - SBAC)*: Người dùng có thẩm quyền trên bản ghi dữ liệu cụ thể (Cơ sở nào? Bộ phận nào? Tổ nào? Lớp nào? Môn nào? Học sinh nào?) hay không?
3. **Nguyên tắc Từ chối An toàn (Safe Denial & Non-Disclosure Principle)**:
   - Khi bị từ chối truy cập (DENY), AI trả về thông báo từ chối chung, tuyệt đối không tiết lộ sự tồn tại của bản ghi (không trả lời kiểu: *"Học sinh này thuộc CS2 nên Thầy/Cô CS1 không được xem"* mà trả lời: *"Thầy/Cô không có thẩm quyền truy cập hồ sơ này"*).
4. **Phòng vệ Chống Injection (Zero-Trust Prompting)**: AI không cho phép người dùng dùng các kỹ thuật xã hội (prompt injection / roleplay) để tự nhận mình là Admin hoặc yêu cầu bỏ qua bộ lọc phạm vi.
5. **Che giấu Thông tin Định danh (PII Protection)**: Các trường định danh cá nhân nhạy cảm (SĐT, Email, Địa chỉ, Số CCCD) tự động bị băm hoặc ẩn trước khi gửi cho Model.

---

## 2. MA TRẬN PHÂN CẤP VAI TRÒ & KHÔNG GIAN DỮ LIỆU (ROLE & SCOPE MATRIX)

| Vai trò Người dùng | Phân loại Chức danh | Phạm vi Cơ sở (Campus Scope) | Phạm vi Bộ phận / TCM (Division / TCM Scope) | Phạm vi Lớp học (Class Scope) | Phạm vi Môn học (Subject Scope) | Phạm vi Học sinh (Student Scope) |
|---|---|---|---|---|---|---|
| **ADMIN / SUPER_ADMIN** | Ban Quản trị Cấp cao | **Toàn bộ 5 Cơ sở** (CS1 - CS5) | **Toàn bộ 6 Bộ phận** & Mọi Tổ CM | **Toàn bộ 231 Lớp** toàn trường | **Tất cả các Môn** | **Tất cả 4.489 Học sinh** |
| **BAN_DHCM / BGH / KT-ĐBCL** | Lãnh đạo Chuyên môn & ĐBCL | **Toàn bộ 5 Cơ sở** | **Toàn bộ 6 Bộ phận** & Mọi Tổ CM | **Toàn bộ các Lớp** | **Tất cả các Môn** | **Toàn bộ Học sinh** |
| **GĐCS (Giám đốc Cơ sở)** | Lãnh đạo Cơ sở | **Chỉ 1 Cơ sở được giao** | Các TCM trực thuộc cơ sở đó | Các lớp thuộc cơ sở mình quản lý | Các môn thuộc cơ sở mình | Học sinh thuộc cơ sở mình |
| **TBP (Trưởng Bộ phận)** | Quản lý Chuyên môn Khối | Theo phân công Bộ phận | **Các TCM trực thuộc Bộ phận** (ví dụ: BP Trung học) | Các lớp thuộc cấp học của Bộ phận | Các môn do Bộ phận quản lý | Học sinh thuộc cấp học Bộ phận |
| **TTCM (Tổ trưởng Chuyên môn)**| Lãnh đạo Tổ Bộ môn | Theo cơ sở giảng dạy | **Chỉ đúng 1 Tổ Chuyên Môn** của mình phụ trách | Các lớp có môn thuộc Tổ giảng dạy | **Chỉ các Môn thuộc Tổ** | Học sinh học các môn thuộc Tổ |
| **GVBM (Giáo viên Bộ môn)** | Giảng dạy chuyên môn | Theo phân công giảng dạy | Thuộc 1 Tổ Chuyên môn | **Chỉ các Lớp được phân công dạy** | **Chỉ Môn mình trực tiếp dạy** | Học sinh trong các lớp mình dạy |
| **GVCN / CVHT** | Chủ nhiệm & Cố vấn | Theo lớp chủ nhiệm | Tổ Chuyên môn cá nhân | **Chỉ Lớp mình làm Chủ nhiệm** | Toàn bộ môn học của lớp Chủ nhiệm | **Chỉ Học sinh lớp Chủ nhiệm** |
| **PHS (Phụ huynh Học sinh)** | Gia đình học sinh | N/A | N/A | N/A | Điểm số các môn của con | **CHỈ CON EM MÌNH** (qua `ParentStudentLink`) |
| **STUDENT (Học sinh)** | Người học | N/A | N/A | N/A | Điểm số các môn của mình | **CHỈ CHÍNH BẢN THÂN HỌC SINH** |

---

## 3. MA TRẬN PHÂN QUYỀN CHI TIẾT THEO TỪNG CÔNG CỤ AI (TOOL PERMISSION MATRIX)

| STT | Tên Tool Nghiệp Vụ | Admin / BGH | GĐCS | TBP | TTCM | GVBM | GVCN | PHS | HS | Điều Kiện Thẩm Định Bắt Buộc (Enforcement Rule) |
|:---:|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| 1 | `searchKnowledge` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Lọc tài liệu theo `roleScope` và `campusScope` của người dùng. |
| 2 | `getCurrentUser` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Chỉ trả thông tin danh tính của chính tài khoản đang đăng nhập. |
| 3 | `getStudentProfile` | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ❌ | ❌ | BGH/GVCN xem toàn diện; GVBM chỉ xem học sinh lớp dạy; PHS/HS dùng API riêng. |
| 4 | `getStudentExamResult` | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | PHS chỉ xem con mình; HS chỉ xem bản thân; GVBM xem lớp mình dạy; GVCN xem lớp CN. |
| 5 | `getClassExamAnalysis` | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ❌ | ❌ | GVBM chỉ xem lớp/môn mình dạy; TTCM xem môn thuộc tổ; PHS/HS không được truy cập. |
| 6 | `getSubjectAnalysis` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Chỉ dành cho cấp quản lý chuyên môn (Tổ trưởng, Trưởng bộ phận, BGH). |
| 7 | `getStudentGoal` | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ✅ | ✅ | ✅ | Quản lý mục tiêu SMART; PHS và HS xem mục tiêu cá nhân; GVCN xem cả lớp. |
| 8 | `getStudentGapAnalysis` | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | Khoảng chênh lệch Thực tế vs Mục tiêu; PHS/HS xem cá nhân; GV xem học sinh diện quản lý. |
| 9 | `getTeacherProfile` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | TTCM chỉ xem GV trong tổ; TBP xem GV trong bộ phận; BGH xem toàn trường. |
| 10 | `getTeacherObservation` | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | GVBM chỉ xem các tiết của chính mình; TTCM xem các tiết trong tổ; BGH xem tất cả. |
| 11 | `getObservationAnalysis`| ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Phân tích 11 tiêu chí dự giờ sư phạm; cấm tuyệt đối đối với học sinh và phụ huynh. |
| 12 | `getStudentSupportTracking` | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ❌ | ❌ | Cảnh báo Xanh/Vàng/Đỏ; GVCN quản lý học sinh lớp mình; BGH giám sát toàn trường. |
| 13 | `getPsychologyTracking` | ✅ | ⚠️ | ⚠️ | ❌ | ❌ | ⚠️ | ❌ | ❌ | Dữ liệu nhạy cảm cao: Chỉ BGH, Chuyên viên Tâm lý và GVCN liên quan trực tiếp. |
| 14 | `getExperienceResult` | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ | ⚠️ | Đánh giá dự án thực tế; HS/PHS xem kết quả của bản thân/con em; GV xem lớp phụ trách. |
| 15 | `getAssessmentDashboard`| ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | Chỉ BGH, Ban ĐHCM và Giám đốc Cơ sở (theo cơ sở) được truy cập dashboard tổng hợp. |
| 16 | `generateReport` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | Tổng hợp báo cáo định kỳ theo đúng phạm vi quản lý được phân quyền. |

*Ghi chú*:
- `✅`: Toàn quyền trong phạm vi được phân công.
- `⚠️`: Giới hạn có điều kiện (Scope-restricted: chỉ lớp dạy, chỉ môn phụ trách, hoặc chỉ bản thân).
- `❌`: Tuyệt đối nghiêm cấm truy cập (Strictly Prohibited).

---

## 4. MA TRẬN BẢO VỆ DỮ LIỆU & CHE GIẤU THÔNG TIN NHẠY CẢM (PII MASKING)

| Trường Dữ liệu | Mức độ Nhạy cảm | Xử lý đối với BGH / Admin | Xử lý đối với Giáo viên | Xử lý đối với Phụ huynh / Học sinh | Xử lý khi gửi sang LLM (Gemini API) |
|---|:---:|:---:|:---:|:---:|:---:|
| **Họ và tên Học sinh** | Trung bình | Hiển thị đầy đủ | Hiển thị đầy đủ | Hiển thị đầy đủ (chính mình/con) | Giữ nguyên (nếu phục vụ nhận xét) |
| **Mã Học sinh (studentCode)** | Thấp | Hiển thị đầy đủ | Hiển thị đầy đủ | Hiển thị đầy đủ | Giữ nguyên |
| **Số điện thoại Phụ huynh** | **CAO** | Hiển thị có kiểm toán | **Che giấu một phần** (`0905***123`) | Chỉ xem SĐT của chính mình | **ẨN HOÀN TOÀN** (`[MASKED_PHONE]`) |
| **Email Phụ huynh/Học sinh** | **CAO** | Hiển thị có kiểm toán | **Che giấu một phần** (`a***@gmail.com`)| Chỉ xem email của mình | **ẨN HOÀN TOÀN** (`[MASKED_EMAIL]`) |
| **Địa chỉ thường trú / Nơi ở** | **CAO** | Hiển thị có kiểm toán | **ẨN HOÀN TOÀN** | Chỉ xem địa chỉ của mình | **ẨN HOÀN TOÀN** (`[MASKED_ADDRESS]`) |
| **Điểm số & Xếp loại** | Nghiệp vụ | Xem toàn trường | Xem lớp dạy / lớp CN | Xem con mình / bản thân | Giữ nguyên phục vụ thống kê |
| **Ghi chú Cố vấn Tâm lý** | **RẤT CAO** | Xem có phân cấp | Chỉ GVCN liên quan trực tiếp | **ẨN TUYỆT ĐỐI** | **Rút gọn tóm lược, không gửi chi tiết** |

---

## 5. THUẬT TOÁN KIỂM SOÁT TỔNG THỂ (PERMISSION GATEWAY PSEUDO-CODE)

```typescript
export async function authorizeAIAction(
  currentUser: SessionUser,
  toolName: string,
  targetResource: {
    campusId?: string;
    departmentId?: string;
    classId?: string;
    subjectId?: string;
    studentId?: string;
  },
  context: RequestContext
): Promise<AuthorizationResult> {
  // 1. Kiểm tra xác thực căn bản
  if (!currentUser || !currentUser.id) {
    return { authorized: false, reason: "UNAUTHENTICATED" };
  }

  const role = (currentUser.role || "").toUpperCase().trim();

  // 2. SuperAdmin & Ban ĐHCM có toàn quyền truy cập (Unrestricted)
  if (["ADMIN", "SUPER_ADMIN", "KT_DBCL", "BAN_DHCM"].includes(role)) {
    return { authorized: true, scope: "GLOBAL" };
  }

  // 3. Kiểm tra Tool Registry xem vai trò này có quyền gọi Tool hay không (Tier 1: RBAC)
  const allowedRolesForTool = TOOL_ROLE_DEFINITIONS[toolName];
  if (!allowedRolesForTool || !allowedRolesForTool.includes(role)) {
    return { authorized: false, reason: "ROLE_UNAUTHORIZED" };
  }

  // 4. Lấy Hồ sơ phân công Chuyên môn của Nhân sự (Tier 2: SBAC)
  const operationalScope = await resolveUserOperationalScope(currentUser.id);

  // 4.1 Thẩm định Cơ sở (Campus Scope)
  if (targetResource.campusId && operationalScope.allowedCampusIds.length > 0) {
    if (!operationalScope.allowedCampusIds.includes(targetResource.campusId)) {
      return { authorized: false, reason: "CAMPUS_SCOPE_VIOLATION" };
    }
  }

  // 4.2 Thẩm định Tổ Chuyên Môn (Department Scope)
  if (targetResource.departmentId) {
    if (operationalScope.isTBP) {
      if (!operationalScope.managedDepartmentIds.includes(targetResource.departmentId)) {
        return { authorized: false, reason: "DIVISION_SCOPE_VIOLATION" };
      }
    } else if (operationalScope.isTTCM) {
      if (!operationalScope.managedDepartmentIds.includes(targetResource.departmentId)) {
        return { authorized: false, reason: "DEPARTMENT_SCOPE_VIOLATION" };
      }
    }
  }

  // 4.3 Thẩm định Lớp học (Class Scope)
  if (targetResource.classId) {
    const isHomeroom = operationalScope.homeroomClassIds.includes(targetResource.classId);
    const isTeaching = operationalScope.teachingClassIds.includes(targetResource.classId);
    if (!isHomeroom && !isTeaching && !operationalScope.isManager) {
      return { authorized: false, reason: "CLASS_SCOPE_VIOLATION" };
    }
  }

  // 4.4 Thẩm định Học sinh (Student Scope)
  if (targetResource.studentId) {
    if (role === "STUDENT") {
      if (context.studentSession?.studentId !== targetResource.studentId) {
        return { authorized: false, reason: "STUDENT_CROSS_ACCESS_FORBIDDEN" };
      }
    } else if (role === "PARENT") {
      const isLinked = await checkParentStudentLink(currentUser.id, targetResource.studentId);
      if (!isLinked) {
        return { authorized: false, reason: "PARENT_CHILD_LINK_FORBIDDEN" };
      }
    }
  }

  // 5. Cấp phép hợp lệ
  return { authorized: true, scope: "SCOPED" };
}
```
