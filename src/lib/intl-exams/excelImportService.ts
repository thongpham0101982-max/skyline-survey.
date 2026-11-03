import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';
import {
  DEFAULT_INTL_EXAM_RULE_SETS,
  ExamFamilyCode,
  ExamTypeCode,
  classifyCheckpoint50Score,
  evaluateCamMainSuiteResult,
  evaluateIeltsResult,
  evaluateYleResult,
  inferEduSystemFromClassName,
  inferGradeFromClassName,
  normalizeCamGradeString,
  normalizeCheckpointBandString,
  normalizePearsonBand,
  normalizeVietnameseText,
  parseCamSkillBreakdownCode,
  parseRawIeltsBand,
  parseYleResultCode,
  recoverClassFromExcelCell,
  stripVietnameseAccents,
} from './ruleEngine';

export interface ParsedSkillItem {
  componentType: 'SKILL' | 'SUBJECT';
  componentCode: string;
  componentName: string;
  scaleUnit: string;
  numericScore: number | null;
  maxNumericScore: number | null;
  officialBandCode: string | null;
  officialBandLabel: string | null;
  isHighOutstanding: boolean | null;
  isLowPerformance: boolean | null;
  sortOrder: number;
}

export interface NormalizedImportRow {
  sheetName: string;
  rowNumber: number;
  examFamily: ExamFamilyCode;
  examType: ExamTypeCode;
  sessionCode: string;
  sessionName: string;
  academicYearText: string;
  examDate: string | null;
  examMonth: number | null;
  examYear: number | null;
  rawStudentCode: string;
  studentName: string;
  studentDob: string | null;
  campusCode: string;
  grade: string;
  className: string;
  eduSystem: string;
  sittingStatus: 'COMPLETED' | 'ABSENT';
  dataCompleteness: 'FULL_COMPONENTS' | 'HISTORICAL_OVERALL_ONLY' | 'PARTIAL_SUBJECTS';
  // Family specific evaluated fields
  yleTotalShields?: number | null;
  yleResultCode?: string | null;
  yleSkylineGroup?: string | null;
  yleMeetsInternalTarget?: boolean | null;
  camOverallScale?: number | null;
  camCalculatedAverage?: number | null;
  camOfficialGrade?: string | null;
  camOfficialStatement?: string | null;
  camCefrLevel?: string | null;
  camAwardedCertificate?: boolean | null;
  camMeetsTargetLevel?: boolean | null;
  camExceedsLevel?: boolean | null;
  ieltsOverallBand?: number | null;
  ieltsCalculatedOverall?: number | null;
  ieltsBandGroup?: string | null;
  ieltsCefrLevel?: string | null;
  ieltsStrongestSkill?: string | null;
  ieltsWeakestSkill?: string | null;
  skills: ParsedSkillItem[];
  validationStatus: 'VALID' | 'WARNING' | 'ERROR' | 'SKIPPED_DRAFT';
  validationMessages: string[];
  rawPayload: Record<string, any>;
}

export interface StudentLookupDirectory {
  byId: Map<string, any>;
  byCode: Map<string, any>;
  byNormalizedName: Map<string, any[]>;
  campusesByCode: Map<string, string>;
}

export function normalizeCampusCode(raw: any): string {
  const s = normalizeVietnameseText(raw).toUpperCase().replace(/\s+/g, '');
  if (!s) return '';
  if (/^[1-5]$/.test(s)) return `CS${s}`;
  if (/^CS[1-5]$/.test(s)) return s;
  const m = s.match(/CS\s*([1-5])/i);
  if (m) return `CS${m[1]}`;
  return s;
}

export function normalizeClassForCompare(raw: string | null | undefined): string {
  if (!raw) return '';
  return String(raw)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[._-]/g, '/');
}

export async function ensureDefaultRuleSetsSeeded(): Promise<Map<ExamTypeCode, string>> {
  const map = new Map<ExamTypeCode, string>();
  for (const def of DEFAULT_INTL_EXAM_RULE_SETS) {
    const existing = await prisma.intlExamRuleSet.findUnique({
      where: { versionCode: def.versionCode },
    });
    if (existing) {
      map.set(def.examType, existing.id);
    } else {
      const created = await prisma.intlExamRuleSet.create({
        data: {
          examFamily: def.examFamily,
          examType: def.examType,
          versionCode: def.versionCode,
          versionName: def.versionName,
          organization: def.organization,
          effectiveFrom: new Date(def.effectiveFrom),
          scaleUnit: def.scaleUnit,
          minOverall: def.minOverall,
          maxOverall: def.maxOverall,
          stepSize: def.stepSize,
          gradeBoundariesJson: JSON.stringify(def.gradeBoundaries),
          skylineTargetsJson: JSON.stringify(def.skylineTargets),
          skillsConfigJson: JSON.stringify(def.skillsConfig),
          allowPartialImport: def.allowPartialImport,
          isDefault: true,
          status: 'ACTIVE',
        },
      });
      map.set(def.examType, created.id);
    }
  }
  return map;
}

export async function buildStudentLookupDirectory(): Promise<StudentLookupDirectory> {
  const [students, mappings, campuses] = await Promise.all([
    prisma.student.findMany({
      include: {
        class: {
          include: {
            campus: true,
          },
        },
      },
    }),
    prisma.studentCodeMapping.findMany(),
    prisma.campus.findMany(),
  ]);

  const byCode = new Map<string, any>();
  const byNormalizedName = new Map<string, any[]>();
  const campusesByCode = new Map<string, string>();

  for (const c of campuses) {
    if (c.campusCode) {
      campusesByCode.set(c.campusCode.toUpperCase(), c.id);
    }
  }

  const byId = new Map<string, any>();
  // Sort students so ACTIVE / latest academicYear comes first when deduplicating by studentCode
  const sortedStudents = [...students].sort((a, b) => {
    if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
    if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
    return String(b.academicYearId).localeCompare(String(a.academicYearId));
  });

  const seenStudentCodesByName = new Map<string, Set<string>>();

  for (const st of sortedStudents) {
    byId.set(st.id, st);
    if (st.studentCode) {
      const codeKey = st.studentCode.trim().toUpperCase();
      if (!byCode.has(codeKey)) {
        byCode.set(codeKey, st);
      }
    }
    const normName = stripVietnameseAccents(st.studentName);
    if (normName) {
      const codeKey = (st.studentCode || st.id).trim().toUpperCase();
      const seenSet = seenStudentCodesByName.get(normName) || new Set<string>();
      if (!seenSet.has(codeKey)) {
        seenSet.add(codeKey);
        seenStudentCodesByName.set(normName, seenSet);
        const list = byNormalizedName.get(normName) || [];
        list.push(st);
        byNormalizedName.set(normName, list);
      }
    }
  }

  for (const m of mappings) {
    const st = byId.get(m.studentId);
    if (st) {
      if ((m as any).oldCode) byCode.set(String((m as any).oldCode).trim().toUpperCase(), st);
      if ((m as any).newCode) byCode.set(String((m as any).newCode).trim().toUpperCase(), st);
      if ((m as any).oldStudentCode) byCode.set(String((m as any).oldStudentCode).trim().toUpperCase(), st);
      if ((m as any).newStudentCode) byCode.set(String((m as any).newStudentCode).trim().toUpperCase(), st);
    }
  }

  return { byId, byCode, byNormalizedName, campusesByCode };
}

