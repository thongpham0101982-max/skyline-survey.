/**
 * Module quản lý và hệ thống hóa Danh mục Môn học (Subject Normalization & Mapping).
 * Áp dụng thống nhất cho toàn bộ hệ thống SSM:
 * 1. Phân chia chuẩn 4 Danh mục:
 *    - MOET: Chương trình chuẩn Bộ Giáo dục & Đào tạo
 *    - SKL: Chương trình đặc thù Hệ thống Giáo dục Sky-Line
 *    - BILINGUAL: Chương trình Song ngữ & Quốc tế (Chuẩn mã INT-...)
 *    - KSDV: Khảo sát đầu vào & Đánh giá năng lực (Môn NLTD độc lập, TAv, TAvd, EPT)
 * 2. Cung cấp bộ quy tắc phân giải (Resolver) cho File Excel nạp điểm:
 *    - File điểm MOET (Toán, Văn, Anh, KHTN, Sử, Địa, Lý, Hóa, Sinh, Tin, GDCD...)
 *    - File kết quả đánh giá năng lực ĐBCL (Mã DG_TOAN, DG_TIENG_VIET, DG_TIENG_ANH, DG_TAM_LY, DG_NLTD...)
 *    - File điểm Song ngữ (Mã INT-ENG, INT-MATH, INT-SCI, INT-READ, INT-GLOBAL, INT-AE, INT-IELTS, INT-SAT, INT-BUS, INT-AR, INT-CORE...)
 */

export type SubjectCategory = "MOET" | "SKL" | "BILINGUAL" | "KSDV";
export type EvaluationType = "SCORE" | "GRADE" | "COMMENT";

export interface SubjectSystemDefinition {
  code: string;
  name: string;
  category: SubjectCategory;
  evaluationType: EvaluationType;
  aliases: string[];
  assessmentCodes?: string[];
  isSubSubject?: boolean;
  parentCode?: string;
  description?: string;
}

/**
 * Danh sách môn học hệ thống hóa chuẩn toàn trường
 */
