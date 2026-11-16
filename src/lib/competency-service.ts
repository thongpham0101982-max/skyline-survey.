// @ts-nocheck
import { prisma } from "./db";

export function normalizeKey(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export interface DgnlSubjectMappingItem {
  dgnlCode: string;
  dgnlName: string;
  ssmSubjectCode: string;
  ssmSubjectName: string;
  programGroup: "MOET" | "BILINGUAL" | "SKL";
  scope: "CORE" | "EXTENDED";
  isComponent?: boolean;
  mappingRule: string;
  acceptedAliases: string[];
}

/**
 * BẢNG QUY CHUẨN MÃ MÔN ĐÁNH GIÁ NĂNG LỰC (ĐGNL)
 * - Áp dụng RIÊNG cho phân hệ Đánh giá năng lực (/admin/competency-assessment/*).
 * - TUYỆT ĐỐI KHÔNG ghi thêm dòng môn DG_* vào bảng quản lý môn học (Subject).
 * - Ánh xạ 100% về các mã môn học chuẩn hiện có trên hệ thống SSM.
 */
export const DGNL_SUBJECT_CATALOG: DgnlSubjectMappingItem[] = [
  // =========================================================================
  // I. 28 MÃ MÔN ĐÁNH GIÁ NĂNG LỰC ĐANG VẬN HÀNH (CORE)
  // =========================================================================
  {
    dgnlCode: "DG_AN0",
    dgnlName: "Âm nhạc",
    ssmSubjectCode: "ANA",
    ssmSubjectName: "Âm nhạc",
    programGroup: "MOET",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Âm nhạc (ANA)",
    acceptedAliases: ["DG_AN0", "Âm nhạc", "Am nhac", "Music"],
  },
  {
    dgnlCode: "DG_CX0",
    dgnlName: "Cảm xúc xã hội",
    ssmSubjectCode: "GCX",
    ssmSubjectName: "Giáo dục Cảm xúc xã hội",
    programGroup: "SKL",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Giáo dục Cảm xúc xã hội (GCX)",
    acceptedAliases: ["DG_CX0", "Cảm xúc xã hội", "Giáo dục Cảm xúc xã hội", "SEL"],
  },
  {
    dgnlCode: "DG_EN0",
    dgnlName: "ESL",
    ssmSubjectCode: "INT-ENG",
    ssmSubjectName: "English",
    programGroup: "BILINGUAL",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn English Song ngữ (INT-ENG)",
    acceptedAliases: ["DG_EN0", "ESL", "English", "Tiếng Anh (ESL)"],
  },
  {
    dgnlCode: "DG_TC0",
    dgnlName: "Giáo dục thể chất",
    ssmSubjectCode: "GTC",
    ssmSubjectName: "Giáo dục thể chất",
    programGroup: "MOET",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Giáo dục thể chất (GTC)",
    acceptedAliases: ["DG_TC0", "Giáo dục thể chất", "GDTC", "Thể dục"],
  },
  {
    dgnlCode: "DG_IT0",
    dgnlName: "ICT",
    ssmSubjectCode: "ICT",
    ssmSubjectName: "Tin học / ICT",
    programGroup: "MOET",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Tin học / ICT (ICT)",
    acceptedAliases: ["DG_IT0", "ICT", "Tin học", "Tin học / ICT", "Công nghệ thông tin"],
  },
  {
    dgnlCode: "DG_MA0",
    dgnlName: "Maths",
    ssmSubjectCode: "MAT",
    ssmSubjectName: "Mathematics",
    programGroup: "BILINGUAL",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Mathematics Song ngữ (MAT)",
    acceptedAliases: ["DG_MA0", "Maths", "Math", "Mathematics", "Mathematics Cambridge"],
  },
  {
    dgnlCode: "DG_MT0",
    dgnlName: "Mĩ thuật",
    ssmSubjectCode: "MTU",
    ssmSubjectName: "Mĩ thuật",
    programGroup: "MOET",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Mĩ thuật (MTU)",
    acceptedAliases: ["DG_MT0", "Mĩ thuật", "Mỹ thuật", "Art"],
  },
  {
    dgnlCode: "DG_SC0",
    dgnlName: "Science",
    ssmSubjectCode: "INT-SCI",
    ssmSubjectName: "Science",
    programGroup: "BILINGUAL",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Science Song ngữ (INT-SCI)",
    acceptedAliases: ["DG_SC0", "Science", "SCI"],
  },
  {
    dgnlCode: "DG_ST0",
    dgnlName: "STEM",
    ssmSubjectCode: "STE",
    ssmSubjectName: "STEM / Công nghệ",
    programGroup: "SKL",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn STEM / Công nghệ (STE)",
    acceptedAliases: ["DG_ST0", "STEM", "Giáo dục STEM", "STEM / Công nghệ"],
  },
  {
    dgnlCode: "DG_TV0",
    dgnlName: "Tiếng việt",
    ssmSubjectCode: "TVI",
    ssmSubjectName: "Tiếng Việt",
    programGroup: "MOET",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Tiếng Việt (TVI)",
    acceptedAliases: ["DG_TV0", "Tiếng việt", "Tiếng Việt"],
  },
  {
    dgnlCode: "DG_TO0",
    dgnlName: "Toán",
    ssmSubjectCode: "TOA",
    ssmSubjectName: "Toán học",
    programGroup: "MOET",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Toán học MOET (TOA)",
    acceptedAliases: ["DG_TO0", "Toán", "Toán học"],
  },
  {
    dgnlCode: "DG_GS0",
    dgnlName: "Global Studies",
    ssmSubjectCode: "INT-GLOBAL",
    ssmSubjectName: "Global Studies",
    programGroup: "BILINGUAL",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Global Studies (INT-GLOBAL)",
    acceptedAliases: ["DG_GS0", "Global Studies", "Global Study", "GLS"],
  },
  {
    dgnlCode: "DG_HO0",
    dgnlName: "Hóa học",
    ssmSubjectCode: "HHO",
    ssmSubjectName: "Hóa học",
    programGroup: "MOET",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Hóa học THPT (HHO)",
    acceptedAliases: ["DG_HO0", "DG_HH0", "Hóa học", "Hóa"],
  },
  {
    dgnlCode: "DG_HN0",
    dgnlName: "Hướng nghiệp",
    ssmSubjectCode: "HNG",
    ssmSubjectName: "Hướng nghiệp",
    programGroup: "SKL",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Hướng nghiệp (HNG)",
    acceptedAliases: ["DG_HN0", "Hướng nghiệp"],
  },
  {
    dgnlCode: "DG_IE0",
    dgnlName: "IELTS Preparation Skills",
    ssmSubjectCode: "INT-IELTS",
    ssmSubjectName: "IELTS",
    programGroup: "BILINGUAL",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn IELTS (INT-IELTS)",
    acceptedAliases: ["DG_IE0", "IELTS Preparation Skills", "IELTS Preparation Skill", "IELTS"],
  },
  {
    dgnlCode: "DG_LS0",
    dgnlName: "Lịch sử",
    ssmSubjectCode: "LSU",
    ssmSubjectName: "Lịch sử & giáo dục địa phương",
    programGroup: "MOET",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Lịch sử & giáo dục địa phương (LSU)",
    acceptedAliases: ["DG_LS0", "Lịch sử", "Lịch sử & giáo dục địa phương"],
  },
  {
    dgnlCode: "DG_LI0",
    dgnlName: "Vật lí",
    ssmSubjectCode: "VLI",
    ssmSubjectName: "Vật lí",
    programGroup: "MOET",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Vật lí THPT (VLI)",
    acceptedAliases: ["DG_LI0", "DG_VL0", "Vật lí", "Vật lý"],
  },
  {
    dgnlCode: "DG_IL0",
    dgnlName: "Independent Learning",
    ssmSubjectCode: "IL",
    ssmSubjectName: "Independent Learning",
    programGroup: "BILINGUAL",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Independent Learning (IL)",
    acceptedAliases: ["DG_IL0", "Independent Learning"],
  },
  {
    dgnlCode: "DG_NV0",
    dgnlName: "Ngữ văn",
    ssmSubjectCode: "NVA",
    ssmSubjectName: "Ngữ Văn",
    programGroup: "MOET",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Ngữ Văn (NVA)",
    acceptedAliases: ["DG_NV0", "Ngữ văn", "Ngữ Văn", "Văn"],
  },
  {
    dgnlCode: "DG_TB0",
    dgnlName: "TA-BGD",
    ssmSubjectCode: "TA",
    ssmSubjectName: "Tiếng Anh",
    programGroup: "MOET",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Tiếng Anh MOET (TA)",
    acceptedAliases: ["DG_TB0", "DG_TA0", "TA-BGD", "Tiếng Anh", "Tiếng Anh (BGD)"],
  },
  {
    dgnlCode: "DG_BU0",
    dgnlName: "Business Studies",
    ssmSubjectCode: "INT-BUS",
    ssmSubjectName: "Business",
    programGroup: "BILINGUAL",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Business (INT-BUS)",
    acceptedAliases: ["DG_BU0", "Business Studies", "Business"],
  },
  {
    dgnlCode: "DG_SI0",
    dgnlName: "Sinh học",
    ssmSubjectCode: "SHO",
    ssmSubjectName: "Sinh học",
    programGroup: "MOET",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Sinh học THPT (SHO)",
    acceptedAliases: ["DG_SI0", "DG_SH0", "Sinh học", "Sinh"],
  },
  {
    dgnlCode: "DG_DL0",
    dgnlName: "Địa lí",
    ssmSubjectCode: "DLI",
    ssmSubjectName: "Địa lí",
    programGroup: "MOET",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Địa lí (DLI)",
    acceptedAliases: ["DG_DL0", "Địa lí", "Địa lý"],
  },
  {
    dgnlCode: "DG_LD0",
    dgnlName: "Lịch sử - Địa lí",
    ssmSubjectCode: "LSU",
    ssmSubjectName: "Lịch sử & giáo dục địa phương",
    programGroup: "MOET",
    scope: "CORE",
    isComponent: true,
    mappingRule: "Môn tích hợp THCS — quy đổi về Lịch sử & giáo dục địa phương (LSU)",
    acceptedAliases: ["DG_LD0", "Lịch sử - Địa lí", "Lịch sử và Địa lí", "LS-ĐL", "LS&ĐL"],
  },
  {
    dgnlCode: "DG_KH0",
    dgnlName: "Khoa học tự nhiên",
    ssmSubjectCode: "KHT",
    ssmSubjectName: "Khoa học tự nhiên",
    programGroup: "MOET",
    scope: "CORE",
    mappingRule: "Ánh xạ 1-1 về môn Khoa học tự nhiên (KHT)",
    acceptedAliases: ["DG_KH0", "Khoa học tự nhiên", "KHTN"],
  },
  {
    dgnlCode: "DG_KH1",
    dgnlName: "Khoa học tự nhiên (Vật Lý)",
    ssmSubjectCode: "KHT",
    ssmSubjectName: "Khoa học tự nhiên",
    programGroup: "MOET",
    scope: "CORE",
    isComponent: true,
    mappingRule: "Phân môn KHTN (Vật lý) — gộp trung bình cộng về KHT khi Commit",
    acceptedAliases: [
      "DG_KH1",
      "Khoa học tự nhiên (Vật Lý)",
      "Khoa học tự nhiên (Vật Lí)",
      "Khoa học tự nhiên (Lý)",
      "Khoa học tự nhiên (Lí)",
      "KHTN (Vật Lý)",
      "KHTN (Lý)",
    ],
  },
  {
    dgnlCode: "DG_KH2",
    dgnlName: "Khoa học tự nhiên (Hóa Học)",
    ssmSubjectCode: "KHT",
    ssmSubjectName: "Khoa học tự nhiên",
    programGroup: "MOET",
    scope: "CORE",
    isComponent: true,
    mappingRule: "Phân môn KHTN (Hóa học) — gộp trung bình cộng về KHT khi Commit",
    acceptedAliases: [
      "DG_KH2",
      "Khoa học tự nhiên (Hóa Học)",
      "Khoa học tự nhiên (Hóa)",
      "KHTN (Hóa Học)",
      "KHTN (Hóa)",
    ],
  },
  {
    dgnlCode: "DG_KH3",
    dgnlName: "Khoa học tự nhiên (Sinh Học)",
    ssmSubjectCode: "KHT",
    ssmSubjectName: "Khoa học tự nhiên",
    programGroup: "MOET",
    scope: "CORE",
    isComponent: true,
    mappingRule: "Phân môn KHTN (Sinh học) — gộp trung bình cộng về KHT khi Commit",
    acceptedAliases: [
      "DG_KH3",
      "Khoa học tự nhiên (Sinh Học)",
      "Khoa học tự nhiên (Sinh)",
      "KHTN (Sinh Học)",
      "KHTN (Sinh)",
    ],
  },

  // =========================================================================
  // II. 13 MÃ MÔN ĐGNL MỞ RỘNG CHO CÁC MÔN GIẢNG DẠY CÒN LẠI TRÊN SSM (EXTENDED)
  // =========================================================================
  {
    dgnlCode: "DG_CD0",
    dgnlName: "Giáo dục công dân",
    ssmSubjectCode: "GCD",
    ssmSubjectName: "Giáo dục công dân",
    programGroup: "MOET",
    scope: "EXTENDED",
    mappingRule: "Ánh xạ 1-1 về môn Giáo dục công dân (GCD)",
    acceptedAliases: ["DG_CD0", "DG_GC0", "Giáo dục công dân", "GDCD"],
  },
  {
    dgnlCode: "DG_KP0",
    dgnlName: "Giáo dục Kinh tế và Pháp luật",
    ssmSubjectCode: "GKP",
    ssmSubjectName: "Giáo dục Kinh tế và Pháp luật",
    programGroup: "MOET",
    scope: "EXTENDED",
    mappingRule: "Ánh xạ 1-1 về môn Giáo dục Kinh tế và Pháp luật (GKP)",
    acceptedAliases: ["DG_KP0", "Giáo dục Kinh tế và Pháp luật", "GDKT&PL", "GDKTPL"],
  },
  {
    dgnlCode: "DG_QP0",
    dgnlName: "GDQP&AN",
    ssmSubjectCode: "GDQPAN",
    ssmSubjectName: "GDQP&AN",
    programGroup: "MOET",
    scope: "EXTENDED",
    mappingRule: "Ánh xạ 1-1 về môn GDQP&AN (GDQPAN)",
    acceptedAliases: ["DG_QP0", "GDQP&AN", "Giáo dục Quốc phòng và An ninh"],
  },
  {
    dgnlCode: "DG_TN0",
    dgnlName: "HĐTN&HN",
    ssmSubjectCode: "HDTNHN",
    ssmSubjectName: "HĐTN&HN",
    programGroup: "MOET",
    scope: "EXTENDED",
    mappingRule: "Ánh xạ 1-1 về môn HĐTN&HN (HDTNHN)",
    acceptedAliases: ["DG_TN0", "HĐTN&HN", "Hoạt động trải nghiệm, hướng nghiệp", "HĐTN"],
  },
  {
    dgnlCode: "DG_DP0",
    dgnlName: "Nội dung giáo dục địa phương",
    ssmSubjectCode: "NDGDCDP",
    ssmSubjectName: "NDGDCĐP",
    programGroup: "MOET",
    scope: "EXTENDED",
    mappingRule: "Ánh xạ 1-1 về môn NDGDCĐP (NDGDCDP)",
    acceptedAliases: ["DG_DP0", "NDGDCĐP", "Nội dung giáo dục địa phương", "GDĐP"],
  },
  {
    dgnlCode: "DG_HT0",
    dgnlName: "HĐTT- GDCĐ",
    ssmSubjectCode: "HTT",
    ssmSubjectName: "HĐTT- GDCĐ",
    programGroup: "MOET",
    scope: "EXTENDED",
    mappingRule: "Ánh xạ 1-1 về môn HĐTT- GDCĐ (HTT)",
    acceptedAliases: ["DG_HT0", "HĐTT- GDCĐ", "HĐTT-GDCĐ"],
  },
  {
    dgnlCode: "DG_AE0",
    dgnlName: "Academic English",
    ssmSubjectCode: "INT-AE",
    ssmSubjectName: "Academic English",
    programGroup: "BILINGUAL",
    scope: "EXTENDED",
    mappingRule: "Ánh xạ 1-1 về môn Academic English (INT-AE)",
    acceptedAliases: ["DG_AE0", "Academic English", "ACE"],
  },
  {
    dgnlCode: "DG_AR0",
    dgnlName: "Academic Research (A.R)",
    ssmSubjectCode: "INT-AR",
    ssmSubjectName: "A.R",
    programGroup: "BILINGUAL",
    scope: "EXTENDED",
    mappingRule: "Ánh xạ 1-1 về môn A.R (INT-AR)",
    acceptedAliases: ["DG_AR0", "A.R", "Academic Research"],
  },
  {
    dgnlCode: "DG_RE0",
    dgnlName: "Library Reading",
    ssmSubjectCode: "INT-READ",
    ssmSubjectName: "Library Reading",
    programGroup: "BILINGUAL",
    scope: "EXTENDED",
    mappingRule: "Ánh xạ 1-1 về môn Library Reading (INT-READ)",
    acceptedAliases: ["DG_RE0", "Library Reading", "Reading"],
  },
  {
    dgnlCode: "DG_SA0",
    dgnlName: "SAT",
    ssmSubjectCode: "INT-SAT",
    ssmSubjectName: "SAT",
    programGroup: "BILINGUAL",
    scope: "EXTENDED",
    mappingRule: "Ánh xạ 1-1 về môn SAT (INT-SAT)",
    acceptedAliases: ["DG_SA0", "SAT"],
  },
  {
    dgnlCode: "DG_TL0",
    dgnlName: "Tâm lý",
    ssmSubjectCode: "TLY",
    ssmSubjectName: "Tâm lý",
    programGroup: "SKL",
    scope: "EXTENDED",
    mappingRule: "Ánh xạ 1-1 về môn Tâm lý (TLY)",
    acceptedAliases: ["DG_TL0", "Tâm lý"],
  },
  {
    dgnlCode: "DG_TD0",
    dgnlName: "Trải nghiệm - Dự án",
    ssmSubjectCode: "TND",
    ssmSubjectName: "Trải nghiệm - Dự án",
    programGroup: "SKL",
    scope: "EXTENDED",
    mappingRule: "Ánh xạ 1-1 về môn Trải nghiệm - Dự án (TND)",
    acceptedAliases: ["DG_TD0", "Trải nghiệm - Dự án"],
  },
  {
    dgnlCode: "DG_NH0",
    dgnlName: "Tiếng Nhật",
    ssmSubjectCode: "TNH",
    ssmSubjectName: "Tiếng Nhật",
    programGroup: "SKL",
    scope: "EXTENDED",
    mappingRule: "Ánh xạ 1-1 về môn Tiếng Nhật (TNH)",
    acceptedAliases: ["DG_NH0", "Tiếng Nhật"],
  },
];

// Build fast O(1) lookup index from normalized key -> canonical SSM subject code
const DGNL_NORMALIZED_INDEX: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const item of DGNL_SUBJECT_CATALOG) {
    const codeKey = normalizeKey(item.dgnlCode);
    if (codeKey) map.set(codeKey, item.ssmSubjectCode);
    const nameKey = normalizeKey(item.dgnlName);
    if (nameKey && !map.has(nameKey)) map.set(nameKey, item.ssmSubjectCode);
    for (const alias of item.acceptedAliases) {
      const aKey = normalizeKey(alias);
      if (aKey && !map.has(aKey)) map.set(aKey, item.ssmSubjectCode);
    }
  }
  return map;
})();

