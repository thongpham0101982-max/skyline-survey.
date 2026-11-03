// ============================================================================
// INTERNATIONAL EXAMS & CERTIFICATES RULE ENGINE - SSM SKY-LINE
// Strictly adheres to official Cambridge English, IELTS, Pearson Edexcel,
// and Cambridge International Checkpoint scoring & classification standards.
// ============================================================================

export type ExamFamilyCode =
  | 'CAMBRIDGE_YLE'
  | 'CAMBRIDGE_MAIN'
  | 'IELTS'
  | 'PEARSON_EDEXCEL'
  | 'CAMBRIDGE_CHECKPOINT';

export type ExamTypeCode =
  | 'STARTERS'
  | 'MOVERS'
  | 'FLYERS'
  | 'KET'
  | 'PET'
  | 'IELTS'
  | 'IPRIMARY'
  | 'ILOWERSECONDARY'
  | 'PRIMARY_CHECKPOINT'
  | 'LOWER_SECONDARY_CHECKPOINT';

export type ScaleUnitCode =
  | 'SHIELD'
  | 'CAMBRIDGE_SCALE'
  | 'IELTS_BAND'
  | 'PEARSON_SCORE'
  | 'CHECKPOINT_50'
  | 'CHECKPOINT_6';

export interface SkillComponentConfig {
  code: string;
  name: string;
  nameVi: string;
  componentType: 'SKILL' | 'SUBJECT';
  scaleUnit: ScaleUnitCode;
  min: number;
  max: number;
  step: number;
  sortOrder: number;
}

export interface DefaultRuleSetDefinition {
  versionCode: string;
  versionName: string;
  examFamily: ExamFamilyCode;
  examType: ExamTypeCode;
  organization: string;
  effectiveFrom: string;
  scaleUnit: ScaleUnitCode;
  minOverall: number | null;
  maxOverall: number | null;
  stepSize: number;
  gradeBoundaries: any[];
  skylineTargets: Record<string, any>;
  skillsConfig: SkillComponentConfig[];
  allowPartialImport: boolean;
}

export const EXAM_FAMILY_META: Record<
  ExamFamilyCode,
  {
    code: ExamFamilyCode;
    label: string;
    shortLabel: string;
    organization: string;
    description: string;
    examTypes: ExamTypeCode[];
    color: string;
  }
> = {
  CAMBRIDGE_YLE: {
    code: 'CAMBRIDGE_YLE',
    label: 'Cambridge Young Learners (Starters / Movers / Flyers)',
    shortLabel: 'Starters / Movers / Flyers',
    organization: 'Cambridge English',
    description: 'Đánh giá theo Số khiên (0–5 khiên/kỹ năng, Tổng 0–15 khiên). Không phân loại Đạt/Trượt chính thức.',
    examTypes: ['STARTERS', 'MOVERS', 'FLYERS'],
    color: '#00A19A',
  },
  CAMBRIDGE_MAIN: {
    code: 'CAMBRIDGE_MAIN',
    label: 'Cambridge English Qualifications (KET / PET)',
    shortLabel: 'KET (A2 Key) / PET (B1 Prelim)',
    organization: 'Cambridge English',
    description: 'Thang điểm Cambridge English Scale (4 kỹ năng & Overall), phân loại Grade A/B/C và quy chiếu CEFR.',
    examTypes: ['KET', 'PET'],
    color: '#2563EB',
  },
  IELTS: {
    code: 'IELTS',
    label: 'IELTS Academic / General Training',
    shortLabel: 'IELTS (Band 0–9)',
    organization: 'IELTS Partners (British Council / IDP / Cambridge)',
    description: 'Thang điểm Band 0.0–9.0 (bước 0.5) cho 4 kỹ năng và Overall theo quy tắc làm tròn chính thức.',
    examTypes: ['IELTS'],
    color: '#DC2626',
  },
  PEARSON_EDEXCEL: {
    code: 'PEARSON_EDEXCEL',
    label: 'Pearson Edexcel International (iPrimary / iLowerSecondary)',
    shortLabel: 'Pearson iPrimary / iLS',
    organization: 'Pearson Edexcel',
    description: 'Đánh giá độc lập theo từng môn học (Mathematics, Science) và mức đạt chuẩn P1/P2/P3 hoặc S1–S4.',
    examTypes: ['IPRIMARY', 'ILOWERSECONDARY'],
    color: '#7C3AED',
  },
  CAMBRIDGE_CHECKPOINT: {
    code: 'CAMBRIDGE_CHECKPOINT',
    label: 'Cambridge Primary & Lower Secondary Checkpoint',
    shortLabel: 'Cambridge Checkpoint',
    organization: 'Cambridge Assessment International Education (CAIE)',
    description: 'Đánh giá độc lập từng môn (ESL, Mathematics, Science) trên thang 0–50 và 6 mức Performance Band.',
    examTypes: ['PRIMARY_CHECKPOINT', 'LOWER_SECONDARY_CHECKPOINT'],
    color: '#D97706',
  },
};

export const EXAM_TYPE_META: Record<
  ExamTypeCode,
  {
    code: ExamTypeCode;
    family: ExamFamilyCode;
    label: string;
    shortLabel: string;
    targetCefr?: string;
    badgeColor: string;
  }
