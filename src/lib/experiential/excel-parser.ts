import * as XLSX from 'xlsx';
import { 
  SHEET_CONFIGS, 
  SheetCode, 
  ActivityCatalogMeta, 
  CatalogEducationLevel, 
  ProgramType,
  ActivityEvaluationConfig,
  CriterionItem
} from './catalog-types';
import { normalizeActivityName } from './name-normalizer';

export const EXCEL_COLUMNS = [
  { key: 'stt', header: 'STT', width: 8 },
  { key: 'grade', header: 'Khối', width: 14 },
  { key: 'activityName', header: 'Tên hoạt động ngoại khóa', width: 34 },
  { key: 'educationLevels', header: 'Bậc học (chọn 1 hay nhiều bậc học)', width: 26 },
  { key: 'programTypes', header: 'Hệ học (chọn 1 hay nhiều hệ)', width: 24 },
  { key: 'themeName', header: 'Chủ đề giáo dục', width: 28 },
  { key: 'integratedSubjects', header: 'Môn phối hợp / Tích hợp', width: 28 },
  { key: 'timeFrameAndSemester', header: 'Thời gian & HK', width: 20 },
  { key: 'expectedLocation', header: 'Địa điểm dự kiến', width: 26 },
  { key: 'cthsTeacherName', header: 'GV Phụ trách Kế hoạch', width: 24 },
  { key: 'deliverables', header: 'Sản phẩm/học tập dự án', width: 28 },
  { key: 'evaluationConfig', header: 'Cấu hình & Hình thức đánh giá', width: 32 },
  { key: 'notes', header: 'Ghi chú', width: 20 }
];