export interface ScoreCalculationResult {
  achievedScore: number | null;
  maxScore: number | null;
  competencyPercent: number | null;
  calculationSource: "SYSTEM_CALCULATED" | "LEGACY_IMPORTED" | null;
}

/**
 * Calculates competency percentage following strict business rules:
 * 1. New data: achievedScore / maxScore * 100, rounded to 1 decimal place, bounded [0, 100].
 * 2. Legacy data (2025-2026): If maxScore is empty but rawRadarPercent has a value,
 *    use rawRadarPercent * 100, marked as LEGACY_IMPORTED without guessing max score.
 * 3. 0 vs NULL: 0 is evaluated with 0% score; null is no data / not evaluated.
 */
export function calculateCompetencyScore(
  rawAchieved: any,
  rawMax: any,
  rawRadarPercent: any
): ScoreCalculationResult {
  const parseNum = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    const str = String(v).trim().replace(",", ".");
    if (str === "" || str === "—" || str === "-") return null;
    const n = Number(str);
    return isNaN(n) ? null : n;
  };

  const parsePercent = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    let str = String(v).trim().replace(",", ".");
    if (str === "" || str === "—" || str === "-") return null;
    if (str.endsWith("%")) {
      const n = Number(str.slice(0, -1).trim());
      return isNaN(n) ? null : n;
    }
    const n = Number(str);
    if (isNaN(n)) return null;
    if (n <= 1 && n > 0) return n * 100;
    return n;
  };

  const achieved = parseNum(rawAchieved);
  const max = parseNum(rawMax);
  const radarPct = parsePercent(rawRadarPercent);

  if (max !== null && max > 0 && achieved !== null) {
    let pct = (achieved / max) * 100;
    pct = Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
    return {
      achievedScore: achieved,
      maxScore: max,
      competencyPercent: pct,
      calculationSource: "SYSTEM_CALCULATED",
    };
  }

  if ((max === null || max === 0) && radarPct !== null) {
    let pct = Math.min(100, Math.max(0, Math.round(radarPct * 10) / 10));
    return {
      achievedScore: achieved,
      maxScore: null,
      competencyPercent: pct,
      calculationSource: "LEGACY_IMPORTED",
    };
  }

  if (achieved === 0 && max !== null && max > 0) {
    return {
      achievedScore: 0,
      maxScore: max,
      competencyPercent: 0.0,
      calculationSource: "SYSTEM_CALCULATED",
    };
  }

  return {
    achievedScore: achieved,
    maxScore: max,
    competencyPercent: null,
    calculationSource: null,
  };
}

