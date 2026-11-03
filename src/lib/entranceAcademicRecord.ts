/**
 * Thư viện xử lý dữ liệu Kết quả học tập đầu vào (Entrance Academic Record)
 * Đảm bảo tính linh hoạt tối đa (Flexible Schema) và tương thích ngược 100% với dữ liệu chuỗi cũ.
 */

export type ProgramType = "BO_GD_DT" | "SONG_NGU" | "NUOC_NGOAI" | "HOMESCHOOLING";

export interface SubjectScoreItem {
  id?: string;
  name: string;
  score?: string; // 0 - 10, Letter grade (A*, A, B...), hoặc phần trăm
  level?: string; // "T" (Tốt), "H" (Hoàn thành), "C" (Chưa hoàn thành), v.v.
  note?: string;
}

export interface MoetRecord {
  gradeLevel: string; // "1" .. "12"
  overallRating: string; // "Hoàn thành xuất sắc" | "Hoàn thành tốt" | "Hoàn thành" | "Chưa hoàn thành" | "Tốt" | "Khá" | "Đạt" | "Chưa đạt"
  conductRating?: string; // "Tốt" | "Khá" | "Đạt" | "Chưa đạt" | "Cần cố gắng"
  achievements?: string; // Thành tích học sinh (nếu có): giải thưởng, chứng chỉ...
  subjects: SubjectScoreItem[];
  combination?: {
    name: string; // "Tổ hợp Khoa học Tự nhiên" | "Tổ hợp Khoa học Xã hội" | "Tổ hợp Công nghệ - Tin học" | "Tổ hợp tự chọn khác"
    score?: string; // Điểm trung bình tự động tính
    level?: string;
    subjects?: SubjectScoreItem[]; // Các môn thành phần của tổ hợp
  };
}

export interface CombinationPreset {
  id: string;
  name: string;
  label: string;
  defaultSubjects: string[];
}

export const THPT_COMBINATION_PRESETS: CombinationPreset[] = [
  {
    id: "KHTN",
    name: "Tổ hợp Khoa học Tự nhiên",
    label: "Tổ hợp Khoa học Tự nhiên (Vật lí, Hóa học, Sinh học)",
    defaultSubjects: ["Vật lí", "Hóa học", "Sinh học"]
  },
  {
    id: "KHXH",
    name: "Tổ hợp Khoa học Xã hội",
    label: "Tổ hợp Khoa học Xã hội (Lịch sử, Địa lí, GDKT&PL)",
    defaultSubjects: ["Lịch sử", "Địa lí", "GDKT & PL"]
  },
  {
    id: "CN_TH",
    name: "Tổ hợp Công nghệ - Tin học",
    label: "Tổ hợp Công nghệ - Tin học (Tin học, Công nghệ)",
    defaultSubjects: ["Tin học", "Công nghệ"]
  },
  {
    id: "TU_CHON",
    name: "Tổ hợp tự chọn khác",
    label: "Tổ hợp tự chọn khác",
    defaultSubjects: ["Môn lựa chọn 1", "Môn lựa chọn 2"]
  }
];

export function calculateCombinationAverage(subs?: SubjectScoreItem[]): string {
  if (!subs || subs.length === 0) return "";
  const validScores: number[] = [];
  subs.forEach(s => {
    if (!s.score) return;
    const num = parseFloat(s.score.toString().replace(",", ".").trim());
    if (!isNaN(num) && num >= 0 && num <= 10) {
      validScores.push(num);
    }
  });
  if (validScores.length === 0) return "";
  const sum = validScores.reduce((a, b) => a + b, 0);
  const avg = sum / validScores.length;
  const rounded = Math.round(avg * 10) / 10;
  return rounded.toFixed(1);
}

export interface BilingualRecord {
  moetRating?: string;
  internationalRating?: string;
  moetSubjects: SubjectScoreItem[];
  internationalSubjects: SubjectScoreItem[];
}

export interface ForeignRecord {
  country?: string;
  gradeCompleted?: string;
  status?: "COMPLETED" | "IN_PROGRESS" | "TRANSFERRED";
  gpaOrHonors?: string;
  subjects: SubjectScoreItem[];
  notes?: string;
}

