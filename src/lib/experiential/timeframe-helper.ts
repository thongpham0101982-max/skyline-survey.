/**
 * Quy định chuẩn hóa Thời gian & Học kỳ theo quy định hệ thống GD Sky-Line:
 * 1. Định dạng chuẩn: "Tháng MM/YYYY" (Ví dụ: Tháng 10/2026, Tháng 04/2027)
 * 2. Mốc quy định Học kỳ tự động:
 *    - Học kỳ 1: Các tháng 8, 9, 10, 11, 12 và Tháng 1 (năm sau)
 *    - Học kỳ 2: Các tháng 2, 3, 4, 5, 6, 7
 */

export interface AcademicYearSpan {
  startYear: number;
  endYear: number;
  label: string;
}

export function parseAcademicYearSpan(academicYearNameOrStartYear?: string | number | null): AcademicYearSpan {
  let startYear = 2026;
  if (typeof academicYearNameOrStartYear === 'number' && academicYearNameOrStartYear >= 2000) {
    startYear = academicYearNameOrStartYear;
  } else if (typeof academicYearNameOrStartYear === 'string' && academicYearNameOrStartYear.trim()) {
    const match = academicYearNameOrStartYear.match(/\b(20\d{2})\b/);
    if (match) {
      startYear = parseInt(match[1], 10);
    }
  }
  const endYear = startYear + 1;
  return {
    startYear,
    endYear,
    label: `${startYear}-${endYear}`
  };
}

/**
 * Mốc quy định Học kỳ tự động từ Tháng:
 * - Tháng 8, 9, 10, 11, 12, 1 -> Học kỳ 1
 * - Tháng 2, 3, 4, 5, 6, 7 -> Học kỳ 2
 */
export function getSemesterFromMonth(month: number): 1 | 2 {
  if (month >= 2 && month <= 7) {
    return 2;
  }
  return 1;
}

/**
 * Xác định Năm theo Tháng và Năm học:
 * - Tháng 8..12 thuộc năm bắt đầu (startYear, ví dụ 2026)
 * - Tháng 1..7 thuộc năm kết thúc (endYear, ví dụ 2027)
 */
export function getYearForMonth(month: number, academicYearNameOrStartYear?: string | number | null): number {
  const span = parseAcademicYearSpan(academicYearNameOrStartYear);
  return (month >= 8 && month <= 12) ? span.startYear : span.endYear;
}

/**
 * Trích xuất tháng và năm từ chuỗi bất kỳ (VD: "Tháng 10", "10/2026", "Tháng 04/2027", "T10", "12")
 */
export function extractMonthAndYear(
  str?: string | null,
  academicYearNameOrStartYear?: string | number | null
): { month: number | null; year: number | null } {
  if (!str || typeof str !== 'string' || !str.trim()) {
    return { month: null, year: null };
  }

  const clean = str.trim();

  // 1. Trường hợp có cả tháng và năm: "Tháng 10/2026", "10/2026", "2026-10", "Tháng 04 - 2027"
  const monthYearMatch = clean.match(/(?:tháng\s*|t\s*)?(\d{1,2})[\/\-\s]+(\d{4})/i);
  if (monthYearMatch) {
    const m = parseInt(monthYearMatch[1], 10);
    const y = parseInt(monthYearMatch[2], 10);
    if (m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
      return { month: m, year: y };
    }
  }

  // 2. Trường hợp ngược lại: "2026/10" hoặc "2026-10"
  const yearMonthMatch = clean.match(/(\d{4})[\/\-](\d{1,2})/);
  if (yearMonthMatch) {
    const y = parseInt(yearMonthMatch[1], 10);
    const m = parseInt(yearMonthMatch[2], 10);
    if (m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
      return { month: m, year: y };
    }
  }

  // 3. Chỉ có tháng: "Tháng 10", "Tháng 4", "Tháng 2 (Học kỳ 2)", "T10", "Tháng 8 (Hè)"
  const monthOnlyMatch = clean.match(/(?:tháng\s*|t\s*)(\d{1,2})/i);
  if (monthOnlyMatch) {
    const m = parseInt(monthOnlyMatch[1], 10);
    if (m >= 1 && m <= 12) {
      const year = getYearForMonth(m, academicYearNameOrStartYear);
      return { month: m, year };
    }
  }

  // 4. Chuỗi chỉ chứa số tháng từ 1 đến 12
  const plainNum = parseInt(clean, 10);
  if (!isNaN(plainNum) && plainNum >= 1 && plainNum <= 12 && String(plainNum) === clean) {
    const year = getYearForMonth(plainNum, academicYearNameOrStartYear);
    return { month: plainNum, year };
  }

  return { month: null, year: null };
}

export interface StandardTimeFrameInfo {
  formattedTime: string;
  timeFrame: string; // Đồng bộ alias với formattedTime
  semester: 1 | 2;
  month: number | null;
  year: number | null;
  semesterLabel: string;
  isAutoDetermined: boolean;
}