/**
 * Normalizes and resolves Subject from ĐGNL SubjectCode, SubjectName, CompetencySubjectCatalog, or SubjectAlias
 */
export function resolveSubjectMatch(
  rawSubjectName: string,
  subjects: Array<{ id: string; subjectCode: string; subjectName: string }>,
  subjectAliases: Array<{ id: string; subjectId: string; normalizedKey: string }>,
  catalogItems?: Array<{ dgnlCode: string; dgnlName: string; subjectId: string; isActive?: boolean }>
): string | null {
  if (!rawSubjectName) return null;
  const key = normalizeKey(rawSubjectName);
  if (!key) return null;

  // 0. Dynamic DB CompetencySubjectCatalog lookup (priority #1 for exclusive ĐGNL codes & ticked status)
  const isExplicitDgnlCode = /^DG_/i.test(rawSubjectName.trim());
  const disabledSubjectIds = new Set<string>();

  if (Array.isArray(catalogItems) && catalogItems.length > 0) {
    const activeSubjectIds = new Set<string>();
    const allCatalogSubjectIds = new Set<string>();
    for (const item of catalogItems) {
      allCatalogSubjectIds.add(item.subjectId);
      if (item.isActive !== false) {
        activeSubjectIds.add(item.subjectId);
      }
    }
    for (const sid of allCatalogSubjectIds) {
      if (!activeSubjectIds.has(sid)) {
        disabledSubjectIds.add(sid);
      }
    }

    const activeMatch = catalogItems.find(
      (item) =>
        item.isActive !== false &&
        (normalizeKey(item.dgnlCode) === key || normalizeKey(item.dgnlName) === key)
    );
    if (activeMatch) return activeMatch.subjectId;

    const inactiveMatch = catalogItems.find(
      (item) =>
        item.isActive === false &&
        (normalizeKey(item.dgnlCode) === key || normalizeKey(item.dgnlName) === key)
    );
    // Respect unticked ("Chưa Đánh giá năng lực") items in CompetencySubjectCatalog
    if (inactiveMatch || isExplicitDgnlCode) {
      return null;
    }
  }

  const guardDisabled = (sid: string | null): string | null => {
    if (!sid) return null;
    return disabledSubjectIds.has(sid) ? null : sid;
  };

  // 1. Official ĐGNL Subject Catalog lookup (static fallback when DB catalog is not passed, or text name variations)
  const mappedSsmCode = DGNL_NORMALIZED_INDEX.get(key);
  if (mappedSsmCode) {
    const target = subjects.find(
      (s) => s.subjectCode.toUpperCase() === mappedSsmCode.toUpperCase()
    );
    if (target) return guardDisabled(target.id);
  }

  // 2. Direct match on canonical SSM subjectCode or subjectName (skip pure KSĐV sub-codes TAv/TAvd)
  const directMatch = subjects.find(
    (s) =>
      s.subjectCode !== "TAv" &&
      s.subjectCode !== "TAvd" &&
      (normalizeKey(s.subjectCode) === key || normalizeKey(s.subjectName) === key)
  );
  if (directMatch) return guardDisabled(directMatch.id);

  // 3. Alias dictionary match (SubjectAlias)
  const aliasMatch = subjectAliases.find((a) => a.normalizedKey === key);
  if (aliasMatch) return guardDisabled(aliasMatch.subjectId);

  // 4. Safe compound-aware fallback (prevents "Khoa học tự nhiên (Hóa Học)" -> "Hóa học" or "Math" -> "Toán")
  if (key.includes("khoahoctunhien") || key.startsWith("khtn")) {
    const kht = subjects.find((s) => s.subjectCode === "KHT");
    if (kht) return guardDisabled(kht.id);
  }
  if (key.includes("lichsudiali") || key.includes("lichsuvadiali")) {
    const lsu = subjects.find((s) => s.subjectCode === "LSU");
    if (lsu) return guardDisabled(lsu.id);
  }
  if (key.includes("math")) {
    const mat = subjects.find((s) => s.subjectCode === "MAT");
    if (mat) return guardDisabled(mat.id);
  }

  if (key.length >= 5) {
    const subMatch = subjects.find((s) => {
      if (["TAv", "TAvd", "EPT", "NLTD", "HHO", "VLI", "SHO", "DLI"].includes(s.subjectCode)) {
        return false;
      }
      const normSub = normalizeKey(s.subjectName);
      return normSub.length >= 5 && (key.includes(normSub) || normSub.includes(key));
    });
    if (subMatch) return guardDisabled(subMatch.id);
  }

  return null;
}