export interface HomeschoolRecord {
  learningMode?: "INDEPENDENT" | "CO_OP" | "ONLINE";
  subjects: SubjectScoreItem[];
  overallEvaluation?: string;
  portfolioNote?: string;
}

export interface FileAttachment {
  name: string;
  url: string;
  size?: number;
  uploadedAt?: string;
}

export interface EntranceAcademicRecord {
  programType: ProgramType;
  transcriptPeriod?: "HK1" | "HK2" | "CA_NAM" | string; // Bảng điểm / Học bạ: "HK1" | "HK2" | "Cả năm"
  overallRating?: string;
  achievements?: string; // Thành tích học sinh (nếu có): giải thưởng, chứng chỉ, năng khiếu...
  moet?: MoetRecord;
  bilingual?: BilingualRecord;
  foreign?: ForeignRecord;
  homeschool?: HomeschoolRecord;
  attachments?: FileAttachment[];
  grade1IntakeMode?: "DAU_NAM" | "HK2"; // "DAU_NAM": Khảo sát đầu năm/đầu cấp (chưa có học bạ), "HK2": Khảo sát HK2 (yêu cầu bổ sung điểm)
  summaryText: string;
  isDraft?: boolean;
  updatedAt?: string;
}

/**
 * Trả về danh sách môn học mặc định theo Khối cho Chương trình Bộ GD&ĐT
 */
export function getDefaultMoetSubjects(gradeStr?: string): SubjectScoreItem[] {
  const g = parseInt(gradeStr || "1", 10);
  if (!isNaN(g) && g >= 1 && g <= 5) {
    // Tiểu học: Toán, Tiếng Việt, Tiếng Anh
    return [
      { id: "toan", name: "Toán", score: "" },
      { id: "tieng_viet", name: "Tiếng Việt", score: "" },
      { id: "tieng_anh", name: "Tiếng Anh", score: "" }
    ];
  } else if (!isNaN(g) && g >= 6 && g <= 9) {
    // THCS: Toán, Ngữ Văn, Tiếng Anh
    return [
      { id: "toan", name: "Toán", score: "" },
      { id: "ngu_van", name: "Ngữ Văn", score: "" },
      { id: "tieng_anh", name: "Tiếng Anh", score: "" }
    ];
  } else {
    // THPT: Toán, Ngữ Văn, Tiếng Anh (+ Tổ hợp)
    return [
      { id: "toan", name: "Toán", score: "" },
      { id: "ngu_van", name: "Ngữ Văn", score: "" },
      { id: "tieng_anh", name: "Tiếng Anh", score: "" }
    ];
  }
}

/**
 * Tạo chuỗi tóm tắt trực quan ngắn gọn để lưu song hành hiển thị trên bảng tra cứu
 */