function parseDobString(rawDob: any): Date | null {
  if (!rawDob) return null;
  if (rawDob instanceof Date && !isNaN(rawDob.getTime())) return rawDob;
  if (typeof rawDob === 'number' && rawDob > 20000 && rawDob < 60000) {
    return new Date(Math.round((rawDob - 25569) * 86400 * 1000));
  }
  const s = String(rawDob).trim();
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const d = parseInt(dmy[1], 10);
    const m = parseInt(dmy[2], 10);
    const y = parseInt(dmy[3], 10);
    return new Date(Date.UTC(y, m - 1, d));
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function matchStudentRecord(
  row: NormalizedImportRow,
  dir: StudentLookupDirectory
): {
  matchedStudentId: string | null;
  matchedStudentCode: string | null;
  matchedStudentName: string | null;
  matchConfidence: 'EXACT_CODE' | 'EXACT_NAME_DOB_CLASS' | 'FUZZY_CANDIDATE' | 'HISTORICAL_UNLINKED';
  candidateMatches: Array<{ id: string; studentCode: string; fullName: string; className: string; campusCode: string }>;
} {
  // 1. Tier 1: Exact Student Code
  if (row.rawStudentCode) {
    const codeKey = row.rawStudentCode.trim().toUpperCase();
    const st = dir.byCode.get(codeKey);
    if (st) {
      return {
        matchedStudentId: st.id,
        matchedStudentCode: st.studentCode,
        matchedStudentName: st.studentName,
        matchConfidence: 'EXACT_CODE',
        candidateMatches: [],
      };
    }
  }

  // 2. Tier 2 & 3: Normalized Name Lookup
  const normName = stripVietnameseAccents(row.studentName);
  const candidates = dir.byNormalizedName.get(normName) || [];

  if (candidates.length === 0) {
    return {
      matchedStudentId: null,
      matchedStudentCode: null,
      matchedStudentName: null,
      matchConfidence: 'HISTORICAL_UNLINKED',
      candidateMatches: [],
    };
  }

  const rowClassNorm = normalizeClassForCompare(row.className);
  const rowCampusNorm = row.campusCode.trim().toUpperCase();

  // Check if any candidate matches Class + Campus (especially for 2026-2027 records)
  for (const st of candidates) {
    const stClass = normalizeClassForCompare(st.class?.className || '');
    const stCampus = (st.class?.campus?.campusCode || '').trim().toUpperCase();

    if (rowClassNorm && stClass === rowClassNorm && (!rowCampusNorm || !stCampus || stCampus === rowCampusNorm)) {
      return {
        matchedStudentId: st.id,
        matchedStudentCode: st.studentCode,
        matchedStudentName: st.studentName,
        matchConfidence: 'EXACT_NAME_DOB_CLASS',
        candidateMatches: [],
      };
    }
  }

  // Check if DOB matches
  if (row.studentDob) {
    const rowDate = new Date(row.studentDob);
    if (!isNaN(rowDate.getTime())) {
      for (const st of candidates) {
        if (st.dateOfBirth) {
          const stDate = new Date(st.dateOfBirth);
          if (
            stDate.getUTCFullYear() === rowDate.getUTCFullYear() &&
            stDate.getUTCMonth() === rowDate.getUTCMonth() &&
            stDate.getUTCDate() === rowDate.getUTCDate()
          ) {
            return {
              matchedStudentId: st.id,
              matchedStudentCode: st.studentCode,
              matchedStudentName: st.studentName,
              matchConfidence: 'EXACT_NAME_DOB_CLASS',
              candidateMatches: [],
            };
          }
        }
      }
    }
  }

  // Check historical grade progression: e.g., student was in Grade G in academicYear Y, so in 2026-2027 they should be in Grade G + (2026 - Y)
  const yearStartMatch = row.academicYearText.match(/^(\d{4})/);
  const examStartYear = yearStartMatch ? parseInt(yearStartMatch[1], 10) : null;
  const rowGradeNum = row.grade ? parseInt(row.grade, 10) : null;

  if (examStartYear && rowGradeNum && !isNaN(rowGradeNum)) {
    const expected2026Grade = rowGradeNum + (2026 - examStartYear);
    if (expected2026Grade > 12) {
      return {
        matchedStudentId: null,
        matchedStudentCode: null,
        matchedStudentName: null,
        matchConfidence: 'HISTORICAL_UNLINKED',
        candidateMatches: [],
      };
    }

    const gradeMatches = candidates.filter((st) => {
      const stGrade = inferGradeFromClassName(st.class?.className, st.class?.grade);
      const stGradeNum = stGrade ? parseInt(stGrade, 10) : null;
      return stGradeNum !== null && Math.abs(stGradeNum - expected2026Grade) <= 1;
    });

    if (gradeMatches.length === 1) {
      const st = gradeMatches[0];
      return {
        matchedStudentId: st.id,
        matchedStudentCode: st.studentCode,
        matchedStudentName: st.studentName,
        matchConfidence: 'EXACT_NAME_DOB_CLASS',
        candidateMatches: [],
      };
    }

    // Filter gradeMatches by campus if multiple students in the same grade have the same name
    if (gradeMatches.length > 1 && rowCampusNorm) {
      const campusGradeMatches = gradeMatches.filter(
        (st) => (st.class?.campus?.campusCode || '').trim().toUpperCase() === rowCampusNorm
      );
      if (campusGradeMatches.length === 1) {
        const st = campusGradeMatches[0];
        return {
          matchedStudentId: st.id,
          matchedStudentCode: st.studentCode,
          matchedStudentName: st.studentName,
          matchConfidence: 'EXACT_NAME_DOB_CLASS',
          candidateMatches: [],
        };
      }
    }
  }

  // If the student is not in a graduated cohort and there is an exact unique name match in the school (or in the same campus)
  if (candidates.length === 1) {
    const st = candidates[0];
    return {
      matchedStudentId: st.id,
      matchedStudentCode: st.studentCode,
      matchedStudentName: st.studentName,
      matchConfidence: 'EXACT_NAME_DOB_CLASS',
      candidateMatches: [],
    };
  }

  if (rowCampusNorm) {
    const campusMatches = candidates.filter(
      (st) => (st.class?.campus?.campusCode || '').trim().toUpperCase() === rowCampusNorm
    );
    if (campusMatches.length === 1) {
      const st = campusMatches[0];
      return {
        matchedStudentId: st.id,
        matchedStudentCode: st.studentCode,
        matchedStudentName: st.studentName,
        matchConfidence: 'EXACT_NAME_DOB_CLASS',
        candidateMatches: [],
      };
    }
  }

  return {
    matchedStudentId: null,
    matchedStudentCode: null,
    matchedStudentName: null,
    matchConfidence: 'FUZZY_CANDIDATE',
    candidateMatches: candidates.slice(0, 5).map((st) => ({
      id: st.id,
      studentCode: st.studentCode,
      fullName: st.studentName,
      className: st.class?.className || '',
      campusCode: st.class?.campus?.campusCode || '',
    })),
  };
}

function normalizeAcademicYearText(raw: any): string {
  const s = normalizeVietnameseText(raw).replace(/\s+/g, '');
  if (!s) return '2024-2025';
  const m = s.match(/(\d{4})[-/](\d{4})/);
  if (m) return `${m[1]}-${m[2]}`;
  return s;
}

export function parseWorkbookToNormalizedRows(buffer: Buffer): {
  sheetsSummary: Array<{ sheetName: string; detectedType: string; totalRows: number; status: string }>;
  rows: NormalizedImportRow[];
} {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const rows: NormalizedImportRow[] = [];
  const sheetsSummary: Array<{ sheetName: string; detectedType: string; totalRows: number; status: string }> = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const matrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const trimmedSheet = sheetName.trim().toUpperCase();

    if (trimmedSheet.includes('TRANG_TÍNH1') || trimmedSheet.includes('TRANG TINH')) {
      let draftCount = 0;
      for (let r = 1; r < matrix.length; r++) {
        const line = matrix[r];
        if (!line || line.every((c) => !String(c).trim())) continue;
        draftCount++;
        rows.push({
          sheetName,
          rowNumber: r + 1,
          examFamily: 'CAMBRIDGE_YLE',
          examType: 'STARTERS',
          sessionCode: 'DRAFT-SKIPPED',
          sessionName: 'Sheet nháp không import',
          academicYearText: '2024-2025',
          examDate: null,
          examMonth: null,
          examYear: null,
          rawStudentCode: '',
          studentName: normalizeVietnameseText(line[1]),
          studentDob: null,
          campusCode: normalizeCampusCode(line[3]),
          grade: inferGradeFromClassName(String(line[2]), ''),
          className: normalizeVietnameseText(line[2]),
          eduSystem: 'Hội nhập',
          sittingStatus: 'COMPLETED',
          dataCompleteness: 'PARTIAL_SUBJECTS',
          skills: [],
          validationStatus: 'SKIPPED_DRAFT',
          validationMessages: [
            'Bỏ qua tự động: Sheet nháp tổng hợp (Trang_tính1) bị khuyết tên chính của học sinh (chỉ có Họ và tên đệm) và chứa bảng nháp thống kê.',
          ],
          rawPayload: { row: line },
        });
      }
      sheetsSummary.push({
        sheetName,
        detectedType: 'DRAFT_SKIPPED',
        totalRows: draftCount,
        status: 'SKIPPED_DRAFT',
      });
      continue;
    }

    // 1. YLE Sheets: STARTERS, MOVERS, FLYERS
    // Header: ["Năm học"(0), "STT"(1), "Mã SKL"(2), "Họ và tên"(3), "Khối"(4), "Lớp"(5), "Cơ sở"(6), "Tổng Điểm/Điểm"(7), "Giải/Thành tích (RW5-L5-S5)"(8)]
    if (trimmedSheet === 'STARTERS' || trimmedSheet === 'MOVERS' || trimmedSheet === 'FLYERS') {
      const examType = trimmedSheet as 'STARTERS' | 'MOVERS' | 'FLYERS';
      let count = 0;
      let lastYear = '2022-2023';
      for (let r = 1; r < matrix.length; r++) {
        const line = matrix[r];
        if (!line || line.every((c) => !String(c).trim())) continue;
        const name = normalizeVietnameseText(line[3]);
        if (!name || name.toUpperCase().includes('HỌ VÀ TÊN')) continue;
        count++;

        if (normalizeVietnameseText(line[0])) {
          lastYear = normalizeAcademicYearText(line[0]);
        }
        const academicYearText = lastYear;
        const rawStudentCode = normalizeVietnameseText(line[2]);
        const classRecovery = recoverClassFromExcelCell(line[5]);
        const grade = inferGradeFromClassName(classRecovery.className, normalizeVietnameseText(line[4]));
        const campusCode = normalizeCampusCode(line[6]);
        const rawTotal = line[7] !== '' && line[7] !== null ? Number(line[7]) : null;
        const rawCode = normalizeVietnameseText(line[8]);

        const parsedCode = parseYleResultCode(rawCode);
        const warnings: string[] = [];
        if (classRecovery.warning) warnings.push(classRecovery.warning);
        if (!campusCode) warnings.push('Thiếu thông tin Cơ sở trên dòng lịch sử.');

        let evalRes;
        const skills: ParsedSkillItem[] = [];

        if (parsedCode) {
          if (rawTotal !== null && !isNaN(rawTotal) && parsedCode.total !== rawTotal) {
            warnings.push(
              `Tổng khiên cột Điểm (${rawTotal}) lệch với tổng 3 kỹ năng ${rawCode} (${parsedCode.total}). Đã chuẩn hóa theo mã thành phần.`
            );
          }
          evalRes = evaluateYleResult({
            rw: parsedCode.rw,
            listening: parsedCode.listening,
            speaking: parsedCode.speaking,
          });
          skills.push(
            {
              componentType: 'SKILL',
              componentCode: 'RW',
              componentName: 'Reading & Writing',
              scaleUnit: 'SHIELD',
              numericScore: parsedCode.rw,
              maxNumericScore: 5,
              officialBandCode: `${parsedCode.rw}_SHIELDS`,
              officialBandLabel: `${parsedCode.rw} Khiên`,
              isHighOutstanding: parsedCode.rw === 5,
              isLowPerformance: parsedCode.rw <= 2,
              sortOrder: 1,
            },
            {
              componentType: 'SKILL',
              componentCode: 'LISTENING',
              componentName: 'Listening',
              scaleUnit: 'SHIELD',
              numericScore: parsedCode.listening,
              maxNumericScore: 5,
              officialBandCode: `${parsedCode.listening}_SHIELDS`,
              officialBandLabel: `${parsedCode.listening} Khiên`,
              isHighOutstanding: parsedCode.listening === 5,
              isLowPerformance: parsedCode.listening <= 2,
              sortOrder: 2,
            },
            {
              componentType: 'SKILL',
              componentCode: 'SPEAKING',
              componentName: 'Speaking',
              scaleUnit: 'SHIELD',
              numericScore: parsedCode.speaking,
              maxNumericScore: 5,
              officialBandCode: `${parsedCode.speaking}_SHIELDS`,
              officialBandLabel: `${parsedCode.speaking} Khiên`,
              isHighOutstanding: parsedCode.speaking === 5,
              isLowPerformance: parsedCode.speaking <= 2,
              sortOrder: 3,
            }
          );
        } else if (rawTotal !== null && !isNaN(rawTotal)) {
          evalRes = evaluateYleResult({ historicalTotalOnly: rawTotal });
          warnings.push('Bản ghi lịch sử chỉ có Tổng khiên, không có chi tiết 3 kỹ năng RW/L/S.');
        }

        rows.push({
          sheetName,
          rowNumber: r + 1,
          examFamily: 'CAMBRIDGE_YLE',
          examType,
          sessionCode: `CAM-${examType}-${academicYearText}`,
          sessionName: `Kỳ thi Cambridge ${examType} (${academicYearText})`,
          academicYearText,
          examDate: null,
          examMonth: null,
          examYear: parseInt(academicYearText.slice(-4), 10) || null,
          rawStudentCode,
          studentName: name,
          studentDob: null,
          campusCode,
          grade,
          className: classRecovery.className,
          eduSystem: inferEduSystemFromClassName(classRecovery.className, 'CAMBRIDGE_YLE'),
          sittingStatus: 'COMPLETED',
          dataCompleteness: evalRes?.dataCompleteness || 'HISTORICAL_OVERALL_ONLY',
          yleTotalShields: evalRes?.yleTotalShields ?? null,
          yleResultCode: evalRes?.yleResultCode ?? null,
          yleSkylineGroup: evalRes?.yleSkylineGroup ?? null,
          yleMeetsInternalTarget: evalRes?.yleMeetsInternalTarget ?? null,
          skills,
          validationStatus: evalRes ? (warnings.length > 0 ? 'WARNING' : 'VALID') : 'ERROR',
          validationMessages: evalRes ? warnings : ['Không đọc được số khiên hợp lệ.'],
          rawPayload: { row: line },
        });
      }
      sheetsSummary.push({ sheetName, detectedType: examType, totalRows: count, status: 'PARSED' });
      continue;
    }

    // 2. KET / PET Historical Sheets
    // Header: ["Năm học"(0), "STT"(1), "Mã SKL"(2), "Họ và tên"(3), "Khối"(4), "Lớp"(5), "Cơ sở"(6), "Điểm"(7), "Giải/Thành tích"(8)]
    if (trimmedSheet === 'KET' || trimmedSheet === 'PET') {
      const examType = trimmedSheet as 'KET' | 'PET';
      let count = 0;
      let lastYear = '2022-2023';
      for (let r = 1; r < matrix.length; r++) {
        const line = matrix[r];
        if (!line || line.every((c) => !String(c).trim())) continue;
        const name = normalizeVietnameseText(line[3]);
        if (!name || name.toUpperCase().includes('HỌ VÀ TÊN')) continue;
        count++;

        if (normalizeVietnameseText(line[0])) {
          lastYear = normalizeAcademicYearText(line[0]);
        }
        const academicYearText = lastYear;
        const rawStudentCode = normalizeVietnameseText(line[2]);
        const classRecovery = recoverClassFromExcelCell(line[5]);
        const grade = inferGradeFromClassName(classRecovery.className, normalizeVietnameseText(line[4]));
        const campusCode = normalizeCampusCode(line[6]);
        const rawScale = line[7] !== '' && line[7] !== null ? Number(line[7]) : null;
        const rawStatement = normalizeVietnameseText(line[8]);

        const warnings: string[] = [];
        if (classRecovery.warning) warnings.push(classRecovery.warning);

        const evalRes =
          rawScale !== null && !isNaN(rawScale)
            ? evaluateCamMainSuiteResult({
                examType,
                officialOverall: rawScale,
                rawGradeOverride: rawStatement,
              })
            : null;

        if (evalRes && evalRes.camOfficialGrade === 'BELOW_THRESHOLD') {
          warnings.push(
            `Điểm Cambridge Scale (${evalRes.camOverallScale}) dưới ngưỡng cấp chứng chỉ (${
              examType === 'KET' ? 100 : 120
            }) — Ghi nhận trạng thái Not Reported / Below Threshold, tuyệt đối không ép thành Grade C.`
          );
        }

        const normalizedGradeFromText = normalizeCamGradeString(rawStatement, examType);
        if (evalRes && normalizedGradeFromText && normalizedGradeFromText !== evalRes.camOfficialGrade) {
          warnings.push(
            `Nhãn xếp loại gốc "${rawStatement}" khác với quy chuẩn điểm ${evalRes.camOverallScale} (${evalRes.camOfficialGrade}).`
          );
        }

        rows.push({
          sheetName,
          rowNumber: r + 1,
          examFamily: 'CAMBRIDGE_MAIN',
          examType,
          sessionCode: `CAM-${examType}-${academicYearText}`,
          sessionName: `Kỳ thi Cambridge ${examType} (${academicYearText})`,
          academicYearText,
          examDate: null,
          examMonth: null,
          examYear: parseInt(academicYearText.slice(-4), 10) || null,
          rawStudentCode,
          studentName: name,
          studentDob: null,
          campusCode,
          grade,
          className: classRecovery.className,
          eduSystem: inferEduSystemFromClassName(classRecovery.className, 'CAMBRIDGE_MAIN'),
          sittingStatus: 'COMPLETED',
          dataCompleteness: 'HISTORICAL_OVERALL_ONLY',
          camOverallScale: evalRes?.camOverallScale ?? null,
          camCalculatedAverage: null,
          camOfficialGrade: evalRes?.camOfficialGrade ?? null,
          camOfficialStatement: evalRes?.camOfficialStatement ?? rawStatement,
          camCefrLevel: evalRes?.camCefrLevel ?? null,
          camAwardedCertificate: evalRes?.camAwardedCertificate ?? null,
          camMeetsTargetLevel: evalRes?.camMeetsTargetLevel ?? null,
          camExceedsLevel: evalRes?.camExceedsLevel ?? null,
          skills: [],
          validationStatus: evalRes ? (warnings.length > 0 ? 'WARNING' : 'VALID') : 'ERROR',
          validationMessages: evalRes ? warnings : ['Điểm Cambridge Scale không hợp lệ.'],
          rawPayload: { row: line },
        });
      }
      sheetsSummary.push({ sheetName, detectedType: examType, totalRows: count, status: 'PARSED' });
      continue;
    }

    // 3. Pearson Edexcel Sheet: Ipls
    // Row 2+: ["Năm học"(0), "STT"(1), "Mã SKL"(2), "Họ và tên"(3), "Khối"(4), "Lớp"(5), "Cơ sở"(6), MathScore(7), MathBand(8), SciScore(9), SciBand(10)]
    if (trimmedSheet === 'IPLS' || trimmedSheet.includes('PEARSON')) {
      let count = 0;
      let lastYear = '2022-2023';
      for (let r = 2; r < matrix.length; r++) {
        const line = matrix[r];
        if (!line || line.every((c) => !String(c).trim())) continue;
        const name = normalizeVietnameseText(line[3]);
        if (!name || name.toUpperCase().includes('HỌ VÀ TÊN')) continue;
        count++;

        if (normalizeVietnameseText(line[0])) {
          lastYear = normalizeAcademicYearText(line[0]);
        }
        const academicYearText = lastYear;
        const rawStudentCode = normalizeVietnameseText(line[2]);
        const classRecovery = recoverClassFromExcelCell(line[5]);
        const grade = inferGradeFromClassName(classRecovery.className, normalizeVietnameseText(line[4]));
        const campusCode = normalizeCampusCode(line[6]);

        const mathScoreRaw = line[7] !== '' && line[7] !== null ? Number(line[7]) : null;
        const mathBandRaw = normalizeVietnameseText(line[8]);
        const sciScoreRaw = line[9] !== '' && line[9] !== null ? Number(line[9]) : null;
        const sciBandRaw = normalizeVietnameseText(line[10]);

        const combinedBands = `${mathBandRaw} ${sciBandRaw}`.toUpperCase();
        const isLowerSec =
          combinedBands.includes('S1') ||
          combinedBands.includes('S2') ||
          combinedBands.includes('S3') ||
          combinedBands.includes('S4') ||
          Number(grade) >= 8;
        const examType: ExamTypeCode = isLowerSec ? 'ILOWERSECONDARY' : 'IPRIMARY';
        const maxSubjectScore = isLowerSec ? 80 : 60;

        const skills: ParsedSkillItem[] = [];
        const warnings: string[] = [];

        if (mathScoreRaw !== null && !isNaN(mathScoreRaw)) {
          const band = normalizePearsonBand(mathBandRaw, examType);
          skills.push({
            componentType: 'SUBJECT',
            componentCode: 'MATH',
            componentName: 'Mathematics',
            scaleUnit: 'PEARSON_SCORE',
            numericScore: mathScoreRaw,
            maxNumericScore: maxSubjectScore,
            officialBandCode: band || mathBandRaw || null,
            officialBandLabel: mathBandRaw || band || null,
            isHighOutstanding: band === 'P3' || band === 'S3' || band === 'S4',
            isLowPerformance: band === 'P1' || band === 'BELOW_P1' || band === 'S1' || band === 'BELOW_S1',
            sortOrder: 1,
          });
        }

        if (sciScoreRaw !== null && !isNaN(sciScoreRaw)) {
          const band = normalizePearsonBand(sciBandRaw, examType);
          skills.push({
            componentType: 'SUBJECT',
            componentCode: 'SCIENCE',
            componentName: 'Science',
            scaleUnit: 'PEARSON_SCORE',
            numericScore: sciScoreRaw,
            maxNumericScore: maxSubjectScore,
            officialBandCode: band || sciBandRaw || null,
            officialBandLabel: sciBandRaw || band || null,
            isHighOutstanding: band === 'P3' || band === 'S3' || band === 'S4',
            isLowPerformance: band === 'P1' || band === 'BELOW_P1' || band === 'S1' || band === 'BELOW_S1',
            sortOrder: 2,
          });
        }

        const completeness = skills.length >= 2 ? 'FULL_COMPONENTS' : 'PARTIAL_SUBJECTS';
        if (skills.length === 1) {
          warnings.push(`Học sinh chỉ dự thi 1 môn (${skills[0].componentName}).`);
        }

        rows.push({
          sheetName,
          rowNumber: r + 1,
          examFamily: 'PEARSON_EDEXCEL',
          examType,
          sessionCode: `PEARSON-${examType}-${academicYearText}`,
          sessionName: `Kỳ thi Pearson Edexcel ${examType === 'IPRIMARY' ? 'iPrimary' : 'iLowerSecondary'} (${academicYearText})`,
          academicYearText,
          examDate: null,
          examMonth: null,
          examYear: parseInt(academicYearText.slice(-4), 10) || null,
          rawStudentCode,
          studentName: name,
          studentDob: null,
          campusCode,
          grade,
          className: classRecovery.className,
          eduSystem: inferEduSystemFromClassName(classRecovery.className, 'PEARSON_EDEXCEL'),
          sittingStatus: 'COMPLETED',
          dataCompleteness: completeness,
          skills,
          validationStatus: skills.length > 0 ? (warnings.length > 0 ? 'WARNING' : 'VALID') : 'ERROR',
          validationMessages: skills.length > 0 ? warnings : ['Không có điểm môn học Pearson nào.'],
          rawPayload: { row: line },
        });
      }
      sheetsSummary.push({ sheetName, detectedType: 'IPRIMARY / ILOWERSECONDARY', totalRows: count, status: 'PARSED' });
      continue;
    }

    // 4. IELTS Sheet
    // Header: ["Năm học"(0), "STT"(1), "Mã SKL"(2), "Họ và tên"(3), "Khối"(4), "Lớp"(5), "Cơ sở"(6), "Band"(7)]
    if (trimmedSheet === 'IELTS') {
      let count = 0;
      let lastYear = '2023-2024';
      for (let r = 1; r < matrix.length; r++) {
        const line = matrix[r];
        if (!line || line.every((c) => !String(c).trim())) continue;
        const rawNameCell = String(line[3] ?? '');
        const hadTabChar = rawNameCell.includes('\t');
        const name = normalizeVietnameseText(rawNameCell);
        if (!name || name.toUpperCase().includes('HỌ VÀ TÊN')) continue;
        count++;

        if (normalizeVietnameseText(line[0])) {
          lastYear = normalizeAcademicYearText(line[0]);
        }
        const academicYearText = lastYear;
        const rawStudentCode = normalizeVietnameseText(line[2]);
        const classRecovery = recoverClassFromExcelCell(line[5]);
        const grade = inferGradeFromClassName(classRecovery.className, normalizeVietnameseText(line[4]));
        const campusCode = normalizeCampusCode(line[6]);
        const rawBandCell = line[7];

        const warnings: string[] = [];
        if (hadTabChar) {
          warnings.push('Đã tự động làm sạch ký tự Tab (\\t) thừa trong họ tên học sinh.');
        }
        if (typeof rawBandCell === 'string' && (rawBandCell.toUpperCase().includes('IELTS') || rawBandCell.includes(','))) {
          warnings.push(`Đã chuẩn hóa chuỗi điểm "${rawBandCell}" thành số Band IELTS chuẩn.`);
        }

        const parsedBand = parseRawIeltsBand(rawBandCell);
        const evalRes = parsedBand !== null ? evaluateIeltsResult({ officialOverall: parsedBand }) : null;

        rows.push({
          sheetName,
          rowNumber: r + 1,
          examFamily: 'IELTS',
          examType: 'IELTS',
          sessionCode: `IELTS-${academicYearText}`,
          sessionName: `Tổng hợp Chứng chỉ IELTS (${academicYearText})`,
          academicYearText,
          examDate: null,
          examMonth: null,
          examYear: parseInt(academicYearText.slice(-4), 10) || null,
          rawStudentCode,
          studentName: name,
          studentDob: null,
          campusCode,
          grade,
          className: classRecovery.className,
          eduSystem: inferEduSystemFromClassName(classRecovery.className, 'IELTS'),
          sittingStatus: 'COMPLETED',
          dataCompleteness: 'HISTORICAL_OVERALL_ONLY',
          ieltsOverallBand: evalRes?.ieltsOverallBand ?? null,
          ieltsCalculatedOverall: null,
          ieltsBandGroup: evalRes?.ieltsBandGroup ?? null,
          ieltsCefrLevel: evalRes?.ieltsCefrLevel ?? null,
          ieltsStrongestSkill: null,
          ieltsWeakestSkill: null,
          skills: [],
          validationStatus: evalRes ? (warnings.length > 0 ? 'WARNING' : 'VALID') : 'ERROR',
          validationMessages: evalRes ? warnings : [`Không thể phân tích điểm IELTS từ giá trị "${rawBandCell}".`],
          rawPayload: { row: line },
        });
      }
      sheetsSummary.push({ sheetName, detectedType: 'IELTS', totalRows: count, status: 'PARSED' });
      continue;
    }

    // 5. Cambridge Checkpoint Sheet
    // Header: ["Năm học"(0), "STT"(1), "Mã SKL"(2), "Họ và tên"(3), "Khối"(4), "Lớp"(5), "Cơ sở"(6), ESL_Score(7), ESL_Band(8), Math_Score(9), Math_Band(10), Sci_Score(11), Sci_Band(12)]
    if (trimmedSheet.includes('CHECKPOINT')) {
      let count = 0;
      let lastYear = '2024-2025';
      for (let r = 1; r < matrix.length; r++) {
        const line = matrix[r];
        if (!line || line.every((c) => !String(c).replace(/\u00A0/g, '').trim())) continue;
        const name = normalizeVietnameseText(line[3]);
        if (!name || name.toUpperCase().includes('HỌ VÀ TÊN')) continue;
        count++;

        if (normalizeVietnameseText(line[0])) {
          lastYear = normalizeAcademicYearText(line[0]);
        }
        const academicYearText = lastYear;
        const rawStudentCode = normalizeVietnameseText(line[2]);
        const classRecovery = recoverClassFromExcelCell(line[5]);
        const grade = inferGradeFromClassName(classRecovery.className, normalizeVietnameseText(line[4]));
        const campusCode = normalizeCampusCode(line[6]);

        const isPrimary = Number(grade) > 0 && Number(grade) <= 6;
        const examType: ExamTypeCode = isPrimary ? 'PRIMARY_CHECKPOINT' : 'LOWER_SECONDARY_CHECKPOINT';

        const subjectDefs = [
          { code: 'ESL', name: 'English as a Second Language (ESL)', scoreIdx: 7, bandIdx: 8, order: 1 },
          { code: 'MATH', name: 'Mathematics', scoreIdx: 9, bandIdx: 10, order: 2 },
          { code: 'SCIENCE', name: 'Science', scoreIdx: 11, bandIdx: 12, order: 3 },
        ];

        const skills: ParsedSkillItem[] = [];
        const warnings: string[] = [];

        for (const sub of subjectDefs) {
          const rawScoreStr = normalizeVietnameseText(line[sub.scoreIdx]);
          const rawBandStr = normalizeVietnameseText(line[sub.bandIdx]);
          if (rawScoreStr !== '') {
            const num = Number(rawScoreStr);
            if (!isNaN(num)) {
              const classified = classifyCheckpoint50Score(num);
              const explicitBand = normalizeCheckpointBandString(rawBandStr);
              const finalBandCode = explicitBand || classified.bandCode;
              skills.push({
                componentType: 'SUBJECT',
                componentCode: sub.code,
                componentName: sub.name,
                scaleUnit: 'CHECKPOINT_50',
                numericScore: num,
                maxNumericScore: 50,
                officialBandCode: finalBandCode,
                officialBandLabel: rawBandStr || classified.bandLabel,
                isHighOutstanding: finalBandCode === 'HIGH' || finalBandCode === 'OUTSTANDING',
                isLowPerformance: finalBandCode === 'UNCLASSIFIED' || finalBandCode === 'BASIC' || finalBandCode === 'ASPIRING',
                sortOrder: sub.order,
              });
            }
          }
        }

        const completeness = skills.length === 3 ? 'FULL_COMPONENTS' : 'PARTIAL_SUBJECTS';
        if (skills.length < 3) {
          warnings.push(
            `Học sinh dự thi ${skills.length}/3 môn Checkpoint (${skills.map((s) => s.componentCode).join(', ')}).`
          );
        }

        rows.push({
          sheetName,
          rowNumber: r + 1,
          examFamily: 'CAMBRIDGE_CHECKPOINT',
          examType,
          sessionCode: `CHK-${examType === 'PRIMARY_CHECKPOINT' ? 'PRI' : 'SEC'}-${academicYearText}`,
          sessionName: `Kỳ thi Cambridge ${examType === 'PRIMARY_CHECKPOINT' ? 'Primary' : 'Lower Secondary'} Checkpoint (${academicYearText})`,
          academicYearText,
          examDate: null,
          examMonth: null,
          examYear: parseInt(academicYearText.slice(-4), 10) || null,
          rawStudentCode,
          studentName: name,
          studentDob: null,
          campusCode,
          grade,
          className: classRecovery.className,
          eduSystem: inferEduSystemFromClassName(classRecovery.className, 'CAMBRIDGE_CHECKPOINT'),
          sittingStatus: 'COMPLETED',
          dataCompleteness: completeness,
          skills,
          validationStatus: skills.length > 0 ? (warnings.length > 0 ? 'WARNING' : 'VALID') : 'ERROR',
          validationMessages: skills.length > 0 ? warnings : ['Không có dữ liệu môn học Checkpoint.'],
          rawPayload: { row: line },
        });
      }
      sheetsSummary.push({ sheetName, detectedType: 'CAMBRIDGE_CHECKPOINT', totalRows: count, status: 'PARSED' });
      continue;
    }

    // 6. Sheet "2026"
    // Header: [SessionMonth(0), "Họ và tên Thí sinh "(1), "Class 2026-2027"(2), "Campus"(3), "Date of birth"(4), "Tên bài thi/Cấp độ"(5), "Loại hình thi"(6), "Kết quả (Breakdown)"(7), Overall(8), Note(9)]
    if (trimmedSheet === '2026' || trimmedSheet.includes('2026')) {
      let count = 0;
      let currentSessionLabel = 'Tháng 7.2026';
      for (let r = 1; r < matrix.length; r++) {
        const line = matrix[r];
        if (!line || line.every((c) => !String(c).trim())) continue;
        if (normalizeVietnameseText(line[0])) {
          currentSessionLabel = normalizeVietnameseText(line[0]);
        }
        const name = normalizeVietnameseText(line[1]);
        if (!name || name.toUpperCase().includes('HỌ VÀ TÊN')) continue;
        count++;

        const classRecovery = recoverClassFromExcelCell(line[2]);
        const grade = inferGradeFromClassName(classRecovery.className, '');
        const campusCode = normalizeCampusCode(line[3]);
        const dobDate = parseDobString(line[4]);
        const rawLevel = normalizeVietnameseText(line[5]).toUpperCase();
        const rawBreakdownCell = normalizeVietnameseText(line[7]);
        const rawOverallCell = normalizeVietnameseText(line[8]);
        const rawCefrNote = normalizeVietnameseText(line[9]);

        const monthMatch = currentSessionLabel.match(/(\d{1,2})\.(\d{4})/);
        const examMonth = monthMatch ? parseInt(monthMatch[1], 10) : 7;
        const examYear = monthMatch ? parseInt(monthMatch[2], 10) : 2026;
        const academicYearText = '2026-2027';

        let examFamily: ExamFamilyCode = 'CAMBRIDGE_YLE';
        let examType: ExamTypeCode = 'FLYERS';
        if (rawLevel === 'S' || rawLevel.includes('STARTER')) {
          examFamily = 'CAMBRIDGE_YLE';
          examType = 'STARTERS';
        } else if (rawLevel === 'M' || rawLevel.includes('MOVER')) {
          examFamily = 'CAMBRIDGE_YLE';
          examType = 'MOVERS';
        } else if (rawLevel === 'F' || rawLevel.includes('FLYER')) {
          examFamily = 'CAMBRIDGE_YLE';
          examType = 'FLYERS';
        } else if (rawLevel === 'KET' || rawLevel.includes('KEY')) {
          examFamily = 'CAMBRIDGE_MAIN';
          examType = 'KET';
        } else if (rawLevel === 'PET' || rawLevel.includes('PRELIM')) {
          examFamily = 'CAMBRIDGE_MAIN';
          examType = 'PET';
        }

        const isAbsent =
          rawOverallCell.toUpperCase().includes('VẮNG') ||
          rawBreakdownCell.toUpperCase().includes('VẮNG');

        const warnings: string[] = [];
        const skills: ParsedSkillItem[] = [];

        if (isAbsent) {
          warnings.push('Học sinh vắng thi (sittingStatus = ABSENT) — Không tính vào mẫu số phân tích điểm.');
          rows.push({
            sheetName,
            rowNumber: r + 1,
            examFamily,
            examType,
            sessionCode: `CAM-${examType}-${examYear}-${String(examMonth).padStart(2, '0')}`,
            sessionName: `Kỳ thi Cambridge ${examType} - ${currentSessionLabel}`,
            academicYearText,
            examDate: new Date(Date.UTC(examYear, examMonth - 1, 15)).toISOString(),
            examMonth,
            examYear,
            rawStudentCode: '',
            studentName: name,
            studentDob: dobDate ? dobDate.toISOString() : null,
            campusCode,
            grade,
            className: classRecovery.className,
            eduSystem: inferEduSystemFromClassName(classRecovery.className, examFamily),
            sittingStatus: 'ABSENT',
            dataCompleteness: 'FULL_COMPONENTS',
            skills: [],
            validationStatus: 'WARNING',
            validationMessages: warnings,
            rawPayload: { row: line },
          });
          continue;
        }

        if (examFamily === 'CAMBRIDGE_YLE') {
          const parsedCode = parseYleResultCode(rawBreakdownCell);
          const evalRes = parsedCode
            ? evaluateYleResult({
                rw: parsedCode.rw,
                listening: parsedCode.listening,
                speaking: parsedCode.speaking,
              })
            : evaluateYleResult({ historicalTotalOnly: Number(rawOverallCell) });

          if (parsedCode) {
            skills.push(
              {
                componentType: 'SKILL',
                componentCode: 'RW',
                componentName: 'Reading & Writing',
                scaleUnit: 'SHIELD',
                numericScore: parsedCode.rw,
                maxNumericScore: 5,
                officialBandCode: `${parsedCode.rw}_SHIELDS`,
                officialBandLabel: `${parsedCode.rw} Khiên`,
                isHighOutstanding: parsedCode.rw === 5,
                isLowPerformance: parsedCode.rw <= 2,
                sortOrder: 1,
              },
              {
                componentType: 'SKILL',
                componentCode: 'LISTENING',
                componentName: 'Listening',
                scaleUnit: 'SHIELD',
                numericScore: parsedCode.listening,
                maxNumericScore: 5,
                officialBandCode: `${parsedCode.listening}_SHIELDS`,
                officialBandLabel: `${parsedCode.listening} Khiên`,
                isHighOutstanding: parsedCode.listening === 5,
                isLowPerformance: parsedCode.listening <= 2,
                sortOrder: 2,
              },
              {
                componentType: 'SKILL',
                componentCode: 'SPEAKING',
                componentName: 'Speaking',
                scaleUnit: 'SHIELD',
                numericScore: parsedCode.speaking,
                maxNumericScore: 5,
                officialBandCode: `${parsedCode.speaking}_SHIELDS`,
                officialBandLabel: `${parsedCode.speaking} Khiên`,
                isHighOutstanding: parsedCode.speaking === 5,
                isLowPerformance: parsedCode.speaking <= 2,
                sortOrder: 3,
              }
            );
          }

          rows.push({
            sheetName,
            rowNumber: r + 1,
            examFamily,
            examType,
            sessionCode: `CAM-${examType}-${examYear}-${String(examMonth).padStart(2, '0')}`,
            sessionName: `Kỳ thi Cambridge ${examType} - ${currentSessionLabel}`,
            academicYearText,
            examDate: new Date(Date.UTC(examYear, examMonth - 1, 15)).toISOString(),
            examMonth,
            examYear,
            rawStudentCode: '',
            studentName: name,
            studentDob: dobDate ? dobDate.toISOString() : null,
            campusCode,
            grade,
            className: classRecovery.className,
            eduSystem: inferEduSystemFromClassName(classRecovery.className, examFamily),
            sittingStatus: 'COMPLETED',
            dataCompleteness: evalRes?.dataCompleteness || 'FULL_COMPONENTS',
            yleTotalShields: evalRes?.yleTotalShields ?? null,
            yleResultCode: evalRes?.yleResultCode ?? null,
            yleSkylineGroup: evalRes?.yleSkylineGroup ?? null,
            yleMeetsInternalTarget: evalRes?.yleMeetsInternalTarget ?? null,
            skills,
            validationStatus: 'VALID',
            validationMessages: warnings,
            rawPayload: { row: line },
          });
        } else {
          // KET or PET with full 4-skill breakdown R132-W133-L147-S150
          const parsed4 = parseCamSkillBreakdownCode(rawBreakdownCell);
          const officialOverall = Number(rawOverallCell);
          const evalRes = evaluateCamMainSuiteResult({
            examType: examType as 'KET' | 'PET',
            reading: parsed4?.reading ?? null,
            writing: parsed4?.writing ?? null,
            listening: parsed4?.listening ?? null,
            speaking: parsed4?.speaking ?? null,
            officialOverall: !isNaN(officialOverall) ? officialOverall : null,
            rawGradeOverride: rawCefrNote || null,
          });

          const maxScale = examType === 'KET' ? 150 : 170;
          if (parsed4) {
            skills.push(
              {
                componentType: 'SKILL',
                componentCode: 'READING',
                componentName: 'Reading',
                scaleUnit: 'CAMBRIDGE_SCALE',
                numericScore: parsed4.reading,
                maxNumericScore: maxScale,
                officialBandCode: null,
                officialBandLabel: `${parsed4.reading} Scale`,
                isHighOutstanding: parsed4.reading >= (examType === 'KET' ? 140 : 160),
                isLowPerformance: parsed4.reading < (examType === 'KET' ? 120 : 140),
                sortOrder: 1,
              },
              {
                componentType: 'SKILL',
                componentCode: 'WRITING',
                componentName: 'Writing',
                scaleUnit: 'CAMBRIDGE_SCALE',
                numericScore: parsed4.writing,
                maxNumericScore: maxScale,
                officialBandCode: null,
                officialBandLabel: `${parsed4.writing} Scale`,
                isHighOutstanding: parsed4.writing >= (examType === 'KET' ? 140 : 160),
                isLowPerformance: parsed4.writing < (examType === 'KET' ? 120 : 140),
                sortOrder: 2,
              },
              {
                componentType: 'SKILL',
                componentCode: 'LISTENING',
                componentName: 'Listening',
                scaleUnit: 'CAMBRIDGE_SCALE',
                numericScore: parsed4.listening,
                maxNumericScore: maxScale,
                officialBandCode: null,
                officialBandLabel: `${parsed4.listening} Scale`,
                isHighOutstanding: parsed4.listening >= (examType === 'KET' ? 140 : 160),
                isLowPerformance: parsed4.listening < (examType === 'KET' ? 120 : 140),
                sortOrder: 3,
              },
              {
                componentType: 'SKILL',
                componentCode: 'SPEAKING',
                componentName: 'Speaking',
                scaleUnit: 'CAMBRIDGE_SCALE',
                numericScore: parsed4.speaking,
                maxNumericScore: maxScale,
                officialBandCode: null,
                officialBandLabel: `${parsed4.speaking} Scale`,
                isHighOutstanding: parsed4.speaking >= (examType === 'KET' ? 140 : 160),
                isLowPerformance: parsed4.speaking < (examType === 'KET' ? 120 : 140),
                sortOrder: 4,
              }
            );
          }

          rows.push({
            sheetName,
            rowNumber: r + 1,
            examFamily,
            examType,
            sessionCode: `CAM-${examType}-${examYear}-${String(examMonth).padStart(2, '0')}`,
            sessionName: `Kỳ thi Cambridge ${examType} - ${currentSessionLabel}`,
            academicYearText,
            examDate: new Date(Date.UTC(examYear, examMonth - 1, 15)).toISOString(),
            examMonth,
            examYear,
            rawStudentCode: '',
            studentName: name,
            studentDob: dobDate ? dobDate.toISOString() : null,
            campusCode,
            grade,
            className: classRecovery.className,
            eduSystem: inferEduSystemFromClassName(classRecovery.className, examFamily),
            sittingStatus: 'COMPLETED',
            dataCompleteness: evalRes?.dataCompleteness || 'FULL_COMPONENTS',
            camOverallScale: evalRes?.camOverallScale ?? null,
            camCalculatedAverage: evalRes?.camCalculatedAverage ?? null,
            camOfficialGrade: evalRes?.camOfficialGrade ?? null,
            camOfficialStatement: evalRes?.camOfficialStatement ?? null,
            camCefrLevel: evalRes?.camCefrLevel ?? null,
            camAwardedCertificate: evalRes?.camAwardedCertificate ?? null,
            camMeetsTargetLevel: evalRes?.camMeetsTargetLevel ?? null,
            camExceedsLevel: evalRes?.camExceedsLevel ?? null,
            skills,
            validationStatus: 'VALID',
            validationMessages: warnings,
            rawPayload: { row: line },
          });
        }
      }
      sheetsSummary.push({ sheetName, detectedType: 'CAMBRIDGE_2026_MULTI', totalRows: count, status: 'PARSED' });
      continue;
    }
  }

  return { sheetsSummary, rows };
}

