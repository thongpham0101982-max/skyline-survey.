import { AIIntent } from "../types";

export function classifyIntent(query: string, currentPath: string = ""): AIIntent {
  const q = query.toLowerCase().trim();

  // 0. Wave 2: AI Action Triggers (Soạn thảo & Gửi email có Human Confirmation)
  if (
    q.includes("gửi email") ||
    q.includes("gửi mail") ||
    q.includes("soạn email") ||
    q.includes("nhắc nhở nộp") ||
    q.includes("nhắc nhở sổ điểm") ||
    q.includes("nhắc nhở dự giờ") ||
    q.includes("gửi thông báo cho phụ huynh") ||
    q.includes("gửi thư cho phụ huynh")
  ) {
    return "ACTION_REQUEST";
  }

  // Wave 3.1: AI Smart Comment & Narrative Insights Generator
  if (
    q.includes("soạn nhận xét") ||
    q.includes("gợi ý nhận xét") ||
    q.includes("nhận xét học kỳ") ||
    q.includes("nhận xét học bạ") ||
    q.includes("nhận xét cho học sinh") ||
    q.includes("lời phê") ||
    q.includes("viết nhận xét") ||
    q.includes("phong cách khích lệ") ||
    q.includes("phong cách khen thưởng") ||
    q.includes("phong cách rèn luyện")
  ) {
    return "SMART_COMMENT";
  }

  // Wave 3.2: One-Click Executive PDF / Report Export
  if (
    q.includes("xuất báo cáo") ||
    q.includes("tải báo cáo") ||
    q.includes("in báo cáo") ||
    q.includes("báo cáo điều hành") ||
    q.includes("báo cáo tổng hợp") ||
    (q.includes("báo cáo") && (q.includes("pdf") || q.includes("phổ điểm") || q.includes("in ấn") || q.includes("toàn diện")))
  ) {
    return "EXECUTIVE_REPORT";
  }

  // Wave 3.3: AI Early Warning System (EWS) & Student Holistic Health Index
  if (
    q.includes("chỉ số sức khỏe") ||
    q.includes("sức khỏe học tập") ||
    q.includes("hhi") ||
    q.includes("early warning") ||
    q.includes("cảnh báo sớm") ||
    q.includes("ma trận rủi ro") ||
    q.includes("kiểm toán rủi ro") ||
    q.includes("phân loại rủi ro")
  ) {
    return "HEALTH_INDEX";
  }


  // 1. Phân biệt rõ: Câu hỏi về quy định, quy chế, văn bản, hướng dẫn, định mức chung -> KNOWLEDGE_SEARCH (RAG)
  // Trừ khi câu hỏi đang hỏi số liệu thực tế: "học sinh nào", "con có môn nào", "của em", "lớp của tôi", "danh sách"
  const isAskingRegulation = (
    q.includes("quy định") ||
    q.includes("quy chế") ||
    q.includes("văn bản") ||
    q.includes("hướng dẫn") ||
    q.includes("quy chuẩn") ||
    q.includes("chính sách") ||
    q.includes("cẩm nang") ||
    q.includes("định mức") ||
    (q.includes("benchmark") && (q.includes("là bao nhiêu") || q.includes("như thế nào") || q.includes("quy chế") || q.includes("chuẩn chung"))) ||
    (q.includes("mở khóa") && (q.includes("quy trình") || q.includes("thủ tục") || q.includes("thời hạn")))
  );

  const isDataInquiry = (
    q.includes("học sinh nào") ||
    q.includes("danh sách") ||
    q.includes("lớp của tôi") ||
    q.includes("lớp chủ nhiệm") ||
    q.includes("con có") ||
    q.includes("con tôi") ||
    q.includes("của con") ||
    q.includes("của em") ||
    q.includes("môn nào") ||
    q.includes("tiến độ") ||
    q.includes("phổ điểm") ||
    q.includes("bao nhiêu học sinh")
  );

  if (isAskingRegulation && !isDataInquiry) {
    return "KNOWLEDGE_SEARCH";
  }

  // 2. Dự giờ & Tiêu chí chuyên môn
  if (
    q.includes("dự giờ") ||
    q.includes("tiết dạy") ||
    q.includes("11 tiêu chí") ||
    q.includes("tiêu chí sư phạm") ||
    q.includes("phiếu dự giờ") ||
    q.includes("chỉ tiêu dự giờ") ||
    currentPath.includes("/du-gio")
  ) {
    if (q.includes("quy định") || q.includes("quy chế")) return "KNOWLEDGE_SEARCH";
    return "OBSERVATION_ANALYSIS";
  }

  // 3. Cố vấn học tập, Mục tiêu SMART, Kế hoạch 7 ngày, Cảnh báo Vàng/Đỏ
  if (
    q.includes("mục tiêu") ||
    q.includes("smart") ||
    q.includes("7 ngày") ||
    q.includes("gỡ khó") ||
    q.includes("gỡ rào cản") ||
    q.includes("rào cản") ||
    q.includes("cảnh báo") ||
    q.includes("vàng") ||
    q.includes("đỏ") ||
    q.includes("khoảng chênh") ||
    q.includes("gap") ||
    q.includes("trợ giúp") ||
    q.includes("cố vấn") ||
    q.includes("hồ sơ 360") ||
    currentPath.includes("/co-van-hoc-tap") ||
    currentPath.includes("/muc-tieu") ||
    currentPath.includes("/ho-tro-hoc-tap")
  ) {
    if (q.includes("quy định") || q.includes("quy chế")) return "KNOWLEDGE_SEARCH";
    return "ADVISORY_ANALYSIS";
  }

  // 4. Kết quả kiểm tra, Điểm số, Phổ điểm, Benchmark lớp/học sinh
  if (
    q.includes("điểm") ||
    q.includes("kết quả") ||
    q.includes("kiểm tra") ||
    q.includes("học lực") ||
    q.includes("phổ điểm") ||
    q.includes("dưới chuẩn") ||
    q.includes("bảng điểm") ||
    q.includes("kscl") ||
    q.includes("giữa kỳ") ||
    q.includes("cuối kỳ") ||
    q.includes("tiến độ vào điểm") ||
    q.includes("tiến độ sổ điểm") ||
    q.includes("sổ điểm") ||
    currentPath.includes("/diem") ||
    currentPath.includes("/so-diem") ||
    currentPath.includes("/ktdbcl")
  ) {
    return "EXAM_ANALYSIS";
  }

  return "GENERAL_INQUIRY";
}