export const SYSTEM_SUBJECTS: SubjectSystemDefinition[] = [
  // ==========================================
  // 1. NHÓM KSDV: Khảo sát đầu vào & ĐG năng lực
  // ==========================================
  {
    code: "NLTD",
    name: "Năng lực tư duy",
    category: "KSDV",
    evaluationType: "SCORE",
    aliases: ["nltd", "nang luc tu duy", "tu duy", "dg_nltd", "danh gia nang luc tu duy", "logic"],
    assessmentCodes: ["NLTD", "DG_NLTD"],
    description: "Môn Khảo sát Đầu vào độc lập (không ghép với môn Toán)"
  },
  {
    code: "TAv",
    name: "Tiếng Anh (viết)",
    category: "KSDV",
    evaluationType: "SCORE",
    aliases: ["tav", "tieng anh viet", "tieng anh (viet)", "anh viet", "english written"],
    assessmentCodes: ["TAv"],
    isSubSubject: true,
    parentCode: "TA",
    description: "Môn KSĐV Tiếng Anh phần viết"
  },
  {
    code: "TAvd",
    name: "Tiếng Anh (vấn đáp)",
    category: "KSDV",
    evaluationType: "SCORE",
    aliases: ["tavd", "tieng anh van dap", "tieng anh (van dap)", "anh van dap", "speaking", "english oral"],
    assessmentCodes: ["TAvd"],
    isSubSubject: true,
    parentCode: "TA",
    description: "Môn KSĐV Tiếng Anh phần vấn đáp"
  },
  {
    code: "EPT",
    name: "English Placement Test (EPT)",
    category: "KSDV",
    evaluationType: "SCORE",
    aliases: ["ept", "english placement test", "test ept", "dg_ept"],
    assessmentCodes: ["EPT", "DG_EPT"],
    isSubSubject: false,
    description: "Bài kiểm tra xếp lớp tiếng Anh đầu vào độc lập (không thuộc môn TA)"
  },

  // ==========================================
  // 2. NHÓM BILINGUAL: Môn học Song ngữ (INT-...)
  // ==========================================
  {
    code: "INT-ENG",
    name: "English",
    category: "BILINGUAL",
    evaluationType: "SCORE",
    aliases: ["int-eng", "english", "esl", "esa", "tieng anh song ngu", "eng", "int_eng"],
    assessmentCodes: ["INT-ENG", "ESL", "ENG"],
    description: "Môn Tiếng Anh Song ngữ"
  },
  {
    code: "INT-MATH",
    name: "Mathematics",
    category: "BILINGUAL",
    evaluationType: "SCORE",
    aliases: ["int-math", "mathematics", "maths", "math", "toan song ngu", "maths cambridge", "mat", "int_math"],
    assessmentCodes: ["INT-MATH", "MAT", "MATHS"],
    description: "Môn Toán Song ngữ / Cambridge"
  },
  {
    code: "INT-SCI",
    name: "Science",
    category: "BILINGUAL",
    evaluationType: "SCORE",
    aliases: ["int-sci", "science", "sci", "khoa hoc song ngu", "int_sci"],
    assessmentCodes: ["INT-SCI", "SCI"],
    description: "Môn Khoa học Song ngữ"
  },
  {
    code: "INT-READ",
    name: "Library Reading",
    category: "BILINGUAL",
    evaluationType: "GRADE",
    aliases: ["int-read", "library reading", "reading", "doc sach", "thu vien", "read", "int_read"],
    assessmentCodes: ["INT-READ", "READ"],
    description: "Môn Đọc sách Thư viện Song ngữ"
  },
  {
    code: "INT-GLOBAL",
    name: "Global Studies",
    category: "BILINGUAL",
    evaluationType: "SCORE",
    aliases: ["int-global", "global studies", "gls", "toan cau hoc", "int_global"],
    assessmentCodes: ["INT-GLOBAL", "GLS"],
    description: "Môn Toàn cầu học Song ngữ"
  },
  {
    code: "INT-AE",
    name: "Academic English",
    category: "BILINGUAL",
    evaluationType: "SCORE",
    aliases: ["int-ae", "academic english", "ace", "tieng anh hoc thuat", "int_ae"],
    assessmentCodes: ["INT-AE", "ACE"],
    description: "Môn Tiếng Anh Học thuật"
  },
  {
    code: "INT-IELTS",
    name: "IELTS",
    category: "BILINGUAL",
    evaluationType: "SCORE",
    aliases: ["int-ielts", "ielts", "iel", "luyen thi ielts", "int_ielts"],
    assessmentCodes: ["INT-IELTS", "IEL"],
    description: "Môn Luyện thi IELTS"
  },
  {
    code: "INT-SAT",
    name: "SAT",
    category: "BILINGUAL",
    evaluationType: "SCORE",
    aliases: ["int-sat", "sat", "luyen thi sat", "int_sat"],
    assessmentCodes: ["INT-SAT", "SAT"],
    description: "Môn Luyện thi SAT"
  },
  {
    code: "INT-BUS",
    name: "Business",
    category: "BILINGUAL",
    evaluationType: "SCORE",
    aliases: ["int-bus", "business", "bss", "kinh doanh", "business studies", "int_bus"],
    assessmentCodes: ["INT-BUS", "BSS"],
    description: "Môn Kinh doanh Quốc tế"
  },
  {
    code: "INT-AR",
    name: "A.R",
    category: "BILINGUAL",
    evaluationType: "SCORE",
    aliases: ["int-ar", "a.r", "ar", "academic research", "acr", "int_ar"],
    assessmentCodes: ["INT-AR", "AR", "ACR"],
    description: "Môn Nghiên cứu Học thuật A.R"
  },
  {
    code: "INT-CORE",
    name: "Core Competencies các môn Học Song ngữ",
    category: "BILINGUAL",
    evaluationType: "SCORE",
    aliases: ["int-core", "core competencies", "nang luc cot loi", "core", "int_core"],
    assessmentCodes: ["INT-CORE", "CORE"],
    description: "Đánh giá Năng lực Cốt lõi các môn Song ngữ"
  },

  // ==========================================
  // 3. NHÓM MOET: Chương trình chuẩn Bộ GD&ĐT
  // ==========================================
  {
    code: "TOA",
    name: "Toán học",
    category: "MOET",
    evaluationType: "SCORE",
    aliases: ["toa", "toan", "toan hoc", "mon toan", "dg_toan", "dg_toan_hoc"],
    assessmentCodes: ["TOA", "DG_TOAN"],
    description: "Môn Toán theo chương trình Bộ GD&ĐT"
  },
  {
    code: "TVI",
    name: "Tiếng Việt",
    category: "MOET",
    evaluationType: "SCORE",
    aliases: ["tvi", "tieng viet", "mon tieng viet", "dg_tieng_viet", "dg_tv"],
    assessmentCodes: ["TVI", "DG_TIENG_VIET"],
    description: "Môn Tiếng Việt (Cấp Tiểu học)"
  },
  {
    code: "NVA",
    name: "Ngữ Văn",
    category: "MOET",
    evaluationType: "SCORE",
    aliases: ["nva", "ngu van", "van", "mon ngu van", "mon van", "dg_ngu_van", "dg_van"],
    assessmentCodes: ["NVA", "DG_NGU_VAN"],
    description: "Môn Ngữ Văn (Cấp THCS / THPT)"
  },
  {
    code: "TA",
    name: "Tiếng Anh",
    category: "MOET",
    evaluationType: "SCORE",
    aliases: ["ta", "tav", "tieng anh", "anh", "mon tieng anh", "dg_tieng_anh", "dg_ta"],
    assessmentCodes: ["TA", "TAV", "DG_TIENG_ANH"],
    description: "Môn Tiếng Anh theo chương trình Bộ GD&ĐT"
  },
  {
    code: "KHT",
    name: "Khoa học tự nhiên",
    category: "MOET",
    evaluationType: "SCORE",
    aliases: ["kht", "khoa hoc tu nhien", "khtn", "mon khtn"],
    assessmentCodes: ["KHT", "KHTN"],
    description: "Môn Khoa học tự nhiên (THCS)"
  },
  {
    code: "VLI",
    name: "Vật lí",
    category: "MOET",
    evaluationType: "SCORE",
    aliases: ["vli", "vat li", "vat ly", "ly", "mon ly", "physics"],
    assessmentCodes: ["VLI", "VAT_LI"],
    description: "Môn Vật lí (THPT)"
  },
  {
    code: "HHO",
    name: "Hóa học",
    category: "MOET",
    evaluationType: "SCORE",
    aliases: ["hho", "hoa hoc", "hoa", "mon hoa", "chemistry"],
    assessmentCodes: ["HHO", "HOA_HOC"],
    description: "Môn Hóa học (THPT)"
  },
  {
    code: "SHO",
    name: "Sinh học",
    category: "MOET",
    evaluationType: "SCORE",
    aliases: ["sho", "sinh hoc", "sinh", "mon sinh", "biology"],
    assessmentCodes: ["SHO", "SINH_HOC"],
    description: "Môn Sinh học (THPT)"
  },
  {
    code: "LSU",
    name: "Lịch sử & giáo dục địa phương",
    category: "MOET",
    evaluationType: "SCORE",
    aliases: ["lsu", "lich su", "su", "mon su", "lich_su", "history"],
    assessmentCodes: ["LSU", "LICH_SU"],
    description: "Môn Lịch sử"
  },
  {
    code: "DLI",
    name: "Địa lí",
    category: "MOET",
    evaluationType: "SCORE",
    aliases: ["dli", "dia li", "dia ly", "dia", "mon dia", "geography"],
    assessmentCodes: ["DLI", "DIA_LI"],
    description: "Môn Địa lí"
  },
  {
    code: "GCD",
    name: "Giáo dục công dân",
    category: "MOET",
    evaluationType: "SCORE",
    aliases: ["gcd", "giao duc cong dan", "gdcd", "dao duc", "civics"],
    assessmentCodes: ["GCD", "GDCD"],
    description: "Môn Giáo dục công dân (THCS)"
  },
  {
    code: "GKP",
    name: "Giáo dục Kinh tế và Pháp luật",
    category: "MOET",
    evaluationType: "SCORE",
    aliases: ["gkp", "gdktpl", "gdkt&pl", "kinh te phap luat"],
    assessmentCodes: ["GKP", "GDKTPL"],
    description: "Môn GDKT&PL (THPT)"
  },
  {
    code: "GDQPAN",
    name: "GDQP&AN",
    category: "MOET",
    evaluationType: "SCORE",
    aliases: ["gdqpan", "gdqp", "quoc phong an ninh", "gdqp&an"],
    assessmentCodes: ["GDQPAN"],
    description: "Môn Giáo dục quốc phòng và an ninh (THPT)"
  },
  {
    code: "TIN_HOC",
    name: "Tin học / ICT",
    category: "MOET",
    evaluationType: "SCORE",
    aliases: ["tin_hoc", "tin hoc", "tin", "ict", "ict-ai", "informatics"],
    assessmentCodes: ["TIN_HOC", "ICT"],
    description: "Môn Tin học / ICT"
  },
  {
    code: "AM_NHAC",
    name: "Âm nhạc",
    category: "MOET",
    evaluationType: "GRADE",
    aliases: ["am_nhac", "ana", "am nhac", "nhac", "mon am nhac", "music"],
    assessmentCodes: ["AM_NHAC", "ANA"],
    description: "Môn Âm nhạc (Đánh giá nhận xét)"
  },
  {
    code: "MI_THUAT",
    name: "Mĩ thuật",
    category: "MOET",
    evaluationType: "GRADE",
    aliases: ["mi_thuat", "mtu", "mi thuat", "my thuat", "ve", "mon mi thuat", "art"],
    assessmentCodes: ["MI_THUAT", "MTU"],
    description: "Môn Mĩ thuật (Đánh giá nhận xét)"
  },
  {
    code: "GTC",
    name: "Giáo dục thể chất",
    category: "MOET",
    evaluationType: "GRADE",
    aliases: ["gtc", "giao duc the chat", "gdtc", "the duc", "pe", "physical education"],
    assessmentCodes: ["GTC", "GDTC"],
    description: "Môn Giáo dục thể chất (Đánh giá nhận xét)"
  },
  {
    code: "HDTNHN",
    name: "HĐTN&HN",
    category: "MOET",
    evaluationType: "GRADE",
    aliases: ["hdtnhn", "hoat dong trai nghiem", "hdtn&hn", "hdtn-hn"],
    assessmentCodes: ["HDTNHN"],
    description: "Hoạt động trải nghiệm, hướng nghiệp (Đánh giá nhận xét)"
  },
  {
    code: "HTT",
    name: "HĐTT- GDCĐ",
    category: "MOET",
    evaluationType: "GRADE",
    aliases: ["htt", "hdtt", "hdtt- gdcd", "hdtt-gdcd"],
    assessmentCodes: ["HTT"],
    description: "Hoạt động tập thể - Giáo dục cộng đồng"
  },
  {
    code: "NDGDCDP",
    name: "NDGDCĐP",
    category: "MOET",
    evaluationType: "SCORE",
    aliases: ["ndgdcdp", "noi dung giao duc dia phuong", "gddp"],
    assessmentCodes: ["NDGDCDP"],
    description: "Nội dung giáo dục của địa phương"
  },

  // ==========================================
  // 4. NHÓM SKL: Môn học đặc thù Sky-Line
  // ==========================================
  {
    code: "TLY",
    name: "Tâm lý",
    category: "SKL",
    evaluationType: "SCORE",
    aliases: ["tly", "tam ly", "mon tam ly", "dg_tam_ly", "psychology"],
    assessmentCodes: ["TLY", "DG_TAM_LY"],
    description: "Môn Tâm lý học đường Sky-Line"
  },
  {
    code: "GCX",
    name: "Giáo dục Cảm xúc xã hội",
    category: "SKL",
    evaluationType: "SCORE",
    aliases: ["gcx", "cd_cxxh", "cam xuc xa hoi", "sel", "giao duc cam xuc xa hoi"],
    assessmentCodes: ["GCX", "CD_CXXH"],
    description: "Chương trình Cảm xúc xã hội (SEL)"
  },
  {
    code: "STE",
    name: "STEM / Công nghệ",
    category: "SKL",
    evaluationType: "SCORE",
    aliases: ["ste", "stem", "stem / cong nghe", "cong nghe", "stem-robotics"],
    assessmentCodes: ["STE", "STEM"],
    description: "Chương trình STEM & Công nghệ Sky-Line"
  },
  {
    code: "HNG",
    name: "Hướng nghiệp",
    category: "SKL",
    evaluationType: "SCORE",
    aliases: ["hng", "huong nghiep", "career"],
    assessmentCodes: ["HNG"],
    description: "Môn Hướng nghiệp Sky-Line"
  },
  {
    code: "TND",
    name: "Trải nghiệm - Dự án",
    category: "SKL",
    evaluationType: "GRADE",
    aliases: ["tnd", "trai nghiem - du an", "trai nghiem", "du an"],
    assessmentCodes: ["TND"],
    description: "Môn Trải nghiệm - Dự án thực tế"
  },
  {
    code: "CD_CD",
    name: "Chủ đề/Chuyên đề",
    category: "SKL",
    evaluationType: "SCORE",
    aliases: ["cd_cd", "chu de", "chuyen de", "chu de/chuyen de"],
    assessmentCodes: ["CD_CD"],
    description: "Chủ đề / Chuyên đề học tập chuyên sâu"
  },
  {
    code: "TNH",
    name: "Tiếng Nhật",
    category: "SKL",
    evaluationType: "SCORE",
    aliases: ["tnh", "tieng nhat", "japanese"],
    assessmentCodes: ["TNH"],
    description: "Ngoại ngữ tăng cường Tiếng Nhật"
  }
];

