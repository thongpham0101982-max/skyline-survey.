export interface ProfileSectionVisibility {
  advisoryGoals: boolean;          // CỐ VẤN HỌC TẬP & NHẬT KÝ THEO DÕI MỤC TIÊU
  moetPeriodicGrades: boolean;     // I. KẾT QUẢ HỌC TẬP VĂN HÓA (MOET) - 1. Điểm kiểm tra định kỳ (KSĐN, GK1, CK1, GK2, CK2)
  moetTermGrades: boolean;         // I. KẾT QUẢ HỌC TẬP VĂN HÓA (MOET) - 2. Bảng điểm Học tập tổng kết (CK1, CK2, Cả năm)
  specialSubjects: boolean;        // MÔN HỌC ĐẶC THÙ SKL (CXXH, FIN_EDU, GDGT, GDHN...)
  bilingualGrades: boolean;        // IV. KẾT QUẢ HỌC TẬP CHƯƠNG TRÌNH SONG NGỮ
  achievements: boolean;           // VI. THÀNH TÍCH & BẢNG VÀNG KHEN THƯỞNG
  experientialActivities: boolean; // HOẠT ĐỘNG TRẢI NGHIỆM
  homeroomTeacherComment: boolean; // VIII. NHẬN XÉT NỔI BẬT ĐỊNH KỲ TỪ GIÁO VIÊN CHỦ NHIỆM
  subjectCompetencyRadar: boolean; // BIỂU ĐỒ RADAR NĂNG LỰC MÔN HỌC
  careerOrientation?: boolean;     // Luôn false / đã bỏ
}

export const DEFAULT_PROFILE_SECTIONS: ProfileSectionVisibility = {
  advisoryGoals: true,
  moetPeriodicGrades: true,
  moetTermGrades: true,
  specialSubjects: true,
  bilingualGrades: true,
  achievements: true,
  experientialActivities: true,
  homeroomTeacherComment: true,
  subjectCompetencyRadar: true,
  careerOrientation: false,
};

export const SECTION_DEFINITIONS: Array<{
  key: keyof ProfileSectionVisibility;
  label: string;
  shortLabel: string;
  description: string;
  category: string;
}> = [
  {
    key: "advisoryGoals",
    label: "CỐ VẤN HỌC TẬP & NHẬT KÝ THEO DÕI MỤC TIÊU",
    shortLabel: "Cố vấn & Nhật ký mục tiêu",
    description: "Nhật ký cố vấn học tập, theo dõi cam kết và mục tiêu phấn đấu học kỳ",
    category: "Cố vấn & Mục tiêu",
  },
  {
    key: "moetPeriodicGrades",
    label: "I.1. ĐIỂM KIỂM TRA ĐỊNH KỲ (MOET)",
    shortLabel: "Điểm định kỳ (KSĐN, GK1, CK1...)",
    description: "Khảo sát đầu năm, Giữa kỳ 1, Cuối kỳ 1, Giữa kỳ 2, Cuối kỳ 2",
    category: "Học thuật MOET",
  },
  {
    key: "moetTermGrades",
    label: "I.2. BẢNG ĐIỂM HỌC TẬP TỔNG KẾT (MOET)",
    shortLabel: "Bảng điểm tổng kết (CK1, CK2, Cả năm)",
    description: "Điểm trung bình các môn văn hóa MOET, xếp loại rèn luyện & học tập",
    category: "Học thuật MOET",
  },
  {
    key: "specialSubjects",
    label: "MÔN HỌC ĐẶC THÙ SKL",
    shortLabel: "Môn học đặc thù SKL (CXXH, FIN_EDU...)",
    description: "Cảm xúc - Xã hội, GD Tài chính, GD Giới tính, GD Hướng nghiệp, Kỹ năng sống",
    category: "Chương trình Đặc thù SKL",
  },
  {
    key: "bilingualGrades",
    label: "IV. KẾT QUẢ HỌC TẬP CHƯƠNG TRÌNH SONG NGỮ",
    shortLabel: "Chương trình Song ngữ (ESL, CAM...)",
    description: "Bảng điểm các môn tiếng Anh quốc tế, Cambridge, Toán/Khoa học tiếng Anh",
    category: "Quốc tế & Song ngữ",
  },
  {
    key: "achievements",
    label: "VI. THÀNH TÍCH & BẢNG VÀNG KHEN THƯỞNG",
    shortLabel: "Thành tích & Khen thưởng",
    description: "Các giải thưởng Olympic, KHKT, Thể thao, Văn nghệ, Học thuật các cấp",
    category: "Khen thưởng & Năng khiếu",
  },
  {
    key: "experientialActivities",
    label: "HOẠT ĐỘNG TRẢI NGHIỆM",
    shortLabel: "Hoạt động trải nghiệm",
    description: "Các dự án trải nghiệm, di sản, sinh thái, hướng nghiệp, cộng đồng",
    category: "Trải nghiệm & Thực hành",
  },
  {
    key: "homeroomTeacherComment",
    label: "VIII. NHẬN XÉT NỔI BẬT ĐỊNH KỲ TỪ GIÁO VIÊN CHỦ NHIỆM",
    shortLabel: "Nhận xét nổi bật định kỳ từ GVCN",
    description: "Đánh giá quá trình rèn luyện, thái độ học tập và đóng góp từ GVCN",
    category: "Đánh giá & Nhận xét",
  },
  {
    key: "subjectCompetencyRadar",
    label: "BIỂU ĐỒ RADAR NĂNG LỰC MÔN HỌC",
    shortLabel: "Biểu đồ radar năng lực môn học",
    description: "Phụ lục đánh giá năng lực toàn diện 360° & Biểu đồ radar năng lực theo từng môn học",
    category: "Đánh giá Năng lực",
  },
];