/**
 * Resolves Subject when Excel provides SubjectCode (DG_*), SubjectName, or both.
 * Prioritizes SubjectCode (DG_*) when present, falling back to SubjectName.
 */
export function resolveCompetencySubject(
  rawSubjectCode: string | null | undefined,
  rawSubjectName: string | null | undefined,
  subjects: Array<{ id: string; subjectCode: string; subjectName: string }>,
  subjectAliases: Array<{ id: string; subjectId: string; normalizedKey: string }>,
  catalogItems?: Array<{ dgnlCode: string; dgnlName: string; subjectId: string; isActive?: boolean }>
): string | null {
  if (rawSubjectCode && rawSubjectCode.trim()) {
    const byCode = resolveSubjectMatch(rawSubjectCode.trim(), subjects, subjectAliases, catalogItems);
    if (byCode) return byCode;
  }
  if (rawSubjectName && rawSubjectName.trim()) {
    return resolveSubjectMatch(rawSubjectName.trim(), subjects, subjectAliases, catalogItems);
  }
  return null;
}

/**
 * Normalizes and resolves Competency from name or alias within a subject
 */
export function resolveCompetencyMatch(
  subjectId: string,
  rawCompName: string,
  competencies: Array<{
    id: string;
    subjectId: string;
    code: string;
    name: string;
  }>,
  competencyAliases: Array<{
    id: string;
    competencyId: string;
    normalizedKey: string;
  }>
): string | null {
  if (!rawCompName || !subjectId) return null;
  const key = normalizeKey(rawCompName);
  if (!key) return null;

  const subjectComps = competencies.filter((c) => c.subjectId === subjectId);

  // 1. Direct match
  const directMatch = subjectComps.find(
    (c) =>
      normalizeKey(c.code) === key ||
      normalizeKey(c.name) === key
  );
  if (directMatch) return directMatch.id;

  // 2. Alias match
  const compIds = new Set(subjectComps.map((c) => c.id));
  const aliasMatch = competencyAliases.find(
    (a) => compIds.has(a.competencyId) && a.normalizedKey === key
  );
  if (aliasMatch) return aliasMatch.competencyId;

  // 3. Partial / fuzzy match
  const fuzzy = subjectComps.find(
    (c) =>
      key.includes(normalizeKey(c.name)) ||
      normalizeKey(c.name).includes(key)
  );
  if (fuzzy) return fuzzy.id;

  return null;
}

