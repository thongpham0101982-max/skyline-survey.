export interface AcademicDivision {
  code: string;
  name: string;
  shortName: string;
  description: string;
  color: string;
  defaultBlockCM?: string;
}

export const ACADEMIC_DIVISIONS: AcademicDivision[] = [
  {
    code: "BP_TRUNG_HOC",
    name: "BP Trung học",
    shortName: "Trung học",
    description: "Các tổ chuyên môn THCS & THPT (Toán TH, Ngữ văn TH, KHTN/Lý-Hóa-Sinh, KHXH/Sử-Địa-GDCD, Nghệ thuật-Thể chất TH...)",
    color: "blue",
    defaultBlockCM: "Phổ thông"
  },
  {
    code: "BP_TIEU_HOC",
    name: "BP Tiểu học",
    shortName: "Tiểu học",
    description: "Các tổ chuyên môn Tiểu học (Tổ 1, Tổ 2, Tổ 3, Tổ 4, Tổ 5, Âm nhạc - Mỹ thuật TH, Thể dục TH...)",
    color: "emerald",
    defaultBlockCM: "Phổ thông"
  },
  {
    code: "BP_MAM_NON",
    name: "BP Mầm non",
    shortName: "Mầm non",
    description: "Các tổ Mầm non (Nhà trẻ, Mẫu giáo Bé - Nhỡ - Lớn, Năng khiếu MN...)",
    color: "amber",
    defaultBlockCM: "Mầm Non"
  },
  {
    code: "BP_STEM_ICT",
    name: "BP Stem-ICT",
    shortName: "Stem-ICT",
    description: "Các tổ Tin học, STEM, Robotics, Công nghệ, Chuyển đổi số...",
    color: "cyan",
    defaultBlockCM: "Phổ thông"
  },
  {
    code: "BP_TA_CTQT",
    name: "BP TA&CTQT",
    shortName: "TA & CTQT",
    description: "Các tổ Tiếng Anh Tiểu học, Tiếng Anh Trung học, Giáo viên Nước ngoài (ESL/Expats), Chương trình Quốc tế...",
    color: "violet",
    defaultBlockCM: "Phổ thông"
  },
  {
    code: "BP_HDNG_CTHS",
    name: "BP HĐNG-CTHS",
    shortName: "HĐNG - CTHS",
    description: "Các tổ Hoạt động trải nghiệm, Kỹ năng sống, Công tác học sinh, Cố vấn học tập, Tâm lý học đường, Đoàn Đội...",
    color: "rose",
    defaultBlockCM: "Hỗ trợ người học"
  }
];

export const DIVISION_MAP: Record<string, AcademicDivision> = ACADEMIC_DIVISIONS.reduce((acc, d) => {
  acc[d.code] = d;
  return acc;
}, {} as Record<string, AcademicDivision>);

export interface AcademicPosition {
  code: string;
  label: string;
  shortLabel: string;
  color: string;
  level: number;
}

export const ACADEMIC_POSITIONS: AcademicPosition[] = [
  { code: "GĐCS", label: "GĐCS (Giám đốc Cơ sở)", shortLabel: "GĐCS", color: "rose", level: 1 },
  { code: "TB_DHCM", label: "Trưởng Ban ĐHCM (Toàn quyền 6 BP)", shortLabel: "Trưởng Ban ĐHCM", color: "purple", level: 2 },
  { code: "Ban ĐHCM", label: "Ban Điều Hành Chuyên Môn", shortLabel: "Ban ĐHCM", color: "purple", level: 2 },
  { code: "TBP", label: "Trưởng Bộ Phận (TBP)", shortLabel: "TBP", color: "indigo", level: 3 },
  { code: "TTCM", label: "Tổ trưởng Chuyên môn (TTCM)", shortLabel: "TTCM", color: "amber", level: 4 },
  { code: "TPTCM", label: "Tổ phó Chuyên môn (TPTCM)", shortLabel: "TPTCM", color: "teal", level: 4 },
  { code: "GV", label: "Giáo viên (GV)", shortLabel: "GV", color: "slate", level: 5 },
  { code: "NV", label: "Nhân viên (NV)", shortLabel: "NV", color: "cyan", level: 5 },
];

export function getDivisionByCode(code?: string | null): AcademicDivision | undefined {
  if (!code) return undefined;
  return DIVISION_MAP[code];
}

export function normalizeDivisionCode(code?: string | null): string {
  if (!code) return "";
  const upper = code.toUpperCase().trim();
  if (upper === "BP_TRUNG_HOC" || upper.includes("TRUNG_HOC") || upper.includes("TRUNG HOC") || upper === "THCS" || upper === "THPT") return "BP_TRUNG_HOC";
  if (upper === "BP_TIEU_HOC" || upper.includes("TIEU_HOC") || upper.includes("TIEU HOC") || upper === "TIH") return "BP_TIEU_HOC";
  if (upper === "BP_MAM_NON" || upper.includes("MAM_NON") || upper.includes("MAM NON") || upper === "MN") return "BP_MAM_NON";
  if (upper === "BP_STEM_ICT" || upper.includes("STEM") || upper.includes("ICT") || upper.includes("TIN_HOC")) return "BP_STEM_ICT";
  if (upper === "BP_TA_CTQT" || upper.includes("TA") || upper.includes("TIENG_ANH") || upper.includes("CTQT") || upper.includes("ESL")) return "BP_TA_CTQT";
  if (upper === "BP_HDNG_CTHS" || upper.includes("HDNG") || upper.includes("CTHS") || upper.includes("TRAI_NGHIEM")) return "BP_HDNG_CTHS";
  return upper;
}