export function normalizeGradeKey(rawInput: any): string {
  const s = String(rawInput || "").trim();
  if (!s || s.toUpperCase() === "ALL") return "ALL";
  const cleaned = s.replace(/^khối\s+/i, "").replace(/^lớp\s+/i, "").trim();
  if (cleaned.includes("tháng") || cleaned.includes("tuổi")) {
    return cleaned;
  }
  const m = cleaned.match(/^(1[0-2]|[1-9])(?:\b|[._/A-Za-z])/);
  if (m) return m[1];
  return cleaned;
}

export function normalizeEduSystemKey(rawInput: any): string {
  const s = String(rawInput || "").trim().toUpperCase();
  if (!s || s === "ALL") return "ALL";
  if (s.includes("SB") || s.includes("SONG BẰNG") || s.includes("SONG BANG") || s.includes("GAC") || s.includes("CAMBRIDGE")) return "SB";
  if (s.includes("HNG") || s.includes("QUỐC TẾ") || s.includes("QUOC TE") || s.includes("SONG NGỮ") || s.includes("SONG NGU")) return "HNG";
  if (s.includes("HNS") || s.includes("SKY-LINE") || s.includes("CHẤT LƯỢNG CAO") || s.includes("CLC")) return "HNS";
  if (s.includes("MNG")) return "MNG";
  if (s.includes("MNS")) return "MNS";
  return s;
}

export function resolveStudentSectionVisibility(
  student: any,
  configMap: Record<string, Record<string, boolean>> = {}
): ProfileSectionVisibility {
  const rawGrade =
    student?.class?.grade ||
    student?.grade ||
    student?.student?.class?.grade ||
    student?.className ||
    student?.class?.className ||
    "";
  const rawEdu =
    student?.class?.educationSystem ||
    student?.educationSystem ||
    student?.studyProgram ||
    student?.student?.class?.educationSystem ||
    student?.className ||
    student?.class?.className ||
    "";

  const grade = normalizeGradeKey(rawGrade);
  const edu = normalizeEduSystemKey(rawEdu);

  const checks = [
    `${grade}_${edu}`,
    `${grade}_ALL`,
    `ALL_${edu}`,
    "ALL_ALL",
    "DEFAULT",
  ];

  const result: ProfileSectionVisibility = { ...DEFAULT_PROFILE_SECTIONS };

  // Loop through keys and resolve with specificity
  Object.keys(DEFAULT_PROFILE_SECTIONS).forEach((k) => {
    if (k === "careerOrientation") {
      result.careerOrientation = false;
      return;
    }
    for (const code of checks) {
      if (configMap[code] && configMap[code][k] !== undefined) {
        (result as any)[k] = Boolean(configMap[code][k]);
        return;
      }
    }
  });

  return result;
}