/**
 * Xóa dấu tiếng Việt phục vụ so khớp alias linh hoạt
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/**
 * Chuẩn hóa mã hoặc tên môn học từ file Excel nạp vào thành đối tượng môn chuẩn
 */
export function normalizeSubjectForImport(rawCodeOrName: string): SubjectSystemDefinition | null {
  if (!rawCodeOrName) return null;
  const clean = rawCodeOrName.trim();
  const normalizedClean = removeVietnameseTones(clean).replace(/[\s\-_]+/g, "");

  // 1. So khớp chính xác mã môn hệ thống (ví dụ: INT-ENG, TOA, NLTD, TAv)
  const exactCodeMatch = SYSTEM_SUBJECTS.find(
    s => s.code.toLowerCase() === clean.toLowerCase()
  );
  if (exactCodeMatch) return exactCodeMatch;

  // 2. So khớp mã assessmentCode (ví dụ: DG_TOAN, DG_NLTD, ESL, MAT, READ)
  const assessmentMatch = SYSTEM_SUBJECTS.find(s =>
    s.assessmentCodes?.some(ac => ac.toLowerCase() === clean.toLowerCase())
  );
  if (assessmentMatch) return assessmentMatch;

  // 3. So khớp qua aliases
  const aliasMatch = SYSTEM_SUBJECTS.find(s => {
    return s.aliases.some(alias => {
      const normAlias = removeVietnameseTones(alias).replace(/[\s\-_]+/g, "");
      return normalizedClean === normAlias;
    });
  });
  if (aliasMatch) return aliasMatch;

  // 4. So khớp theo tên môn chuẩn
  const nameMatch = SYSTEM_SUBJECTS.find(s => {
    const normName = removeVietnameseTones(s.name).replace(/[\s\-_]+/g, "");
    return normalizedClean === normName;
  });
  if (nameMatch) return nameMatch;

  return null;
}