export async function recomputeIeltsLongitudinalFlags() {
  const ieltsResults = await prisma.intlExamResult.findMany({
    where: {
      examFamily: 'IELTS',
      sittingStatus: 'COMPLETED',
    },
    orderBy: [{ academicYearText: 'asc' }, { examDate: 'asc' }, { createdAt: 'asc' }],
  });

  const groups = new Map<string, typeof ieltsResults>();
  for (const r of ieltsResults) {
    const key = r.studentId
      ? `ST_${r.studentId}`
      : `HIST_${stripVietnameseAccents(r.studentNameSnapshot)}_${r.campusCodeSnapshot || ''}`;
    const list = groups.get(key) || [];
    list.push(r);
    groups.set(key, list);
  }

  for (const [, list] of Array.from(groups.entries())) {
    if (list.length === 0) continue;
    let maxBand = -1;
    let maxIdx = 0;
    list.forEach((item, idx) => {
      const band = item.ieltsOverallBand ?? 0;
      if (band >= maxBand) {
        maxBand = band;
        maxIdx = idx;
      }
    });

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const attemptNumber = i + 1;
      const isLatest = i === list.length - 1;
      const isHighest = i === maxIdx;
      if (
        item.ieltsAttemptNumber !== attemptNumber ||
        item.ieltsIsLatest !== isLatest ||
        item.ieltsIsHighest !== isHighest
      ) {
        await prisma.intlExamResult.update({
          where: { id: item.id },
          data: {
            ieltsAttemptNumber: attemptNumber,
            ieltsIsLatest: isLatest,
            ieltsIsHighest: isHighest,
          },
        });
      }
    }
  }
}

