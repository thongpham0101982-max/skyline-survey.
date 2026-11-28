export const ALL_GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export type GradeNumber = (typeof ALL_GRADES)[number];

export interface AdmissionDossierItem {
  id: string;
  name: string;
  /** Số lượng mặc định khi bật 1 ô trên ma trận (vd: "01", "x") */
  defaultQty: string;
  /** Bản đồ số lượng theo từng khối lớp (1..12). Chuỗi rỗng hoặc undefined = không áp dụng cho lớp đó */
  gradeQuantities: Partial<Record<GradeNumber, string>>;
  /** Hồ sơ có điều kiện (vd: Cam kết tăng cường kiến thức - chỉ yêu cầu nếu có cam kết) */
  isConditional?: boolean;
  /** Nhãn điều kiện hiển thị cạnh dòng (vd: "Nếu có cam kết") */
  conditionLabel?: string;
  /** Ghi chú nội bộ / hiển thị thêm nếu cần */
  note?: string;
}

export interface AdmissionDossierGroup {
  id: string;
  name: string;
  shortLabel: string;
  subtitle: string;
  /** Các Đối tượng tuyển sinh (DOI_TUONG_TS) ánh xạ vào bảng hồ sơ này */
  targetTypes: string[];
  /** Nhóm mặc định khi học sinh không khớp đối tượng đặc biệt nào */
  isDefault?: boolean;
  items: AdmissionDossierItem[];
  /** Ghi chú chuyên biệt in trên trang A4 (vd: giải thích [*] Đúng tuyến / Trái tuyến cho Lớp 1) */
  footnotes: string[];
  /** Ghi chú hạn bổ sung hồ sơ hiển thị cuối trang A4 */
  submissionNote: string;
  /** Lưu ý quy trình nội bộ cho Tuyển sinh / Giáo vụ (không in trên tờ A4 gửi PHHS) */
  internalNotes?: string[];
}

export interface ResolvedDossierRow {
  id: string;
  name: string;
  qty: string;
  note?: string;
  isConditional?: boolean;
  conditionLabel?: string;
}

export interface ResolvedStudentDossier {
  group: AdmissionDossierGroup;
  grade: GradeNumber;
  items: ResolvedDossierRow[];
  /** Các dòng ghi chú footnotes phù hợp (tự lọc [*] nếu trong items có chứa "[*]") */
  footnotes: string[];
  submissionNote: string;
}

export const ADMISSION_DOSSIER_STORAGE_KEY = "skyline_admission_dossier_matrix_v2";

export const DEFAULT_SUBMISSION_NOTE =
  "* Quý phụ huynh vui lòng bổ sung hồ sơ thiếu (nếu có) trong vòng 10 ngày kể từ ngày nộp Hồ sơ.";

function buildGradeMap(grades: readonly GradeNumber[], value: string): Partial<Record<GradeNumber, string>> {
  const map: Partial<Record<GradeNumber, string>> = {};
  for (const g of grades) {
    map[g] = value;
  }
  return map;
}