export function generateSummaryText(record: Partial<EntranceAcademicRecord>): string {
  if (!record || !record.programType) return record?.overallRating || "";

  let base = "";
  switch (record.programType) {
    case "BO_GD_DT": {
      const moet = record.moet;
      const parts: string[] = [];
      if (moet?.overallRating) parts.push(`Chung: ${moet.overallRating}`);
      if (moet?.subjects && moet.subjects.length > 0) {
        const subParts = moet.subjects
          .filter(s => s.score || s.level)
          .map(s => {
            if (s.level && s.score) return `${s.name}: ${s.level} (${s.score})`;
            if (s.level) return `${s.name}: ${s.level}`;
            return `${s.name}: ${s.score}`;
          });
        if (subParts.length > 0) parts.push(subParts.join(" | "));
      }
      if (moet?.combination?.name && moet.combination.score) {
        const subParts = (moet.combination.subjects || [])
          .filter(s => s.name && s.score)
          .map(s => `${s.name}: ${s.score}`);
        if (subParts.length > 0) {
          parts.push(`${moet.combination.name}: ${moet.combination.score} (${subParts.join(", ")})`);
        } else {
          parts.push(`${moet.combination.name}: ${moet.combination.score}`);
        }
      }
      base = parts.length > 0 ? parts.join(" • ") : (moet?.overallRating || "Bộ GD&ĐT");
      break;
    }

    case "SONG_NGU": {
      const bi = record.bilingual;
      const parts: string[] = ["Song ngữ"];
      if (bi?.moetRating) parts.push(`VN: ${bi.moetRating}`);
      if (bi?.internationalRating) parts.push(`QT: ${bi.internationalRating}`);
      const notable = [...(bi?.moetSubjects || []), ...(bi?.internationalSubjects || [])].filter(s => s.score);
      if (notable.length > 0) {
        parts.push(notable.slice(0, 3).map(s => `${s.name}: ${s.score}`).join(" | "));
      }
      base = parts.join(" • ");
      break;
    }

    case "NUOC_NGOAI": {
      const f = record.foreign;
      const parts: string[] = [];
      if (f?.country) parts.push(f.country);
      if (f?.gpaOrHonors) parts.push(`GPA: ${f.gpaOrHonors}`);
      else if (f?.status === "COMPLETED") parts.push("Đã hoàn thành");
      if (f?.subjects && f.subjects.length > 0) {
        const sub = f.subjects.filter(s => s.score).map(s => `${s.name}: ${s.score}`).join(" | ");
        if (sub) parts.push(sub);
      }
      base = parts.length > 0 ? `Nước ngoài (${parts.join(" • ")})` : "Học bạ nước ngoài";
      break;
    }

    case "HOMESCHOOLING": {
      const h = record.homeschool;
      const parts: string[] = ["Homeschooling"];
      if (h?.overallEvaluation) parts.push(h.overallEvaluation);
      if (h?.subjects && h.subjects.length > 0) {
        const sub = h.subjects.filter(s => s.name).map(s => s.score ? `${s.name}: ${s.score}` : s.name).join(", ");
        if (sub) parts.push(`Môn: ${sub}`);
      }
      base = parts.join(" • ");
      break;
    }

    default:
      base = record.overallRating || "";
  }

  const ach = record.achievements || record.moet?.achievements;
  if (ach && ach.trim()) {
    base = base ? `${base} • 🏆 ${ach.trim()}` : `🏆 ${ach.trim()}`;
  }
  return base;
}

/**
 * Đóng gói bản ghi thành chuỗi JSON chuẩn lưu vào database
 */
export function serializeEntranceRecord(record: EntranceAcademicRecord): string {
  const summaryText = generateSummaryText(record);
  const payload = {
    ...record,
    summaryText,
    updatedAt: new Date().toISOString()
  };
  return JSON.stringify(payload);
}

/**
 * Bóc tách chuỗi từ database:
 * - Nếu chuỗi là JSON hợp lệ: parse và trả về đối tượng đầy đủ
 * - Nếu chuỗi là dữ liệu cũ ("Tốt", "Khá", "Đạt" hoặc văn bản thường): tự động chuyển đổi sang định dạng chuẩn Bộ GD&ĐT
 */