> = {
  STARTERS: {
    code: 'STARTERS',
    family: 'CAMBRIDGE_YLE',
    label: 'Pre A1 Starters',
    shortLabel: 'Starters',
    targetCefr: 'Pre-A1',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
  },
  MOVERS: {
    code: 'MOVERS',
    family: 'CAMBRIDGE_YLE',
    label: 'A1 Movers',
    shortLabel: 'Movers',
    targetCefr: 'A1',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  FLYERS: {
    code: 'FLYERS',
    family: 'CAMBRIDGE_YLE',
    label: 'A2 Flyers',
    shortLabel: 'Flyers',
    targetCefr: 'A2',
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  },
  KET: {
    code: 'KET',
    family: 'CAMBRIDGE_MAIN',
    label: 'A2 Key (KET)',
    shortLabel: 'KET (A2 Key)',
    targetCefr: 'A2',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  PET: {
    code: 'PET',
    family: 'CAMBRIDGE_MAIN',
    label: 'B1 Preliminary (PET)',
    shortLabel: 'PET (B1 Prelim)',
    targetCefr: 'B1',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  IELTS: {
    code: 'IELTS',
    family: 'IELTS',
    label: 'IELTS Academic',
    shortLabel: 'IELTS',
    targetCefr: 'B2–C2',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  IPRIMARY: {
    code: 'IPRIMARY',
    family: 'PEARSON_EDEXCEL',
    label: 'Pearson Edexcel iPrimary',
    shortLabel: 'Pearson iPrimary',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  ILOWERSECONDARY: {
    code: 'ILOWERSECONDARY',
    family: 'PEARSON_EDEXCEL',
    label: 'Pearson Edexcel iLowerSecondary',
    shortLabel: 'Pearson iLowerSecondary',
    badgeColor: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  },
  PRIMARY_CHECKPOINT: {
    code: 'PRIMARY_CHECKPOINT',
    family: 'CAMBRIDGE_CHECKPOINT',
    label: 'Cambridge Primary Checkpoint',
    shortLabel: 'Primary Checkpoint',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  LOWER_SECONDARY_CHECKPOINT: {
    code: 'LOWER_SECONDARY_CHECKPOINT',
    family: 'CAMBRIDGE_CHECKPOINT',
    label: 'Cambridge Lower Secondary Checkpoint',
    shortLabel: 'Lower Sec Checkpoint',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
  },
};

// ============================================================================
// 1. CAMBRIDGE YLE (STARTERS / MOVERS / FLYERS) RULES & CALCULATORS
// ============================================================================

export type YleSkylineGroupCode = '0_6' | '7_9' | '10_14' | '15';

export const YLE_SKYLINE_GROUPS: Record<
  YleSkylineGroupCode,
  { code: YleSkylineGroupCode; label: string; min: number; max: number; color: string }
> = {
  '0_6': { code: '0_6', label: '0–6 khiên (Cần hỗ trợ nền tảng)', min: 0, max: 6, color: '#EF4444' },
  '7_9': { code: '7_9', label: '7–9 khiên (Đang phát triển)', min: 7, max: 9, color: '#F59E0B' },
  '10_14': { code: '10_14', label: '10–14 khiên (Đạt mục tiêu nội bộ)', min: 10, max: 14, color: '#3B82F6' },
  '15': { code: '15', label: '15 khiên tuyệt đối (Xuất sắc)', min: 15, max: 15, color: '#10B981' },
};

export function classifyYleShieldGroup(totalShields: number): YleSkylineGroupCode {
  if (totalShields >= 15) return '15';
  if (totalShields >= 10) return '10_14';
  if (totalShields >= 7) return '7_9';
  return '0_6';
}

export function formatYleResultCode(rw: number, listening: number, speaking: number): string {
  return `RW${rw}-L${listening}-S${speaking}`;
}

export function parseYleResultCode(codeStr: string | null | undefined): {
  rw: number;
  listening: number;
  speaking: number;
  total: number;
} | null {
  if (!codeStr) return null;
  const cleaned = String(codeStr).trim().toUpperCase();
  const match = cleaned.match(/RW\s*(\d)\s*[-/,\s]+\s*L\s*(\d)\s*[-/,\s]+\s*S\s*(\d)/i);
  if (!match) return null;
  const rw = parseInt(match[1], 10);
  const listening = parseInt(match[2], 10);
  const speaking = parseInt(match[3], 10);
  if (
    isNaN(rw) ||
    isNaN(listening) ||
    isNaN(speaking) ||
    rw < 0 ||
    rw > 5 ||
    listening < 0 ||
    listening > 5 ||
    speaking < 0 ||
    speaking > 5
  ) {
    return null;
  }
  return {
    rw,
    listening,
    speaking,
    total: rw + listening + speaking,
  };
}

export function evaluateYleResult(params: {
  rw?: number | null;
  listening?: number | null;
  speaking?: number | null;
  historicalTotalOnly?: number | null;
  internalTargetShields?: number;
}) {
  const target = params.internalTargetShields ?? 10;
  const hasAllThree =
    params.rw !== null &&
    params.rw !== undefined &&
    params.listening !== null &&
    params.listening !== undefined &&
    params.speaking !== null &&
    params.speaking !== undefined;

  if (hasAllThree) {
    const rw = Math.max(0, Math.min(5, Math.round(Number(params.rw))));
    const listening = Math.max(0, Math.min(5, Math.round(Number(params.listening))));
    const speaking = Math.max(0, Math.min(5, Math.round(Number(params.speaking))));
    const total = rw + listening + speaking;
    return {
      rw,
      listening,
      speaking,
      yleTotalShields: total,
      yleResultCode: formatYleResultCode(rw, listening, speaking),
      yleSkylineGroup: classifyYleShieldGroup(total),
      yleMeetsInternalTarget: total >= target,
      is15Shields: total === 15,
      dataCompleteness: 'FULL_COMPONENTS' as const,
    };
  }

  if (params.historicalTotalOnly !== null && params.historicalTotalOnly !== undefined) {
    const total = Math.max(0, Math.min(15, Math.round(Number(params.historicalTotalOnly))));
    return {
      rw: null,
      listening: null,
      speaking: null,
      yleTotalShields: total,
      yleResultCode: null,
      yleSkylineGroup: classifyYleShieldGroup(total),
      yleMeetsInternalTarget: total >= target,
      is15Shields: total === 15,
      dataCompleteness: 'HISTORICAL_OVERALL_ONLY' as const,
    };
  }

  return null;
}

// ============================================================================
// 2. CAMBRIDGE ENGLISH MAIN SUITE (KET / PET) RULES & CALCULATORS
// ============================================================================

export type CamGradeCode =
  | 'GRADE_A'
  | 'GRADE_B'
  | 'GRADE_C'
  | 'LEVEL_A1'
  | 'LEVEL_A2'
  | 'BELOW_THRESHOLD';

export interface CamEvaluationOutput {
  examType: 'KET' | 'PET';
  camOverallScale: number;
  camCalculatedAverage: number | null;
  camOfficialGrade: CamGradeCode;
  camOfficialStatement: string;
  camCefrLevel: 'B2' | 'B1' | 'A2' | 'A1' | 'BELOW_A1' | 'BELOW_A2';
  camAwardedCertificate: boolean;
  camMeetsTargetLevel: boolean;
  camExceedsLevel: boolean;
  dataCompleteness: 'FULL_COMPONENTS' | 'HISTORICAL_OVERALL_ONLY';
  scaleDiscrepancyWarning: string | null;
}

export function classifyKetScale(overallScale: number): {
  gradeCode: CamGradeCode;
  statement: string;
  cefr: 'B1' | 'A2' | 'A1' | 'BELOW_A1';
  awardedCertificate: boolean;
  meetsTargetLevel: boolean;
  exceedsLevel: boolean;
} {
  if (overallScale >= 140) {
    return {
      gradeCode: 'GRADE_A',
      statement: 'Pass at Grade A',
      cefr: 'B1',
      awardedCertificate: true,
      meetsTargetLevel: true,
      exceedsLevel: true,
    };
  }
  if (overallScale >= 133) {
    return {
      gradeCode: 'GRADE_B',
      statement: 'Pass at Grade B',
      cefr: 'A2',
      awardedCertificate: true,
      meetsTargetLevel: true,
      exceedsLevel: false,
    };
  }
  if (overallScale >= 120) {
    return {
      gradeCode: 'GRADE_C',
      statement: 'Pass at Grade C',
      cefr: 'A2',
      awardedCertificate: true,
      meetsTargetLevel: true,
      exceedsLevel: false,
    };
  }
  if (overallScale >= 100) {
    return {
      gradeCode: 'LEVEL_A1',
      statement: 'Council of Europe Level A1',
      cefr: 'A1',
      awardedCertificate: true,
      meetsTargetLevel: false,
      exceedsLevel: false,
    };
  }
  return {
    gradeCode: 'BELOW_THRESHOLD',
    statement: 'Not Reported (Below Certificate Threshold)',
    cefr: 'BELOW_A1',
    awardedCertificate: false,
    meetsTargetLevel: false,
    exceedsLevel: false,
  };
}

export function classifyPetScale(overallScale: number): {
  gradeCode: CamGradeCode;
  statement: string;
  cefr: 'B2' | 'B1' | 'A2' | 'BELOW_A2';
  awardedCertificate: boolean;
  meetsTargetLevel: boolean;
  exceedsLevel: boolean;
} {
  if (overallScale >= 160) {
    return {
      gradeCode: 'GRADE_A',
      statement: 'Pass at Grade A',
      cefr: 'B2',
      awardedCertificate: true,
      meetsTargetLevel: true,
      exceedsLevel: true,
    };
  }
  if (overallScale >= 153) {
    return {
      gradeCode: 'GRADE_B',
      statement: 'Pass at Grade B',
      cefr: 'B1',
      awardedCertificate: true,
      meetsTargetLevel: true,
      exceedsLevel: false,
    };
  }
  if (overallScale >= 140) {
    return {
      gradeCode: 'GRADE_C',
      statement: 'Pass at Grade C',
      cefr: 'B1',
      awardedCertificate: true,
      meetsTargetLevel: true,
      exceedsLevel: false,
    };
  }
  if (overallScale >= 120) {
    return {
      gradeCode: 'LEVEL_A2',
      statement: 'Council of Europe Level A2',
      cefr: 'A2',
      awardedCertificate: true,
      meetsTargetLevel: false,
      exceedsLevel: false,
    };
  }
  return {
    gradeCode: 'BELOW_THRESHOLD',
    statement: 'Not Reported (Below Certificate Threshold)',
    cefr: 'BELOW_A2',
    awardedCertificate: false,
    meetsTargetLevel: false,
    exceedsLevel: false,
  };
}

export function normalizeCamGradeString(
  rawGrade: string | null | undefined,
  examType: 'KET' | 'PET'
): CamGradeCode | null {
  if (!rawGrade) return null;
  const s = rawGrade.trim().toUpperCase();
  if (!s) return null;
  if (s.includes('GRADE A') || s === 'A' || s.includes('B1 - VƯỢT KHUNG') || s.includes('B2 - VƯỢT KHUNG')) {
    return 'GRADE_A';
  }
  if (s.includes('GRADE B') || s === 'B') return 'GRADE_B';
  if (s.includes('GRADE C') || s === 'C') return 'GRADE_C';
  if (s.includes('LEVEL A1') || s === 'A1') return 'LEVEL_A1';
  if (s.includes('LEVEL A2') || (examType === 'PET' && s === 'A2')) return 'LEVEL_A2';
  if (s.includes('NOT REPORTED') || s.includes('BELOW') || s.includes('KHÔNG ĐẠT') || s.includes('CHƯA ĐẠT')) {
    return 'BELOW_THRESHOLD';
  }
  return null;
}

export function parseCamSkillBreakdownCode(codeStr: string | null | undefined): {
  reading: number;
  writing: number;
  listening: number;
  speaking: number;
  suggestedOverall: number;
} | null {
  if (!codeStr) return null;
  const cleaned = String(codeStr).trim().toUpperCase();
  // Format: R132-W133-L147-S150
  const match = cleaned.match(
    /R\s*(\d{2,3})\s*[-/,\s]+\s*W\s*(\d{2,3})\s*[-/,\s]+\s*L\s*(\d{2,3})\s*[-/,\s]+\s*S\s*(\d{2,3})/i
  );
  if (!match) return null;
  const reading = parseInt(match[1], 10);
  const writing = parseInt(match[2], 10);
  const listening = parseInt(match[3], 10);
  const speaking = parseInt(match[4], 10);
  return {
    reading,
    writing,
    listening,
    speaking,
    suggestedOverall: Math.round((reading + writing + listening + speaking) / 4),
  };
}

export function evaluateCamMainSuiteResult(params: {
  examType: 'KET' | 'PET';
  reading?: number | null;
  writing?: number | null;
  listening?: number | null;
  speaking?: number | null;
  officialOverall?: number | null;
  rawGradeOverride?: string | null;
}): CamEvaluationOutput | null {
  const has4Skills =
    params.reading !== null &&
    params.reading !== undefined &&
    params.writing !== null &&
    params.writing !== undefined &&
    params.listening !== null &&
    params.listening !== undefined &&
    params.speaking !== null &&
    params.speaking !== undefined;

  const calculatedAvg = has4Skills
    ? Number(
        (
          (Number(params.reading) +
            Number(params.writing) +
            Number(params.listening) +
            Number(params.speaking)) /
          4
        ).toFixed(2)
      )
    : null;

  const suggestedOverall = calculatedAvg !== null ? Math.round(calculatedAvg) : null;
  const finalOverall =
    params.officialOverall !== null && params.officialOverall !== undefined
      ? Math.round(Number(params.officialOverall))
      : suggestedOverall;

  if (finalOverall === null || isNaN(finalOverall)) {
    return null;
  }

  const ruleResult =
    params.examType === 'KET' ? classifyKetScale(finalOverall) : classifyPetScale(finalOverall);

  let scaleDiscrepancyWarning: string | null = null;
  if (
    suggestedOverall !== null &&
    params.officialOverall !== null &&
    params.officialOverall !== undefined &&
    Math.abs(finalOverall - suggestedOverall) > 2
  ) {
    scaleDiscrepancyWarning = `Điểm Overall chính thức (${finalOverall}) lệch ${Math.abs(
      finalOverall - suggestedOverall
    )} điểm so với trung bình 4 kỹ năng (${suggestedOverall}). Hệ thống ưu tiên giữ điểm Overall trên bảng điểm gốc.`;
  }

  return {
    examType: params.examType,
    camOverallScale: finalOverall,
    camCalculatedAverage: calculatedAvg,
    camOfficialGrade: ruleResult.gradeCode,
    camOfficialStatement: params.rawGradeOverride?.trim() || ruleResult.statement,
    camCefrLevel: ruleResult.cefr,
    camAwardedCertificate: ruleResult.awardedCertificate,
    camMeetsTargetLevel: ruleResult.meetsTargetLevel,
    camExceedsLevel: ruleResult.exceedsLevel,
    dataCompleteness: has4Skills ? 'FULL_COMPONENTS' : 'HISTORICAL_OVERALL_ONLY',
    scaleDiscrepancyWarning,
  };
}

// ============================================================================
// 3. IELTS (ACADEMIC / GENERAL TRAINING) RULES & CALCULATORS
// ============================================================================

export type IeltsBandGroupCode =
  | 'UNDER_4_0'
  | '4_0_4_5'
  | '5_0_5_5'
  | '6_0_6_5'
  | '7_0_7_5'
  | '8_0_PLUS';

export const IELTS_BAND_GROUPS: Record<
  IeltsBandGroupCode,
  { code: IeltsBandGroupCode; label: string; min: number; max: number; color: string }
> = {
  UNDER_4_0: { code: 'UNDER_4_0', label: 'Dưới 4.0', min: 0, max: 3.5, color: '#EF4444' },
  '4_0_4_5': { code: '4_0_4_5', label: 'Band 4.0–4.5', min: 4.0, max: 4.5, color: '#F97316' },
  '5_0_5_5': { code: '5_0_5_5', label: 'Band 5.0–5.5', min: 5.0, max: 5.5, color: '#F59E0B' },
  '6_0_6_5': { code: '6_0_6_5', label: 'Band 6.0–6.5', min: 6.0, max: 6.5, color: '#3B82F6' },
  '7_0_7_5': { code: '7_0_7_5', label: 'Band 7.0–7.5', min: 7.0, max: 7.5, color: '#10B981' },
  '8_0_PLUS': { code: '8_0_PLUS', label: 'Từ 8.0 trở lên', min: 8.0, max: 9.0, color: '#7C3AED' },
};

/**
 * Official IELTS Rounding Rule:
 * Average of 4 skills ending in .25 is rounded up to .5; ending in .75 is rounded up to the next whole band.
 * Mathematically equivalent to Math.round(avg * 2) / 2 for standard 0.5-increment inputs.
 */
export function calculateOfficialIeltsOverall(
  listening: number,
  reading: number,
  writing: number,
  speaking: number
): number {
  const avg = (listening + reading + writing + speaking) / 4;
  return Math.round(avg * 2) / 2;
}

export function isValidIeltsBand(val: number): boolean {
  if (typeof val !== 'number' || isNaN(val)) return false;
  if (val < 0 || val > 9.0) return false;
  return Math.abs(val * 2 - Math.round(val * 2)) < 1e-6;
}

export function parseRawIeltsBand(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    return isValidIeltsBand(raw) ? raw : null;
  }
  const cleaned = String(raw)
    .replace(/IELTS/gi, '')
    .replace(/BAND/gi, '')
    .replace(/,/g, '.')
    .trim();
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  const rounded = Math.round(num * 2) / 2;
  if (rounded < 0 || rounded > 9.0) return null;
  return rounded;
}

export function classifyIeltsBandGroup(overallBand: number): IeltsBandGroupCode {
  if (overallBand >= 8.0) return '8_0_PLUS';
  if (overallBand >= 7.0) return '7_0_7_5';
  if (overallBand >= 6.0) return '6_0_6_5';
  if (overallBand >= 5.0) return '5_0_5_5';
  if (overallBand >= 4.0) return '4_0_4_5';
  return 'UNDER_4_0';
}

export function mapIeltsToCefr(overallBand: number): 'C2' | 'C1' | 'B2' | 'B1' | 'A2' | 'BELOW_A2' {
  if (overallBand >= 8.5) return 'C2';
  if (overallBand >= 7.0) return 'C1';
  if (overallBand >= 5.5) return 'B2';
  if (overallBand >= 4.0) return 'B1';
  if (overallBand >= 3.0) return 'A2';
  return 'BELOW_A2';
}

export function evaluateIeltsResult(params: {
  listening?: number | null;
  reading?: number | null;
  writing?: number | null;
  speaking?: number | null;
  officialOverall?: number | null;
}) {
  const has4Skills =
    params.listening !== null &&
    params.listening !== undefined &&
    params.reading !== null &&
    params.reading !== undefined &&
    params.writing !== null &&
    params.writing !== undefined &&
    params.speaking !== null &&
    params.speaking !== undefined;

  const calculatedOverall = has4Skills
    ? calculateOfficialIeltsOverall(
        Number(params.listening),
        Number(params.reading),
        Number(params.writing),
        Number(params.speaking)
      )
    : null;

  const finalOverall =
    params.officialOverall !== null && params.officialOverall !== undefined
      ? Number(params.officialOverall)
      : calculatedOverall;

  if (finalOverall === null || !isValidIeltsBand(finalOverall)) {
    return null;
  }

  let strongestSkill: string | null = null;
  let weakestSkill: string | null = null;

  if (has4Skills) {
    const entries: Array<{ code: string; val: number }> = [
      { code: 'LISTENING', val: Number(params.listening) },
      { code: 'READING', val: Number(params.reading) },
      { code: 'WRITING', val: Number(params.writing) },
      { code: 'SPEAKING', val: Number(params.speaking) },
    ];
    const maxVal = Math.max(...entries.map((e) => e.val));
    const minVal = Math.min(...entries.map((e) => e.val));
    const maxSkills = entries.filter((e) => e.val === maxVal).map((e) => e.code);
    const minSkills = entries.filter((e) => e.val === minVal).map((e) => e.code);

    strongestSkill = maxSkills.length === 1 ? maxSkills[0] : `TIE:${maxSkills.join(',')}`;
    weakestSkill = minSkills.length === 1 ? minSkills[0] : `TIE:${minSkills.join(',')}`;
  }

  let roundingDiscrepancyWarning: string | null = null;
  if (
    calculatedOverall !== null &&
    params.officialOverall !== null &&
    params.officialOverall !== undefined &&
    Math.abs(finalOverall - calculatedOverall) > 0.01
  ) {
    roundingDiscrepancyWarning = `Điểm Overall nhập vào (${finalOverall.toFixed(
      1
    )}) khác với điểm làm tròn chuẩn từ 4 kỹ năng (${calculatedOverall.toFixed(
      1
    )}). Hệ thống ưu tiên lưu Overall trên TRF chính thức.`;
  }

  return {
    ieltsOverallBand: finalOverall,
    ieltsCalculatedOverall: calculatedOverall,
    ieltsBandGroup: classifyIeltsBandGroup(finalOverall),
    ieltsCefrLevel: mapIeltsToCefr(finalOverall),
    ieltsStrongestSkill: strongestSkill,
    ieltsWeakestSkill: weakestSkill,
    dataCompleteness: has4Skills ? ('FULL_COMPONENTS' as const) : ('HISTORICAL_OVERALL_ONLY' as const),
    roundingDiscrepancyWarning,
  };
}

// ============================================================================
// 4. PEARSON EDEXCEL (iPRIMARY & iLOWERSECONDARY) RULES & CALCULATORS
// ============================================================================

export type PearsonLevelCode =
  | 'P1'
  | 'P2'
  | 'P3'
  | 'BELOW_P1'
  | 'S1'
  | 'S2'
  | 'S3'
  | 'S4'
  | 'BELOW_S1';

export const PEARSON_LEVEL_META: Record<
  PearsonLevelCode,
  { code: PearsonLevelCode; label: string; program: 'IPRIMARY' | 'ILOWERSECONDARY'; isHigh: boolean; isLow: boolean; color: string }
> = {
  P3: { code: 'P3', label: 'P3 (Vượt chuẩn / Xuất sắc iPrimary)', program: 'IPRIMARY', isHigh: true, isLow: false, color: '#10B981' },
  P2: { code: 'P2', label: 'P2 (Đạt chuẩn vững chắc iPrimary)', program: 'IPRIMARY', isHigh: false, isLow: false, color: '#3B82F6' },
  P1: { code: 'P1', label: 'P1 (Đạt chuẩn cơ bản iPrimary)', program: 'IPRIMARY', isHigh: false, isLow: true, color: '#F59E0B' },
  BELOW_P1: { code: 'BELOW_P1', label: 'Unclassified (Dưới P1)', program: 'IPRIMARY', isHigh: false, isLow: true, color: '#EF4444' },
  S4: { code: 'S4', label: 'S4 (Xuất sắc iLowerSecondary)', program: 'ILOWERSECONDARY', isHigh: true, isLow: false, color: '#7C3AED' },
  S3: { code: 'S3', label: 'S3 (Tốt iLowerSecondary)', program: 'ILOWERSECONDARY', isHigh: true, isLow: false, color: '#10B981' },
  S2: { code: 'S2', label: 'S2 (Khá / Đạt chuẩn iLowerSecondary)', program: 'ILOWERSECONDARY', isHigh: false, isLow: false, color: '#3B82F6' },
  S1: { code: 'S1', label: 'S1 (Cơ bản iLowerSecondary)', program: 'ILOWERSECONDARY', isHigh: false, isLow: true, color: '#F59E0B' },
  BELOW_S1: { code: 'BELOW_S1', label: 'Unclassified (Dưới S1)', program: 'ILOWERSECONDARY', isHigh: false, isLow: true, color: '#EF4444' },
};

export function normalizePearsonBand(rawBand: string | null | undefined, examType?: 'IPRIMARY' | 'ILOWERSECONDARY'): PearsonLevelCode | null {
  if (!rawBand) return null;
  const s = String(rawBand).trim().toUpperCase();
  if (s === 'P1' || s === 'P2' || s === 'P3') return s as PearsonLevelCode;
  if (s === 'S1' || s === 'S2' || s === 'S3' || s === 'S4') return s as PearsonLevelCode;
  if (s.includes('UNCLASSIFIED') || s.includes('BELOW') || s === 'U') {
    return examType === 'ILOWERSECONDARY' ? 'BELOW_S1' : 'BELOW_P1';
  }
  return null;
}

/**
 * Suggests a reference Pearson level only when the official printed level is not yet entered,
 * while reminding the user that Pearson Edexcel grade boundaries vary by exam series (May/June vs Oct/Nov).
 */
export function suggestPearsonBandReference(
  score: number,
  examType: 'IPRIMARY' | 'ILOWERSECONDARY'
): PearsonLevelCode {
  if (examType === 'IPRIMARY') {
    if (score >= 49) return 'P3';
    if (score >= 35) return 'P2';
    if (score >= 20) return 'P1';
    return 'BELOW_P1';
  } else {
    if (score >= 68) return 'S4';
    if (score >= 54) return 'S3';
    if (score >= 38) return 'S2';
    if (score >= 22) return 'S1';
    return 'BELOW_S1';
  }
}

// ============================================================================
// 5. CAMBRIDGE CHECKPOINT (PRIMARY & LOWER SECONDARY) RULES & CALCULATORS
// ============================================================================

export type CheckpointBandCode =
  | 'UNCLASSIFIED'
  | 'BASIC'
  | 'ASPIRING'
  | 'GOOD'
  | 'HIGH'
  | 'OUTSTANDING';

export const CHECKPOINT_50_BANDS: Record<
  CheckpointBandCode,
  { code: CheckpointBandCode; label: string; min: number; max: number; isHighOutstanding: boolean; isLowPerformance: boolean; color: string }
> = {
  UNCLASSIFIED: {
    code: 'UNCLASSIFIED',
    label: 'Unclassified (0)',
    min: 0,
    max: 0,
    isHighOutstanding: false,
    isLowPerformance: true,
    color: '#6B7280',
  },
  BASIC: {
    code: 'BASIC',
    label: 'Basic (1–10)',
    min: 1,
    max: 10,
    isHighOutstanding: false,
    isLowPerformance: true,
    color: '#EF4444',
  },
  ASPIRING: {
    code: 'ASPIRING',
    label: 'Aspiring (11–20)',
    min: 11,
    max: 20,
    isHighOutstanding: false,
    isLowPerformance: true,
    color: '#F59E0B',
  },
  GOOD: {
    code: 'GOOD',
    label: 'Good (21–30)',
    min: 21,
    max: 30,
    isHighOutstanding: false,
    isLowPerformance: false,
    color: '#3B82F6',
  },
  HIGH: {
    code: 'HIGH',
    label: 'High (31–40)',
    min: 31,
    max: 40,
    isHighOutstanding: true,
    isLowPerformance: false,
    color: '#10B981',
  },
  OUTSTANDING: {
    code: 'OUTSTANDING',
    label: 'Outstanding (41–50)',
    min: 41,
    max: 50,
    isHighOutstanding: true,
    isLowPerformance: false,
    color: '#7C3AED',
  },
};

export function classifyCheckpoint50Score(score: number): {
  bandCode: CheckpointBandCode;
  bandLabel: string;
  isHighOutstanding: boolean;
  isLowPerformance: boolean;
} {
  const s = Math.max(0, Math.min(50, Math.round(score)));
  if (s === 0) {
    return { bandCode: 'UNCLASSIFIED', bandLabel: 'Unclassified', isHighOutstanding: false, isLowPerformance: true };
  }
  if (s <= 10) {
    return { bandCode: 'BASIC', bandLabel: 'Basic', isHighOutstanding: false, isLowPerformance: true };
  }
  if (s <= 20) {
    return { bandCode: 'ASPIRING', bandLabel: 'Aspiring', isHighOutstanding: false, isLowPerformance: true };
  }
  if (s <= 30) {
    return { bandCode: 'GOOD', bandLabel: 'Good', isHighOutstanding: false, isLowPerformance: false };
  }
  if (s <= 40) {
    return { bandCode: 'HIGH', bandLabel: 'High', isHighOutstanding: true, isLowPerformance: false };
  }
  return { bandCode: 'OUTSTANDING', bandLabel: 'Outstanding', isHighOutstanding: true, isLowPerformance: false };
}

export function classifyCheckpointLegacy6Score(score: number): {
  bandCode: CheckpointBandCode;
  bandLabel: string;
  isHighOutstanding: boolean;
  isLowPerformance: boolean;
} {
  if (score >= 5.0) return { bandCode: 'OUTSTANDING', bandLabel: 'Excellent (5.0–6.0)', isHighOutstanding: true, isLowPerformance: false };
  if (score >= 4.0) return { bandCode: 'HIGH', bandLabel: 'Very Good (4.0–4.9)', isHighOutstanding: true, isLowPerformance: false };
  if (score >= 3.0) return { bandCode: 'GOOD', bandLabel: 'Good (3.0–3.9)', isHighOutstanding: false, isLowPerformance: false };
  if (score >= 2.0) return { bandCode: 'ASPIRING', bandLabel: 'OK (2.0–2.9)', isHighOutstanding: false, isLowPerformance: true };
  return { bandCode: 'BASIC', bandLabel: 'Poor (<2.0)', isHighOutstanding: false, isLowPerformance: true };
}

export function normalizeCheckpointBandString(raw: string | null | undefined): CheckpointBandCode | null {
  if (!raw) return null;
  const s = String(raw).replace(/\u00A0/g, ' ').trim().toUpperCase();
  if (!s) return null;
  if (s.includes('OUTSTANDING')) return 'OUTSTANDING';
  if (s.includes('HIGH')) return 'HIGH';
  if (s.includes('GOOD')) return 'GOOD';
  if (s.includes('ASPIRING')) return 'ASPIRING';
  if (s.includes('BASIC')) return 'BASIC';
  if (s.includes('UNCLASSIFIED')) return 'UNCLASSIFIED';
  return null;
}

// ============================================================================
// 6. DEFAULT OFFICIAL RULE SETS CATALOG (SEED DATA)
// ============================================================================

const YLE_SKILLS_CONFIG: SkillComponentConfig[] = [
  { code: 'RW', name: 'Reading & Writing', nameVi: 'Đọc & Viết (Reading & Writing)', componentType: 'SKILL', scaleUnit: 'SHIELD', min: 0, max: 5, step: 1, sortOrder: 1 },
  { code: 'LISTENING', name: 'Listening', nameVi: 'Nghe (Listening)', componentType: 'SKILL', scaleUnit: 'SHIELD', min: 0, max: 5, step: 1, sortOrder: 2 },
  { code: 'SPEAKING', name: 'Speaking', nameVi: 'Nói (Speaking)', componentType: 'SKILL', scaleUnit: 'SHIELD', min: 0, max: 5, step: 1, sortOrder: 3 },
];

export const DEFAULT_INTL_EXAM_RULE_SETS: DefaultRuleSetDefinition[] = [
  {
    versionCode: 'YLE_STARTERS_SHIELD_V1',
    versionName: 'Cambridge Pre A1 Starters (Thang 15 Khiên)',
    examFamily: 'CAMBRIDGE_YLE',
    examType: 'STARTERS',
    organization: 'Cambridge English',
    effectiveFrom: '2018-01-01T00:00:00.000Z',
    scaleUnit: 'SHIELD',
    minOverall: 0,
    maxOverall: 15,
    stepSize: 1,
    gradeBoundaries: Object.values(YLE_SKYLINE_GROUPS),
    skylineTargets: { targetTotalShields: 10, minSkillShields: 3 },
    skillsConfig: YLE_SKILLS_CONFIG,
    allowPartialImport: true,
  },
  {
    versionCode: 'YLE_MOVERS_SHIELD_V1',
    versionName: 'Cambridge A1 Movers (Thang 15 Khiên)',
    examFamily: 'CAMBRIDGE_YLE',
    examType: 'MOVERS',
    organization: 'Cambridge English',
    effectiveFrom: '2018-01-01T00:00:00.000Z',
    scaleUnit: 'SHIELD',
    minOverall: 0,
    maxOverall: 15,
    stepSize: 1,
    gradeBoundaries: Object.values(YLE_SKYLINE_GROUPS),
    skylineTargets: { targetTotalShields: 10, minSkillShields: 3 },
    skillsConfig: YLE_SKILLS_CONFIG,
    allowPartialImport: true,
  },
  {
    versionCode: 'YLE_FLYERS_SHIELD_V1',
    versionName: 'Cambridge A2 Flyers (Thang 15 Khiên)',
    examFamily: 'CAMBRIDGE_YLE',
    examType: 'FLYERS',
    organization: 'Cambridge English',
    effectiveFrom: '2018-01-01T00:00:00.000Z',
    scaleUnit: 'SHIELD',
    minOverall: 0,
    maxOverall: 15,
    stepSize: 1,
    gradeBoundaries: Object.values(YLE_SKYLINE_GROUPS),
    skylineTargets: { targetTotalShields: 10, minSkillShields: 3 },
    skillsConfig: YLE_SKILLS_CONFIG,
    allowPartialImport: true,
  },
  {
    versionCode: 'KET_CAMBRIDGE_SCALE_2020_V1',
    versionName: 'Cambridge A2 Key (KET) – Cambridge English Scale (2020)',
    examFamily: 'CAMBRIDGE_MAIN',
    examType: 'KET',
    organization: 'Cambridge English',
    effectiveFrom: '2020-01-01T00:00:00.000Z',
    scaleUnit: 'CAMBRIDGE_SCALE',
    minOverall: 80,
    maxOverall: 150,
    stepSize: 1,
    gradeBoundaries: [
      { min: 140, max: 150, grade: 'GRADE_A', label: 'Grade A', cefr: 'B1', awarded: true, targetMet: true },
      { min: 133, max: 139, grade: 'GRADE_B', label: 'Grade B', cefr: 'A2', awarded: true, targetMet: true },
      { min: 120, max: 132, grade: 'GRADE_C', label: 'Grade C', cefr: 'A2', awarded: true, targetMet: true },
      { min: 100, max: 119, grade: 'LEVEL_A1', label: 'Level A1', cefr: 'A1', awarded: true, targetMet: false },
      { min: 80, max: 99, grade: 'BELOW_THRESHOLD', label: 'Not Reported (<100)', cefr: 'BELOW_A1', awarded: false, targetMet: false },
    ],
    skylineTargets: { targetScale: 120, targetCefr: 'A2', distinctionScale: 140 },
    skillsConfig: [
      { code: 'READING', name: 'Reading', nameVi: 'Đọc (Reading)', componentType: 'SKILL', scaleUnit: 'CAMBRIDGE_SCALE', min: 80, max: 150, step: 1, sortOrder: 1 },
      { code: 'WRITING', name: 'Writing', nameVi: 'Viết (Writing)', componentType: 'SKILL', scaleUnit: 'CAMBRIDGE_SCALE', min: 80, max: 150, step: 1, sortOrder: 2 },
      { code: 'LISTENING', name: 'Listening', nameVi: 'Nghe (Listening)', componentType: 'SKILL', scaleUnit: 'CAMBRIDGE_SCALE', min: 80, max: 150, step: 1, sortOrder: 3 },
      { code: 'SPEAKING', name: 'Speaking', nameVi: 'Nói (Speaking)', componentType: 'SKILL', scaleUnit: 'CAMBRIDGE_SCALE', min: 80, max: 150, step: 1, sortOrder: 4 },
    ],
    allowPartialImport: true,
  },
  {
    versionCode: 'PET_CAMBRIDGE_SCALE_2020_V1',
    versionName: 'Cambridge B1 Preliminary (PET) – Cambridge English Scale (2020)',
    examFamily: 'CAMBRIDGE_MAIN',
    examType: 'PET',
    organization: 'Cambridge English',
    effectiveFrom: '2020-01-01T00:00:00.000Z',
    scaleUnit: 'CAMBRIDGE_SCALE',
    minOverall: 100,
    maxOverall: 170,
    stepSize: 1,
    gradeBoundaries: [
      { min: 160, max: 170, grade: 'GRADE_A', label: 'Grade A', cefr: 'B2', awarded: true, targetMet: true },
      { min: 153, max: 159, grade: 'GRADE_B', label: 'Grade B', cefr: 'B1', awarded: true, targetMet: true },
      { min: 140, max: 152, grade: 'GRADE_C', label: 'Grade C', cefr: 'B1', awarded: true, targetMet: true },
      { min: 120, max: 139, grade: 'LEVEL_A2', label: 'Level A2', cefr: 'A2', awarded: true, targetMet: false },
      { min: 100, max: 119, grade: 'BELOW_THRESHOLD', label: 'Not Reported (<120)', cefr: 'BELOW_A2', awarded: false, targetMet: false },
    ],
    skylineTargets: { targetScale: 140, targetCefr: 'B1', distinctionScale: 160 },
    skillsConfig: [
      { code: 'READING', name: 'Reading', nameVi: 'Đọc (Reading)', componentType: 'SKILL', scaleUnit: 'CAMBRIDGE_SCALE', min: 100, max: 170, step: 1, sortOrder: 1 },
      { code: 'WRITING', name: 'Writing', nameVi: 'Viết (Writing)', componentType: 'SKILL', scaleUnit: 'CAMBRIDGE_SCALE', min: 100, max: 170, step: 1, sortOrder: 2 },
      { code: 'LISTENING', name: 'Listening', nameVi: 'Nghe (Listening)', componentType: 'SKILL', scaleUnit: 'CAMBRIDGE_SCALE', min: 100, max: 170, step: 1, sortOrder: 3 },
      { code: 'SPEAKING', name: 'Speaking', nameVi: 'Nói (Speaking)', componentType: 'SKILL', scaleUnit: 'CAMBRIDGE_SCALE', min: 100, max: 170, step: 1, sortOrder: 4 },
    ],
    allowPartialImport: true,
  },
  {
    versionCode: 'IELTS_OFFICIAL_BAND_V1',
    versionName: 'IELTS Official 9-Band Scale',
    examFamily: 'IELTS',
    examType: 'IELTS',
    organization: 'IELTS Partners',
    effectiveFrom: '2000-01-01T00:00:00.000Z',
    scaleUnit: 'IELTS_BAND',
    minOverall: 0,
    maxOverall: 9.0,
    stepSize: 0.5,
    gradeBoundaries: Object.values(IELTS_BAND_GROUPS),
    skylineTargets: { milestones: [6.0, 6.5, 7.0, 7.5, 8.0], defaultTargetBand: 6.5 },
    skillsConfig: [
      { code: 'LISTENING', name: 'Listening', nameVi: 'Nghe (Listening)', componentType: 'SKILL', scaleUnit: 'IELTS_BAND', min: 0, max: 9.0, step: 0.5, sortOrder: 1 },
      { code: 'READING', name: 'Reading', nameVi: 'Đọc (Reading)', componentType: 'SKILL', scaleUnit: 'IELTS_BAND', min: 0, max: 9.0, step: 0.5, sortOrder: 2 },
      { code: 'WRITING', name: 'Writing', nameVi: 'Viết (Writing)', componentType: 'SKILL', scaleUnit: 'IELTS_BAND', min: 0, max: 9.0, step: 0.5, sortOrder: 3 },
      { code: 'SPEAKING', name: 'Speaking', nameVi: 'Nói (Speaking)', componentType: 'SKILL', scaleUnit: 'IELTS_BAND', min: 0, max: 9.0, step: 0.5, sortOrder: 4 },
    ],
    allowPartialImport: true,
  },
  {
    versionCode: 'PEARSON_IPRIMARY_V1',
    versionName: 'Pearson Edexcel iPrimary (Mức P1 / P2 / P3 theo môn)',
    examFamily: 'PEARSON_EDEXCEL',
    examType: 'IPRIMARY',
    organization: 'Pearson Edexcel',
    effectiveFrom: '2019-01-01T00:00:00.000Z',
    scaleUnit: 'PEARSON_SCORE',
    minOverall: null,
    maxOverall: null,
    stepSize: 1,
    gradeBoundaries: [
      { code: 'P3', label: 'P3 (Highest Achievement)' },
      { code: 'P2', label: 'P2 (Expected Standard)' },
      { code: 'P1', label: 'P1 (Developing Standard)' },
      { code: 'BELOW_P1', label: 'Unclassified (Below P1)' },
    ],
    skylineTargets: { targetLevels: ['P2', 'P3'], excellenceLevel: 'P3' },
    skillsConfig: [
      { code: 'MATH', name: 'Mathematics', nameVi: 'Toán Quốc tế (Mathematics)', componentType: 'SUBJECT', scaleUnit: 'PEARSON_SCORE', min: 0, max: 60, step: 1, sortOrder: 1 },
      { code: 'SCIENCE', name: 'Science', nameVi: 'Khoa học Quốc tế (Science)', componentType: 'SUBJECT', scaleUnit: 'PEARSON_SCORE', min: 0, max: 60, step: 1, sortOrder: 2 },
      { code: 'ENGLISH', name: 'English', nameVi: 'Tiếng Anh (English)', componentType: 'SUBJECT', scaleUnit: 'PEARSON_SCORE', min: 0, max: 60, step: 1, sortOrder: 3 },
    ],
    allowPartialImport: true,
  },
  {
    versionCode: 'PEARSON_ILOWERSECONDARY_V1',
    versionName: 'Pearson Edexcel iLowerSecondary (Mức S1 / S2 / S3 / S4 theo môn)',
    examFamily: 'PEARSON_EDEXCEL',
    examType: 'ILOWERSECONDARY',
    organization: 'Pearson Edexcel',
    effectiveFrom: '2019-01-01T00:00:00.000Z',
    scaleUnit: 'PEARSON_SCORE',
    minOverall: null,
    maxOverall: null,
    stepSize: 1,
    gradeBoundaries: [
      { code: 'S4', label: 'S4 (Exceptional Achievement)' },
      { code: 'S3', label: 'S3 (High Achievement)' },
      { code: 'S2', label: 'S2 (Expected Standard)' },
      { code: 'S1', label: 'S1 (Developing Standard)' },
      { code: 'BELOW_S1', label: 'Unclassified (Below S1)' },
    ],
    skylineTargets: { targetLevels: ['S2', 'S3', 'S4'], excellenceLevels: ['S3', 'S4'] },
    skillsConfig: [
      { code: 'MATH', name: 'Mathematics', nameVi: 'Toán Quốc tế (Mathematics)', componentType: 'SUBJECT', scaleUnit: 'PEARSON_SCORE', min: 0, max: 80, step: 1, sortOrder: 1 },
      { code: 'SCIENCE', name: 'Science', nameVi: 'Khoa học Quốc tế (Science)', componentType: 'SUBJECT', scaleUnit: 'PEARSON_SCORE', min: 0, max: 80, step: 1, sortOrder: 2 },
      { code: 'ENGLISH', name: 'English', nameVi: 'Tiếng Anh (English)', componentType: 'SUBJECT', scaleUnit: 'PEARSON_SCORE', min: 0, max: 80, step: 1, sortOrder: 3 },
    ],
    allowPartialImport: true,
  },
  {
    versionCode: 'CHECKPOINT_PRIMARY_50_2023_V1',
    versionName: 'Cambridge Primary Checkpoint – Thang 0–50 (Từ 2023)',
    examFamily: 'CAMBRIDGE_CHECKPOINT',
    examType: 'PRIMARY_CHECKPOINT',
    organization: 'Cambridge Assessment International Education',
    effectiveFrom: '2023-01-01T00:00:00.000Z',
    scaleUnit: 'CHECKPOINT_50',
    minOverall: null,
    maxOverall: null,
    stepSize: 1,
    gradeBoundaries: Object.values(CHECKPOINT_50_BANDS),
    skylineTargets: { highOutstandingMin: 31, goodMin: 21 },
    skillsConfig: [
      { code: 'ESL', name: 'English as a Second Language (ESL)', nameVi: 'Tiếng Anh (ESL)', componentType: 'SUBJECT', scaleUnit: 'CHECKPOINT_50', min: 0, max: 50, step: 1, sortOrder: 1 },
      { code: 'MATH', name: 'Mathematics', nameVi: 'Toán Quốc tế (Mathematics)', componentType: 'SUBJECT', scaleUnit: 'CHECKPOINT_50', min: 0, max: 50, step: 1, sortOrder: 2 },
      { code: 'SCIENCE', name: 'Science', nameVi: 'Khoa học Quốc tế (Science)', componentType: 'SUBJECT', scaleUnit: 'CHECKPOINT_50', min: 0, max: 50, step: 1, sortOrder: 3 },
    ],
    allowPartialImport: true,
  },
  {
    versionCode: 'CHECKPOINT_LOWER_SEC_50_2023_V1',
    versionName: 'Cambridge Lower Secondary Checkpoint – Thang 0–50 (Từ 2023)',
    examFamily: 'CAMBRIDGE_CHECKPOINT',
    examType: 'LOWER_SECONDARY_CHECKPOINT',
    organization: 'Cambridge Assessment International Education',
    effectiveFrom: '2023-01-01T00:00:00.000Z',
    scaleUnit: 'CHECKPOINT_50',
    minOverall: null,
    maxOverall: null,
    stepSize: 1,
    gradeBoundaries: Object.values(CHECKPOINT_50_BANDS),
    skylineTargets: { highOutstandingMin: 31, goodMin: 21 },
    skillsConfig: [
      { code: 'ESL', name: 'English as a Second Language (ESL)', nameVi: 'Tiếng Anh (ESL)', componentType: 'SUBJECT', scaleUnit: 'CHECKPOINT_50', min: 0, max: 50, step: 1, sortOrder: 1 },
      { code: 'MATH', name: 'Mathematics', nameVi: 'Toán Quốc tế (Mathematics)', componentType: 'SUBJECT', scaleUnit: 'CHECKPOINT_50', min: 0, max: 50, step: 1, sortOrder: 2 },
      { code: 'SCIENCE', name: 'Science', nameVi: 'Khoa học Quốc tế (Science)', componentType: 'SUBJECT', scaleUnit: 'CHECKPOINT_50', min: 0, max: 50, step: 1, sortOrder: 3 },
    ],
    allowPartialImport: true,
  },
];

// ============================================================================
// 7. STRING & TEXT NORMALIZATION UTILITIES
// ============================================================================

export function normalizeVietnameseText(raw: string | null | undefined): string {
  if (!raw) return '';
  return String(raw)
    .normalize('NFC')
    .replace(/\u00A0/g, ' ')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripVietnameseAccents(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Converts Excel date serial numbers that were accidentally formatted from class names like "5/6" or "8/12"
 * back to their original class string, or parses actual dates.
 */
export function recoverClassFromExcelCell(val: any): {
  className: string;
  wasExcelSerial: boolean;
  warning?: string;
} {
  if (val === null || val === undefined) return { className: '', wasExcelSerial: false };
  const s = String(val).trim();
  if (!s) return { className: '', wasExcelSerial: false };

  // Known Excel serials from 'Thống kê các kỳ thi.xlsx' or 5-digit serial numbers in Class column
  if (/^\d{5}$/.test(s)) {
    const serial = parseInt(s, 10);
    // Excel epoch: Dec 30, 1899
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const yearShort = String(date.getUTCFullYear()).slice(-2);
    // In Vietnamese Excel, typing "6/5" or "8/12" turns into a date serial
    const recovered = `${month}/${day}`;
    return {
      className: recovered,
      wasExcelSerial: true,
      warning: `Ô Lớp gốc chứa số serial ngày Excel (${serial} ~ ${month}/${day}/${yearShort}), đã khôi phục tham chiếu Lớp "${recovered}" — cần kiểm tra đối soát.`,
    };
  }

  return { className: normalizeVietnameseText(s), wasExcelSerial: false };
}

export function inferGradeFromClassName(className: string | null | undefined, rawGrade?: string | null): string {
  if (rawGrade) {
    const m = String(rawGrade).match(/(\d{1,2})/);
    if (m) return m[1];
  }
  if (!className) return '';
  const m = String(className).trim().match(/^(\d{1,2})/);
  if (m) return m[1];
  return '';
}

export function inferEduSystemFromClassName(className: string | null | undefined, examFamily?: ExamFamilyCode): string {
  if (!className) {
    if (examFamily === 'CAMBRIDGE_CHECKPOINT' || examFamily === 'PEARSON_EDEXCEL') return 'Quốc tế / Song ngữ';
    return 'Hội nhập';
  }
  const u = className.toUpperCase();
  if (u.includes('GAC') || u.includes('QT') || u.includes('INT')) return 'Quốc tế (GAC)';
  if (u.includes('SN') || u.includes('BIL')) return 'Song ngữ';
  if (u.includes('TH')) return 'Tích hợp';
  return 'Hội nhập';
}