/**
 * Trả về danh sách môn học thuộc 1 danh mục cụ thể
 */
export function getSubjectsByCategory(category: SubjectCategory): SubjectSystemDefinition[] {
  return SYSTEM_SUBJECTS.filter(s => s.category === category);
}

/**
 * Tương thích ngược với SUBJECT_MAPPING_LIST cũ
 */
export const SUBJECT_MAPPING_LIST = SYSTEM_SUBJECTS.map(s => ({
  mainCode: s.code,
  mainName: s.name,
  assessmentCode: s.assessmentCodes?.[0] || s.code,
  assessmentName: s.name,
  isSubSubject: !!s.isSubSubject,
  parentCode: s.parentCode,
  category: s.category,
  evaluationType: s.evaluationType
}));

/**
 * Lấy Mã môn mẹ từ Mã môn khảo sát (Ví dụ: TAv -> TA, TAvd -> TA)
 */
export function getParentSubjectCode(assessmentCode: string): string {
  if (!assessmentCode) return "";
  const found = normalizeSubjectForImport(assessmentCode);
  if (found && found.parentCode) {
    return found.parentCode;
  }
  return found?.code || assessmentCode.trim().toUpperCase();
}

/**
 * Lấy danh sách các mã môn khảo sát / thành phần thuộc 1 mã môn chính
 */