export function parseEntranceRecord(rawString?: string | null, gradeStr?: string): EntranceAcademicRecord {
  const defaultMoetSubs = getDefaultMoetSubjects(gradeStr);
  const isPrimary = parseInt(gradeStr || "1", 10) <= 5;

  const defaultRecord: EntranceAcademicRecord = {
    programType: "BO_GD_DT",
    transcriptPeriod: "CA_NAM",
    overallRating: isPrimary ? "Hoàn thành tốt" : "Tốt",
    moet: {
      gradeLevel: gradeStr || "1",
      overallRating: isPrimary ? "Hoàn thành tốt" : "Tốt",
      conductRating: "Tốt",
      subjects: defaultMoetSubs
    },
    bilingual: {
      moetRating: "Tốt",
      internationalRating: "A",
      moetSubjects: [
        { id: "vn_toan", name: "Toán", score: "" },
        { id: "vn_van", name: "Ngữ Văn / Tiếng Việt", score: "" },
        { id: "vn_anh", name: "Tiếng Anh", score: "" }
      ],
      internationalSubjects: []
    },
    foreign: {
      country: "",
      gradeCompleted: "",
      status: "COMPLETED",
      gpaOrHonors: "",
      subjects: []
    },
    homeschool: {
      learningMode: "INDEPENDENT",
      subjects: [],
      overallEvaluation: ""
    },
    attachments: [],
    summaryText: ""
  };

  if (!rawString || typeof rawString !== "string" || !rawString.trim()) {
    defaultRecord.summaryText = generateSummaryText(defaultRecord);
    return defaultRecord;
  }

  const trimmed = rawString.trim();

  // Kiểm tra nếu là JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.programType) {
        return {
          ...defaultRecord,
          ...parsed,
          moet: {
            ...defaultRecord.moet,
            ...(parsed.moet || {}),
            subjects: parsed.moet?.subjects?.length > 0 ? parsed.moet.subjects : defaultMoetSubs
          },
          bilingual: {
            ...defaultRecord.bilingual,
            ...(parsed.bilingual || {})
          },
          foreign: {
            ...defaultRecord.foreign,
            ...(parsed.foreign || {})
          },
          homeschool: {
            ...defaultRecord.homeschool,
            ...(parsed.homeschool || {})
          },
          attachments: parsed.attachments || [],
          summaryText: parsed.summaryText || generateSummaryText(parsed)
        };
      }
    } catch (e) {
      // Fallback xuống parse text thường
    }
  }

  // Dữ liệu cũ dạng chuỗi đơn ("Tốt", "Khá", "Đạt" hoặc ghi chú tự do)
  let detectedType: ProgramType = "BO_GD_DT";
  if (trimmed.toLowerCase().includes("homeschool")) detectedType = "HOMESCHOOLING";
  else if (trimmed.toLowerCase().includes("quốc tế") || trimmed.toLowerCase().includes("gpa")) detectedType = "NUOC_NGOAI";

  const legacyRecord: EntranceAcademicRecord = {
    ...defaultRecord,
    programType: detectedType,
    overallRating: trimmed,
    moet: {
      ...defaultRecord.moet!,
      overallRating: trimmed,
      subjects: defaultMoetSubs
    },
    summaryText: trimmed
  };

  return legacyRecord;
}

export interface ExtractedAcademicDetails {
  programLabel: string;
  programType: ProgramType;
  programBadgeCls: string;
  transcriptPeriod: string; // "HK1" | "HK2" | "Cả năm" | "Không áp dụng"
  overallRating: string;
  conductRating?: string;
  achievements?: string;
  math: string;
  literature: string;
  english: string;
  otherSubjects: string;
  otherSubjectList: Array<{ name: string; score: string }>;
  attachments: FileAttachment[];
  isGrade1DauNam?: boolean;
}

