/**
 * Khung thời lượng giáo dục chuẩn năm học 2026–2027 (40 tiết/tuần cho mọi khối K1–K12)
 * Theo Quyết định số 82/2026/QĐ-SKL ngày 12/06/2026 của Tổng Giám đốc Hệ thống Giáo dục Sky-Line:
 * - Phụ lục 01: Khung thời lượng giáo dục Hệ Hội nhập S ("Hệ S")
 * - Phụ lục 02: Khung thời lượng giáo dục Hệ Quốc tế ("Hệ I")
 *
 * Quy ước quy đổi khớp danh mục Môn học vận hành trên SSM:
 * - Nghệ thuật (Music, Art = 2 tiết/tuần ở Tiểu học & THCS): Âm nhạc (ANA = 1) + Mĩ thuật (MTU = 1).
 * - Hoạt động tập thể, giáo dục chuyên đề / Hướng nghiệp (1 tiết/tuần K1–K12): HĐTT- GDCĐ (HTT = 1).
 * - Môn học lựa chọn 1, 2, 3 cấp THPT (3 môn × 2 tiết = 6 tiết/tuần):
 *   + Tổ hợp Tự nhiên (TN): Vật lí (VLI = 2*), Hóa học (HHO = 2*), Sinh học (SHO = 2*).
 *   + Tổ hợp Xã hội (XH): Địa lí (DLI = 2*), Giáo dục Kinh tế và Pháp luật (GKP = 2*), Mĩ thuật (MTU = 2*).
 *   (Trên từng lớp THPT không gắn hậu tố TN/XH trong tên lớp, hệ thống tự động nhận diện môn lựa chọn 2 tiết
 *    dựa trên Phân công giảng dạy / tiết thực xếp của lớp đó, đảm bảo tổng định mức mỗi lớp & mỗi khối = đúng 40 tiết/tuần).
 * - GDQP&AN cấp THPT: Học theo đợt tập trung tháng 08/2026 và tháng 01/2027 (Lưu ý QĐ 82/2026) -> 0 tiết/tuần TKB thường xuyên.
 */

export interface Qd82ProgramQuotaSpec {
  /** Định mức tiết/tuần từ Khối 1 -> Khối 9 */
  grades1To9?: Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, number>>
  /** Định mức tiết/tuần cấp THPT theo tổ hợp Tự nhiên (TN) & Xã hội (XH) */
  g10TN?: number
  g10XH?: number
  g11TN?: number
  g11XH?: number
  g12TN?: number
  g12XH?: number
  /** Các ô đánh dấu tiết lựa chọn / đặc thù (*) trong /admin/subjects */
  starFlags?: string[]
}

export interface Qd82SubjectStandardEntry {
  subjectCode: string
  /** Các cấp học cần đảm bảo có trong Subject.level để hiển thị đủ trên các tab Quản lý môn học */
  requiredLevels: Array<"PRIMARY" | "MIDDLE" | "HIGH">
  heS: Qd82ProgramQuotaSpec
  heI: Qd82ProgramQuotaSpec
}

function uniformHigh(g10: number, g11: number, g12: number): Pick<
  Qd82ProgramQuotaSpec,
  "g10TN" | "g10XH" | "g11TN" | "g11XH" | "g12TN" | "g12XH"
> {
  return {
    g10TN: g10,
    g10XH: g10,
    g11TN: g11,
    g11XH: g11,
    g12TN: g12,
    g12XH: g12,
  }
}

const ELECTIVE_TN_HIGH: Pick<
  Qd82ProgramQuotaSpec,
  "g10TN" | "g10XH" | "g11TN" | "g11XH" | "g12TN" | "g12XH" | "starFlags"
> = {
  g10TN: 2,
  g10XH: 0,
  g11TN: 2,
  g11XH: 0,
  g12TN: 2,
  g12XH: 0,
  starFlags: ["G10TN", "G11TN", "G12TN"],
}

const ELECTIVE_XH_HIGH: Pick<
  Qd82ProgramQuotaSpec,
  "g10TN" | "g10XH" | "g11TN" | "g11XH" | "g12TN" | "g12XH" | "starFlags"
> = {
  g10TN: 0,
  g10XH: 2,
  g11TN: 0,
  g11XH: 2,
  g12TN: 0,
  g12XH: 2,
  starFlags: ["G10XH", "G11XH", "G12XH"],
}