export function getAssessmentCodesForMainSubject(mainCode: string): string[] {
  if (!mainCode) return [];
  const code = mainCode.trim().toUpperCase();
  if (code === "TA" || code === "TAV") {
    return ["TAv", "TAvd", "TA", "DG_TIENG_ANH"];
  }
  if (code === "EPT") {
    return ["EPT", "DG_EPT"];
  }
  const match = SYSTEM_SUBJECTS.find(s => s.code.toUpperCase() === code);
  if (match) {
    return match.assessmentCodes || [match.code];
  }
  return [mainCode];
}

/**
 * Lấy thông tin mapping của 1 mã môn
 */
export function getSubjectMappingInfo(code: string) {
  return normalizeSubjectForImport(code);
}

/**
 * Trích xuất và chuẩn hóa danh sách Môn Cam kết cho Hỗ trợ học tập & Phân công giáo viên.
 * Nhận diện riêng môn Năng lực tư duy (NLTD) độc lập, không ghép vào Toán.
 */
export function parseCommittedSubjects(note?: string | null, resultStr?: string | null): string[] {
  const text = `${note || ""} ${resultStr || ""}`.trim();
  if (!text) return [];

  let rawSubs: string[] = [];
  const match = text.match(/(?:Môn cam kết|Mon cam ket|Cam kết|Môn kiểm tra lại):\s*\[?([^\]\r\n]+)\]?/i);
  if (match && match[1]) {
    rawSubs = match[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }

  if (rawSubs.length === 0) {
    if (/Toán|Math/i.test(text)) rawSubs.push("Toán");
    if (/Tiếng Việt|TN-XH|Tự nhiên/i.test(text)) rawSubs.push("Tiếng Việt");
    if (/Ngữ văn|Literature|Văn/i.test(text) && !/Tiếng Việt/i.test(text)) rawSubs.push("Ngữ Văn");
    if (/Anh|English|ESL|EPT/i.test(text)) rawSubs.push("Tiếng Anh");
    if (/Tâm lý|Psychology/i.test(text)) rawSubs.push("Tâm lý");
    if (/Tư duy|NLTD|Logic/i.test(text)) rawSubs.push("Năng lực tư duy");
  }

  const finalSubs: string[] = [];
  rawSubs.forEach((s) => {
    const clean = s.trim().replace(/^môn\s+/i, "");
    const lower = clean.toLowerCase();
    
    // Năng lực tư duy riêng biệt (ưu tiên check trước để không lẫn với môn khác)
    if (lower.includes("tư duy") || lower.includes("tu duy") || lower.includes("nltd") || lower.includes("logic")) {
      if (!finalSubs.includes("Năng lực tư duy")) finalSubs.push("Năng lực tư duy");
    } else if (lower.includes("anh") || lower.includes("english") || lower.includes("esl") || lower.includes("ept")) {
      if (!finalSubs.includes("Tiếng Anh")) finalSubs.push("Tiếng Anh");
    } else if (lower.includes("toán") || lower.includes("toan") || lower.includes("math")) {
      if (!finalSubs.includes("Toán")) finalSubs.push("Toán");
    } else if (lower.includes("tiếng việt") || lower.includes("tieng viet")) {
      if (!finalSubs.includes("Tiếng Việt")) finalSubs.push("Tiếng Việt");
    } else if (lower.includes("ngữ văn") || lower.includes("ngu van") || lower.includes("literature") || lower === "văn") {
      if (!finalSubs.includes("Ngữ Văn")) finalSubs.push("Ngữ Văn");
    } else if (lower.includes("tâm lý") || lower.includes("tam ly") || lower.includes("psychology")) {
      if (!finalSubs.includes("Tâm lý")) finalSubs.push("Tâm lý");
    } else {
      if (!finalSubs.includes(clean)) finalSubs.push(clean);
    }
  });

  return finalSubs;
}
