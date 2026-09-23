import { AIIntent } from "../types";

export function classifyIntent(query: string, currentPath: string = ""): AIIntent {
  const q = query.toLowerCase().trim();

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

