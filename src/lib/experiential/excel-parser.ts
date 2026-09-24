import * as XLSX from 'xlsx';
import { 
  SHEET_CONFIGS, 
  SheetCode, 
  ActivityCatalogMeta, 
  CatalogEducationLevel, 
  ProgramType 
} from './catalog-types';

export const EXCEL_COLUMNS = [
  { key: 'stt', header: 'STT', width: 8 },
  { key: 'grade', header: 'Khối lớp', width: 12 },
  { key: 'activityName', header: 'Tên hoạt động ngoại khóa', width: 32 },
  { key: 'themeName', header: 'Chủ đề giáo dục', width: 28 },
  { key: 'integratedSubjects', header: 'Các môn tích hợp', width: 26 },
  { key: 'educationalContent', header: 'Nội dung giáo dục', width: 38 },
  { key: 'learningOutcomes', header: 'Yêu cầu cần đạt', width: 38 },
  { key: 'organizationFormat', header: 'Hình thức tổ chức', width: 18 },
  { key: 'timeFrame', header: 'Thời gian', width: 16 },
  { key: 'semester', header: 'Học kỳ', width: 10 },
  { key: 'expectedLocation', header: 'Địa điểm (dự kiến)', width: 25 },
  { key: 'partners', header: 'Đối tác/Đơn vị phối hợp', width: 22 },
  { key: 'primarySubjectName', header: 'Môn chủ trì', width: 18 },
  { key: 'coopSubjectNames', header: 'Môn phối hợp', width: 20 },
  { key: 'deliverables', header: 'Sản phẩm học tập/Dự án', width: 24 },
  { key: 'notes', header: 'Ghi chú', width: 20 }
];