export interface RadarPoint {
  competencyId: string;
  code: string;
  name: string;
  displayOrder: number;
  weight: number;
  percent: number | null;
  achievedScore?: number | null;
  maxScore?: number | null;
  calculationSource?: string | null;
}

/**
 * Synthesizes Radar points and overall weighted subject score
 * Respects displayOrder and treats NULL distinctly from 0.
 */
export function synthesizeSubjectSummary(
  allCompetenciesOfSubject: Array<{
    id: string;
    code: string;
    name: string;
    displayOrder: number;
    weight: number;
  }>,
  studentAssessments: Array<{
    competencyId: string;
    competencyPercent: number | null;
    achievedScore?: number | null;
    maxScore?: number | null;
    calculationSource?: string | null;
  }>
) {
  const assessmentMap = new Map<string, typeof studentAssessments[0]>();
  studentAssessments.forEach((a) => assessmentMap.set(a.competencyId, a));

  const sortedCompetencies = [...allCompetenciesOfSubject].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  let totalWeightedPercent = 0;
  let totalWeightEvaluated = 0;
  let evaluatedCount = 0;

  const radarData: RadarPoint[] = sortedCompetencies.map((c) => {
    const assessment = assessmentMap.get(c.id);
    const hasValue = assessment && assessment.competencyPercent !== null && assessment.competencyPercent !== undefined;
    const percent = hasValue ? assessment.competencyPercent : null;

    if (percent !== null) {
      const weight = c.weight || 1.0;
      totalWeightedPercent += percent * weight;
      totalWeightEvaluated += weight;
      evaluatedCount++;
    }

    return {
      competencyId: c.id,
      code: c.code,
      name: c.name,
      displayOrder: c.displayOrder,
      weight: c.weight || 1.0,
      percent,
      achievedScore: assessment?.achievedScore,
      maxScore: assessment?.maxScore,
      calculationSource: assessment?.calculationSource,
    };
  });

  const subjectScore =
    totalWeightEvaluated > 0
      ? Math.round((totalWeightedPercent / totalWeightEvaluated) * 10) / 10
      : null;

  return {
    subjectScore,
    evaluatedCount,
    totalCompetencies: sortedCompetencies.length,
    radarData,
  };
}