export const QD82_2026_SUBJECT_STANDARDS: Qd82SubjectStandardEntry[] = [
  // 1. ESL / ELA / ESL-A.E
  {
    subjectCode: "ESL",
    requiredLevels: ["PRIMARY", "MIDDLE", "HIGH"],
    heS: {
      grades1To9: { 1: 8, 2: 8, 3: 8, 4: 8, 5: 8, 6: 8, 7: 8, 8: 8, 9: 8 },
      ...uniformHigh(8, 8, 8),
    },
    heI: {
      grades1To9: { 1: 8, 2: 8, 3: 8, 4: 7, 5: 7, 6: 8, 7: 8, 8: 8, 9: 6 },
      ...uniformHigh(6, 6, 6),
    },
  },

  // 2. Science
  {
    subjectCode: "SCI",
    requiredLevels: ["PRIMARY", "MIDDLE", "HIGH"],
    heS: {
      grades1To9: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2 },
      ...uniformHigh(0, 0, 0),
    },
    heI: {
      grades1To9: { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3, 9: 3 },
      ...uniformHigh(2, 2, 2),
    },
  },

  // 3. Mathematics (Matific / Cambridge / Quốc tế)
  {
    subjectCode: "MAT",
    requiredLevels: ["PRIMARY", "MIDDLE", "HIGH"],
    heS: {
      grades1To9: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2 },
      ...uniformHigh(0, 0, 0),
    },
    heI: {
      grades1To9: { 1: 3, 2: 3, 3: 3, 4: 4, 5: 4, 6: 3, 7: 3, 8: 3, 9: 3 },
      ...uniformHigh(2, 2, 2),
    },
  },

  // 4. Global Studies
  {
    subjectCode: "INT-GLOBAL",
    requiredLevels: ["PRIMARY", "MIDDLE"],
    heS: {
      grades1To9: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2 },
      ...uniformHigh(0, 0, 0),
    },
    heI: {
      grades1To9: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2 },
      ...uniformHigh(0, 0, 0),
    },
  },

  // 5. Academic English (Khối 7–12 Hệ S; Hệ I gộp trong ESL / A.E)
  {
    subjectCode: "INT-AE",
    requiredLevels: ["MIDDLE", "HIGH"],
    heS: {
      grades1To9: { 7: 3, 8: 3, 9: 3 },
      ...uniformHigh(3, 3, 3),
    },
    heI: {
      grades1To9: {},
      ...uniformHigh(0, 0, 0),
    },
  },

  // 6. Business Studies / Academic research & Business Studies (THPT K10–K12 = 2 tiết cho cả Hệ S & Hệ I)
  {
    subjectCode: "INT-BUS",
    requiredLevels: ["HIGH"],
    heS: {
      grades1To9: {},
      ...uniformHigh(2, 2, 2),
    },
    heI: {
      grades1To9: {},
      ...uniformHigh(2, 2, 2),
    },
  },

  // Đặt A.R riêng về 0 vì QĐ 82/2026 gộp chung dòng "Academic research / Business Studies = 2 tiết" vào INT-BUS
  {
    subjectCode: "INT-AR",
    requiredLevels: ["HIGH"],
    heS: { grades1To9: {}, ...uniformHigh(0, 0, 0) },
    heI: { grades1To9: {}, ...uniformHigh(0, 0, 0) },
  },

  // 7. IELTS Preparation Skills (THPT Hệ I = 2 tiết; Hệ S = 0)
  {
    subjectCode: "IELTS",
    requiredLevels: ["HIGH"],
    heS: {
      grades1To9: {},
      ...uniformHigh(0, 0, 0),
    },
    heI: {
      grades1To9: {},
      ...uniformHigh(2, 2, 2),
    },
  },

  // 8. SAT (THPT Hệ I = 2 tiết; Hệ S = 0)
  {
    subjectCode: "INT-SAT",
    requiredLevels: ["HIGH"],
    heS: {
      grades1To9: {},
      ...uniformHigh(0, 0, 0),
    },
    heI: {
      grades1To9: {},
      ...uniformHigh(2, 2, 2),
    },
  },

  // 9. TA BGD (Khối 9 Hệ Quốc tế = 2 tiết)
  {
    subjectCode: "TA",
    requiredLevels: ["PRIMARY", "MIDDLE", "HIGH"],
    heS: {
      grades1To9: {},
      ...uniformHigh(0, 0, 0),
    },
    heI: {
      grades1To9: { 9: 2 },
      ...uniformHigh(0, 0, 0),
    },
  },

  // 10. Tiếng Việt (Tiểu học K1–K5)
  {
    subjectCode: "TVI",
    requiredLevels: ["PRIMARY"],
    heS: {
      grades1To9: { 1: 12, 2: 10, 3: 9, 4: 8, 5: 8 },
      ...uniformHigh(0, 0, 0),
    },
    heI: {
      grades1To9: { 1: 10, 2: 9, 3: 9, 4: 7, 5: 7 },
      ...uniformHigh(0, 0, 0),
    },
  },

  // 11. Ngữ Văn (THCS & THPT K6–K12)
  {
    subjectCode: "NVA",
    requiredLevels: ["MIDDLE", "HIGH"],
    heS: {
      grades1To9: { 6: 5, 7: 5, 8: 4.5, 9: 5 },
      ...uniformHigh(5.5, 5.5, 6),
    },
    heI: {
      grades1To9: { 6: 4.5, 7: 4.5, 8: 4, 9: 4 },
      ...uniformHigh(4.5, 4.5, 5),
    },
  },

  // 12. Toán học (K1–K12)
  {
    subjectCode: "TOA",
    requiredLevels: ["PRIMARY", "MIDDLE", "HIGH"],
    heS: {
      grades1To9: { 1: 3, 2: 5, 3: 6, 4: 5, 5: 5, 6: 4.5, 7: 4.5, 8: 5, 9: 5.5 },
      ...uniformHigh(5.5, 5.5, 6),
    },
    heI: {
      grades1To9: { 1: 3, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4, 7: 4, 8: 4.5, 9: 4.5 },
      ...uniformHigh(4.5, 4.5, 5),
    },
  },

  // 13. Khoa học tự nhiên (THCS K6–K9)
  {
    subjectCode: "KHT",
    requiredLevels: ["MIDDLE"],
    heS: {
      grades1To9: { 6: 3, 7: 4, 8: 4, 9: 4 },
      ...uniformHigh(0, 0, 0),
    },
    heI: {
      grades1To9: { 6: 3, 7: 3, 8: 3, 9: 3 },
      ...uniformHigh(0, 0, 0),
    },
  },

  // 14. Lịch sử & giáo dục địa phương (K4–K9 = 1 tiết, K10–K12 = 2 tiết)
  {
    subjectCode: "LSU",
    requiredLevels: ["PRIMARY", "MIDDLE", "HIGH"],
    heS: {
      grades1To9: { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 },
      ...uniformHigh(2, 2, 2),
    },
    heI: {
      grades1To9: { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 },
      ...uniformHigh(2, 2, 2),
    },
  },

  // 15. Địa lí (K4–K9 = 1 tiết bắt buộc; THPT XH = 2* tiết lựa chọn)
  {
    subjectCode: "DLI",
    requiredLevels: ["PRIMARY", "MIDDLE", "HIGH"],
    heS: {
      grades1To9: { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 },
      ...ELECTIVE_XH_HIGH,
    },
    heI: {
      grades1To9: { 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 },
      ...ELECTIVE_XH_HIGH,
    },
  },

  // 16. Giáo dục công dân (THCS K6–K9 = 0.5 tiết/tuần)
  {
    subjectCode: "GDCD",
    requiredLevels: ["MIDDLE"],
    heS: {
      grades1To9: { 6: 0.5, 7: 0.5, 8: 0.5, 9: 0.5 },
      ...uniformHigh(0, 0, 0),
    },
    heI: {
      grades1To9: { 6: 0.5, 7: 0.5, 8: 0.5, 9: 0.5 },
      ...uniformHigh(0, 0, 0),
    },
  },

  // 17. Giáo dục thể chất / PE (K1–K12 = 2 tiết/tuần)
  {
    subjectCode: "GTC",
    requiredLevels: ["PRIMARY", "MIDDLE", "HIGH"],
    heS: {
      grades1To9: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2 },
      ...uniformHigh(2, 2, 2),
    },
    heI: {
      grades1To9: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2 },
      ...uniformHigh(2, 2, 2),
    },
  },

  // 18. Giáo dục Cảm xúc xã hội — CXXH (K1–K9 = 1 tiết/tuần)
  {
    subjectCode: "GCX",
    requiredLevels: ["PRIMARY", "MIDDLE"],
    heS: {
      grades1To9: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 },
      ...uniformHigh(0, 0, 0),
    },
    heI: {
      grades1To9: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 },
      ...uniformHigh(0, 0, 0),
    },
  },

  // 19. Nghệ thuật — Âm nhạc (K1–K9 = 1 tiết/tuần)
  {
    subjectCode: "ANA",
    requiredLevels: ["PRIMARY", "MIDDLE", "HIGH"],
    heS: {
      grades1To9: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 },
      ...uniformHigh(0, 0, 0),
    },
    heI: {
      grades1To9: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 },
      ...uniformHigh(0, 0, 0),
    },
  },

  // 20. Nghệ thuật — Mĩ thuật (K1–K9 = 1 tiết/tuần; THPT XH = 2* tiết lựa chọn)
  {
    subjectCode: "MTU",
    requiredLevels: ["PRIMARY", "MIDDLE", "HIGH"],
    heS: {
      grades1To9: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 },
      ...ELECTIVE_XH_HIGH,
    },
    heI: {
      grades1To9: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 },
      ...ELECTIVE_XH_HIGH,
    },
  },

  // 21. Câu lạc bộ (Hệ S: K1–K12 = 1 tiết; Hệ I: Tiểu học K1–K5 = 1 tiết, THPT K10–K12 = 1 tiết, THCS Hệ I = 0)
  {
    subjectCode: "CLB",
    requiredLevels: ["PRIMARY", "MIDDLE", "HIGH"],
    heS: {
      grades1To9: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 },
      ...uniformHigh(1, 1, 1),
    },
    heI: {
      grades1To9: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 },
      ...uniformHigh(1, 1, 1),
    },
  },

  // 22. STEM / Công nghệ (Hệ S: K1–K8 = 2, K9–K12 = 1; Hệ I: K1–K9 = 2, THPT = 0)
  {
    subjectCode: "STE",
    requiredLevels: ["PRIMARY", "MIDDLE", "HIGH"],
    heS: {
      grades1To9: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 1 },
      ...uniformHigh(1, 1, 1),
    },
    heI: {
      grades1To9: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2 },
      ...uniformHigh(0, 0, 0),
    },
  },

  // 23. ICT-AI / Tin học (K1–K11 = 2 tiết, K12 = 1 tiết)
  {
    subjectCode: "ICT",
    requiredLevels: ["PRIMARY", "MIDDLE", "HIGH"],
    heS: {
      grades1To9: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2 },
      ...uniformHigh(2, 2, 1),
    },
    heI: {
      grades1To9: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2 },
      ...uniformHigh(2, 2, 1),
    },
  },

  // 24. Tiếng Nhật (THPT K10–K12 = 1 tiết)
  {
    subjectCode: "TNH",
    requiredLevels: ["HIGH"],
    heS: {
      grades1To9: {},
      ...uniformHigh(1, 1, 1),
    },
    heI: {
      grades1To9: {},
      ...uniformHigh(1, 1, 1),
    },
  },

  // 25. Hoạt động tập thể, giáo dục chuyên đề / Hướng nghiệp (K1–K12 = 1 tiết)
  {
    subjectCode: "HTT",
    requiredLevels: ["PRIMARY", "MIDDLE", "HIGH"],
    heS: {
      grades1To9: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 },
      ...uniformHigh(1, 1, 1),
    },
    heI: {
      grades1To9: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 },
      ...uniformHigh(1, 1, 1),
    },
  },

  // Đặt HĐTN & GDQP&AN riêng về 0 để không cộng trùng với HTT (1 tiết) và đợt học tập trung GDQP&AN
  {
    subjectCode: "HĐTN",
    requiredLevels: ["PRIMARY", "MIDDLE", "HIGH"],
    heS: { grades1To9: {}, ...uniformHigh(0, 0, 0) },
    heI: { grades1To9: {}, ...uniformHigh(0, 0, 0) },
  },
  {
    subjectCode: "GDQPAN",
    requiredLevels: ["HIGH"],
    heS: { grades1To9: {}, ...uniformHigh(0, 0, 0) },
    heI: { grades1To9: {}, ...uniformHigh(0, 0, 0) },
  },

  // 26–29. Các môn học lựa chọn cấp THPT (3 môn × 2 tiết = 6 tiết/tuần)
  {
    subjectCode: "VLI",
    requiredLevels: ["HIGH"],
    heS: { grades1To9: {}, ...ELECTIVE_TN_HIGH },
    heI: { grades1To9: {}, ...ELECTIVE_TN_HIGH },
  },
  {
    subjectCode: "HHO",
    requiredLevels: ["HIGH"],
    heS: { grades1To9: {}, ...ELECTIVE_TN_HIGH },
    heI: { grades1To9: {}, ...ELECTIVE_TN_HIGH },
  },
  {
    subjectCode: "SHO",
    requiredLevels: ["HIGH"],
    heS: { grades1To9: {}, ...ELECTIVE_TN_HIGH },
    heI: { grades1To9: {}, ...ELECTIVE_TN_HIGH },
  },
  {
    subjectCode: "GKP",
    requiredLevels: ["HIGH"],
    heS: { grades1To9: {}, ...ELECTIVE_XH_HIGH },
    heI: { grades1To9: {}, ...ELECTIVE_XH_HIGH },
  },
]

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function buildPrismaQuotaFieldsFromQd82Spec(spec: Qd82ProgramQuotaSpec) {
  const g = spec.grades1To9 || {}
  const quotaG1 = round2(g[1] || 0)
  const quotaG2 = round2(g[2] || 0)
  const quotaG3 = round2(g[3] || 0)
  const quotaG4 = round2(g[4] || 0)
  const quotaG5 = round2(g[5] || 0)
  const quotaG6 = round2(g[6] || 0)
  const quotaG7 = round2(g[7] || 0)
  const quotaG8 = round2(g[8] || 0)
  const quotaG9 = round2(g[9] || 0)

  const quotaG10TN = round2(spec.g10TN ?? 0)
  const quotaG10XH = round2(spec.g10XH ?? 0)
  const quotaG11TN = round2(spec.g11TN ?? 0)
  const quotaG11XH = round2(spec.g11XH ?? 0)
  const quotaG12TN = round2(spec.g12TN ?? 0)
  const quotaG12XH = round2(spec.g12XH ?? 0)

  const quotaG10 = round2(Math.max(quotaG10TN, quotaG10XH))
  const quotaG11 = round2(Math.max(quotaG11TN, quotaG11XH))
  const quotaG12 = round2(Math.max(quotaG12TN, quotaG12XH))

  const quotaPrimary = round2(quotaG1 + quotaG2 + quotaG3 + quotaG4 + quotaG5)
  const quotaMiddle = round2(quotaG6 + quotaG7 + quotaG8 + quotaG9)
  const quotaHigh = round2(
    quotaG10TN + quotaG10XH + quotaG11TN + quotaG11XH + quotaG12TN + quotaG12XH
  )

  return {
    quotaPrimary,
    quotaMiddle,
    quotaHigh,
    quotaG1,
    quotaG2,
    quotaG3,
    quotaG4,
    quotaG5,
    quotaG6,
    quotaG7,
    quotaG8,
    quotaG9,
    quotaG10,
    quotaG11,
    quotaG12,
    quotaG10TN,
    quotaG10XH,
    quotaG11TN,
    quotaG11XH,
    quotaG12TN,
    quotaG12XH,
    specialNoteFlags: (spec.starFlags || []).join(","),
  }
}

