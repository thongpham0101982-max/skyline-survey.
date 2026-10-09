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
  conductRating?: string; // "Tốt" | "Khá" | "Đạt" | "Chưa đạt"
  subjects: SubjectScoreItem[];
  combination?: {
    name: string; // "KHTN" | "KHXH" | "Tổ hợp tự chọn"
    score?: string;
    level?: string;
  };
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
  overallRating?: string;
  moet?: MoetRecord;
  bilingual?: BilingualRecord;
  foreign?: ForeignRecord;
  homeschool?: HomeschoolRecord;
  attachments?: FileAttachment[];
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
      { id: "toan", name: "Toán", level: "T", score: "" },
      { id: "tieng_viet", name: "Tiếng Việt", level: "T", score: "" },
      { id: "tieng_anh", name: "Tiếng Anh", level: "T", score: "" }
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
        parts.push(`${moet.combination.name}: ${moet.combination.score}`);
      }
      return parts.length > 0 ? parts.join(" • ") : (moet?.overallRating || "Bộ GD&ĐT");
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
      return parts.join(" • ");
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
      return parts.length > 0 ? `Nước ngoài (${parts.join(" • ")})` : "Học bạ nước ngoài";
    }

    case "HOMESCHOOLING": {
      const h = record.homeschool;
      const parts: string[] = ["Homeschooling"];
      if (h?.overallEvaluation) parts.push(h.overallEvaluation);
      if (h?.subjects && h.subjects.length > 0) {
        const sub = h.subjects.filter(s => s.name).map(s => s.score ? `${s.name}: ${s.score}` : s.name).join(", ");
        if (sub) parts.push(`Môn: ${sub}`);
      }
      return parts.join(" • ");
    }

    default:
      return record.overallRating || "";
  }
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
      internationalSubjects: [
        { id: "intl_esl", name: "English / ESL", score: "" },
        { id: "intl_math", name: "Mathematics", score: "" },
        { id: "intl_sci", name: "Science", score: "" }
      ]
    },
    foreign: {
      country: "",
      gradeCompleted: "",
      status: "COMPLETED",
      gpaOrHonors: "",
      subjects: [
        { id: "f_la", name: "Language Arts", score: "" },
        { id: "f_math", name: "Mathematics", score: "" },
        { id: "f_sci", name: "Science", score: "" }
      ]
    },
    homeschool: {
      learningMode: "INDEPENDENT",
      subjects: [
        { id: "hs_toan", name: "Toán học", score: "" },
        { id: "hs_ngonngu", name: "Ngôn ngữ & Đọc viết", score: "" }
      ],
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