export function generateActivityCatalogTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new();

  SHEET_CONFIGS.forEach(config => {
    const defaultLevelText = config.level === 'MN' ? 'Mầm non' : config.level === 'TIEU_HOC' ? 'Tiểu học' : config.level === 'THCS' ? 'THCS' : 'THPT';
    const defaultProgramText = config.programType === 'HE_S' ? 'Hệ S' : 'Song ngữ';

    const sampleRows = [
      {
        'STT': 1,
        'Khối': config.defaultGrades.slice(0, 2).join(', '),
        'Tên hoạt động ngoại khóa': `Hành trình khám phá di sản - ${config.title}`,
        'Bậc học (chọn 1 hay nhiều bậc học)': defaultLevelText,
        'Hệ học (chọn 1 hay nhiều hệ)': defaultProgramText,
        'Chủ đề giáo dục': 'Giáo dục giá trị di sản văn hóa truyền thống',
        'Môn phối hợp / Tích hợp': 'Lịch sử & Địa lí, Mỹ thuật, Tiếng Việt',
        'Thời gian & HK': 'Tháng 10 (Học kỳ 1)',
        'Địa điểm dự kiến': 'Bảo tàng Mỹ thuật Đà Nẵng',
        'GV Phụ trách Kế hoạch': 'Tổ CTHS - BP HĐNGLL',
        'Sản phẩm/học tập dự án': 'Tranh Đông Hồ / Bài thu hoạch trải nghiệm',
        'Cấu hình & Hình thức đánh giá': 'Tiêu chí Rubric (Chủ động: 30%, Hợp tác: 40%, Sản phẩm: 30%)',
        'Ghi chú': 'Chuẩn bị sổ tay ghi chép và họa cụ'
      },
      {
        'STT': 2,
        'Khối': config.defaultGrades[0] || '1',
        'Tên hoạt động ngoại khóa': `Ngày hội STEM và trải nghiệm xanh - ${config.title}`,
        'Bậc học (chọn 1 hay nhiều bậc học)': defaultLevelText,
        'Hệ học (chọn 1 hay nhiều hệ)': `${defaultProgramText}, Quốc tế`,
        'Chủ đề giáo dục': 'Khám phá khoa học và bảo vệ môi trường sống',
        'Môn phối hợp / Tích hợp': 'Khoa học, Tiếng Anh, GDTC',
        'Thời gian & HK': 'Tháng 2 (Học kỳ 2)',
        'Địa điểm dự kiến': 'Hòa Phú Jungle / Khu sinh thái',
        'GV Phụ trách Kế hoạch': 'Tổ CTHS - BP HĐNGLL',
        'Sản phẩm/học tập dự án': 'Mô hình sinh thái / Poster bảo vệ môi trường',
        'Cấu hình & Hình thức đánh giá': 'Đánh giá theo Vai trò học sinh (Trưởng nhóm / Thành viên tích cực)',
        'Ghi chú': 'Trang phục thể thao năng động'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    ws['!cols'] = EXCEL_COLUMNS.map(c => ({ wch: c.width }));
    XLSX.utils.book_append_sheet(wb, ws, config.sheetName);
  });

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
}

export interface ParsedCatalogRow {
  sheetName: string;
  sheetCode: SheetCode;
  educationLevel: CatalogEducationLevel;
  educationLevels: CatalogEducationLevel[];
  programType: ProgramType;
  programTypes: ProgramType[];
  rowNumber: number;
  stt: number;
  grade: string;
  grades: string[];
  activityName: string;
  themeName: string;
  integratedSubjects: string;
  educationalContent: string;
  learningOutcomes: string;
  organizationFormat: string;
  timeFrame: string;
  semester: number;
  expectedLocation: string;
  partners?: string;
  primarySubjectName: string;
  coopSubjectNames: string;
  deliverables: string;
  cthsTeacherName: string;
  evaluationConfig?: ActivityEvaluationConfig;
  notes?: string;
  errors: string[];
}

export interface ParseCatalogResult {
  success: boolean;
  totalRows: number;
  validRows: number;
  errorRows: number;
  sheetSummaries: {
    sheetName: string;
    sheetCode: SheetCode;
    total: number;
    valid: number;
    errors: number;
  }[];
  data: ParsedCatalogRow[];
  globalErrors: string[];
}

// Hàm hỗ trợ parse mảng Bậc học từ chuỗi Excel (VD: "Tiểu học, THCS" -> ['TIEU_HOC', 'THCS'])
function parseEducationLevels(str: string, fallback: CatalogEducationLevel): { primary: CatalogEducationLevel; all: CatalogEducationLevel[] } {
  if (!str || !str.trim()) return { primary: fallback, all: [fallback] };
  const lower = str.toLowerCase();
  const list: CatalogEducationLevel[] = [];

  if (lower.includes('mầm non') || lower.includes('mam non') || lower.includes('mn')) list.push('MN');
  if (lower.includes('tiểu học') || lower.includes('tieu hoc') || lower.includes('th') && !lower.includes('thcs') && !lower.includes('thpt')) list.push('TIEU_HOC');
  if (lower.includes('thcs') || lower.includes('trung học cơ sở') || lower.includes('cấp 2')) list.push('THCS');
  if (lower.includes('thpt') || lower.includes('trung học phổ thông') || lower.includes('cấp 3')) list.push('THPT');

  const all = list.length > 0 ? Array.from(new Set(list)) : [fallback];
  return { primary: all[0] || fallback, all };
}

// Hàm hỗ trợ parse mảng Hệ học từ chuỗi Excel (VD: "Hệ S, Song ngữ" -> ['HE_S', 'SONG_NGU'])
function parseProgramTypes(str: string, fallback: ProgramType): { primary: ProgramType; all: ProgramType[] } {
  if (!str || !str.trim()) return { primary: fallback, all: [fallback] };
  const lower = str.toLowerCase();
  const list: ProgramType[] = [];

  if (lower.includes('hệ s') || lower.includes('chất lượng cao') || lower.includes('he_s') || lower.includes('s')) list.push('HE_S');
  if (lower.includes('song ngữ') || lower.includes('song ngu') || lower.includes('sn')) list.push('SONG_NGU');
  if (lower.includes('quốc tế') || lower.includes('quoc te') || lower.includes('qt')) list.push('QUOC_TE');

  const all = list.length > 0 ? Array.from(new Set(list)) : [fallback];
  return { primary: all[0] || fallback, all };
}

// Hàm hỗ trợ parse Thời gian & Học kỳ từ chuỗi (VD: "Tháng 10 (Học kỳ 1)" hoặc "Tháng 2, HK 2")
function parseTimeFrameAndSemester(timeStr: string, semStr: string): { timeFrame: string; semester: number } {
  let semester = 1;
  const combined = `${timeStr} ${semStr}`.toLowerCase();
  if (combined.includes('2') || combined.includes('hk2') || combined.includes('học kỳ 2')) {
    semester = 2;
  }

  let timeFrame = timeStr.trim();
  // Loại bỏ phần "(Học kỳ 1)", "(HK2)" nếu có trong timeFrame để chuỗi gọn gàng
  timeFrame = timeFrame.replace(/\s*\(?(học kỳ|hk)\s*[12]\)?/gi, '').trim();
  if (!timeFrame) timeFrame = 'Trong năm học';

  return { timeFrame, semester };
}

// Hàm hỗ trợ parse Hình thức & Tiêu chí đánh giá từ chuỗi Excel
function parseEvaluationConfigText(text: string): ActivityEvaluationConfig {
  if (!text || !text.trim()) {
    return {
      mode: 'CRITERIA',
      modeTitle: 'Đánh giá theo Tiêu chí Rubric',
      hasRoleAssessment: true,
      criteria: [
        { id: 'crit-1', name: 'Tính chủ động & Tinh thần tham gia', weight: 40, maxScore: 10 },
        { id: 'crit-2', name: 'Kỹ năng hợp tác & Làm việc nhóm', weight: 30, maxScore: 10 },
        { id: 'crit-3', name: 'Chất lượng sản phẩm / Bài thu hoạch', weight: 30, maxScore: 10 }
      ],
      formulaType: 'WEIGHTED',
      completionBenchmark: 'Điểm TB >= 5.0'
    };
  }

  const lower = text.toLowerCase();
  if (lower.includes('đạt') || lower.includes('chưa đạt') || lower.includes('pass')) {
    return {
      mode: 'PASS_FAIL',
      modeTitle: 'Đạt / Chưa đạt',
      hasRoleAssessment: lower.includes('vai trò'),
      completionBenchmark: 'Đạt tất cả nội dung hoạt động'
    };
  }

  if (lower.includes('vai trò') || lower.includes('role')) {
    return {
      mode: 'ROLE_BASED',
      modeTitle: 'Đánh giá theo Vai trò học sinh',
      hasRoleAssessment: true,
      rolesList: ['Trưởng nhóm', 'Phó nhóm / Thư ký', 'Thành viên tích cực', 'Thành viên tham gia'],
      completionBenchmark: 'Hoàn thành vai trò được giao'
    };
  }

  if (lower.includes('thang 10') || lower.includes('điểm số')) {
    return {
      mode: 'SCORE_10',
      modeTitle: 'Đánh giá theo Thang điểm 10',
      hasRoleAssessment: true,
      formulaType: 'AVERAGE',
      completionBenchmark: 'Điểm tổng kết >= 5.0'
    };
  }

  // Mặc định Rubric Criteria
  return {
    mode: 'CRITERIA',
    modeTitle: 'Đánh giá theo Tiêu chí Rubric',
    hasRoleAssessment: true,
    criteria: [
      { id: 'crit-1', name: 'Tính chủ động & Tinh thần tham gia', weight: 40, maxScore: 10 },
      { id: 'crit-2', name: 'Kỹ năng hợp tác & Làm việc nhóm', weight: 30, maxScore: 10 },
      { id: 'crit-3', name: 'Chất lượng sản phẩm / Dự án học tập', weight: 30, maxScore: 10 }
    ],
    formulaType: 'WEIGHTED',
    completionBenchmark: 'Điểm TB >= 5.0'
  };
}

export function parseActivityCatalogWorkbook(fileBuffer: Buffer | Uint8Array): ParseCatalogResult {
  const wb = XLSX.read(fileBuffer, { type: 'buffer' });
  const allParsedRows: ParsedCatalogRow[] = [];
  const sheetSummaries: ParseCatalogResult['sheetSummaries'] = [];
  const globalErrors: string[] = [];

  const matchedSheets = wb.SheetNames;
  if (matchedSheets.length === 0) {
    return {
      success: false,
      totalRows: 0,
      validRows: 0,
      errorRows: 0,
      sheetSummaries: [],
      data: [],
      globalErrors: ['File Excel không có bất kỳ trang tính (Sheet) nào']
    };
  }

  matchedSheets.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    // Tìm sheet config khớp nhất
    const normalizedSheetName = sheetName.trim().toUpperCase().replace(/\s+/g, '_');
    const cfg = SHEET_CONFIGS.find(c => 
      c.sheetName.toUpperCase() === sheetName.trim().toUpperCase() ||
      c.code.toUpperCase() === normalizedSheetName ||
      normalizedSheetName.includes(c.code.toUpperCase())
    ) || SHEET_CONFIGS[1];

    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(ws);
    if (!rawData || rawData.length === 0) return;

    let sheetValidCount = 0;
    let sheetErrorCount = 0;

    rawData.forEach((row, idx) => {
      const rowNum = idx + 2;

      const getVal = (possibleHeaders: string[]): string => {
        for (const h of possibleHeaders) {
          if (row[h] !== undefined && row[h] !== null) {
            return String(row[h]).trim();
          }
          const foundKey = Object.keys(row).find(k => k.trim().toLowerCase() === h.toLowerCase());
          if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
            return String(row[foundKey]).trim();
          }
        }
        return '';
      };

      const activityName = getVal(['Tên hoạt động ngoại khóa', 'Tên hoạt động', 'Hoạt động ngoại khóa', 'Tên HĐ']);
      const gradeStr = getVal(['Khối', 'Khối lớp', 'Lớp']);
      const eduLevelsStr = getVal(['Bậc học (chọn 1 hay nhiều bậc học)', 'Bậc học', 'Bậc']);
      const programTypesStr = getVal(['Hệ học (chọn 1 hay nhiều hệ)', 'Hệ học', 'Hệ đào tạo', 'Hệ']);
      const themeName = getVal(['Chủ đề giáo dục', 'Chủ đề']);
      const integratedSubjects = getVal(['Môn phối hợp / Tích hợp', 'Môn phối hợp', 'Các môn tích hợp', 'Tích hợp']);
      const timeAndSemStr = getVal(['Thời gian & HK', 'Thời gian', 'Thời điểm']);
      const semesterStr = getVal(['Học kỳ', 'HK']);
      const expectedLocation = getVal(['Địa điểm dự kiến', 'Địa điểm (dự kiến)', 'Địa điểm']);
      const cthsTeacherName = getVal(['GV Phụ trách Kế hoạch', 'GV phụ trách', 'Người phụ trách', 'GV Tổ CTHS']);
      const deliverables = getVal(['Sản phẩm/học tập dự án', 'Sản phẩm học tập/Dự án', 'Sản phẩm', 'Dự án']);
      const evalConfigStr = getVal(['Cấu hình & Hình thức đánh giá', 'Hình thức đánh giá', 'Cấu hình đánh giá', 'Tiêu chí đánh giá']);
      const educationalContent = getVal(['Nội dung giáo dục', 'Nội dung']);
      const learningOutcomes = getVal(['Yêu cầu cần đạt', 'Yêu cầu']);
      const organizationFormat = getVal(['Hình thức tổ chức', 'Hình thức']);
      const notes = getVal(['Ghi chú', 'Lưu ý']);
      const sttStr = getVal(['STT']);

      // Bỏ qua dòng trống hoàn toàn
      if (!activityName && !themeName && !gradeStr) {
        return;
      }

      const errors: string[] = [];
      if (!activityName) {
        errors.push('Thiếu Tên hoạt động ngoại khóa');
      }

      const { primary: parsedLevel, all: parsedLevels } = parseEducationLevels(eduLevelsStr, cfg.level);
      const { primary: parsedProg, all: parsedProgs } = parseProgramTypes(programTypesStr, cfg.programType);
      const { timeFrame, semester } = parseTimeFrameAndSemester(timeAndSemStr, semesterStr);

      let grades: string[] = [];
      if (gradeStr) {
        grades = gradeStr.split(/[,;\-\/]/).map(g => g.trim()).filter(Boolean);
      }
      if (grades.length === 0) {
        grades = cfg.defaultGrades;
      }

      const evalConfig = parseEvaluationConfigText(evalConfigStr);

      const parsedRow: ParsedCatalogRow = {
        sheetName,
        sheetCode: cfg.code,
        educationLevel: parsedLevel,
        educationLevels: parsedLevels,
        programType: parsedProg,
        programTypes: parsedProgs,
        rowNumber: rowNum,
        stt: parseInt(sttStr, 10) || (sheetValidCount + sheetErrorCount + 1),
        grade: gradeStr || grades.join(', '),
        grades,
        activityName: normalizeActivityName(activityName),
        themeName,
        integratedSubjects,
        educationalContent: educationalContent || themeName,
        learningOutcomes: learningOutcomes || 'Hình thành và phát triển phẩm chất, năng lực học sinh',
        organizationFormat: organizationFormat || 'Trải nghiệm',
        timeFrame,
        semester,
        expectedLocation,
        primarySubjectName: integratedSubjects.split(/[,;\/]/)[0]?.trim() || 'HĐTN',
        coopSubjectNames: integratedSubjects,
        deliverables,
        ctthsTeacherName: cthsTeacherName || 'Tổ CTHS',
        evaluationConfig: evalConfig,
        notes,
        errors
      };

      if (errors.length > 0) {
        sheetErrorCount++;
      } else {
        sheetValidCount++;
      }

      allParsedRows.push(parsedRow);
    });

    sheetSummaries.push({
      sheetName,
      sheetCode: cfg.code,
      total: sheetValidCount + sheetErrorCount,
      valid: sheetValidCount,
      errors: sheetErrorCount
    });
  });

  const totalValid = sheetSummaries.reduce((acc, s) => acc + s.valid, 0);
  const totalErrors = sheetSummaries.reduce((acc, s) => acc + s.errors, 0);

  return {
    success: totalValid > 0,
    totalRows: totalValid + totalErrors,
    validRows: totalValid,
    errorRows: totalErrors,
    sheetSummaries,
    data: allParsedRows,
    globalErrors
  };
}