export function extractAcademicDetails(
  record: EntranceAcademicRecord, 
  gradeStr?: string, 
  hocKyStr?: string,
  extraContext?: {
    isForeign?: boolean;
    isHomeschool?: boolean;
    rawSchoolName?: string;
    rawKqgd?: string;
  }
): ExtractedAcademicDetails {
  const isForeign = record.programType === "NUOC_NGOAI" || !!extraContext?.isForeign;
  const isHomeschool = record.programType === "HOMESCHOOLING" || !!extraContext?.isHomeschool;
  const effectiveProgramType: ProgramType = isHomeschool 
    ? "HOMESCHOOLING" 
    : (isForeign ? "NUOC_NGOAI" : record.programType);

  const programBadgeMap: Record<ProgramType, { label: string; cls: string }> = {
    BO_GD_DT: { label: "Bộ GD&ĐT", cls: "bg-blue-50 text-blue-700 border-blue-200/80" },
    SONG_NGU: { label: "Song ngữ", cls: "bg-purple-50 text-purple-700 border-purple-200/80" },
    NUOC_NGOAI: { label: "Nước ngoài", cls: "bg-amber-50 text-amber-700 border-amber-200/80" },
    HOMESCHOOLING: { label: "Homeschooling", cls: "bg-emerald-50 text-emerald-700 border-emerald-200/80" }
  };

  const badge = programBadgeMap[effectiveProgramType] || programBadgeMap.BO_GD_DT;

  let overallRating = record.moet?.overallRating || record.bilingual?.moetRating || record.foreign?.gpaOrHonors || record.homeschool?.overallEvaluation || record.overallRating || "—";
  let conductRating = record.moet?.conductRating || "";
  let achievements = record.achievements || record.moet?.achievements || "";

  // Xác định trường hợp Khối 1: Đầu năm / HK1 (Chưa có học bạ lớp 1) vs HK2 (Yêu cầu bổ sung các môn)
  const numericGrade = parseInt(gradeStr || "1", 10);
  const isGrade1 = numericGrade === 1;
  const isHk2 = (hocKyStr && (hocKyStr.toLowerCase().includes("hk2") || hocKyStr.toLowerCase().includes("2") || hocKyStr.toLowerCase().includes("học kỳ 2") || hocKyStr.toLowerCase().includes("hoc ky 2"))) || record.grade1IntakeMode === "HK2";
  const isGrade1DauNam = isGrade1 && !isHk2;

  // Thu thập danh sách môn học
  let allSubjects: SubjectScoreItem[] = [];
  if (record.programType === "BO_GD_DT") {
    allSubjects = record.moet?.subjects || [];
  } else if (record.programType === "SONG_NGU") {
    allSubjects = [...(record.bilingual?.moetSubjects || []), ...(record.bilingual?.internationalSubjects || [])];
  } else if (record.programType === "NUOC_NGOAI") {
    allSubjects = record.foreign?.subjects || [];
  } else if (record.programType === "HOMESCHOOLING") {
    allSubjects = record.homeschool?.subjects || [];
  }

  const findSub = (keywords: string[]) => {
    return allSubjects.find(s => {
      const n = (s.name || "").toLowerCase().trim();
      const id = (s.id || "").toLowerCase().trim();
      return keywords.some(k => n.includes(k) || id === k);
    });
  };

  const formatSubVal = (item?: SubjectScoreItem) => {
    if (!item) return "—";
    // Ưu tiên hiển thị ĐTB / Điểm số
    if (item.score && item.score.trim()) return item.score.trim();
    // Nếu chỉ có level hợp lệ và không phải dummy T
    if (item.level && item.level !== "T") return item.level;
    return "—";
  };

  const mathItem = findSub(["toán", "toan", "math"]);
  const litItem = findSub(["tiếng việt", "tieng viet", "tieng_viet", "văn", "van", "ngữ văn", "ngu van", "ngu_van", "literature"]);
  const engItem = findSub(["tiếng anh", "tieng anh", "tieng_anh", "anh", "english"]);

  let math = formatSubVal(mathItem);
  let literature = formatSubVal(litItem);
  let english = formatSubVal(engItem);

  // Thu thập các môn còn lại do người dùng bấm "+ Thêm môn học" (chỉ lấy môn có điểm thực tế và không phải môn placeholder)
  const matchedNames = new Set([mathItem?.name, litItem?.name, engItem?.name].filter(Boolean));
  const otherItems = (isForeign || isHomeschool)
    ? []
    : allSubjects.filter(s => {
        if (!s.name?.trim() || matchedNames.has(s.name)) return false;
        const low = s.name.toLowerCase();
        if (low.includes("science") || low.includes("language arts") || low.includes("đọc viết") || low.includes("ngôn ngữ") || low.includes("esl") || low === "mathematics") return false;
        return (s.score && s.score.trim()) || (s.level && s.level.trim() && s.level !== "T");
      });

  const otherSubjectList: Array<{ name: string; score: string }> = [];
  const otherParts: string[] = [];

  if (record.moet?.combination?.name && (record.moet.combination.score || record.moet.combination.level)) {
    const combVal = record.moet.combination.score || record.moet.combination.level;
    const subParts = (record.moet.combination.subjects || [])
      .filter(s => s.name && s.score)
      .map(s => `${s.name}: ${s.score}`);
    if (subParts.length > 0) {
      otherParts.push(`${record.moet.combination.name} (ĐTB: ${combVal} | ${subParts.join(", ")})`);
    } else {
      otherParts.push(`${record.moet.combination.name}: ${combVal}`);
    }
  }

  otherItems.forEach(s => {
    const sName = (s.name || "").trim();
    if (!sName) return;
    const val = (s.score && s.score.trim()) || (s.level && s.level !== "T" ? s.level : "");
    if (val) {
      otherParts.push(`${sName}: ${val}`);
    }
    otherSubjectList.push({
      name: sName,
      score: val || "—"
    });
  });

  if (record.foreign?.gradeCompleted) {
    otherParts.push(`Đã hoàn thành Lớp ${record.foreign.gradeCompleted}`);
  }

  let otherSubjects = otherParts.length > 0 ? otherParts.join(" • ") : "—";

  // QUY TẮC MIỄN & ÁP DỤNG:
  // 1. Hồ sơ Nước ngoài hoặc Homeschooling:
  // Miễn các môn: KQ Xếp loại, KQ Rèn luyện, Điểm Môn Toán, Điểm Môn Ngữ Văn/Tiếng Việt, Điểm Tiếng Anh, Các môn khác -> "Không áp dụng"
  if (isForeign || isHomeschool) {
    overallRating = "Không áp dụng";
    conductRating = "Không áp dụng";
    math = "Không áp dụng";
    literature = "Không áp dụng";
    english = "Không áp dụng";
    otherSubjects = "Không áp dụng";
    otherSubjectList.forEach(item => {
      item.score = "Không áp dụng";
    });
  } else if (isGrade1DauNam) {
    // 2. Khối 1 Khảo sát đầu năm / HK1 (Chưa có hồ sơ học bạ lớp 1):
    // Không áp dụng: KQ Xếp loại, KQ Rèn luyện, Điểm Môn Toán, Điểm Môn Ngữ Văn/Tiếng Việt, Điểm Tiếng Anh, Các môn khác
    overallRating = "Không áp dụng";
    conductRating = "Không áp dụng";
    math = "Không áp dụng";
    literature = "Không áp dụng";
    english = "Không áp dụng";
    otherSubjects = "Không áp dụng";
    otherSubjectList.forEach(item => {
      item.score = "Không áp dụng";
    });
  } else if (isGrade1 && isHk2) {
    // 3. Khối 1 khảo sát HK2: Yêu cầu bổ sung các môn nếu chưa có
    if (math === "—") math = "Yêu cầu bổ sung";
    if (literature === "—") literature = "Yêu cầu bổ sung";
    if (english === "—") english = "Yêu cầu bổ sung";
    if (otherSubjects === "—") otherSubjects = "Yêu cầu bổ sung";
    otherSubjectList.forEach(item => {
      if (item.score === "—") item.score = "Yêu cầu bổ sung";
    });
  }

  // Xác định Bảng điểm / Học bạ (HK1, HK2, Cả năm)
  let transcriptPeriod = "Cả năm";
  if (isForeign || isHomeschool || isGrade1DauNam) {
    transcriptPeriod = "Không áp dụng";
  } else if (record.transcriptPeriod) {
    const rawP = record.transcriptPeriod.toString().toUpperCase().trim();
    if (rawP.includes("HK1") || rawP === "1") transcriptPeriod = "HK1";
    else if (rawP.includes("HK2") || rawP === "2") transcriptPeriod = "HK2";
    else if (rawP.includes("CA_NAM") || rawP.includes("CẢ NĂM") || rawP.includes("CANAM")) transcriptPeriod = "Cả năm";
    else transcriptPeriod = record.transcriptPeriod;
  } else {
    // Tự động suy đoán hợp lý nếu chưa thiết lập
    if (isHk2 || record.grade1IntakeMode === "HK2") {
      transcriptPeriod = "HK1";
    } else {
      transcriptPeriod = "Cả năm";
    }
  }

  return {
    programLabel: badge.label,
    programType: effectiveProgramType,
    programBadgeCls: badge.cls,
    transcriptPeriod,
    overallRating,
    conductRating,
    achievements,
    math,
    literature,
    english,
    otherSubjects,
    otherSubjectList,
    attachments: record.attachments || [],
    isGrade1DauNam
  };
}