export async function stageAndOptionallyCommitExcelImport(params: {
  buffer: Buffer;
  fileName: string;
  importedById?: string;
  autoCommit?: boolean;
}) {
  const ruleSetMap = await ensureDefaultRuleSetsSeeded();
  const dir = await buildStudentLookupDirectory();
  const { sheetsSummary, rows } = parseWorkbookToNormalizedRows(params.buffer);

  let validRows = 0;
  let warningRows = 0;
  let errorRows = 0;
  let matchedStudents = 0;
  let unmatchedStudents = 0;

  const stagedPayloads = rows.map((row) => {
    const match =
      row.validationStatus === 'SKIPPED_DRAFT'
        ? {
            matchedStudentId: null,
            matchedStudentCode: null,
            matchedStudentName: null,
            matchConfidence: 'HISTORICAL_UNLINKED' as const,
            candidateMatches: [],
          }
        : matchStudentRecord(row, dir);

    if (row.validationStatus !== 'SKIPPED_DRAFT') {
      if (match.matchedStudentId) {
        matchedStudents++;
        const ssmSt = dir.byId.get(match.matchedStudentId);
        if (ssmSt) {
          row.studentName = ssmSt.studentName;
          row.rawStudentCode = ssmSt.studentCode;
          row.campusCode = ssmSt.class?.campus?.campusCode || row.campusCode;
          row.className = ssmSt.class?.className || row.className;
          row.grade = inferGradeFromClassName(ssmSt.class?.className, ssmSt.class?.grade) || row.grade;
          row.eduSystem =
            ssmSt.class?.educationSystem ||
            inferEduSystemFromClassName(ssmSt.class?.className, row.examFamily);
          if (ssmSt.dateOfBirth) {
            row.studentDob = new Date(ssmSt.dateOfBirth).toISOString().slice(0, 10);
          }
        }
      } else {
        unmatchedStudents++;
        row.validationStatus = 'ERROR';
        row.validationMessages.unshift(
          'Bỏ qua: Học sinh không tồn tại trong hệ thống SSM (Không tự động thêm mới dữ liệu ngoài SSM).'
        );
      }
    }

    if (row.validationStatus === 'VALID') validRows++;
    else if (row.validationStatus === 'WARNING') warningRows++;
    else if (row.validationStatus === 'ERROR') errorRows++;

    return {
      row,
      match,
    };
  });

  const batchCode = `INTL-IMP-${Date.now()}`;
  const batch = await prisma.intlImportBatch.create({
    data: {
      batchCode,
      fileName: params.fileName,
      totalSheets: sheetsSummary.length,
      totalRows: rows.length,
      validRows,
      warningRows,
      errorRows,
      matchedStudents,
      unmatchedStudents,
      status: params.autoCommit ? 'COMMITTED' : 'PREVIEW',
      summaryJson: JSON.stringify(sheetsSummary),
      importedById: params.importedById || null,
    },
  });

  const sessionMap = new Map<string, string>();

  for (const item of stagedPayloads) {
    const { row, match } = item;
    let createdResultId: string | null = null;

    if (
      params.autoCommit &&
      match.matchedStudentId &&
      (row.validationStatus === 'VALID' || row.validationStatus === 'WARNING')
    ) {
      const ruleSetId = ruleSetMap.get(row.examType)!;
      let sessionId = sessionMap.get(row.sessionCode);
      if (!sessionId) {
        const existingSession = await prisma.intlExamSession.findUnique({
          where: { sessionCode: row.sessionCode },
        });
        if (existingSession) {
          sessionId = existingSession.id;
        } else {
          const newSession = await prisma.intlExamSession.create({
            data: {
              sessionCode: row.sessionCode,
              sessionName: row.sessionName,
              examFamily: row.examFamily,
              examType: row.examType,
              academicYearText: row.academicYearText,
              examDate: row.examDate ? new Date(row.examDate) : null,
              examMonth: row.examMonth,
              examYear: row.examYear,
              ruleSetId,
              createdById: params.importedById || null,
            },
          });
          sessionId = newSession.id;
        }
        sessionMap.set(row.sessionCode, sessionId);
      }

      const campusId = row.campusCode ? dir.campusesByCode.get(row.campusCode.toUpperCase()) || null : null;

      const createdResult = await prisma.intlExamResult.create({
        data: {
          sessionId,
          ruleSetId,
          examFamily: row.examFamily,
          examType: row.examType,
          studentId: match.matchedStudentId,
          studentCodeSnapshot: match.matchedStudentCode || row.rawStudentCode || null,
          studentNameSnapshot: match.matchedStudentName || row.studentName,
          studentDobSnapshot: row.studentDob ? new Date(row.studentDob) : null,
          campusIdSnapshot: campusId,
          campusCodeSnapshot: row.campusCode || null,
          gradeSnapshot: row.grade || null,
          classNameSnapshot: row.className || null,
          eduSystemSnapshot: row.eduSystem || null,
          academicYearText: row.academicYearText,
          examDate: row.examDate ? new Date(row.examDate) : null,
          sittingStatus: row.sittingStatus,
          yleTotalShields: row.yleTotalShields ?? null,
          yleResultCode: row.yleResultCode ?? null,
          yleSkylineGroup: row.yleSkylineGroup ?? null,
          yleMeetsInternalTarget: row.yleMeetsInternalTarget ?? null,
          camOverallScale: row.camOverallScale ?? null,
          camCalculatedAverage: row.camCalculatedAverage ?? null,
          camOfficialGrade: row.camOfficialGrade ?? null,
          camOfficialStatement: row.camOfficialStatement ?? null,
          camCefrLevel: row.camCefrLevel ?? null,
          camAwardedCertificate: row.camAwardedCertificate ?? null,
          camMeetsTargetLevel: row.camMeetsTargetLevel ?? null,
          camExceedsLevel: row.camExceedsLevel ?? null,
          ieltsOverallBand: row.ieltsOverallBand ?? null,
          ieltsCalculatedOverall: row.ieltsCalculatedOverall ?? null,
          ieltsBandGroup: row.ieltsBandGroup ?? null,
          ieltsCefrLevel: row.ieltsCefrLevel ?? null,
          ieltsStrongestSkill: row.ieltsStrongestSkill ?? null,
          ieltsWeakestSkill: row.ieltsWeakestSkill ?? null,
          dataCompleteness: row.dataCompleteness,
          isHistoricalImport: true,
          isStudentVerified: Boolean(match.matchedStudentId),
          importBatchId: batch.id,
          remarks: row.validationMessages.length > 0 ? row.validationMessages.join(' | ') : null,
          createdById: params.importedById || null,
          skillResults: {
            create: row.skills.map((s) => ({
              componentType: s.componentType,
              componentCode: s.componentCode,
              componentName: s.componentName,
              scaleUnit: s.scaleUnit,
              numericScore: s.numericScore,
              maxNumericScore: s.maxNumericScore,
              officialBandCode: s.officialBandCode,
              officialBandLabel: s.officialBandLabel,
              isHighOutstanding: s.isHighOutstanding,
              isLowPerformance: s.isLowPerformance,
              sortOrder: s.sortOrder,
            })),
          },
          certificate: {
            create: {
              studentId: match.matchedStudentId,
              certificateStatus:
                row.sittingStatus === 'ABSENT' || row.camAwardedCertificate === false
                  ? 'NOT_AWARDED'
                  : 'RECEIVED_AT_SCHOOL',
            },
          },
        },
      });
      createdResultId = createdResult.id;
    }

    await prisma.intlStagingRecord.create({
      data: {
        batchId: batch.id,
        sheetName: row.sheetName,
        rowNumber: row.rowNumber,
        detectedExamFamily: row.examFamily,
        detectedExamType: row.examType,
        rawPayloadJson: JSON.stringify(row.rawPayload),
        normalizedJson: JSON.stringify(row),
        matchedStudentId: match.matchedStudentId,
        matchedStudentCode: match.matchedStudentCode,
        matchedStudentName: match.matchedStudentName,
        matchConfidence: match.matchConfidence,
        candidateMatchesJson:
          match.candidateMatches.length > 0 ? JSON.stringify(match.candidateMatches) : null,
        validationStatus: row.validationStatus,
        validationMessages:
          row.validationMessages.length > 0 ? JSON.stringify(row.validationMessages) : null,
        isCommitted: Boolean(createdResultId),
        createdResultId,
      },
    });
  }

  if (params.autoCommit) {
    await recomputeIeltsLongitudinalFlags();
  }

  return {
    batchId: batch.id,
    batchCode: batch.batchCode,
    sheetsSummary,
    totalRows: rows.length,
    validRows,
    warningRows,
    errorRows,
    matchedStudents,
    unmatchedStudents,
  };
}