export function createDefaultAdmissionDossierGroups(): AdmissionDossierGroup[] {
  return [
    {
      id: "trong_nuoc",
      name: "Học sinh trong nước (Nội tỉnh / Ngoại tỉnh)",
      shortLabel: "Trong nước (Nội/Ngoại tỉnh)",
      subtitle: "Áp dụng nhập học đầu năm học, học kì 1",
      targetTypes: ["Nội tỉnh", "Ngoại tỉnh"],
      isDefault: true,
      items: [
        {
          id: "tn_1",
          name: "Giấy khai sinh (có dấu đỏ)",
          defaultQty: "01",
          gradeQuantities: buildGradeMap(ALL_GRADES, "01"),
        },
        {
          id: "tn_2",
          name: "Ảnh thẻ 3x4",
          defaultQty: "01",
          gradeQuantities: buildGradeMap(ALL_GRADES, "01"),
        },
        {
          id: "tn_3",
          name: "Mẫu đơn xin vào lớp 1 [*]",
          defaultQty: "01",
          gradeQuantities: buildGradeMap([1], "01"),
        },
        {
          id: "tn_4",
          name: "Đơn xin chuyển trường (Hiệu trưởng trường cũ xác nhận)",
          defaultQty: "01",
          gradeQuantities: buildGradeMap([2, 3, 4, 5, 7, 8, 9, 11, 12], "01"),
        },
        {
          id: "tn_5",
          name: "Đơn xin xác nhận Hiệu trưởng TH,THCS, THPT Sky-Line",
          defaultQty: "01",
          gradeQuantities: buildGradeMap([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "01"),
        },
        {
          id: "tn_6",
          name: "Học bạ tiểu học (tất cả các quyển)",
          defaultQty: "01",
          gradeQuantities: buildGradeMap([2, 3, 4, 5, 6], "01"),
        },
        {
          id: "tn_7",
          name: "Học bạ Trung học cơ sở (tất cả các quyển)",
          defaultQty: "01",
          gradeQuantities: buildGradeMap([7, 8, 9, 10], "01"),
        },
        {
          id: "tn_8",
          name: "Học bạ Trung học phổ thông (tất cả các quyển)",
          defaultQty: "01",
          gradeQuantities: buildGradeMap([11, 12], "01"),
        },
        {
          id: "tn_9",
          name: "Giấy trúng tuyển vào lớp 10",
          defaultQty: "01",
          gradeQuantities: buildGradeMap([11, 12], "01"),
        },
        {
          id: "tn_10",
          name: "Cam kết tăng cường kiến thức trong quá trình học tập",
          defaultQty: "x",
          gradeQuantities: buildGradeMap(ALL_GRADES, "x"),
          isConditional: true,
          conditionLabel: "Nếu có cam kết",
        },
      ],
      footnotes: [
        "[*] Mẫu đơn xin vào lớp 1 có 2 loại: đúng tuyến và trái tuyến:",
        "Đúng tuyến: Áp dụng với học sinh có nơi cư trú thuộc địa bàn phường nơi cơ sở Trường đặt trụ sở. (CS1, 3: Hòa Cường, CS2: Hải Châu, CS4: Điện Bàn Đông; CS5: Thanh Khê).",
        "Trái tuyến: Áp dụng đối với học sinh có nơi cư trú ngoài Phường, ngoại tỉnh, học sinh người Việt sống ở nước ngoài đăng ký nhập học hoặc học sinh là người nước ngoài.",
      ],
      submissionNote: DEFAULT_SUBMISSION_NOTE,
    },
    {
      id: "nuoc_ngoai",
      name: "Học sinh Việt Nam về nước / Học sinh người nước ngoài",
      shortLabel: "VN về nước / Nước ngoài",
      subtitle: "Danh mục hồ sơ nhập học học sinh Việt Nam về nước / Học sinh người nước ngoài",
      targetTypes: ["Nước ngoài", "Việt Nam về nước", "Người nước ngoài"],
      items: [
        {
          id: "nn_1",
          name: "Giấy khai sinh (có dấu đỏ)",
          defaultQty: "01",
          gradeQuantities: buildGradeMap(ALL_GRADES, "01"),
        },
        {
          id: "nn_2",
          name: "Ảnh 3*4",
          defaultQty: "01",
          gradeQuantities: buildGradeMap(ALL_GRADES, "01"),
        },
        {
          id: "nn_3",
          name: "Đơn xin học của học sinh hoặc cha mẹ học sinh",
          defaultQty: "01",
          gradeQuantities: buildGradeMap(ALL_GRADES, "01"),
        },
        {
          id: "nn_4",
          name: "Học bạ hoặc giấy xác nhận của nhà trường nơi học sinh học tập về kết quả học tập các lớp học trước đó (bản dịch sang tiếng Việt có chứng thực)",
          defaultQty: "01",
          gradeQuantities: buildGradeMap([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "01"),
        },
        {
          id: "nn_5",
          name: "Cam kết tăng cường kiến thức trong quá trình học tập",
          defaultQty: "x",
          gradeQuantities: buildGradeMap(ALL_GRADES, "x"),
          isConditional: true,
          conditionLabel: "Nếu có cam kết",
        },
      ],
      footnotes: [],
      submissionNote: DEFAULT_SUBMISSION_NOTE,
    },
    {
      id: "homeschooling",
      name: "Học sinh Homeschooling",
      shortLabel: "Homeschooling",
      subtitle: "Danh mục hồ sơ nhập học học sinh Homeschooling",
      targetTypes: ["Home Schooling", "Homeschooling"],
      items: [
        {
          id: "hs_1",
          name: "Giấy khai sinh (có dấu đỏ)",
          defaultQty: "01",
          gradeQuantities: buildGradeMap(ALL_GRADES, "01"),
        },
        {
          id: "hs_2",
          name: "Ảnh 3*4",
          defaultQty: "01",
          gradeQuantities: buildGradeMap(ALL_GRADES, "01"),
        },
        {
          id: "hs_3",
          name: "Đơn xin học của học sinh hoặc cha mẹ học sinh",
          defaultQty: "01",
          gradeQuantities: buildGradeMap(ALL_GRADES, "01"),
        },
        {
          id: "hs_4",
          name: "Học bạ hoặc giấy xác nhận về kết quả học tập các lớp học trước đó (bản dịch sang tiếng Việt nếu hồ sơ tiếng nước ngoài) nếu có",
          defaultQty: "01",
          gradeQuantities: buildGradeMap([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], "01"),
        },
        {
          id: "hs_5",
          name: "PHHS phối hợp Nhà trường để học sinh hoàn thiện hồ sơ học tập theo quy định",
          defaultQty: "01",
          gradeQuantities: buildGradeMap([2, 3, 4, 5, 6], "01"),
        },
        {
          id: "hs_6",
          name: "Cam kết tăng cường kiến thức trong quá trình học tập",
          defaultQty: "x",
          gradeQuantities: buildGradeMap(ALL_GRADES, "x"),
          isConditional: true,
          conditionLabel: "Nếu có cam kết",
        },
      ],
      footnotes: [],
      submissionNote: DEFAULT_SUBMISSION_NOTE,
      internalNotes: [
        "Đối với tiểu học: sau khi có kết luận ĐẠT > Xuất thư chúc mừng (như bình thường) & Bản cam kết (các nội dung cam kết — nếu có).",
        "Trung học: Sau khi kết quả đạt > Tư vấn trao đổi thông tin với PHHS hoàn thiện hồ sơ trình Sở GD&ĐT cho ý kiến; nếu được phê duyệt thì chính thức xuất thư chúc mừng.",
        "Học sinh Giao lưu: Tư vấn trao đổi PHHS kí bản cam kết (không xuất thư chúc mừng).",
      ],
    },
  ];
}

export function parseGradeNumber(grade: unknown): GradeNumber | null {
  if (typeof grade === "number" && Number.isInteger(grade) && grade >= 1 && grade <= 12) {
    return grade as GradeNumber;
  }
  if (!grade) return null;
  const match = String(grade).match(/\d+/);
  if (!match) return null;
  const num = parseInt(match[0], 10);
  if (num >= 1 && num <= 12) return num as GradeNumber;
  return null;
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFC")
    .replace(/\s+/g, " ");
}

/** Đếm số lượng hồ sơ bắt buộc (không tính dòng có điều kiện) cho 1 khối lớp */
export function countRequiredDocsForGrade(group: AdmissionDossierGroup, grade: GradeNumber): number {
  return group.items.reduce((sum, item) => {
    if (item.isConditional) return sum;
    const raw = (item.gradeQuantities[grade] || "").trim();
    if (!raw) return sum;
    const parsed = parseInt(raw, 10);
    return sum + (Number.isFinite(parsed) && parsed > 0 ? parsed : 1);
  }, 0);
}

export function formatTwoDigits(n: number): string {
  return String(n).padStart(2, "0");
}

/** Kiểm tra học sinh có thuộc diện Cam kết tăng cường kiến thức hay không */
export function studentHasLearningCommitment(student: any): boolean {
  if (!student) return false;
  if (Array.isArray(student.committedSubjects) && student.committedSubjects.length > 0) {
    return true;
  }
  const fields = [
    student.admissionResult,
    student.devAssessmentResult,
    student.probationaryResult,
    student.directorNote,
  ];
  return fields.some((f) => {
    const text = String(f || "").toLowerCase();
    return text.includes("cam kết") || text.includes("cam_ket") || text.includes("môn cam kết:");
  });
}

/** Tìm nhóm hồ sơ phù hợp nhất theo Đối tượng tuyển sinh của học sinh */
export function matchDossierGroupForTarget(
  groups: AdmissionDossierGroup[],
  targetType?: string | null
): AdmissionDossierGroup {
  const safeGroups = groups.length > 0 ? groups : createDefaultAdmissionDossierGroups();
  const fallback = safeGroups.find((g) => g.isDefault) || safeGroups[0];

  if (!targetType || !String(targetType).trim()) {
    return fallback;
  }

  const studentTokens = String(targetType)
    .split(",")
    .map(normalizeToken)
    .filter(Boolean);

  // 1. Khớp chính xác hoặc bao hàm với targetTypes đã cấu hình trên từng nhóm
  for (const group of safeGroups) {
    const groupTokens = (group.targetTypes || []).map(normalizeToken).filter(Boolean);
    const matched = studentTokens.some((st) =>
      groupTokens.some((gt) => st === gt || st.includes(gt) || gt.includes(st))
    );
    if (matched) return group;
  }

  // 2. Fallback theo từ khóa phổ biến
  const joined = studentTokens.join(" ");
  if (joined.includes("homeschool") || joined.includes("home school")) {
    const hs = safeGroups.find((g) => g.id === "homeschooling");
    if (hs) return hs;
  }
  if (joined.includes("nước ngoài") || joined.includes("về nước") || joined.includes("foreign")) {
    const nn = safeGroups.find((g) => g.id === "nuoc_ngoai");
    if (nn) return nn;
  }

  return fallback;
}

/**
 * Tạo danh sách hồ sơ nhập học chuẩn cho 1 học sinh (hoặc 1 cặp Nhóm × Khối lớp)
 * dùng cho xem trước A4, in PDF Thư Chúc mừng, và gửi Email.
 */
export function resolveStudentDossier(
  groups: AdmissionDossierGroup[],
  options: {
    grade?: unknown;
    targetType?: string | null;
    groupId?: string | null;
    hasCommitment?: boolean;
  }
): ResolvedStudentDossier {
  const safeGroups = groups.length > 0 ? groups : createDefaultAdmissionDossierGroups();
  const grade = parseGradeNumber(options.grade) || 1;
  const group = options.groupId
    ? safeGroups.find((g) => g.id === options.groupId) || matchDossierGroupForTarget(safeGroups, options.targetType)
    : matchDossierGroupForTarget(safeGroups, options.targetType);

  const items: ResolvedDossierRow[] = [];
  for (const item of group.items) {
    const val = (item.gradeQuantities[grade] || "").trim();
    if (!val) continue;
    if (item.isConditional && !options.hasCommitment) continue;
    items.push({
      id: item.id,
      name: item.name,
      qty: item.isConditional ? (val.toLowerCase() === "x" ? "01" : val) : val,
      note: item.note,
      isConditional: item.isConditional,
      conditionLabel: item.conditionLabel,
    });
  }

  const hasAsteriskMarker = items.some((i) => i.name.includes("[*]"));
  const footnotes = (group.footnotes || []).filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    // Chỉ hiển thị giải thích [*] (đúng tuyến / trái tuyến lớp 1) khi danh sách hồ sơ của lớp có chứa [*]
    const isGrade1RoutingNote =
      trimmed.startsWith("[*]") ||
      trimmed.startsWith("Đúng tuyến:") ||
      trimmed.startsWith("Trái tuyến:");
    if (isGrade1RoutingNote && !hasAsteriskMarker) return false;
    return true;
  });

  return {
    group,
    grade,
    items,
    footnotes,
    submissionNote: group.submissionNote || DEFAULT_SUBMISSION_NOTE,
  };
}

export function loadAdmissionDossierGroups(): AdmissionDossierGroup[] {
  if (typeof window === "undefined") {
    return createDefaultAdmissionDossierGroups();
  }
  try {
    const raw = localStorage.getItem(ADMISSION_DOSSIER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore malformed localStorage
  }
  const defaults = createDefaultAdmissionDossierGroups();
  try {
    localStorage.setItem(ADMISSION_DOSSIER_STORAGE_KEY, JSON.stringify(defaults));
  } catch {
    // ignore quota error
  }
  return defaults;
}

export function saveAdmissionDossierGroups(groups: AdmissionDossierGroup[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADMISSION_DOSSIER_STORAGE_KEY, JSON.stringify(groups));
  } catch {
    // ignore quota error
  }
}
