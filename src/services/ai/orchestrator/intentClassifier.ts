import { AIIntent } from "../types";

export function classifyIntent(query: string, currentPath: string = ""): AIIntent {
  const q = query.toLowerCase().trim();

  // 1. Priority 1: Knowledge RAG queries (Quy chế, quy trình, hướng dẫn, benchmark, định mức)
  if (
    q.includes("quy định") ||
    q.includes("quy chế") ||
    q.includes("hướng dẫn") ||
    q.includes("quy chuẩn") ||
    q.includes("benchmark") ||
    q.includes("tiêu chí") ||
    q.includes("định mức") ||
    q.includes("quy trình") ||
    q.includes("thời hạn") ||
    q.includes("mở khóa") ||
    q.includes("cẩm nang") ||
    q.includes("chính sách")
  ) {
    return "KNOWLEDGE_SEARCH";
  }

  // 2. Priority 3: Observation & Professional Development (Dự giờ)
  if (
    q.includes("dự giờ") ||
    q.includes("tiết dạy") ||
    q.includes("phiếu dự giờ") ||
    q.includes("tiết học") ||
    q.includes("góp ý tiết") ||
    currentPath.includes("/du-gio")
  ) {
    // If asking about scores in observation page
    if (q.includes("tiết") || q.includes("dự") || q.includes("đánh giá")) {
      return "OBSERVATION_ANALYSIS";
    }
  }

  // 3. Priority 4: Advisory & SMART Goals (Cố vấn & Mục tiêu)
  if (
    q.includes("mục tiêu") ||
    q.includes("smart") ||
    q.includes("7 ngày") ||
    q.includes("gỡ khó") ||
    q.includes("rào cản") ||
    q.includes("cảnh báo") ||
    q.includes("vàng") ||
    q.includes("đỏ") ||
    q.includes("trợ giúp") ||
    q.includes("cố vấn") ||
    currentPath.includes("/co-van-hoc-tap") ||
    currentPath.includes("/muc-tieu")
  ) {
    if (q.includes("mục tiêu") || q.includes("cố vấn") || q.includes("cảnh báo") || q.includes("gỡ khó") || q.includes("trợ giúp")) {
      return "ADVISORY_ANALYSIS";
    }
  }

  // 4. Priority 2: Exam & Gradebook Analysis (Kiểm tra & Sổ điểm)
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
    currentPath.includes("/diem") ||
    currentPath.includes("/so-diem")
  ) {
    return "EXAM_ANALYSIS";
  }

  return "GENERAL_INQUIRY";
}