export function mergeSubjectLevelCsv(
  currentLevel: string | null | undefined,
  requiredLevels: Array<"PRIMARY" | "MIDDLE" | "HIGH">
): string {
  const existing = String(currentLevel || "")
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean)
  if (existing.includes("ALL")) return "ALL"
  const merged = new Set(existing)
  for (const req of requiredLevels) merged.add(req)
  const ordered = (["PRIMARY", "MIDDLE", "HIGH"] as const).filter((lv) => merged.has(lv))
  for (const extra of merged) {
    if (!ordered.includes(extra as any)) ordered.push(extra as any)
  }
  return ordered.join(", ")
}

/**
 * Pure verification helper (for tests & UI diagnostics): computes column sums K1..K9, 10TN, 10XH, 11TN, 11XH, 12TN, 12XH
 * for both Hệ S and Hệ I under QĐ 82/2026/QĐ-SKL. Every single column must equal 40.
 */
export function computeQd82ColumnSums(): Record<"Hệ S" | "Hệ I", Record<string, number>> {
  const result: Record<"Hệ S" | "Hệ I", Record<string, number>> = {
    "Hệ S": {},
    "Hệ I": {},
  }
  const cols = [
    "G1",
    "G2",
    "G3",
    "G4",
    "G5",
    "G6",
    "G7",
    "G8",
    "G9",
    "G10TN",
    "G10XH",
    "G11TN",
    "G11XH",
    "G12TN",
    "G12XH",
  ] as const

  for (const prog of ["Hệ S", "Hệ I"] as const) {
    for (const c of cols) result[prog][c] = 0
    for (const item of QD82_2026_SUBJECT_STANDARDS) {
      const fields = buildPrismaQuotaFieldsFromQd82Spec(prog === "Hệ S" ? item.heS : item.heI)
      for (const c of cols) {
        const val = Number((fields as any)[`quota${c}`] || 0)
        result[prog][c] = round2(result[prog][c] + val)
      }
    }
  }
  return result
}