export function generateActivityCatalogTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new();

  SHEET_CONFIGS.forEach(config => {
    const sampleRows = [
      {
        'STT': 1,
        'Khối lớp': config.defaultGrades[0] || '1',
        'Tên hoạt động ngoại khóa': `Hành trình Khám phá Di sản - ${config.title}`,
        'Chủ đề giáo dục': 'Giáo dục giá trị di sản văn hóa',
        'Các môn tích hợp': 'Lịch sử và Địa lí địa phương, Mỹ thuật, Tiếng Việt',
        'Nội dung giáo dục': '- Khám phá Văn hóa - Lịch sử địa phương/dân tộc\n- Trải nghiệm Nghệ thuật & Thủ công truyền thống\n- Giáo dục ý thức bảo tồn và phát triển',
        'Yêu cầu cần đạt': '- Nhận diện và tái hiện được một số nét đặc trưng cơ bản của di sản\n- Hiểu được giá trị của di sản văn hóa đối với đời sống',
        'Hình thức tổ chức': 'Trải nghiệm',
        'Thời gian': 'Tháng 10',
        'Học kỳ': 1,
        'Địa điểm (dự kiến)': 'Bảo tàng Mỹ thuật Đà Nẵng',
        'Đối tác/Đơn vị phối hợp': 'Bảo tàng Mỹ thuật ĐN',
        'Môn chủ trì': 'Lịch sử & Địa lí',
        'Môn phối hợp': 'Mỹ thuật, Tiếng Việt',
        'Sản phẩm học tập/Dự án': 'Tranh Đông Hồ / Bài thu hoạch',
        'Ghi chú': 'Chuẩn bị sổ tay ghi chép và họa cụ'
      },
      {
        'STT': 2,
        'Khối lớp': config.defaultGrades[0] || '1',
        'Tên hoạt động ngoại khóa': `Hành trình Xanh - Trải nghiệm quanh em - ${config.title}`,
        'Chủ đề giáo dục': 'Trải nghiệm và Bảo vệ thiên nhiên quanh em',
        'Các môn tích hợp': 'Tiếng Anh, Giáo dục thể chất, TNXH, Khoa học',
        'Nội dung giáo dục': '- Khởi động vận động kết hợp Tiếng Anh\n- Thử thách "Truy tìm kho báu xanh"\n- Trò chơi phối hợp đồng đội',
        'Yêu cầu cần đạt': '- Tự giác tham gia hoạt động ngoài trời\n- Rèn luyện kỹ năng sống, kỹ năng giao tiếp, hợp tác và tinh thần tự lập',
        'Hình thức tổ chức': 'Trải nghiệm',
        'Thời gian': 'Tháng 2',
        'Học kỳ': 2,
        'Địa điểm (dự kiến)': 'Hòa Phú Jungle',
        'Đối tác/Đơn vị phối hợp': 'Khu du lịch sinh thái',
        'Môn chủ trì': 'Khoa học / TNXH',
        'Môn phối hợp': 'Tiếng Anh, GDTC',
        'Sản phẩm học tập/Dự án': 'Bộ sưu tập lá cây / Poster bảo vệ môi trường',
        'Ghi chú': 'Trang phục thể thao năng động'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);

    // Set column widths
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
  programType: ProgramType;
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
  partners: string;
  primarySubjectName: string;
  coopSubjectNames: string;
  deliverables: string;
  notes: string;
  errors: string[];
}

export interface ParseCatalogResult {
  success: boolean;
  totalSheetsFound: number;
  totalRows: number;
  validRows: ParsedCatalogRow[];
  invalidRows: ParsedCatalogRow[];
  sheetSummaries: {
    sheetName: string;
    sheetCode: SheetCode;
    count: number;
    errorsCount: number;
  }[];
}

export function parseActivityCatalogWorkbook(buffer: ArrayBuffer | Buffer, academicYearId?: string): ParseCatalogResult {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetNames = wb.SheetNames;

  const validRows: ParsedCatalogRow[] = [];
  const invalidRows: ParsedCatalogRow[] = [];
  const sheetSummaries: { sheetName: string; sheetCode: SheetCode; count: number; errorsCount: number }[] = [];

  SHEET_CONFIGS.forEach(cfg => {
    // Fuzzy match sheet name (e.g., 'TH S', 'TH_S', 'TH-S', 'ths')
    const matchedSheetName = sheetNames.find(sn => {
      const cleanSn = sn.trim().toUpperCase().replace(/[\s\-_]/g, '');
      const cleanCfg = cfg.sheetName.trim().toUpperCase().replace(/[\s\-_]/g, '');
      return cleanSn === cleanCfg || cleanSn.includes(cleanCfg);
    });

    if (!matchedSheetName) {
      return;
    }

    const ws = wb.Sheets[matchedSheetName];
    if (!ws) return;

    const rawData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    let sheetValidCount = 0;
    let sheetErrorCount = 0;

    rawData.forEach((row, idx) => {
      const rowNum = idx + 2; // header is line 1

      // Find value regardless of slight header naming variations
      const getVal = (possibleHeaders: string[]): string => {
        for (const h of possibleHeaders) {
          if (row[h] !== undefined && row[h] !== null) {
            return String(row[h]).trim();
          }
          // Case-insensitive match
          const foundKey = Object.keys(row).find(k => k.trim().toLowerCase() === h.toLowerCase());
          if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
            return String(row[foundKey]).trim();
          }
        }
        return '';
      };

      const activityName = getVal(['Tên hoạt động ngoại khóa', 'Tên hoạt động', 'Hoạt động ngoại khóa', 'Tên HĐ']);
      const themeName = getVal(['Chủ đề giáo dục', 'Chủ đề']);
      const gradeStr = getVal(['Khối lớp', 'Khối', 'Lớp']);
      const integratedSubjects = getVal(['Các môn tích hợp', 'Môn tích hợp', 'Tích hợp']);
      const educationalContent = getVal(['Nội dung giáo dục', 'Nội dung']);
      const learningOutcomes = getVal(['Yêu cầu cần đạt', 'Yêu cầu']);
      const organizationFormat = getVal(['Hình thức tổ chức', 'Hình thức']);
      const timeFrame = getVal(['Thời gian', 'Thời điểm']);
      const semesterStr = getVal(['Học kỳ', 'HK']);
      const expectedLocation = getVal(['Địa điểm (dự kiến)', 'Địa điểm']);
      const partners = getVal(['Đối tác/Đơn vị phối hợp', 'Đối tác', 'Đơn vị phối hợp']);
      const primarySubjectName = getVal(['Môn chủ trì', 'Môn phụ trách']);
      const coopSubjectNames = getVal(['Môn phối hợp', 'TCM phối hợp']);
      const deliverables = getVal(['Sản phẩm học tập/Dự án', 'Sản phẩm', 'Dự án']);
      const notes = getVal(['Ghi chú', 'Lưu ý']);
      const sttStr = getVal(['STT']);

      // Skip completely blank rows
      if (!activityName && !themeName && !gradeStr && !educationalContent) {
        return;
      }

      const errors: string[] = [];
      if (!activityName) {
        errors.push('Thiếu Tên hoạt động ngoại khóa');
      }

      let parsedSemester = 1;
      if (semesterStr.includes('2')) parsedSemester = 2;

      let grades: string[] = [];
      if (gradeStr) {
        grades = gradeStr.split(/[,;\-\/]/).map(g => g.trim()).filter(Boolean);
      }
      if (grades.length === 0) {
        grades = cfg.defaultGrades;
      }

      const parsedRow: ParsedCatalogRow = {
        sheetName: matchedSheetName,
        sheetCode: cfg.code,
        educationLevel: cfg.level,
        programType: cfg.programType,
        rowNumber: rowNum,
        stt: parseInt(sttStr, 10) || (sheetValidCount + sheetErrorCount + 1),
        grade: gradeStr || grades.join(', '),
        grades,
        activityName,
        themeName,
        integratedSubjects,
        educationalContent,
        learningOutcomes,
        organizationFormat: organizationFormat || 'Trải nghiệm',
        timeFrame,
        semester: parsedSemester,
        expectedLocation,
        partners,
        primarySubjectName,
        coopSubjectNames,
        deliverables,
        notes,
        errors
      };

      if (errors.length > 0) {
        sheetErrorCount++;
        invalidRows.push(parsedRow);
      } else {
        sheetValidCount++;
        validRows.push(parsedRow);
      }
    });

    sheetSummaries.push({
      sheetName: matchedSheetName,
      sheetCode: cfg.code,
      count: sheetValidCount + sheetErrorCount,
      errorsCount: sheetErrorCount
    });
  });

  return {
    success: invalidRows.length === 0 && validRows.length > 0,
    totalSheetsFound: sheetSummaries.length,
    totalRows: validRows.length + invalidRows.length,
    validRows,
    invalidRows,
    sheetSummaries
  };
}
