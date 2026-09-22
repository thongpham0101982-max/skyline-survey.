import type { AssistantRole } from "./personas";

export interface KnowledgeItem {
  id: string;
  category: "Học vụ & Điểm số" | "Cố vấn & Hỗ trợ" | "Chuyên môn & Dự giờ" | "Mục tiêu SMART" | "Vận hành & Hướng dẫn";
  title: string;
  keywords: string[];
  applicableRoles: AssistantRole[];
  content: string;
}

/**
 * BỘ TRI THỨC VÀ QUY CHẾ SƯ PHẠM TRƯỜNG SKY-LINE (KNOWLEDGE BASE)
 * Dễ dàng bổ sung thêm quy định, chính sách, hướng dẫn thao tác tại đây.
 * Trợ lý sẽ tự động tra cứu và trả lời khi người dùng hỏi về quy định, cách làm.
 */
export const SCHOOL_KNOWLEDGE_BASE: KnowledgeItem[] = [
  // --- 1. HỌC VỤ & ĐIỂM SỐ ---
  {
    id: "kb-benchmark-thresholds",
    category: "Học vụ & Điểm số",
    title: "Quy định Điểm chuẩn Benchmark học tập",
    keywords: ["benchmark", "điểm chuẩn", "ngưỡng chuẩn", "chuẩn học lực", "chuẩn đánh giá", "điểm sàn"],
    applicableRoles: ["TEACHER", "ADMIN", "PARENT", "STUDENT"],
    content: `### 🎯 Quy Định Ngưỡng Điểm Chuẩn Benchmark — Hệ Thống Giáo Dục Sky-Line

1. **Khối Tiểu học**:
   - Áp dụng ngưỡng điểm chuẩn là **7.0 điểm**.
   - Học sinh có điểm tổng kết dưới 7.0 sẽ được xếp vào danh sách cần giáo viên bộ môn và cố vấn học tập theo dõi sát sao.

2. **Khối THCS và THPT**:
   - Áp dụng ngưỡng điểm chuẩn là **6.0 điểm**.
   - Học sinh có điểm tổng kết dưới 6.0 sẽ được phân loại vào diện cần hỗ trợ học thuật và xây dựng lộ trình cải thiện.

3. **Cơ chế rà soát**:
   - Trợ lý Chuyên môn sẽ tự động đối soát điểm thực tế so với chuẩn quy định và báo cáo cho Thầy/Cô tại mục **Cố vấn học tập** & **Sổ điểm nhận xét**.`
  },
  {
    id: "kb-gradebook-lock-unlock",
    category: "Học vụ & Điểm số",
    title: "Quy trình Khóa và Mở khóa sổ điểm",
    keywords: ["khóa sổ điểm", "mở khóa sổ điểm", "xin mở sổ", "thời hạn vào điểm", "hạn nhập điểm", "sửa điểm quá hạn"],
    applicableRoles: ["TEACHER", "ADMIN"],
    content: `### 🔒 Quy Trình Khóa và Mở Khóa Sổ Điểm

1. **Thời hạn vào điểm**:
   - Giáo viên bộ môn (GVBM) hoàn thành nhập điểm thành phần và điểm tổng kết theo đúng lịch thông báo của Phòng KT-ĐBCL (Khảo thí & Đảm bảo chất lượng).
   - Khi hết hạn, hệ thống SSM sẽ tự động kích hoạt tính năng **Khóa sổ điểm (Gradebook Lock)**.

2. **Quy trình xin mở khóa khi cần hiệu chỉnh**:
   - **Bước 1**: Giáo viên vào màn hình **Sổ điểm nhận xét** môn dạy tương ứng.
   - **Bước 2**: Nhấp vào nút **"Yêu cầu mở khóa"** và điền rõ lý do điều chỉnh, danh sách học sinh cần sửa điểm.
   - **Bước 3**: Bộ phận KT-ĐBCL hoặc Ban Giám Hiệu duyệt yêu cầu trực tiếp trên hệ thống. Khi được duyệt, sổ điểm sẽ mở lại tạm thời trong vòng 24 - 48 giờ để GV hoàn tất chỉnh sửa.`
  },

  // --- 2. CỐ VẤN HỌC TẬP & CẢNH BÁO ---
  {
    id: "kb-at-risk-warning-levels",
    category: "Cố vấn & Hỗ trợ",
    title: "Quy chuẩn phân loại cảnh báo Vàng & Đỏ",
    keywords: ["cảnh báo vàng", "cảnh báo đỏ", "màu vàng", "màu đỏ", "học sinh nguy cơ", "phân loại cảnh báo", "diện nguy cơ"],
    applicableRoles: ["TEACHER", "ADMIN", "PARENT"],
    content: `### 🚨 Quy Chuẩn Phân Loại Mức Độ Cảnh Báo Nguy Cơ

Hệ thống SSM giám sát học sinh tự động qua 3 cấp độ:

- 🟢 **Mức Xanh (Bình thường)**: Học sinh đạt chuẩn ở toàn bộ các môn, tiến độ thực hiện mục tiêu rèn luyện tốt, không có vướng mắc tâm lý - kỷ luật.
- 🟡 **Mức Vàng (Cần lưu ý)**:
  * Có từ **1 đến 2 môn học** có điểm thành phần/tổng kết dưới điểm chuẩn benchmark.
  * Hoặc chưa hoàn thành đúng hạn mục tiêu cá nhân đã cam kết.
  * *Hành động*: GVCN và GVBM cùng theo dõi, nhắc nhở và đôn đốc trong giờ sinh hoạt lớp.
- 🔴 **Mức Đỏ (Nguy cơ cao - Báo động)**:
  * Có từ **3 môn học trở lên** dưới chuẩn benchmark.
  * Hoặc có sự sụt giảm kết quả đột ngột hoặc học sinh gửi yêu cầu trợ giúp khẩn cấp.
  * *Hành động bắt buộc*: GVCN phải tổ chức buổi **Cố vấn 1-1** trong vòng 3 ngày, lập **Kế hoạch 7 ngày gỡ khó** và gửi thông báo phối hợp tới Phụ huynh.`
  },
  {
    id: "kb-seven-day-unlock",
    category: "Cố vấn & Hỗ trợ",
    title: "Kế hoạch 7 ngày gỡ khó (7-Day Action Plan)",
    keywords: ["7 ngày", "kế hoạch 7 ngày", "gỡ khó", "seven day unlock", "hành động 7 ngày", "giải tỏa khó khăn"],
    applicableRoles: ["STUDENT", "TEACHER", "PARENT", "ADMIN"],
    content: `### 🚀 Kế Hoạch 7 Ngày Gỡ Khó (7-Day Action Plan) Là Gì?

1. **Khái niệm**:
   - Là một chiến lược can thiệp ngắn hạn, chia nhỏ mục tiêu khó khăn thành các hành động cụ thể, làm liên tục trong vòng 7 ngày để giúp học sinh nhanh chóng vượt qua rào cản tâm lý hoặc học thuật.

2. **Cách thức thực hiện**:
   - **Học sinh**: Xác định 1 khó khăn lớn nhất (Ví dụ: *Không nhớ công thức Hóa học*, *Chưa biết cách viết đoạn văn Tiếng Anh*).
   - **Hành động 7 ngày**: Cam kết mỗi ngày dành 15-20 phút thực hiện bài tập có sự hướng dẫn.
   - **Cố vấn & Phụ huynh**: Đồng hành, xác nhận kết quả hằng ngày và mở khóa (Unlock) ghi nhận thành tích của học sinh.`
  },

  // --- 3. CHUYÊN MÔN & DỰ GIỜ ---
  {
    id: "kb-teacher-observation-quota",
    category: "Chuyên môn & Dự giờ",
    title: "Chỉ tiêu và Quy định Dự giờ chuyên môn",
    keywords: ["dự giờ", "chỉ tiêu dự giờ", "mấy tiết dự giờ", "quy định dự giờ", "tiết dạy", "định mức dự giờ"],
    applicableRoles: ["TEACHER", "ADMIN"],
    content: `### 🏫 Quy Định Chỉ Tiêu Dự Giờ Chuyên Môn Tại Sky-Line

1. **Định mức dự giờ bắt buộc**:
   - Mỗi giáo viên bắt buộc dự tối thiểu **02 tiết/tháng** (theo lịch đăng ký hoặc dự đột xuất).
   - Tổ trưởng chuyên môn (TTCM) và BGH có định mức dự kiểm tra định kỳ theo kế hoạch năm học.

2. **Quy trình thực hiện trên SSM**:
   - **Bước 1**: Giáo viên đăng ký tiết dạy của mình lên hệ thống tại mục **Dự giờ**.
   - **Bước 2**: Giáo viên đồng nghiệp chọn tiết muốn dự và bấm **Đăng ký dự giờ**.
   - **Bước 3**: Sau tiết dạy, giáo viên đi dự điền phiếu góp ý (Ưu điểm, Điểm cần cải thiện, Xếp loại) trên phần mềm để hệ thống ghi nhận hoàn thành chỉ tiêu.`
  },

  // --- 4. SỔ MỤC TIÊU SMART ---
  {
    id: "kb-smart-goals-guide",
    category: "Mục tiêu SMART",
    title: "Hướng dẫn lập Mục tiêu rèn luyện SMART",
    keywords: ["mục tiêu smart", "đặt mục tiêu", "cách đặt mục tiêu", "sổ mục tiêu", "tiêu chí smart"],
    applicableRoles: ["STUDENT", "TEACHER", "PARENT"],
    content: `### 🌟 Hướng Dẫn Thiết Lập Mục Tiêu Rèn Luyện SMART

Mục tiêu chuẩn SMART bao gồm 5 yếu tố:
- **S (Specific - Cụ thể)**: Nêu rõ môn học và kỹ năng cần cải thiện (Ví dụ: *"Nâng điểm môn Toán"* thay vì *"Học giỏi hơn"*).
- **M (Measurable - Đo lường được)**: Có con số rõ ràng (Ví dụ: *"Đạt từ 8.0 điểm trở lên"*).
- **A (Achievable - Khả thi)**: Phù hợp với năng lực hiện tại, không đặt mục tiêu quá xa vời.
- **R (Relevant - Thực tế)**: Gắn liền với định hướng phát triển hoặc môn học bản thân đang còn yếu.
- **T (Time-bound - Có thời hạn)**: Thời điểm hoàn thành cụ thể (Ví dụ: *"Trước kỳ thi Cuối Học kỳ 1"*).

> 👨‍🏫 **Ghi nhận từ nhà trường**: Sau khi học sinh đăng ký mục tiêu, GVCN sẽ duyệt và phản hồi nhận xét; Phụ huynh có thể xem và gửi lời nhắn cổ vũ con em mình.`
  },

  // --- 5. VẬN HÀNH & ĐIỀU HƯỚNG SSM ---
  {
    id: "kb-navigation-guide",
    category: "Vận hành & Hướng dẫn",
    title: "Hướng dẫn Điều hướng các Chức năng trên SSM",
    keywords: ["ở đâu", "xem ở đâu", "menu nào", "chức năng ở đâu", "tìm ở đâu", "hướng dẫn vào"],
    applicableRoles: ["STUDENT", "TEACHER", "PARENT", "ADMIN"],
    content: `### 🧭 Sơ Đồ Điều Hướng Nhanh Trên Hệ Thống SSM

- **Dành cho Giáo viên**:
  * **Sổ điểm nhận xét**: Vào menu \`/teacher/so-diem-nhan-xet\` để nhập điểm và nhận xét môn dạy.
  * **Điểm lớp chủ nhiệm**: Vào menu \`/teacher/diem-lop-chu-nhiem\` để theo dõi bảng điểm tổng hợp của lớp.
  * **Cố vấn học tập**: Vào menu \`/teacher/co-van-hoc-tap\` để quản lý diện cảnh báo Vàng/Đỏ và phê duyệt mục tiêu.
  * **Dự giờ chuyên môn**: Vào menu \`/teacher/du-gio\` để đăng ký tiết dạy và chấm phiếu dự giờ.

- **Dành cho Học sinh**:
  * **Cổng thông tin & Bảng điểm**: \`/hocsinh/portal\`
  * **Sổ mục tiêu rèn luyện**: \`/hocsinh/portal/muc-tieu\`
  * **Radar đánh giá năng lực**: \`/hocsinh/portal/danh-gia-nang-luc\`
  * **Gửi yêu cầu trợ giúp**: \`/hocsinh/portal/ho-tro\`

- **Dành cho Phụ huynh**:
  * **Kết quả học tập con**: \`/parent/grades\`
  * **Sổ mục tiêu & Lời dặn GV**: \`/parent/children/advisory\``
  }
];