export async function commitStagedImportBatch(batchId: string, actorUserId?: string) {
  const batch = await prisma.intlImportBatch.findUnique({
    where: { id: batchId },
    include: { stagingRecords: true },
  });
  if (!batch) throw new Error('Không tìm thấy lô import.');
  if (batch.status === 'COMMITTED') return { alreadyCommitted: true, committedCount: 0 };

  const ruleSetMap = await ensureDefaultRuleSetsSeeded();
  const dir = await buildStudentLookupDirectory();
  const sessionMap = new Map<string, string>();
  let committedCount = 0;

  for (const stg of batch.stagingRecords) {
    if (stg.isCommitted) continue;
    if (!stg.matchedStudentId) continue;
    if (stg.validationStatus !== 'VALID' && stg.validationStatus !== 'WARNING') continue;

    const row: NormalizedImportRow = JSON.parse(stg.normalizedJson);
    const ruleSetId = ruleSetMap.get(row.examType)!;

    let sessionId = sessionMap.get(row.sessionCode);
    if (!sessionId) {
      const existingSession = await prisma.intlExamSession.findUnique({
        where: { sessionCode: row.sessionCode },
      });
      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        const newSession = await prisma.intlExamSession.create({
          data: {
            sessionCode: row.sessionCode,
            sessionName: row.sessionName,
            examFamily: row.examFamily,
            examType: row.examType,
            academicYearText: row.academicYearText,
            examDate: row.examDate ? new Date(row.examDate) : null,
            examMonth: row.examMonth,
            examYear: row.examYear,
            ruleSetId,
            createdById: actorUserId || null,
          },
        });
        sessionId = newSession.id;
      }
      sessionMap.set(row.sessionCode, sessionId);
    }

    const campusId = row.campusCode ? dir.campusesByCode.get(row.campusCode.toUpperCase()) || null : null;

    const createdResult = await prisma.intlExamResult.create({
      data: {
        sessionId,
        ruleSetId,
        examFamily: row.examFamily,
        examType: row.examType,
        studentId: stg.matchedStudentId,
        studentCodeSnapshot: stg.matchedStudentCode || row.rawStudentCode || null,
        studentNameSnapshot: stg.matchedStudentName || row.studentName,
        studentDobSnapshot: row.studentDob ? new Date(row.studentDob) : null,
        campusIdSnapshot: campusId,
        campusCodeSnapshot: row.campusCode || null,
        gradeSnapshot: row.grade || null,
        classNameSnapshot: row.className || null,
        eduSystemSnapshot: row.eduSystem || null,
        academicYearText: row.academicYearText,
        examDate: row.examDate ? new Date(row.examDate) : null,
        sittingStatus: row.sittingStatus,
        yleTotalShields: row.yleTotalShields ?? null,
        yleResultCode: row.yleResultCode ?? null,
        yleSkylineGroup: row.yleSkylineGroup ?? null,
        yleMeetsInternalTarget: row.yleMeetsInternalTarget ?? null,
        camOverallScale: row.camOverallScale ?? null,
        camCalculatedAverage: row.camCalculatedAverage ?? null,
        camOfficialGrade: row.camOfficialGrade ?? null,
        camOfficialStatement: row.camOfficialStatement ?? null,
        camCefrLevel: row.camCefrLevel ?? null,
        camAwardedCertificate: row.camAwardedCertificate ?? null,
        camMeetsTargetLevel: row.camMeetsTargetLevel ?? null,
        camExceedsLevel: row.camExceedsLevel ?? null,
        ieltsOverallBand: row.ieltsOverallBand ?? null,
        ieltsCalculatedOverall: row.ieltsCalculatedOverall ?? null,
        ieltsBandGroup: row.ieltsBandGroup ?? null,
        ieltsCefrLevel: row.ieltsCefrLevel ?? null,
        ieltsStrongestSkill: row.ieltsStrongestSkill ?? null,
        ieltsWeakestSkill: row.ieltsWeakestSkill ?? null,
        dataCompleteness: row.dataCompleteness,
        isHistoricalImport: true,
        isStudentVerified: Boolean(stg.matchedStudentId),
        importBatchId: batch.id,
        remarks: row.validationMessages.length > 0 ? row.validationMessages.join(' | ') : null,
        createdById: actorUserId || null,
        skillResults: {
          create: row.skills.map((s) => ({
            componentType: s.componentType,
            componentCode: s.componentCode,
            componentName: s.componentName,
            scaleUnit: s.scaleUnit,
            numericScore: s.numericScore,
            maxNumericScore: s.maxNumericScore,
            officialBandCode: s.officialBandCode,
            officialBandLabel: s.officialBandLabel,
            isHighOutstanding: s.isHighOutstanding,
            isLowPerformance: s.isLowPerformance,
            sortOrder: s.sortOrder,
          })),
        },
        certificate: {
          create: {
            studentId: stg.matchedStudentId,
            certificateStatus:
              row.sittingStatus === 'ABSENT' || row.camAwardedCertificate === false
                ? 'NOT_AWARDED'
                : 'RECEIVED_AT_SCHOOL',
          },
        },
      },
    });

    await prisma.intlStagingRecord.update({
      where: { id: stg.id },
      data: {
        isCommitted: true,
        createdResultId: createdResult.id,
      },
    });
    committedCount++;
  }

  await prisma.intlImportBatch.update({
    where: { id: batch.id },
    data: { status: 'COMMITTED' },
  });

  await recomputeIeltsLongitudinalFlags();

  return { alreadyCommitted: false, committedCount };
}