/**
 * Định dạng chuẩn Tháng/Năm: "Tháng MM/YYYY" và tự động xác định Học kỳ
 * Hỗ trợ linh hoạt các kiểu gọi:
 * - formatTimeFrameAndSemester(timeStr, academicYear, semester)
 * - formatTimeFrameAndSemester(timeStr, semester, academicYear)
 * - formatTimeFrameAndSemester(timeStr, semester)
 * - formatTimeFrameAndSemester(timeStr)
 */
export function formatTimeFrameAndSemester(
  inputTime?: string | null,
  academicYearOrSemester?: string | number | null,
  explicitSemesterOrYear?: string | number | null
): StandardTimeFrameInfo {
  let resolvedAcademicYear: string | number | null = null;
  let resolvedExplicitSemester: number | null = null;

  // Xử lý tham số thứ 2
  if (typeof academicYearOrSemester === 'number') {
    if (academicYearOrSemester === 1 || academicYearOrSemester === 2) {
      resolvedExplicitSemester = academicYearOrSemester;
    } else if (academicYearOrSemester >= 2000) {
      resolvedAcademicYear = academicYearOrSemester;
    }
  } else if (typeof academicYearOrSemester === 'string' && academicYearOrSemester.trim()) {
    resolvedAcademicYear = academicYearOrSemester;
  }

  // Xử lý tham số thứ 3
  if (typeof explicitSemesterOrYear === 'number') {
    if (explicitSemesterOrYear === 1 || explicitSemesterOrYear === 2) {
      resolvedExplicitSemester = explicitSemesterOrYear;
    } else if (explicitSemesterOrYear >= 2000 && !resolvedAcademicYear) {
      resolvedAcademicYear = explicitSemesterOrYear;
    }
  } else if (typeof explicitSemesterOrYear === 'string' && explicitSemesterOrYear.trim() && !resolvedAcademicYear) {
    resolvedAcademicYear = explicitSemesterOrYear;
  }

  const { month, year } = extractMonthAndYear(inputTime, resolvedAcademicYear);

  if (month !== null && year !== null) {
    const formattedMonth = month < 10 ? `0${month}` : `${month}`;
    const formattedTime = `Tháng ${formattedMonth}/${year}`;
    const autoSem = getSemesterFromMonth(month);
    const finalSemester = (resolvedExplicitSemester === 1 || resolvedExplicitSemester === 2) ? resolvedExplicitSemester : autoSem;

    return {
      formattedTime,
      timeFrame: formattedTime,
      semester: finalSemester,
      month,
      year,
      semesterLabel: `Học kỳ ${finalSemester}`,
      isAutoDetermined: finalSemester === autoSem
    };
  }

  // Nếu không nhận diện được tháng cụ thể (ví dụ: "Trong năm học", "Linh hoạt")
  const rawClean = (inputTime || '').trim() || 'Trong năm học';
  let semester: 1 | 2 = 1;
  if (resolvedExplicitSemester === 2 || rawClean.toLowerCase().includes('hk2') || rawClean.toLowerCase().includes('học kỳ 2')) {
    semester = 2;
  }

  return {
    formattedTime: rawClean,
    timeFrame: rawClean,
    semester,
    month: null,
    year: null,
    semesterLabel: `Học kỳ ${semester}`,
    isAutoDetermined: false
  };
}

/**
 * Danh sách gợi ý các tháng trong năm học (từ Tháng 8 đến Tháng 7 năm sau)
 */
export function generateAcademicMonthOptions(academicYearNameOrStartYear?: string | number | null) {
  const span = parseAcademicYearSpan(academicYearNameOrStartYear);
  const sequence = [
    { month: 8, year: span.startYear, semester: 1 },
    { month: 9, year: span.startYear, semester: 1 },
    { month: 10, year: span.startYear, semester: 1 },
    { month: 11, year: span.startYear, semester: 1 },
    { month: 12, year: span.startYear, semester: 1 },
    { month: 1, year: span.endYear, semester: 1 },
    { month: 2, year: span.endYear, semester: 2 },
    { month: 3, year: span.endYear, semester: 2 },
    { month: 4, year: span.endYear, semester: 2 },
    { month: 5, year: span.endYear, semester: 2 },
    { month: 6, year: span.endYear, semester: 2 },
    { month: 7, year: span.endYear, semester: 2 },
  ];

  return sequence.map(item => {
    const formattedMonth = item.month < 10 ? `0${item.month}` : `${item.month}`;
    const value = `Tháng ${formattedMonth}/${item.year}`;
    const label = `${value} (Học kỳ ${item.semester})`;
    return {
      value,
      label,
      month: item.month,
      year: item.year,
      semester: item.semester as (1 | 2)
    };
  });
}