/**
 * Hàm tìm kiếm tri thức phù hợp dựa trên câu hỏi của người dùng
 */
export function searchKnowledgeBase(query: string, userRole: AssistantRole): KnowledgeItem | null {
  const q = query.toLowerCase().trim();
  if (q.length < 3) return null;

  // Loại bỏ các từ hư từ thông thường
  const cleanQ = q.replace(/(cho tôi biết|hãy giải thích|là gì|như thế nào|thế nào|thì sao|thưa trợ lý|trợ lý ơi|thầy cô|em hỏi)/gi, "").trim();

  let bestMatch: KnowledgeItem | null = null;
  let highestScore = 0;

  for (const item of SCHOOL_KNOWLEDGE_BASE) {
    // Kiểm tra tính tương thích về phân quyền
    if (!item.applicableRoles.includes(userRole) && userRole !== "ADMIN") {
      continue;
    }

    let score = 0;

    // 1. Khớp từ khóa (Keywords)
    for (const kw of item.keywords) {
      const lowerKw = kw.toLowerCase();
      if (cleanQ.includes(lowerKw) || q.includes(lowerKw)) {
        score += 15;
      }
    }

    // 2. Khớp tiêu đề
    const titleWords = item.title.toLowerCase().split(/\s+/);
    for (const word of titleWords) {
      if (word.length > 2 && (cleanQ.includes(word) || q.includes(word))) {
        score += 3;
      }
    }

    if (score > highestScore && score >= 15) {
      highestScore = score;
      bestMatch = item;
    }
  }

  return bestMatch;
}
