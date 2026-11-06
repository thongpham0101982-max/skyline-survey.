'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getAdminSession } from '@/lib/session';
import { logActivity } from '@/lib/audit';
import {
  CHECKPOINT_50_BANDS,
  ExamFamilyCode,
  ExamTypeCode,
  IELTS_BAND_GROUPS,
  YLE_SKYLINE_GROUPS,
  classifyCheckpoint50Score,
  classifyCheckpointLegacy6Score,
  evaluateCamMainSuiteResult,
  evaluateIeltsResult,
  evaluateYleResult,
  inferEduSystemFromClassName,
  inferGradeFromClassName,
  normalizePearsonBand,
  normalizeVietnameseText,
  stripVietnameseAccents,
  suggestPearsonBandReference,
} from '@/lib/intl-exams/ruleEngine';
import {
  commitStagedImportBatch,
  ensureDefaultRuleSetsSeeded,
  normalizeCampusCode,
  recomputeIeltsLongitudinalFlags,
  stageAndOptionallyCommitExcelImport,
} from '@/lib/intl-exams/excelImportService';
import {
  SendIntlExamNotificationInput,
  dispatchIntlExamNotifications,
  resolveRecipientsForResults,
} from '@/lib/intl-exams/notificationService';

export interface IntlExamFilterInput {
  academicYear?: string;
  semester?: string; // ALL | HK1 | HK2 | SUMMER
  examMonth?: string; // ALL | 1..12
  campusCode?: string;
  grade?: string;
  className?: string;
  eduSystem?: string;
  examFamily?: string;
  examType?: string;
  search?: string;
}

function resolveExamMonthAndSemester(r: any): {
  examMonth: number | null;
  semesterCode: 'HK1' | 'HK2' | 'SUMMER';
  semesterLabel: string;
} {
  let month: number | null = null;
  if (r.examDate) {
    const d = new Date(r.examDate);
    if (!isNaN(d.getTime())) {
      month = d.getMonth() + 1;
    }
  }
  if (!month && r.session?.examMonth) {
    month = Number(r.session.examMonth) || null;
  }
  const sessionCodeStr = String(r.session?.sessionCode || '');
  let explicitSemester: 'HK1' | 'HK2' | 'SUMMER' | null = null;
  if (sessionCodeStr.includes('-HK1')) explicitSemester = 'HK1';
  else if (sessionCodeStr.includes('-HK2')) explicitSemester = 'HK2';
  else if (sessionCodeStr.includes('-SUMMER')) explicitSemester = 'SUMMER';

  let semesterCode: 'HK1' | 'HK2' | 'SUMMER' = explicitSemester || 'HK1';
  if (!explicitSemester && month) {
    if (month >= 8 && month <= 12) semesterCode = 'HK1';
    else if (month >= 1 && month <= 5) semesterCode = 'HK2';
    else semesterCode = 'SUMMER';
  }

  const semesterLabel =
    semesterCode === 'HK1'
      ? 'Học kỳ I'
      : semesterCode === 'HK2'
      ? 'Học kỳ II'
      : 'Học kỳ Hè';

  return { examMonth: month, semesterCode, semesterLabel };
}

export async function getIntlExamsWorkspaceData(filters: IntlExamFilterInput = {}) {
  await ensureDefaultRuleSetsSeeded();

  // Strictly display ONLY records belonging to students existing in SSM
  const whereClause: any = {
    studentId: { not: null },
    isStudentVerified: true,
  };
  if (filters.academicYear && filters.academicYear !== 'ALL') {
    whereClause.academicYearText = filters.academicYear;
  }
  if (filters.campusCode && filters.campusCode !== 'ALL') {
    whereClause.campusCodeSnapshot = filters.campusCode;
  }
  if (filters.grade && filters.grade !== 'ALL') {
    whereClause.gradeSnapshot = filters.grade;
  }
  if (filters.className && filters.className !== 'ALL') {
    whereClause.classNameSnapshot = filters.className;
  }
  if (filters.eduSystem && filters.eduSystem !== 'ALL') {
    whereClause.eduSystemSnapshot = filters.eduSystem;
  }
  if (filters.examFamily && filters.examFamily !== 'ALL') {
    whereClause.examFamily = filters.examFamily;
  }
  if (filters.examType && filters.examType !== 'ALL') {
    whereClause.examType = filters.examType;
  }

  const [
    ruleSets,
    sessions,
    ssmAcademicYears,
    ssmCampuses,
    ssmClasses,
    allSsmStudents,
    allResultsForOptions,
    rawFilteredResults,
    recentBatches,
  ] = await Promise.all([
    prisma.intlExamRuleSet.findMany({
      orderBy: [{ examFamily: 'asc' }, { examType: 'asc' }],
    }),
    prisma.intlExamSession.findMany({
      orderBy: [{ academicYearText: 'desc' }, { sessionCode: 'asc' }],
    }),
    prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true, status: true },
    }),
    prisma.campus.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { campusCode: 'asc' },
      select: { id: true, campusCode: true, campusName: true },
    }),
    prisma.class.findMany({
      where: { status: 'ACTIVE' },
      include: {
        campus: { select: { id: true, campusCode: true, campusName: true } },
        academicYear: { select: { id: true, name: true, status: true } },
      },
      orderBy: { className: 'asc' },
    }),
    prisma.student.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        studentCode: true,
        studentName: true,
        dateOfBirth: true,
        gender: true,
        classId: true,
        campusId: true,
        academicYearId: true,
      },
      orderBy: [{ studentName: 'asc' }],
    }),
    prisma.intlExamResult.findMany({
      where: {
        studentId: { not: null },
        isStudentVerified: true,
      },
      select: {
        academicYearText: true,
        campusCodeSnapshot: true,
        gradeSnapshot: true,
        classNameSnapshot: true,
        eduSystemSnapshot: true,
        examFamily: true,
        examType: true,
      },
    }),
    prisma.intlExamResult.findMany({
      where: whereClause,
      include: {
        skillResults: {
          orderBy: { sortOrder: 'asc' },
        },
        certificate: true,
        session: true,
        ruleSet: true,
      },
      orderBy: [{ academicYearText: 'desc' }, { examType: 'asc' }, { studentNameSnapshot: 'asc' }],
    }),
    prisma.intlImportBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        stagingRecords: {
          where: { matchedStudentId: { not: null } },
          take: 150,
          orderBy: { rowNumber: 'asc' },
        },
      },
    }),
  ]);

  const ayById = new Map(ssmAcademicYears.map((y) => [y.id, y]));
  const campusById = new Map(ssmCampuses.map((c) => [c.id, c]));
  const classById = new Map(ssmClasses.map((cl) => [cl.id, cl]));
  const studentCountByClassId = new Map<string, number>();

  const enrichedSsmStudents = allSsmStudents.map((s) => {
    if (s.classId) {
      studentCountByClassId.set(s.classId, (studentCountByClassId.get(s.classId) || 0) + 1);
    }
    const cls = classById.get(s.classId) || null;
    const cmp = cls?.campus || campusById.get(s.campusId) || null;
    const ay = ayById.get(s.academicYearId) || cls?.academicYear || null;
    return {
      ...s,
      class: cls,
      campus: cmp,
      academicYear: ay,
    };
  });

  const ssmStudentMap = new Map(enrichedSsmStudents.map((s) => [s.id, s]));

  const filteredResults = rawFilteredResults
    .filter((r) => r.studentId && ssmStudentMap.has(r.studentId))
    .map((r) => ({
      ...r,
      student: ssmStudentMap.get(r.studentId!) || null,
    }));

  // Apply search, semester, and examMonth filter in memory if provided
  const searchNorm = filters.search ? stripVietnameseAccents(filters.search) : '';
  const results = filteredResults.filter((r) => {
    const timeInfo = resolveExamMonthAndSemester(r);
    if (filters.semester && filters.semester !== 'ALL' && timeInfo.semesterCode !== filters.semester) {
      return false;
    }
    if (
      filters.examMonth &&
      filters.examMonth !== 'ALL' &&
      String(timeInfo.examMonth || '') !== String(filters.examMonth)
    ) {
      return false;
    }
    if (!searchNorm) return true;
    const ssmName = r.student?.studentName || r.studentNameSnapshot;
    const ssmCode = r.student?.studentCode || r.studentCodeSnapshot || '';
    const nameNorm = stripVietnameseAccents(ssmName);
    const codeNorm = ssmCode.toUpperCase();
    const certNorm = (r.certificate?.certificateNumber || '').toUpperCase();
    return (
      nameNorm.includes(searchNorm) ||
      codeNorm.includes(searchNorm) ||
      certNorm.includes(searchNorm)
    );
  });

  // Distinct filter options directly from SSM master tables + verified results
  const academicYears = Array.from(
    new Set<string>([
      ...ssmAcademicYears.map((y) => y.name),
      ...allResultsForOptions.map((r: any) => String(r.academicYearText || '')).filter(Boolean),
    ])
  ).sort((a: string, b: string) => b.localeCompare(a));

  const campuses = Array.from(
    new Set<string>([
      ...ssmCampuses.map((c) => c.campusCode),
      ...allResultsForOptions.map((r: any) => String(r.campusCodeSnapshot || '')).filter(Boolean),
    ])
  ).sort();

  const classesMatchingYearAndCampus = ssmClasses.filter((c) => {
    if (
      filters.academicYear &&
      filters.academicYear !== 'ALL' &&
      c.academicYear?.name !== filters.academicYear
    ) {
      return false;
    }
    if (
      filters.campusCode &&
      filters.campusCode !== 'ALL' &&
      c.campus?.campusCode !== filters.campusCode
    ) {
      return false;
    }
    return true;
  });

  const resultsMatchingYearAndCampus = allResultsForOptions.filter((r: any) => {
    if (
      filters.academicYear &&
      filters.academicYear !== 'ALL' &&
      r.academicYearText !== filters.academicYear
    ) {
      return false;
    }
    if (
      filters.campusCode &&
      filters.campusCode !== 'ALL' &&
      r.campusCodeSnapshot !== filters.campusCode
    ) {
      return false;
    }
    return true;
  });

  const grades = Array.from(
    new Set<string>([
      ...classesMatchingYearAndCampus
        .map((c) => inferGradeFromClassName(c.className, c.grade))
        .filter((g) => Boolean(g) && /^\d+$/.test(g)),
      ...resultsMatchingYearAndCampus.map((r: any) => String(r.gradeSnapshot || '')).filter(Boolean),
    ])
  ).sort((a: string, b: string) => Number(a) - Number(b));

  const classesMatchingGrade = classesMatchingYearAndCampus.filter((c) => {
    if (filters.grade && filters.grade !== 'ALL') {
      return inferGradeFromClassName(c.className, c.grade) === filters.grade;
    }
    return true;
  });

  const classes = Array.from(
    new Set<string>([
      ...classesMatchingGrade.map((c) => c.className).filter(Boolean),
      ...resultsMatchingYearAndCampus
        .filter((r: any) => !filters.grade || filters.grade === 'ALL' || String(r.gradeSnapshot || '') === filters.grade)
        .map((r: any) => String(r.classNameSnapshot || ''))
        .filter(Boolean),
    ])
  ).sort();

  const eduSystems = Array.from(
    new Set<string>([
      ...classesMatchingYearAndCampus.map((c) => String(c.educationSystem || '')).filter(Boolean),
      ...resultsMatchingYearAndCampus.map((r: any) => String(r.eduSystemSnapshot || '')).filter(Boolean),
    ])
  ).sort();

  // ==========================================================================
  // 4 EXPLICIT DENOMINATORS GOVERNANCE
  // ==========================================================================
  const completedResults = results.filter((r) => r.sittingStatus === 'COMPLETED');
  const absentResults = results.filter((r) => r.sittingStatus === 'ABSENT');

  const uniqueStudentKeys = new Set<string>();
  let totalComponentEntriesCount = 0;
  let awardedCertificatesCount = 0;
  let verifiedStudentsSittingsCount = 0;

  for (const r of completedResults) {
    const key = r.studentId
      ? `ID:${r.studentId}`
      : `NAME:${stripVietnameseAccents(r.studentNameSnapshot)}|${r.campusCodeSnapshot || ''}`;
    uniqueStudentKeys.add(key);
    totalComponentEntriesCount += r.skillResults.length;
    if (r.camAwardedCertificate !== false) {
      awardedCertificatesCount++;
    }
    if (r.isStudentVerified) {
      verifiedStudentsSittingsCount++;
    }
  }

  const denominators = {
    uniqueStudentsCount: uniqueStudentKeys.size,
    totalSittingsCount: results.length,
    completedSittingsCount: completedResults.length,
    absentSittingsCount: absentResults.length,
    totalComponentEntriesCount,
    awardedCertificatesCount,
    verifiedStudentsSittingsCount,
    unverifiedSittingsCount: completedResults.length - verifiedStudentsSittingsCount,
  };

  // ==========================================================================
  // 1. ANALYTICS: CAMBRIDGE YLE (STARTERS / MOVERS / FLYERS)
  // ==========================================================================
  const yleRows = completedResults.filter((r) => r.examFamily === 'CAMBRIDGE_YLE');
  const yleRule = ruleSets.find((rs) => rs.examFamily === 'CAMBRIDGE_YLE');
  const yleTargetShields = yleRule?.skylineTargetsJson
    ? JSON.parse(yleRule.skylineTargetsJson).targetTotalShields || 10
    : 10;

  const yleAnalytics = buildYleAnalytics(yleRows, yleTargetShields);

  // ==========================================================================
  // 2. ANALYTICS: CAMBRIDGE MAIN SUITE (KET / PET)
  // ==========================================================================
  const camMainRows = completedResults.filter((r) => r.examFamily === 'CAMBRIDGE_MAIN');
  const camMainAnalytics = buildCamMainAnalytics(camMainRows);

  // ==========================================================================
  // 3. ANALYTICS: IELTS
  // ==========================================================================
  const ieltsRows = completedResults.filter((r) => r.examFamily === 'IELTS');
  const ieltsRule = ruleSets.find((rs) => rs.examFamily === 'IELTS');
  const ieltsDefaultTarget = ieltsRule?.skylineTargetsJson
    ? JSON.parse(ieltsRule.skylineTargetsJson).defaultTargetBand || 6.5
    : 6.5;
  const ieltsAnalytics = buildIeltsAnalytics(ieltsRows, ieltsDefaultTarget);

  // ==========================================================================
  // 4. ANALYTICS: PEARSON EDEXCEL (iPRIMARY & iLOWERSECONDARY)
  // ==========================================================================
  const pearsonRows = completedResults.filter((r) => r.examFamily === 'PEARSON_EDEXCEL');
  const pearsonAnalytics = buildPearsonAnalytics(pearsonRows);

  // ==========================================================================
  // 5. ANALYTICS: CAMBRIDGE CHECKPOINT (PRIMARY & LOWER SECONDARY)
  // ==========================================================================
  const checkpointRows = completedResults.filter((r) => r.examFamily === 'CAMBRIDGE_CHECKPOINT');
  const checkpointAnalytics = buildCheckpointAnalytics(checkpointRows);

  // ==========================================================================
  // 6. COMPARATIVE REPORTS ACROSS CAMPUS, GRADE/CLASS, AND YEARS
  // ==========================================================================
  const comparativeReports = buildComparativeReports(completedResults);

  // ==========================================================================
  // 7. RECONCILIATION QUEUE (UNVERIFIED STUDENTS)
  // ==========================================================================
  const unverifiedResults = results
    .filter((r) => !r.isStudentVerified)
    .slice(0, 200)
    .map((r) => ({
      id: r.id,
      examFamily: r.examFamily,
      examType: r.examType,
      academicYearText: r.academicYearText,
      studentCodeSnapshot: r.studentCodeSnapshot,
      studentNameSnapshot: r.studentNameSnapshot,
      campusCodeSnapshot: r.campusCodeSnapshot,
      gradeSnapshot: r.gradeSnapshot,
      classNameSnapshot: r.classNameSnapshot,
      summaryScore: formatSummaryScoreLabel(r),
    }));

  // ==========================================================================
  // 8. SSM STUDENT ROSTER FOR SELECTION, ENTRY, EDIT & DELETE
  // ==========================================================================
  const serializedResults = results.map((r) => serializeExamResult(r));
  const resultsByStudentId = new Map<string, any[]>();
  const resultsByStudentCode = new Map<string, any[]>();

  for (const sr of serializedResults) {
    if (sr.studentId) {
      if (!resultsByStudentId.has(sr.studentId)) resultsByStudentId.set(sr.studentId, []);
      resultsByStudentId.get(sr.studentId)!.push(sr);
    }
    if (sr.studentCodeSnapshot) {
      if (!resultsByStudentCode.has(sr.studentCodeSnapshot)) {
        resultsByStudentCode.set(sr.studentCodeSnapshot, []);
      }
      resultsByStudentCode.get(sr.studentCodeSnapshot)!.push(sr);
    }
  }

  // Filter SSM students according to global filters
  const filteredSsmStudentsRaw = enrichedSsmStudents.filter((s) => {
    const ayName = s.academicYear?.name || s.class?.academicYear?.name || '';
    const cCode = s.class?.campus?.campusCode || s.campus?.campusCode || '';
    const cName = s.class?.className || '';
    const gVal = inferGradeFromClassName(cName, s.class?.grade || '');
    const edSys = s.class?.educationSystem || inferEduSystemFromClassName(cName) || '';

    if (filters.academicYear && filters.academicYear !== 'ALL' && ayName !== filters.academicYear) {
      return false;
    }
    if (filters.campusCode && filters.campusCode !== 'ALL' && cCode !== filters.campusCode) {
      return false;
    }
    if (filters.grade && filters.grade !== 'ALL' && gVal !== filters.grade) {
      return false;
    }
    if (filters.className && filters.className !== 'ALL' && cName !== filters.className) {
      return false;
    }
    if (filters.eduSystem && filters.eduSystem !== 'ALL' && edSys !== filters.eduSystem) {
      return false;
    }
    if (searchNorm) {
      const nameNorm = stripVietnameseAccents(s.studentName || '');
      const codeNorm = (s.studentCode || '').toUpperCase();
      if (!nameNorm.includes(searchNorm) && !codeNorm.includes(searchNorm)) {
        return false;
      }
    }
    return true;
  });

  // Deduplicate by studentCode when academicYear is 'ALL', preferring latest academic year (2026-2027)
  const dedupedStudentsMap = new Map<string, (typeof enrichedSsmStudents)[number]>();
  const sortedForDedup = [...filteredSsmStudentsRaw].sort((a, b) => {
    const ayA = a.academicYear?.name || a.class?.academicYear?.name || '';
    const ayB = b.academicYear?.name || b.class?.academicYear?.name || '';
    return ayB.localeCompare(ayA);
  });
  for (const s of sortedForDedup) {
    const key = s.studentCode || s.id;
    if (!dedupedStudentsMap.has(key)) {
      dedupedStudentsMap.set(key, s);
    }
  }

  const uniqueFilteredSsmStudents = Array.from(dedupedStudentsMap.values()).sort((a, b) => {
    const clsA = a.class?.className || '';
    const clsB = b.class?.className || '';
    if (clsA !== clsB) return clsA.localeCompare(clsB);
    return (a.studentName || '').localeCompare(b.studentName || '', 'vi');
  });

  const ssmStudentRoster = uniqueFilteredSsmStudents.map((s) => {
    const cName = s.class?.className || '';
    const cCode = s.class?.campus?.campusCode || s.campus?.campusCode || '';
    const cFull = s.class?.campus?.campusName || s.campus?.campusName || cCode;
    const gVal = inferGradeFromClassName(cName, s.class?.grade || '');
    const edSys = s.class?.educationSystem || inferEduSystemFromClassName(cName) || 'Hội nhập';
    const ayName = s.academicYear?.name || s.class?.academicYear?.name || '2026-2027';

    const byId = resultsByStudentId.get(s.id) || [];
    const byCode = s.studentCode ? resultsByStudentCode.get(s.studentCode) || [] : [];
    const mergedResultsMap = new Map<string, any>();
    for (const r of [...byId, ...byCode]) {
      mergedResultsMap.set(r.id, r);
    }

    return {
      id: s.id,
      studentCode: s.studentCode,
      studentName: s.studentName,
      dateOfBirth: s.dateOfBirth ? s.dateOfBirth.toISOString() : null,
      gender: s.gender || null,
      classId: s.classId,
      className: cName,
      grade: gVal,
      campusId: s.campusId,
      campusCode: cCode,
      campusName: cFull,
      eduSystem: edSys,
      academicYearName: ayName,
      examResults: Array.from(mergedResultsMap.values()),
    };
  });

  return {
    denominators: {
      ...denominators,
      totalSsmStudentsCount: uniqueFilteredSsmStudents.length,
    },
    ssmStudentRoster,
    filterOptions: {
      academicYears,
      campuses,
      grades,
      classes,
      eduSystems,
      ssmCampuses: ssmCampuses.map((c) => ({
        id: c.id,
        campusCode: c.campusCode,
        campusName: c.campusName,
      })),
      ssmClasses: ssmClasses.map((cl) => ({
        id: cl.id,
        classCode: cl.classCode,
        className: cl.className,
        grade: inferGradeFromClassName(cl.className, cl.grade),
        campusId: cl.campusId,
        campusCode: cl.campus?.campusCode || '',
        campusName: cl.campus?.campusName || '',
        academicYearName: cl.academicYear?.name || '',
        educationSystem: cl.educationSystem || '',
        studentCount: studentCountByClassId.get(cl.id) ?? 0,
      })),
    },
    ruleSets: ruleSets.map((rs) => ({
      ...rs,
      effectiveFrom: rs.effectiveFrom.toISOString(),
      effectiveTo: rs.effectiveTo ? rs.effectiveTo.toISOString() : null,
      createdAt: rs.createdAt.toISOString(),
      updatedAt: rs.updatedAt.toISOString(),
    })),
    sessions: sessions.map((s) => ({
      ...s,
      examDate: s.examDate ? s.examDate.toISOString() : null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    results: results.map((r) => serializeExamResult(r)),
    yleAnalytics,
    camMainAnalytics,
    ieltsAnalytics,
    pearsonAnalytics,
    checkpointAnalytics,
    comparativeReports,
    unverifiedResults,
    recentBatches: recentBatches.map((b) => ({
      id: b.id,
      batchCode: b.batchCode,
      fileName: b.fileName,
      totalSheets: b.totalSheets,
      totalRows: b.totalRows,
      validRows: b.validRows,
      warningRows: b.warningRows,
      errorRows: b.errorRows,
      matchedStudents: b.matchedStudents,
      unmatchedStudents: b.unmatchedStudents,
      status: b.status,
      summary: b.summaryJson ? JSON.parse(b.summaryJson) : [],
      createdAt: b.createdAt.toISOString(),
      stagingRecords: b.stagingRecords.map((stg) => ({
        id: stg.id,
        sheetName: stg.sheetName,
        rowNumber: stg.rowNumber,
        detectedExamFamily: stg.detectedExamFamily,
        detectedExamType: stg.detectedExamType,
        matchedStudentId: stg.matchedStudentId,
        matchedStudentCode: stg.matchedStudentCode,
        matchedStudentName: stg.matchedStudentName,
        matchConfidence: stg.matchConfidence,
        candidateMatches: stg.candidateMatchesJson ? JSON.parse(stg.candidateMatchesJson) : [],
        validationStatus: stg.validationStatus,
        validationMessages: stg.validationMessages ? JSON.parse(stg.validationMessages) : [],
        isCommitted: stg.isCommitted,
        normalized: JSON.parse(stg.normalizedJson),
      })),
    })),
  };
}

function formatSummaryScoreLabel(r: any): string {
  if (r.sittingStatus === 'ABSENT') return 'Vắng thi';
  if (r.examFamily === 'CAMBRIDGE_YLE') {
    return `${r.yleTotalShields ?? 0}/15 khiên${r.yleResultCode ? ` (${r.yleResultCode})` : ''}`;
  }
  if (r.examFamily === 'CAMBRIDGE_MAIN') {
    return `${r.camOverallScale ?? '-'} Scale • ${r.camOfficialGrade || ''} (${r.camCefrLevel || ''})`;
  }
  if (r.examFamily === 'IELTS') {
    return `Band ${r.ieltsOverallBand?.toFixed(1) ?? '-'}${r.ieltsCefrLevel ? ` (${r.ieltsCefrLevel})` : ''}`;
  }
  if (r.examFamily === 'PEARSON_EDEXCEL' || r.examFamily === 'CAMBRIDGE_CHECKPOINT') {
    return (r.skillResults || [])
      .map((s: any) => `${s.componentCode}: ${s.numericScore ?? '-'}${s.officialBandCode ? ` (${s.officialBandCode})` : ''}`)
      .join(' | ');
  }
  return '-';
}

function serializeExamResult(r: any) {
  const ssmStudent = r.student;
  const ssmClass = ssmStudent?.class;
  const ssmCampus = ssmClass?.campus || ssmStudent?.campus;

  const liveStudentCode = ssmStudent?.studentCode || r.studentCodeSnapshot;
  const liveStudentName = ssmStudent?.studentName || r.studentNameSnapshot;
  const liveCampusCode = ssmCampus?.campusCode || r.campusCodeSnapshot;
  const liveClassName = ssmClass?.className || r.classNameSnapshot;
  const liveGrade =
    inferGradeFromClassName(liveClassName, ssmClass?.grade) || r.gradeSnapshot;
  const liveEduSystem =
    ssmClass?.educationSystem ||
    r.eduSystemSnapshot ||
    inferEduSystemFromClassName(liveClassName, r.examFamily);

  return {
    id: r.id,
    sessionId: r.sessionId,
    sessionName: r.session?.sessionName || '',
    ruleSetId: r.ruleSetId,
    ruleSetVersion: r.ruleSet?.versionCode || '',
    examFamily: r.examFamily as ExamFamilyCode,
    examType: r.examType as ExamTypeCode,
    studentId: r.studentId,
    studentCodeSnapshot: liveStudentCode,
    studentNameSnapshot: liveStudentName,
    studentDobSnapshot: ssmStudent?.dateOfBirth
      ? ssmStudent.dateOfBirth.toISOString()
      : r.studentDobSnapshot
      ? r.studentDobSnapshot.toISOString()
      : null,
    campusIdSnapshot: ssmCampus?.id || r.campusIdSnapshot,
    campusCodeSnapshot: liveCampusCode,
    gradeSnapshot: liveGrade,
    classNameSnapshot: liveClassName,
    eduSystemSnapshot: liveEduSystem,
    academicYearText: r.academicYearText,
    examDate: r.examDate ? r.examDate.toISOString() : null,
    examMonth: resolveExamMonthAndSemester(r).examMonth,
    semesterCode: resolveExamMonthAndSemester(r).semesterCode,
    semesterLabel: resolveExamMonthAndSemester(r).semesterLabel,
    sittingStatus: r.sittingStatus,
    yleTotalShields: r.yleTotalShields,
    yleResultCode: r.yleResultCode,
    yleSkylineGroup: r.yleSkylineGroup,
    yleMeetsInternalTarget: r.yleMeetsInternalTarget,
    camOverallScale: r.camOverallScale,
    camCalculatedAverage: r.camCalculatedAverage,
    camOfficialGrade: r.camOfficialGrade,
    camOfficialStatement: r.camOfficialStatement,
    camCefrLevel: r.camCefrLevel,
    camAwardedCertificate: r.camAwardedCertificate,
    camMeetsTargetLevel: r.camMeetsTargetLevel,
    camExceedsLevel: r.camExceedsLevel,
    ieltsOverallBand: r.ieltsOverallBand,
    ieltsCalculatedOverall: r.ieltsCalculatedOverall,
    ieltsBandGroup: r.ieltsBandGroup,
    ieltsCefrLevel: r.ieltsCefrLevel,
    ieltsStrongestSkill: r.ieltsStrongestSkill,
    ieltsWeakestSkill: r.ieltsWeakestSkill,
    ieltsAttemptNumber: r.ieltsAttemptNumber,
    ieltsIsLatest: r.ieltsIsLatest,
    ieltsIsHighest: r.ieltsIsHighest,
    dataCompleteness: r.dataCompleteness,
    isHistoricalImport: r.isHistoricalImport,
    isStudentVerified: r.isStudentVerified,
    remarks: r.remarks,
    summaryScoreLabel: formatSummaryScoreLabel(r),
    skillResults: (r.skillResults || []).map((s: any) => ({
      id: s.id,
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
    certificate: r.certificate
      ? {
          id: r.certificate.id,
          certificateNumber: r.certificate.certificateNumber,
          candidateNumber: r.certificate.candidateNumber,
          centerNumber: r.certificate.centerNumber,
          issueDate: r.certificate.issueDate ? r.certificate.issueDate.toISOString() : null,
          expiryDate: r.certificate.expiryDate ? r.certificate.expiryDate.toISOString() : null,
          certificateStatus: r.certificate.certificateStatus,
          receivedByStudentAt: r.certificate.receivedByStudentAt
            ? r.certificate.receivedByStudentAt.toISOString()
            : null,
          receivedByName: r.certificate.receivedByName,
          fileUrl: r.certificate.fileUrl,
          statementFileUrl: r.certificate.statementFileUrl,
          verificationUrl: r.certificate.verificationUrl,
          notes: r.certificate.notes,
        }
      : null,
  };
}

// ============================================================================
// SPECIALIZED ANALYTICS BUILDERS
// ============================================================================

function buildYleAnalytics(rows: any[], targetShields: number) {
  const totalSittings = rows.length;
  const uniqueKeys = new Set(
    rows.map((r) => r.studentId || stripVietnameseAccents(r.studentNameSnapshot))
  );
  const fullSkillRows = rows.filter((r) => r.dataCompleteness === 'FULL_COMPONENTS');

  let sumTotalShields = 0;
  let count15Shields = 0;
  let countTargetMet = 0;

  const skylineGroupsCount: Record<string, number> = {
    '0_6': 0,
    '7_9': 0,
    '10_14': 0,
    '15': 0,
  };

  const shieldHistogram: Record<number, number> = {};
  for (let i = 0; i <= 15; i++) shieldHistogram[i] = 0;

  const skillSums: Record<string, { sum: number; count: number; count5: number; countLow: number }> = {
    RW: { sum: 0, count: 0, count5: 0, countLow: 0 },
    LISTENING: { sum: 0, count: 0, count5: 0, countLow: 0 },
    SPEAKING: { sum: 0, count: 0, count5: 0, countLow: 0 },
  };

  for (const r of rows) {
    const sh = r.yleTotalShields ?? 0;
    sumTotalShields += sh;
    if (sh === 15) count15Shields++;
    if (sh >= targetShields) countTargetMet++;
    const grp = r.yleSkylineGroup || (sh === 15 ? '15' : sh >= 10 ? '10_14' : sh >= 7 ? '7_9' : '0_6');
    skylineGroupsCount[grp] = (skylineGroupsCount[grp] || 0) + 1;
    if (sh >= 0 && sh <= 15) shieldHistogram[sh] = (shieldHistogram[sh] || 0) + 1;

    for (const sk of r.skillResults || []) {
      if (skillSums[sk.componentCode] && sk.numericScore !== null) {
        skillSums[sk.componentCode].sum += sk.numericScore;
        skillSums[sk.componentCode].count += 1;
        if (sk.numericScore === 5) skillSums[sk.componentCode].count5 += 1;
        if (sk.numericScore <= 2) skillSums[sk.componentCode].countLow += 1;
      }
    }
  }

  // Compare STARTERS, MOVERS, FLYERS
  const byLevel = (['STARTERS', 'MOVERS', 'FLYERS'] as const).map((lvl) => {
    const sub = rows.filter((r) => r.examType === lvl);
    const n = sub.length;
    const c15 = sub.filter((r) => r.yleTotalShields === 15).length;
    const cTarget = sub.filter((r) => (r.yleTotalShields ?? 0) >= targetShields).length;
    const avg = n > 0 ? Number((sub.reduce((acc, r) => acc + (r.yleTotalShields ?? 0), 0) / n).toFixed(2)) : 0;

    const rwVals = sub.flatMap((r) => (r.skillResults || []).filter((s: any) => s.componentCode === 'RW').map((s: any) => s.numericScore));
    const lVals = sub.flatMap((r) => (r.skillResults || []).filter((s: any) => s.componentCode === 'LISTENING').map((s: any) => s.numericScore));
    const sVals = sub.flatMap((r) => (r.skillResults || []).filter((s: any) => s.componentCode === 'SPEAKING').map((s: any) => s.numericScore));

    return {
      examType: lvl,
      totalSittings: n,
      avgTotalShields: avg,
      count15Shields: c15,
      rate15Shields: n > 0 ? Number(((c15 / n) * 100).toFixed(1)) : 0,
      countTargetMet: cTarget,
      rateTargetMet: n > 0 ? Number(((cTarget / n) * 100).toFixed(1)) : 0,
      group0_6: sub.filter((r) => r.yleSkylineGroup === '0_6').length,
      group7_9: sub.filter((r) => r.yleSkylineGroup === '7_9').length,
      group10_14: sub.filter((r) => r.yleSkylineGroup === '10_14').length,
      group15: c15,
      avgRW: rwVals.length > 0 ? Number((rwVals.reduce((a, b) => a + b, 0) / rwVals.length).toFixed(2)) : null,
      avgListening: lVals.length > 0 ? Number((lVals.reduce((a, b) => a + b, 0) / lVals.length).toFixed(2)) : null,
      avgSpeaking: sVals.length > 0 ? Number((sVals.reduce((a, b) => a + b, 0) / sVals.length).toFixed(2)) : null,
    };
  });

  // Campus & Class breakdown
  const campusMap = new Map<string, any[]>();
  for (const r of rows) {
    const key = r.campusCodeSnapshot || 'Chưa rõ CS';
    const arr = campusMap.get(key) || [];
    arr.push(r);
    campusMap.set(key, arr);
  }
  const byCampus = Array.from(campusMap.entries()).map(([campus, list]) => {
    const n = list.length;
    const c15 = list.filter((r) => r.yleTotalShields === 15).length;
    const cTarget = list.filter((r) => (r.yleTotalShields ?? 0) >= targetShields).length;
    return {
      campus,
      totalSittings: n,
      avgTotalShields: n > 0 ? Number((list.reduce((a, r) => a + (r.yleTotalShields ?? 0), 0) / n).toFixed(2)) : 0,
      count15Shields: c15,
      rate15Shields: n > 0 ? Number(((c15 / n) * 100).toFixed(1)) : 0,
      rateTargetMet: n > 0 ? Number(((cTarget / n) * 100).toFixed(1)) : 0,
      startersCount: list.filter((r) => r.examType === 'STARTERS').length,
      moversCount: list.filter((r) => r.examType === 'MOVERS').length,
      flyersCount: list.filter((r) => r.examType === 'FLYERS').length,
    };
  });

  return {
    totalSittings,
    uniqueStudents: uniqueKeys.size,
    fullSkillSittings: fullSkillRows.length,
    internalTargetShields: targetShields,
    avgTotalShields: totalSittings > 0 ? Number((sumTotalShields / totalSittings).toFixed(2)) : 0,
    count15Shields,
    rate15Shields: totalSittings > 0 ? Number(((count15Shields / totalSittings) * 100).toFixed(1)) : 0,
    countTargetMet,
    rateTargetMet: totalSittings > 0 ? Number(((countTargetMet / totalSittings) * 100).toFixed(1)) : 0,
    skylineGroups: Object.values(YLE_SKYLINE_GROUPS).map((g) => ({
      ...g,
      count: skylineGroupsCount[g.code] || 0,
      rate: totalSittings > 0 ? Number((((skylineGroupsCount[g.code] || 0) / totalSittings) * 100).toFixed(1)) : 0,
    })),
    shieldHistogram: Object.entries(shieldHistogram).map(([shields, count]) => ({
      shields: Number(shields),
      count,
    })),
    skillAverages: [
      {
        code: 'RW',
        label: 'Reading & Writing (Đọc & Viết)',
        avgShields: skillSums.RW.count > 0 ? Number((skillSums.RW.sum / skillSums.RW.count).toFixed(2)) : 0,
        rate5Shields: skillSums.RW.count > 0 ? Number(((skillSums.RW.count5 / skillSums.RW.count) * 100).toFixed(1)) : 0,
        lowCount: skillSums.RW.countLow,
        denominator: skillSums.RW.count,
      },
      {
        code: 'LISTENING',
        label: 'Listening (Nghe)',
        avgShields: skillSums.LISTENING.count > 0 ? Number((skillSums.LISTENING.sum / skillSums.LISTENING.count).toFixed(2)) : 0,
        rate5Shields: skillSums.LISTENING.count > 0 ? Number(((skillSums.LISTENING.count5 / skillSums.LISTENING.count) * 100).toFixed(1)) : 0,
        lowCount: skillSums.LISTENING.countLow,
        denominator: skillSums.LISTENING.count,
      },
      {
        code: 'SPEAKING',
        label: 'Speaking (Nói)',
        avgShields: skillSums.SPEAKING.count > 0 ? Number((skillSums.SPEAKING.sum / skillSums.SPEAKING.count).toFixed(2)) : 0,
        rate5Shields: skillSums.SPEAKING.count > 0 ? Number(((skillSums.SPEAKING.count5 / skillSums.SPEAKING.count) * 100).toFixed(1)) : 0,
        lowCount: skillSums.SPEAKING.countLow,
        denominator: skillSums.SPEAKING.count,
      },
    ],
    byLevel,
    byCampus,
  };
}

function buildCamMainAnalytics(rows: any[]) {
  const buildForType = (sub: any[], examType: 'KET' | 'PET') => {
    const n = sub.length;
    const scales = sub.map((r) => r.camOverallScale).filter((v): v is number => typeof v === 'number');
    const avgScale = scales.length > 0 ? Number((scales.reduce((a, b) => a + b, 0) / scales.length).toFixed(1)) : 0;

    const gradeCounts: Record<string, number> = {
      GRADE_A: 0,
      GRADE_B: 0,
      GRADE_C: 0,
      LEVEL_A1: 0,
      LEVEL_A2: 0,
      BELOW_THRESHOLD: 0,
    };
    const cefrCounts: Record<string, number> = {
      B2: 0,
      B1: 0,
      A2: 0,
      A1: 0,
      BELOW_THRESHOLD: 0,
    };

    let targetMetCount = 0;
    let exceedsCount = 0;
    let certAwardedCount = 0;

    const skillSums: Record<string, { sum: number; count: number }> = {
      READING: { sum: 0, count: 0 },
      WRITING: { sum: 0, count: 0 },
      LISTENING: { sum: 0, count: 0 },
      SPEAKING: { sum: 0, count: 0 },
    };

    for (const r of sub) {
      const g = r.camOfficialGrade || 'BELOW_THRESHOLD';
      gradeCounts[g] = (gradeCounts[g] || 0) + 1;

      const c = r.camCefrLevel || 'BELOW_THRESHOLD';
      if (c === 'BELOW_A1' || c === 'BELOW_A2') {
        cefrCounts.BELOW_THRESHOLD += 1;
      } else {
        cefrCounts[c] = (cefrCounts[c] || 0) + 1;
      }

      if (r.camMeetsTargetLevel) targetMetCount++;
      if (r.camExceedsLevel) exceedsCount++;
      if (r.camAwardedCertificate) certAwardedCount++;

      for (const sk of r.skillResults || []) {
        if (skillSums[sk.componentCode] && typeof sk.numericScore === 'number') {
          skillSums[sk.componentCode].sum += sk.numericScore;
          skillSums[sk.componentCode].count += 1;
        }
      }
    }

    return {
      examType,
      totalSittings: n,
      avgScale,
      targetMetCount,
      targetMetRate: n > 0 ? Number(((targetMetCount / n) * 100).toFixed(1)) : 0,
      exceedsCount,
      exceedsRate: n > 0 ? Number(((exceedsCount / n) * 100).toFixed(1)) : 0,
      certAwardedCount,
      certAwardedRate: n > 0 ? Number(((certAwardedCount / n) * 100).toFixed(1)) : 0,
      belowThresholdCount: gradeCounts.BELOW_THRESHOLD || 0,
      gradeDistribution:
        examType === 'KET'
          ? [
              { code: 'GRADE_A', label: 'Grade A (140–150 • CEFR B1 Vượt khung)', count: gradeCounts.GRADE_A, color: '#10B981' },
              { code: 'GRADE_B', label: 'Grade B (133–139 • CEFR A2)', count: gradeCounts.GRADE_B, color: '#3B82F6' },
              { code: 'GRADE_C', label: 'Grade C (120–132 • CEFR A2)', count: gradeCounts.GRADE_C, color: '#6366F1' },
              { code: 'LEVEL_A1', label: 'Level A1 (100–119 • CEFR A1)', count: gradeCounts.LEVEL_A1, color: '#F59E0B' },
              { code: 'BELOW_THRESHOLD', label: 'Not Reported (<100 • Dưới ngưỡng)', count: gradeCounts.BELOW_THRESHOLD, color: '#EF4444' },
            ]
          : [
              { code: 'GRADE_A', label: 'Grade A (160–170 • CEFR B2 Vượt khung)', count: gradeCounts.GRADE_A, color: '#10B981' },
              { code: 'GRADE_B', label: 'Grade B (153–159 • CEFR B1)', count: gradeCounts.GRADE_B, color: '#3B82F6' },
              { code: 'GRADE_C', label: 'Grade C (140–152 • CEFR B1)', count: gradeCounts.GRADE_C, color: '#6366F1' },
              { code: 'LEVEL_A2', label: 'Level A2 (120–139 • CEFR A2)', count: gradeCounts.LEVEL_A2, color: '#F59E0B' },
              { code: 'BELOW_THRESHOLD', label: 'Not Reported (<120 • Dưới ngưỡng)', count: gradeCounts.BELOW_THRESHOLD, color: '#EF4444' },
            ],
      cefrDistribution: [
        { cefr: 'B2', count: cefrCounts.B2, color: '#003B3A' },
        { cefr: 'B1', count: cefrCounts.B1, color: '#10B981' },
        { cefr: 'A2', count: cefrCounts.A2, color: '#3B82F6' },
        { cefr: 'A1', count: cefrCounts.A1, color: '#F59E0B' },
        { cefr: 'Dưới ngưỡng', count: cefrCounts.BELOW_THRESHOLD, color: '#EF4444' },
      ].filter((item) => item.count > 0 || (examType === 'KET' ? ['B1', 'A2', 'A1'].includes(item.cefr) : ['B2', 'B1', 'A2'].includes(item.cefr))),
      skillAverages: (['READING', 'WRITING', 'LISTENING', 'SPEAKING'] as const).map((code) => ({
        code,
        avgScale:
          skillSums[code].count > 0
            ? Number((skillSums[code].sum / skillSums[code].count).toFixed(1))
            : null,
        denominator: skillSums[code].count,
      })),
    };
  };

  return {
    totalSittings: rows.length,
    ket: buildForType(
      rows.filter((r) => r.examType === 'KET'),
      'KET'
    ),
    pet: buildForType(
      rows.filter((r) => r.examType === 'PET'),
      'PET'
    ),
  };
}

function buildIeltsAnalytics(rows: any[], defaultTargetBand: number) {
  const n = rows.length;
  const bands = rows.map((r) => r.ieltsOverallBand).filter((v): v is number => typeof v === 'number');
  const avgBand = bands.length > 0 ? Number((bands.reduce((a, b) => a + b, 0) / bands.length).toFixed(2)) : 0;
  const maxBand = bands.length > 0 ? Math.max(...bands) : 0;

  const groupCounts: Record<string, number> = {
    UNDER_4_0: 0,
    '4_0_4_5': 0,
    '5_0_5_5': 0,
    '6_0_6_5': 0,
    '7_0_7_5': 0,
    '8_0_PLUS': 0,
  };

  for (const r of rows) {
    const grp = r.ieltsBandGroup || '6_0_6_5';
    groupCounts[grp] = (groupCounts[grp] || 0) + 1;
  }

  const milestones = [5.5, 6.0, 6.5, 7.0, 7.5, 8.0].map((target) => {
    const c = bands.filter((b) => b >= target).length;
    return {
      targetBand: target,
      count: c,
      rate: bands.length > 0 ? Number(((c / bands.length) * 100).toFixed(1)) : 0,
    };
  });

  const skillSums: Record<string, { sum: number; count: number }> = {
    LISTENING: { sum: 0, count: 0 },
    READING: { sum: 0, count: 0 },
    WRITING: { sum: 0, count: 0 },
    SPEAKING: { sum: 0, count: 0 },
  };

  for (const r of rows) {
    for (const sk of r.skillResults || []) {
      if (skillSums[sk.componentCode] && typeof sk.numericScore === 'number') {
        skillSums[sk.componentCode].sum += sk.numericScore;
        skillSums[sk.componentCode].count += 1;
      }
    }
  }

  // Yearly progression
  const yearMap = new Map<string, number[]>();
  for (const r of rows) {
    if (typeof r.ieltsOverallBand === 'number') {
      const arr = yearMap.get(r.academicYearText) || [];
      arr.push(r.ieltsOverallBand);
      yearMap.set(r.academicYearText, arr);
    }
  }
  const byAcademicYear = Array.from(yearMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, vals]) => ({
      academicYear: year,
      count: vals.length,
      avgBand: Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)),
      rate6_5Plus: Number(((vals.filter((v) => v >= 6.5).length / vals.length) * 100).toFixed(1)),
      rate7_0Plus: Number(((vals.filter((v) => v >= 7.0).length / vals.length) * 100).toFixed(1)),
      rate8_0Plus: Number(((vals.filter((v) => v >= 8.0).length / vals.length) * 100).toFixed(1)),
    }));

  // Multi-attempt students
  const studentAttempts = new Map<string, any[]>();
  for (const r of rows) {
    const key = r.studentId || `${stripVietnameseAccents(r.studentNameSnapshot)}|${r.campusCodeSnapshot || ''}`;
    const list = studentAttempts.get(key) || [];
    list.push(r);
    studentAttempts.set(key, list);
  }
  const multiAttemptStudents = Array.from(studentAttempts.values())
    .filter((list) => list.length > 1)
    .map((list) => {
      const sorted = [...list].sort((a, b) => a.academicYearText.localeCompare(b.academicYearText));
      const first = sorted[0];
      const latest = sorted[sorted.length - 1];
      const bestBand = Math.max(...sorted.map((x) => x.ieltsOverallBand ?? 0));
      return {
        studentName: latest.studentNameSnapshot,
        campusCode: latest.campusCodeSnapshot,
        attemptsCount: sorted.length,
        firstBand: first.ieltsOverallBand,
        latestBand: latest.ieltsOverallBand,
        bestBand,
        delta: Number(((latest.ieltsOverallBand ?? 0) - (first.ieltsOverallBand ?? 0)).toFixed(1)),
      };
    });

  return {
    totalSittings: n,
    uniqueStudents: studentAttempts.size,
    defaultTargetBand,
    avgBand,
    maxBand,
    bandDistribution: Object.values(IELTS_BAND_GROUPS).map((g) => ({
      ...g,
      count: groupCounts[g.code] || 0,
      rate: n > 0 ? Number((((groupCounts[g.code] || 0) / n) * 100).toFixed(1)) : 0,
    })),
    milestones,
    skillAverages: (['LISTENING', 'READING', 'WRITING', 'SPEAKING'] as const).map((code) => ({
      code,
      avgBand:
        skillSums[code].count > 0
          ? Number((skillSums[code].sum / skillSums[code].count).toFixed(2))
          : null,
      denominator: skillSums[code].count,
    })),
    byAcademicYear,
    multiAttemptStudents,
  };
}

function buildPearsonAnalytics(rows: any[]) {
  const buildProgram = (sub: any[], program: 'IPRIMARY' | 'ILOWERSECONDARY') => {
    const subjects = (['MATH', 'SCIENCE'] as const).map((subCode) => {
      const items = sub.flatMap((r) =>
        (r.skillResults || [])
          .filter((s: any) => s.componentCode === subCode && typeof s.numericScore === 'number')
          .map((s: any) => ({ ...s, academicYearText: r.academicYearText, campus: r.campusCodeSnapshot }))
      );
      const count = items.length;
      const avgScore =
        count > 0 ? Number((items.reduce((a, b) => a + b.numericScore, 0) / count).toFixed(1)) : 0;

      const levelOrder = program === 'IPRIMARY' ? ['P3', 'P2', 'P1', 'BELOW_P1'] : ['S4', 'S3', 'S2', 'S1', 'BELOW_S1'];
      const levelCounts: Record<string, number> = {};
      for (const lv of levelOrder) levelCounts[lv] = 0;

      for (const it of items) {
        const lv = it.officialBandCode || 'P2';
        levelCounts[lv] = (levelCounts[lv] || 0) + 1;
      }

      const highCount = items.filter((it) => it.isHighOutstanding).length;
      const lowCount = items.filter((it) => it.isLowPerformance).length;

      return {
        subjectCode: subCode,
        subjectName: subCode === 'MATH' ? 'Mathematics (Toán Quốc tế)' : 'Science (Khoa học Quốc tế)',
        entriesCount: count,
        avgScore,
        highCount,
        highRate: count > 0 ? Number(((highCount / count) * 100).toFixed(1)) : 0,
        lowCount,
        lowRate: count > 0 ? Number(((lowCount / count) * 100).toFixed(1)) : 0,
        levelDistribution: levelOrder.map((lv) => ({
          level: lv,
          count: levelCounts[lv] || 0,
          rate: count > 0 ? Number((((levelCounts[lv] || 0) / count) * 100).toFixed(1)) : 0,
        })),
      };
    });

    return {
      program,
      totalStudentsSitting: sub.length,
      subjects,
    };
  };

  // Multi-year & Campus comparison for Pearson
  const byYearMap = new Map<string, any[]>();
  for (const r of rows) {
    const list = byYearMap.get(r.academicYearText) || [];
    list.push(r);
    byYearMap.set(r.academicYearText, list);
  }
  const byAcademicYear = Array.from(byYearMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, list]) => {
      const mathScores = list.flatMap((r) => (r.skillResults || []).filter((s: any) => s.componentCode === 'MATH' && typeof s.numericScore === 'number'));
      const sciScores = list.flatMap((r) => (r.skillResults || []).filter((s: any) => s.componentCode === 'SCIENCE' && typeof s.numericScore === 'number'));
      return {
        academicYear: year,
        sittings: list.length,
        mathEntries: mathScores.length,
        avgMath: mathScores.length > 0 ? Number((mathScores.reduce((a, b) => a + b.numericScore, 0) / mathScores.length).toFixed(1)) : null,
        sciEntries: sciScores.length,
        avgScience: sciScores.length > 0 ? Number((sciScores.reduce((a, b) => a + b.numericScore, 0) / sciScores.length).toFixed(1)) : null,
      };
    });

  return {
    totalSittings: rows.length,
    iPrimary: buildProgram(
      rows.filter((r) => r.examType === 'IPRIMARY'),
      'IPRIMARY'
    ),
    iLowerSecondary: buildProgram(
      rows.filter((r) => r.examType === 'ILOWERSECONDARY'),
      'ILOWERSECONDARY'
    ),
    byAcademicYear,
  };
}

function buildCheckpointAnalytics(rows: any[]) {
  const subjects = (['ESL', 'MATH', 'SCIENCE'] as const).map((subCode) => {
    const items = rows.flatMap((r) =>
      (r.skillResults || [])
        .filter((s: any) => s.componentCode === subCode && typeof s.numericScore === 'number')
        .map((s: any) => ({
          ...s,
          studentName: r.studentNameSnapshot,
          className: r.classNameSnapshot,
          campus: r.campusCodeSnapshot,
          examType: r.examType,
        }))
    );

    const count = items.length;
    const avgScore =
      count > 0 ? Number((items.reduce((a, b) => a + b.numericScore, 0) / count).toFixed(1)) : 0;

    const bandCounts: Record<string, number> = {
      UNCLASSIFIED: 0,
      BASIC: 0,
      ASPIRING: 0,
      GOOD: 0,
      HIGH: 0,
      OUTSTANDING: 0,
    };

    for (const it of items) {
      const b = it.officialBandCode || 'GOOD';
      bandCounts[b] = (bandCounts[b] || 0) + 1;
    }

    const highOutstandingCount = (bandCounts.HIGH || 0) + (bandCounts.OUTSTANDING || 0);
    const lowCount = (bandCounts.UNCLASSIFIED || 0) + (bandCounts.BASIC || 0) + (bandCounts.ASPIRING || 0);

    return {
      subjectCode: subCode,
      subjectName:
        subCode === 'ESL'
          ? 'English as a Second Language (ESL)'
          : subCode === 'MATH'
          ? 'Mathematics (Toán Quốc tế)'
          : 'Science (Khoa học Quốc tế)',
      entriesCount: count,
      avgScore,
      highOutstandingCount,
      highOutstandingRate: count > 0 ? Number(((highOutstandingCount / count) * 100).toFixed(1)) : 0,
      lowCount,
      lowRate: count > 0 ? Number(((lowCount / count) * 100).toFixed(1)) : 0,
      bandDistribution: Object.values(CHECKPOINT_50_BANDS).map((b) => ({
        ...b,
        count: bandCounts[b.code] || 0,
        rate: count > 0 ? Number((((bandCounts[b.code] || 0) / count) * 100).toFixed(1)) : 0,
      })),
      lowPerformingStudents: items
        .filter((it) => it.isLowPerformance)
        .map((it) => ({
          studentName: it.studentName,
          className: it.className,
          campus: it.campus,
          score: it.numericScore,
          band: it.officialBandCode,
        })),
    };
  });

  // Identify lowest performing subject for professional support
  const validSubjects = subjects.filter((s) => s.entriesCount > 0);
  const lowestSubject =
    validSubjects.length > 0
      ? [...validSubjects].sort((a, b) => a.avgScore - b.avgScore)[0]
      : null;

  return {
    totalSittings: rows.length,
    primaryCount: rows.filter((r) => r.examType === 'PRIMARY_CHECKPOINT').length,
    lowerSecondaryCount: rows.filter((r) => r.examType === 'LOWER_SECONDARY_CHECKPOINT').length,
    subjects,
    lowestPerformingSubjectAlert: lowestSubject
      ? {
          subjectCode: lowestSubject.subjectCode,
          subjectName: lowestSubject.subjectName,
          avgScore: lowestSubject.avgScore,
          highOutstandingRate: lowestSubject.highOutstandingRate,
          lowCount: lowestSubject.lowCount,
        }
      : null,
  };
}

function buildComparativeReports(rows: any[]) {
  // 1. Campus Benchmark Matrix
  const campuses = ['CS1', 'CS2', 'CS3', 'CS4', 'CS5'];
  const campusMatrix = campuses.map((cs) => {
    const sub = rows.filter((r) => (r.campusCodeSnapshot || '') === cs);
    const yle = sub.filter((r) => r.examFamily === 'CAMBRIDGE_YLE');
    const ket = sub.filter((r) => r.examType === 'KET');
    const pet = sub.filter((r) => r.examType === 'PET');
    const ielts = sub.filter((r) => r.examFamily === 'IELTS');
    const pearson = sub.filter((r) => r.examFamily === 'PEARSON_EDEXCEL');
    const chk = sub.filter((r) => r.examFamily === 'CAMBRIDGE_CHECKPOINT');

    return {
      campusCode: cs,
      totalSittings: sub.length,
      yleCount: yle.length,
      yle15Rate:
        yle.length > 0
          ? Number(((yle.filter((r) => r.yleTotalShields === 15).length / yle.length) * 100).toFixed(1))
          : null,
      ketCount: ket.length,
      ketTargetRate:
        ket.length > 0
          ? Number(((ket.filter((r) => r.camMeetsTargetLevel).length / ket.length) * 100).toFixed(1))
          : null,
      petCount: pet.length,
      petTargetRate:
        pet.length > 0
          ? Number(((pet.filter((r) => r.camMeetsTargetLevel).length / pet.length) * 100).toFixed(1))
          : null,
      ieltsCount: ielts.length,
      ieltsAvgBand:
        ielts.length > 0
          ? Number((ielts.reduce((a, r) => a + (r.ieltsOverallBand ?? 0), 0) / ielts.length).toFixed(2))
          : null,
      pearsonCount: pearson.length,
      checkpointCount: chk.length,
    };
  });

  // 2. Academic Year Longitudinal Summary
  const yearSet = Array.from(new Set(rows.map((r) => r.academicYearText))).sort();
  const yearlyMatrix = yearSet.map((yr) => {
    const sub = rows.filter((r) => r.academicYearText === yr);
    return {
      academicYear: yr,
      totalSittings: sub.length,
      starters: sub.filter((r) => r.examType === 'STARTERS').length,
      movers: sub.filter((r) => r.examType === 'MOVERS').length,
      flyers: sub.filter((r) => r.examType === 'FLYERS').length,
      ket: sub.filter((r) => r.examType === 'KET').length,
      pet: sub.filter((r) => r.examType === 'PET').length,
      ielts: sub.filter((r) => r.examType === 'IELTS').length,
      pearson: sub.filter((r) => r.examFamily === 'PEARSON_EDEXCEL').length,
      checkpoint: sub.filter((r) => r.examFamily === 'CAMBRIDGE_CHECKPOINT').length,
    };
  });

  return {
    campusMatrix,
    yearlyMatrix,
  };
}

// ============================================================================
// SERVER ACTIONS FOR CRUD, IMPORT, RECONCILIATION, AND PROFILE 360°
// ============================================================================

export interface SaveExamResultInput {
  id?: string;
  examFamily: ExamFamilyCode;
  examType: ExamTypeCode;
  academicYearText: string;
  semesterCode?: 'HK1' | 'HK2' | 'SUMMER' | null;
  examMonth?: number | null;
  examDate?: string | null;
  studentId?: string | null;
  studentCode?: string | null;
  studentName: string;
  studentDob?: string | null;
  campusCode?: string | null;
  grade?: string | null;
  className?: string | null;
  eduSystem?: string | null;
  sittingStatus?: 'COMPLETED' | 'ABSENT';
  isHistoricalOverallOnly?: boolean;
  // YLE inputs
  yleRw?: number | null;
  yleListening?: number | null;
  yleSpeaking?: number | null;
  yleTotalOnly?: number | null;
  // KET / PET inputs
  camReading?: number | null;
  camWriting?: number | null;
  camListening?: number | null;
  camSpeaking?: number | null;
  camOverallScale?: number | null;
  camRawStatement?: string | null;
  // IELTS inputs
  ieltsListening?: number | null;
  ieltsReading?: number | null;
  ieltsWriting?: number | null;
  ieltsSpeaking?: number | null;
  ieltsOverallBand?: number | null;
  // Pearson & Checkpoint subject inputs
  subjectScores?: Array<{
    componentCode: string; // MATH | SCIENCE | ESL | ENGLISH
    componentName: string;
    numericScore: number | null;
    officialBandCode?: string | null;
    scaleType?: 'CHECKPOINT_50' | 'CHECKPOINT_6' | 'PEARSON_SCORE';
  }>;
  // Certificate metadata
  certificateNumber?: string | null;
  candidateNumber?: string | null;
  centerNumber?: string | null;
  certificateStatus?: string;
  certificateFileUrl?: string | null;
  issueDate?: string | null;
  remarks?: string | null;
  autoNotifyStakeholders?: boolean;
}

export async function saveIntlExamResultAction(input: SaveExamResultInput) {
  const session = await getAdminSession();
  const actorId = session?.userId || 'ADMIN';

  // Strictly require an existing SSM Student
  let ssmStudent = input.studentId
    ? await prisma.student.findUnique({
        where: { id: input.studentId },
        include: {
          class: { include: { campus: true } },
          campus: true,
        },
      })
    : null;

  if (!ssmStudent && input.studentCode) {
    ssmStudent = await prisma.student.findFirst({
      where: { studentCode: input.studentCode.trim() },
      include: {
        class: { include: { campus: true } },
        campus: true,
      },
      orderBy: { status: 'asc' },
    });
  }

  if (!ssmStudent) {
    throw new Error(
      'Học sinh không tồn tại trong hệ thống SSM. Vui lòng chọn học sinh từ danh sách SSM (Hệ thống không tự động thêm mới học sinh ngoài SSM).'
    );
  }

  const ruleSetMap = await ensureDefaultRuleSetsSeeded();
  const ruleSetId = ruleSetMap.get(input.examType);
  if (!ruleSetId) {
    throw new Error(`Không tìm thấy bộ quy chuẩn cho kỳ thi ${input.examType}.`);
  }

  const academicYearText = input.academicYearText.trim() || '2026-2027';
  const parsedExamDate = input.examDate ? new Date(input.examDate) : null;
  const resolvedMonth =
    input.examMonth ||
    (parsedExamDate && !isNaN(parsedExamDate.getTime()) ? parsedExamDate.getMonth() + 1 : null);
  const resolvedSemester: 'HK1' | 'HK2' | 'SUMMER' =
    input.semesterCode ||
    (resolvedMonth
      ? resolvedMonth >= 8 && resolvedMonth <= 12
        ? 'HK1'
        : resolvedMonth >= 1 && resolvedMonth <= 5
        ? 'HK2'
        : 'SUMMER'
      : 'HK1');

  const sessionCode = `MANUAL-${input.examType}-${academicYearText}-${resolvedSemester}${
    resolvedMonth ? `-M${resolvedMonth}` : ''
  }`;
  let examSession = await prisma.intlExamSession.findUnique({
    where: { sessionCode },
  });
  if (!examSession) {
    examSession = await prisma.intlExamSession.create({
      data: {
        sessionCode,
        sessionName: `Kỳ thi ${input.examType} (${academicYearText} - ${
          resolvedSemester === 'HK1'
            ? 'Học kỳ I'
            : resolvedSemester === 'HK2'
            ? 'Học kỳ II'
            : 'Kỳ Hè'
        }${resolvedMonth ? ` - Tháng ${resolvedMonth}` : ''})`,
        examFamily: input.examFamily,
        examType: input.examType,
        academicYearText,
        examMonth: resolvedMonth,
        examYear: parsedExamDate && !isNaN(parsedExamDate.getTime()) ? parsedExamDate.getFullYear() : null,
        ruleSetId,
        createdById: actorId,
      },
    });
  }

  // Always auto-populate Student Name, Student Code, Campus, Class, Grade, Education System from SSM
  const verifiedStudentId = ssmStudent.id;
  const verifiedStudentCode = ssmStudent.studentCode;
  const verifiedStudentName = ssmStudent.studentName;
  const verifiedStudentDob = ssmStudent.dateOfBirth || null;
  const campusIdSnapshot = ssmStudent.class?.campus?.id || ssmStudent.campus?.id || ssmStudent.campusId;
  const campusCode = ssmStudent.class?.campus?.campusCode || ssmStudent.campus?.campusCode || normalizeCampusCode(input.campusCode);
  const className = ssmStudent.class?.className || normalizeVietnameseText(input.className);
  const grade = inferGradeFromClassName(className, ssmStudent.class?.grade || input.grade);
  const eduSystem =
    ssmStudent.class?.educationSystem ||
    inferEduSystemFromClassName(className, input.examFamily);
  const sittingStatus = input.sittingStatus || 'COMPLETED';

  let dataCompleteness: 'FULL_COMPONENTS' | 'HISTORICAL_OVERALL_ONLY' | 'PARTIAL_SUBJECTS' = 'FULL_COMPONENTS';
  const skillCreates: any[] = [];

  // Family-specific evaluation
  let yleFields: any = {};
  let camFields: any = {};
  let ieltsFields: any = {};

  if (sittingStatus === 'COMPLETED') {
    if (input.examFamily === 'CAMBRIDGE_YLE') {
      const evalRes = input.isHistoricalOverallOnly
        ? evaluateYleResult({ historicalTotalOnly: input.yleTotalOnly })
        : evaluateYleResult({
            rw: input.yleRw,
            listening: input.yleListening,
            speaking: input.yleSpeaking,
            historicalTotalOnly: input.yleTotalOnly,
          });
      if (!evalRes) {
        throw new Error('Vui lòng nhập số khiên hợp lệ (0–5 khiên mỗi kỹ năng hoặc Tổng 0–15 khiên).');
      }
      dataCompleteness = evalRes.dataCompleteness;
      yleFields = {
        yleTotalShields: evalRes.yleTotalShields,
        yleResultCode: evalRes.yleResultCode,
        yleSkylineGroup: evalRes.yleSkylineGroup,
        yleMeetsInternalTarget: evalRes.yleMeetsInternalTarget,
      };
      if (evalRes.rw !== null && evalRes.listening !== null && evalRes.speaking !== null) {
        skillCreates.push(
          {
            componentType: 'SKILL',
            componentCode: 'RW',
            componentName: 'Reading & Writing',
            scaleUnit: 'SHIELD',
            numericScore: evalRes.rw,
            maxNumericScore: 5,
            officialBandCode: `${evalRes.rw}_SHIELDS`,
            officialBandLabel: `${evalRes.rw} Khiên`,
            isHighOutstanding: evalRes.rw === 5,
            isLowPerformance: evalRes.rw <= 2,
            sortOrder: 1,
          },
          {
            componentType: 'SKILL',
            componentCode: 'LISTENING',
            componentName: 'Listening',
            scaleUnit: 'SHIELD',
            numericScore: evalRes.listening,
            maxNumericScore: 5,
            officialBandCode: `${evalRes.listening}_SHIELDS`,
            officialBandLabel: `${evalRes.listening} Khiên`,
            isHighOutstanding: evalRes.listening === 5,
            isLowPerformance: evalRes.listening <= 2,
            sortOrder: 2,
          },
          {
            componentType: 'SKILL',
            componentCode: 'SPEAKING',
            componentName: 'Speaking',
            scaleUnit: 'SHIELD',
            numericScore: evalRes.speaking,
            maxNumericScore: 5,
            officialBandCode: `${evalRes.speaking}_SHIELDS`,
            officialBandLabel: `${evalRes.speaking} Khiên`,
            isHighOutstanding: evalRes.speaking === 5,
            isLowPerformance: evalRes.speaking <= 2,
            sortOrder: 3,
          }
        );
      }
    } else if (input.examFamily === 'CAMBRIDGE_MAIN') {
      const examType = input.examType as 'KET' | 'PET';
      const evalRes = evaluateCamMainSuiteResult({
        examType,
        reading: input.isHistoricalOverallOnly ? null : input.camReading,
        writing: input.isHistoricalOverallOnly ? null : input.camWriting,
        listening: input.isHistoricalOverallOnly ? null : input.camListening,
        speaking: input.isHistoricalOverallOnly ? null : input.camSpeaking,
        officialOverall: input.camOverallScale,
        rawGradeOverride: input.camRawStatement,
      });
      if (!evalRes) {
        throw new Error('Vui lòng nhập điểm Cambridge Scale hợp lệ.');
      }
      dataCompleteness = evalRes.dataCompleteness;
      camFields = {
        camOverallScale: evalRes.camOverallScale,
        camCalculatedAverage: evalRes.camCalculatedAverage,
        camOfficialGrade: evalRes.camOfficialGrade,
        camOfficialStatement: evalRes.camOfficialStatement,
        camCefrLevel: evalRes.camCefrLevel,
        camAwardedCertificate: evalRes.camAwardedCertificate,
        camMeetsTargetLevel: evalRes.camMeetsTargetLevel,
        camExceedsLevel: evalRes.camExceedsLevel,
      };
      const maxScale = examType === 'KET' ? 150 : 170;
      if (!input.isHistoricalOverallOnly) {
        const four = [
          { code: 'READING', name: 'Reading', val: input.camReading, order: 1 },
          { code: 'WRITING', name: 'Writing', val: input.camWriting, order: 2 },
          { code: 'LISTENING', name: 'Listening', val: input.camListening, order: 3 },
          { code: 'SPEAKING', name: 'Speaking', val: input.camSpeaking, order: 4 },
        ];
        for (const item of four) {
          if (item.val !== null && item.val !== undefined) {
            skillCreates.push({
              componentType: 'SKILL',
              componentCode: item.code,
              componentName: item.name,
              scaleUnit: 'CAMBRIDGE_SCALE',
              numericScore: Number(item.val),
              maxNumericScore: maxScale,
              officialBandCode: null,
              officialBandLabel: `${item.val} Scale`,
              isHighOutstanding: Number(item.val) >= (examType === 'KET' ? 140 : 160),
              isLowPerformance: Number(item.val) < (examType === 'KET' ? 120 : 140),
              sortOrder: item.order,
            });
          }
        }
      }
    } else if (input.examFamily === 'IELTS') {
      const evalRes = evaluateIeltsResult({
        listening: input.isHistoricalOverallOnly ? null : input.ieltsListening,
        reading: input.isHistoricalOverallOnly ? null : input.ieltsReading,
        writing: input.isHistoricalOverallOnly ? null : input.ieltsWriting,
        speaking: input.isHistoricalOverallOnly ? null : input.ieltsSpeaking,
        officialOverall: input.ieltsOverallBand,
      });
      if (!evalRes) {
        throw new Error('Điểm Band IELTS không hợp lệ (Thang 0.0–9.0, bước điểm 0.5).');
      }
      dataCompleteness = evalRes.dataCompleteness;
      ieltsFields = {
        ieltsOverallBand: evalRes.ieltsOverallBand,
        ieltsCalculatedOverall: evalRes.ieltsCalculatedOverall,
        ieltsBandGroup: evalRes.ieltsBandGroup,
        ieltsCefrLevel: evalRes.ieltsCefrLevel,
        ieltsStrongestSkill: evalRes.ieltsStrongestSkill,
        ieltsWeakestSkill: evalRes.ieltsWeakestSkill,
      };
      if (!input.isHistoricalOverallOnly) {
        const four = [
          { code: 'LISTENING', name: 'Listening', val: input.ieltsListening, order: 1 },
          { code: 'READING', name: 'Reading', val: input.ieltsReading, order: 2 },
          { code: 'WRITING', name: 'Writing', val: input.ieltsWriting, order: 3 },
          { code: 'SPEAKING', name: 'Speaking', val: input.ieltsSpeaking, order: 4 },
        ];
        for (const item of four) {
          if (item.val !== null && item.val !== undefined) {
            skillCreates.push({
              componentType: 'SKILL',
              componentCode: item.code,
              componentName: item.name,
              scaleUnit: 'IELTS_BAND',
              numericScore: Number(item.val),
              maxNumericScore: 9.0,
              officialBandCode: `BAND_${Number(item.val).toFixed(1)}`,
              officialBandLabel: `Band ${Number(item.val).toFixed(1)}`,
              isHighOutstanding: Number(item.val) >= 7.5,
              isLowPerformance: Number(item.val) < 5.5,
              sortOrder: item.order,
            });
          }
        }
      }
    } else if (input.examFamily === 'PEARSON_EDEXCEL') {
      const subs = (input.subjectScores || []).filter(
        (s) => s.numericScore !== null && s.numericScore !== undefined && !isNaN(Number(s.numericScore))
      );
      if (subs.length === 0) {
        throw new Error('Vui lòng nhập điểm ít nhất 1 môn học Pearson Edexcel (Mathematics hoặc Science).');
      }
      const maxScore = input.examType === 'ILOWERSECONDARY' ? 80 : 60;
      subs.forEach((s, idx) => {
        const num = Number(s.numericScore);
        const band =
          normalizePearsonBand(s.officialBandCode, input.examType as 'IPRIMARY' | 'ILOWERSECONDARY') ||
          suggestPearsonBandReference(num, input.examType as 'IPRIMARY' | 'ILOWERSECONDARY');
        skillCreates.push({
          componentType: 'SUBJECT',
          componentCode: s.componentCode,
          componentName: s.componentName,
          scaleUnit: 'PEARSON_SCORE',
          numericScore: num,
          maxNumericScore: maxScore,
          officialBandCode: band,
          officialBandLabel: band,
          isHighOutstanding: band === 'P3' || band === 'S3' || band === 'S4',
          isLowPerformance: band === 'P1' || band === 'BELOW_P1' || band === 'S1' || band === 'BELOW_S1',
          sortOrder: idx + 1,
        });
      });
      dataCompleteness = subs.length >= 2 ? 'FULL_COMPONENTS' : 'PARTIAL_SUBJECTS';
    } else if (input.examFamily === 'CAMBRIDGE_CHECKPOINT') {
      const subs = (input.subjectScores || []).filter(
        (s) => s.numericScore !== null && s.numericScore !== undefined && !isNaN(Number(s.numericScore))
      );
      if (subs.length === 0) {
        throw new Error('Vui lòng nhập điểm ít nhất 1 môn Cambridge Checkpoint (ESL, Mathematics, Science).');
      }
      subs.forEach((s, idx) => {
        const num = Number(s.numericScore);
        const isLegacy6 = s.scaleType === 'CHECKPOINT_6';
        const classified = isLegacy6
          ? classifyCheckpointLegacy6Score(num)
          : classifyCheckpoint50Score(num);
        const bandCode = (s.officialBandCode as any) || classified.bandCode;
        skillCreates.push({
          componentType: 'SUBJECT',
          componentCode: s.componentCode,
          componentName: s.componentName,
          scaleUnit: isLegacy6 ? 'CHECKPOINT_6' : 'CHECKPOINT_50',
          numericScore: num,
          maxNumericScore: isLegacy6 ? 6.0 : 50.0,
          officialBandCode: bandCode,
          officialBandLabel: classified.bandLabel,
          isHighOutstanding: bandCode === 'HIGH' || bandCode === 'OUTSTANDING',
          isLowPerformance: bandCode === 'UNCLASSIFIED' || bandCode === 'BASIC' || bandCode === 'ASPIRING',
          sortOrder: idx + 1,
        });
      });
      dataCompleteness = subs.length === 3 ? 'FULL_COMPONENTS' : 'PARTIAL_SUBJECTS';
    }
  }

  let savedResult;
  if (input.id) {
    await prisma.intlExamSkillResult.deleteMany({ where: { resultId: input.id } });
    savedResult = await prisma.intlExamResult.update({
      where: { id: input.id },
      data: {
        sessionId: examSession.id,
        examFamily: input.examFamily,
        examType: input.examType,
        ruleSetId,
        studentId: verifiedStudentId,
        studentCodeSnapshot: verifiedStudentCode,
        studentNameSnapshot: verifiedStudentName,
        studentDobSnapshot: verifiedStudentDob,
        campusIdSnapshot: campusIdSnapshot || null,
        campusCodeSnapshot: campusCode || null,
        gradeSnapshot: grade || null,
        classNameSnapshot: className || null,
        eduSystemSnapshot: eduSystem || null,
        academicYearText,
        examDate: input.examDate ? new Date(input.examDate) : null,
        sittingStatus,
        ...yleFields,
        ...camFields,
        ...ieltsFields,
        dataCompleteness,
        isStudentVerified: true,
        remarks: input.remarks || null,
        skillResults: {
          create: skillCreates,
        },
        certificate: {
          upsert: {
            create: {
              studentId: verifiedStudentId,
              certificateNumber: input.certificateNumber || null,
              candidateNumber: input.candidateNumber || null,
              centerNumber: input.centerNumber || null,
              issueDate: input.issueDate ? new Date(input.issueDate) : null,
              certificateStatus: input.certificateStatus || 'RECEIVED_AT_SCHOOL',
              fileUrl: input.certificateFileUrl || null,
            },
            update: {
              studentId: verifiedStudentId,
              certificateNumber: input.certificateNumber || null,
              candidateNumber: input.candidateNumber || null,
              centerNumber: input.centerNumber || null,
              issueDate: input.issueDate ? new Date(input.issueDate) : null,
              certificateStatus: input.certificateStatus || 'RECEIVED_AT_SCHOOL',
              fileUrl: input.certificateFileUrl || null,
            },
          },
        },
      },
    });
  } else {
    savedResult = await prisma.intlExamResult.create({
      data: {
        sessionId: examSession.id,
        ruleSetId,
        examFamily: input.examFamily,
        examType: input.examType,
        studentId: verifiedStudentId,
        studentCodeSnapshot: verifiedStudentCode,
        studentNameSnapshot: verifiedStudentName,
        studentDobSnapshot: verifiedStudentDob,
        campusIdSnapshot: campusIdSnapshot || null,
        campusCodeSnapshot: campusCode || null,
        gradeSnapshot: grade || null,
        classNameSnapshot: className || null,
        eduSystemSnapshot: eduSystem || null,
        academicYearText,
        examDate: input.examDate ? new Date(input.examDate) : null,
        sittingStatus,
        ...yleFields,
        ...camFields,
        ...ieltsFields,
        dataCompleteness,
        isHistoricalImport: Boolean(input.isHistoricalOverallOnly),
        isStudentVerified: true,
        remarks: input.remarks || null,
        createdById: actorId,
        skillResults: {
          create: skillCreates,
        },
        certificate: {
          create: {
            studentId: verifiedStudentId,
            certificateNumber: input.certificateNumber || null,
            candidateNumber: input.candidateNumber || null,
            centerNumber: input.centerNumber || null,
            issueDate: input.issueDate ? new Date(input.issueDate) : null,
            certificateStatus:
              sittingStatus === 'ABSENT' || camFields.camAwardedCertificate === false
                ? 'NOT_AWARDED'
                : input.certificateStatus || 'RECEIVED_AT_SCHOOL',
            fileUrl: input.certificateFileUrl || null,
          },
        },
      },
    });
  }

  if (input.examFamily === 'IELTS') {
    await recomputeIeltsLongitudinalFlags();
  }

  // Automatically notify Homeroom Teacher (GVCN), Parent, and Student Portal when certificate/result is achieved
  let notificationResult: any = null;
  if (
    input.autoNotifyStakeholders !== false &&
    sittingStatus === 'COMPLETED' &&
    camFields.camAwardedCertificate !== false &&
    input.certificateStatus !== 'NOT_AWARDED'
  ) {
    try {
      notificationResult = await dispatchIntlExamNotifications({
        resultIds: [savedResult.id],
        scenario:
          input.certificateStatus === 'RECEIVED_AT_SCHOOL' && input.certificateNumber
            ? 'CERT_READY_PICKUP'
            : 'CONGRATS_RESULT',
        sendToGVCN: true,
        sendToParent: true,
        sendToStudentPortal: true,
        senderName: 'Ban Khảo thí & ĐBCL Sky-Line',
      });
    } catch (err) {
      console.error('Auto-dispatch intl exam notification error:', err);
    }
  }

  await logActivity({
    action: input.id ? 'UPDATE' : 'CREATE',
    module: 'INTL_EXAMS',
    description: `${input.id ? 'Cập nhật' : 'Thêm mới'} kết quả kỳ thi ${input.examType} cho học sinh ${input.studentName} (${academicYearText})`,
    userId: session?.userId,
    userEmail: session?.email,
    userRole: session?.role,
  });

  revalidatePath('/admin/ktdbcl/international-exams');
  revalidatePath('/teacher/ho-so-hoc-sinh');
  revalidatePath('/parent/children/profile');
  revalidatePath('/hocsinh/portal');
  return { success: true, id: savedResult.id, notificationResult };
}

export async function deleteIntlExamResultAction(id: string) {
  const session = await getAdminSession();
  const existing = await prisma.intlExamResult.findUnique({ where: { id } });
  if (!existing) throw new Error('Không tìm thấy bản ghi kết quả thi.');

  await prisma.intlExamResult.delete({ where: { id } });
  if (existing.examFamily === 'IELTS') {
    await recomputeIeltsLongitudinalFlags();
  }

  await logActivity({
    action: 'DELETE',
    module: 'INTL_EXAMS',
    description: `Xóa kết quả kỳ thi ${existing.examType} của học sinh ${existing.studentNameSnapshot}`,
    userId: session?.userId,
    userEmail: session?.email,
    userRole: session?.role,
  });

  revalidatePath('/admin/ktdbcl/international-exams');
  return { success: true };
}

export async function reconcileResultStudentAction(params: {
  resultId: string;
  studentId: string;
  applyToSameNameInCampus?: boolean;
}) {
  const session = await getAdminSession();
  const [targetResult, student] = await Promise.all([
    prisma.intlExamResult.findUnique({ where: { id: params.resultId } }),
    prisma.student.findUnique({
      where: { id: params.studentId },
      include: { class: { include: { campus: true } } },
    }),
  ]);

  if (!targetResult || !student) {
    throw new Error('Không tìm thấy kết quả thi hoặc hồ sơ học sinh SSM.');
  }

  await prisma.intlExamResult.update({
    where: { id: targetResult.id },
    data: {
      studentId: student.id,
      studentCodeSnapshot: student.studentCode,
      isStudentVerified: true,
    },
  });

  await prisma.intlCertificateRecord.updateMany({
    where: { resultId: targetResult.id },
    data: { studentId: student.id },
  });

  let linkedCount = 1;
  if (params.applyToSameNameInCampus) {
    const normTarget = stripVietnameseAccents(targetResult.studentNameSnapshot);
    const otherUnverified = await prisma.intlExamResult.findMany({
      where: {
        isStudentVerified: false,
        campusCodeSnapshot: targetResult.campusCodeSnapshot,
      },
    });
    for (const other of otherUnverified) {
      if (other.id !== targetResult.id && stripVietnameseAccents(other.studentNameSnapshot) === normTarget) {
        await prisma.intlExamResult.update({
          where: { id: other.id },
          data: {
            studentId: student.id,
            studentCodeSnapshot: student.studentCode,
            isStudentVerified: true,
          },
        });
        await prisma.intlCertificateRecord.updateMany({
          where: { resultId: other.id },
          data: { studentId: student.id },
        });
        linkedCount++;
      }
    }
  }

  await recomputeIeltsLongitudinalFlags();

  await logActivity({
    action: 'UPDATE',
    module: 'INTL_EXAMS',
    description: `Đối soát liên kết ${linkedCount} kết quả thi quốc tế của "${targetResult.studentNameSnapshot}" với Mã HS ${student.studentCode}`,
    userId: session?.userId,
    userEmail: session?.email,
    userRole: session?.role,
  });

  revalidatePath('/admin/ktdbcl/international-exams');
  return { success: true, linkedCount };
}

export async function getStudentsByClassForIntlExamAction(classId: string) {
  if (!classId) return [];
  const students = await prisma.student.findMany({
    where: {
      classId,
      status: 'ACTIVE',
    },
    include: {
      class: {
        include: { campus: true },
      },
      campus: true,
    },
    orderBy: { studentName: 'asc' },
  });

  return students.map((s) => ({
    id: s.id,
    studentCode: s.studentCode,
    studentName: s.studentName,
    className: s.class?.className || '',
    grade: inferGradeFromClassName(s.class?.className, s.class?.grade),
    campusCode: s.class?.campus?.campusCode || s.campus?.campusCode || '',
    campusName: s.class?.campus?.campusName || s.campus?.campusName || '',
    eduSystem: s.class?.educationSystem || '',
    dateOfBirth: s.dateOfBirth ? s.dateOfBirth.toISOString().slice(0, 10) : null,
  }));
}

export async function resetAllIntlExamsDataAction() {
  const session = await getAdminSession();
  await prisma.intlCertificateRecord.deleteMany({});
  await prisma.intlExamSkillResult.deleteMany({});
  await prisma.intlExamResult.deleteMany({});
  await prisma.intlStagingRecord.deleteMany({});
  await prisma.intlImportBatch.deleteMany({});
  await prisma.intlExamSession.deleteMany({});

  await logActivity({
    action: 'DELETE',
    module: 'INTL_EXAMS',
    description: 'Làm mới hoàn toàn toàn bộ dữ liệu kết quả thi quốc tế & chứng chỉ',
    userId: session?.userId,
    userEmail: session?.email,
    userRole: session?.role,
  });

  revalidatePath('/admin/ktdbcl/international-exams');
  return { success: true };
}

export async function searchStudentsForIntlExamAction(query: string, academicYearText?: string) {
  const q = normalizeVietnameseText(query);
  if (!q || q.length < 2) return [];
  const normQ = stripVietnameseAccents(q);

  const students = await prisma.student.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { studentCode: { contains: q } },
        { studentName: { contains: q } },
      ],
    },
    include: {
      academicYear: true,
      class: {
        include: { campus: true, academicYear: true },
      },
    },
    take: 60,
  });

  // Fallback accent-insensitive search if fewer than 5 results
  let list = students;
  if (list.length < 5) {
    const allActive = await prisma.student.findMany({
      where: { status: 'ACTIVE' },
      include: {
        academicYear: true,
        class: { include: { campus: true, academicYear: true } },
      },
      take: 2500,
    });
    const matched = allActive.filter(
      (s) =>
        stripVietnameseAccents(s.studentName).includes(normQ) ||
        s.studentCode.toUpperCase().includes(normQ)
    );
    const ids = new Set(list.map((x) => x.id));
    for (const m of matched) {
      if (!ids.has(m.id)) {
        list.push(m);
        ids.add(m.id);
      }
      if (list.length >= 60) break;
    }
  }

  // Filter / sort by requested academicYearText so the student's class matches the selected academic year
  const targetYear = academicYearText && academicYearText !== 'ALL' ? academicYearText : null;
  if (targetYear) {
    const exactYearMatches = list.filter((s) => {
      const ay = s.academicYear?.name || s.class?.academicYear?.name || '';
      return ay === targetYear;
    });
    if (exactYearMatches.length > 0) {
      list = exactYearMatches;
    }
  } else {
    // Prefer latest academic year (2026-2027) first
    list.sort((a, b) => {
      const ayA = a.academicYear?.name || a.class?.academicYear?.name || '';
      const ayB = b.academicYear?.name || b.class?.academicYear?.name || '';
      return ayB.localeCompare(ayA);
    });
  }

  // Deduplicate by studentCode
  const seen = new Set<string>();
  const unique: Array<{
    id: string;
    studentCode: string;
    studentName: string;
    classId: string;
    className: string;
    grade: string;
    campusCode: string;
    academicYearName: string;
    dateOfBirth: string | null;
  }> = [];

  for (const s of list) {
    if (seen.has(s.studentCode)) continue;
    seen.add(s.studentCode);
    unique.push({
      id: s.id,
      studentCode: s.studentCode,
      studentName: s.studentName,
      classId: s.classId,
      className: s.class?.className || '',
      grade: inferGradeFromClassName(s.class?.className, s.class?.grade),
      campusCode: s.class?.campus?.campusCode || '',
      academicYearName: s.academicYear?.name || s.class?.academicYear?.name || '',
      dateOfBirth: s.dateOfBirth ? s.dateOfBirth.toISOString().slice(0, 10) : null,
    });
  }

  return unique.slice(0, 20);
}

export async function updateRuleSetTargetsAction(params: {
  ruleSetId: string;
  skylineTargets: Record<string, any>;
}) {
  const session = await getAdminSession();
  const rs = await prisma.intlExamRuleSet.update({
    where: { id: params.ruleSetId },
    data: {
      skylineTargetsJson: JSON.stringify(params.skylineTargets),
    },
  });

  // If YLE target shields changed, recompute yleMeetsInternalTarget on YLE results
  if (rs.examFamily === 'CAMBRIDGE_YLE' && typeof params.skylineTargets.targetTotalShields === 'number') {
    const target = params.skylineTargets.targetTotalShields;
    await prisma.intlExamResult.updateMany({
      where: { examFamily: 'CAMBRIDGE_YLE', yleTotalShields: { gte: target } },
      data: { yleMeetsInternalTarget: true },
    });
    await prisma.intlExamResult.updateMany({
      where: { examFamily: 'CAMBRIDGE_YLE', yleTotalShields: { lt: target } },
      data: { yleMeetsInternalTarget: false },
    });
  }

  await logActivity({
    action: 'UPDATE',
    module: 'INTL_EXAMS',
    description: `Cập nhật ngưỡng mục tiêu nội bộ Sky-Line cho quy chuẩn ${rs.versionCode}`,
    userId: session?.userId,
    userEmail: session?.email,
    userRole: session?.role,
  });

  revalidatePath('/admin/ktdbcl/international-exams');
  return { success: true };
}

export async function uploadAndPreviewExcelAction(formData: FormData) {
  const session = await getAdminSession();
  const file = formData.get('file') as File | null;
  const autoCommit = formData.get('autoCommit') === 'true';

  if (!file) {
    throw new Error('Vui lòng chọn file Excel (.xlsx) để tải lên.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const summary = await stageAndOptionallyCommitExcelImport({
    buffer,
    fileName: file.name,
    importedById: session?.userId || 'ADMIN',
    autoCommit,
  });

  await logActivity({
    action: 'IMPORT',
    module: 'INTL_EXAMS',
    description: `${autoCommit ? 'Import & Lưu' : 'Xem trước Import'} file Excel "${file.name}" (${summary.validRows} hợp lệ, ${summary.warningRows} cảnh báo, ${summary.matchedStudents} khớp Mã HS)`,
    userId: session?.userId,
    userEmail: session?.email,
    userRole: session?.role,
  });

  revalidatePath('/admin/ktdbcl/international-exams');
  return summary;
}

export async function commitStagedBatchAction(batchId: string) {
  const session = await getAdminSession();
  const res = await commitStagedImportBatch(batchId, session?.userId || 'ADMIN');

  await logActivity({
    action: 'IMPORT',
    module: 'INTL_EXAMS',
    description: `Xác nhận ghi nhận chính thức ${res.committedCount} kết quả thi quốc tế từ lô staging ${batchId}`,
    userId: session?.userId,
    userEmail: session?.email,
    userRole: session?.role,
  });

  revalidatePath('/admin/ktdbcl/international-exams');
  return res;
}

/**
 * Fetches longitudinal International Exam Results & Certificates for a student in Profile 360°.
 * Matches both by studentId AND by studentCodeSnapshot so multi-year enrollments are seamlessly unified.
 */
export async function getStudentIntlExamsPassportAction(studentId: string, studentCode?: string) {
  const orConditions: any[] = [{ studentId }];
  if (studentCode) {
    orConditions.push({ studentCodeSnapshot: studentCode });
  }

  const results = await prisma.intlExamResult.findMany({
    where: {
      OR: orConditions,
    },
    include: {
      skillResults: {
        orderBy: { displayOrder: 'asc' },
      },
      certificate: true,
      session: true,
      ruleSet: true,
    },
    orderBy: [{ academicYearText: 'desc' }, { createdAt: 'desc' }],
  });

  return results.map((r) => serializeExamResult(r));
}

export async function getIntlExamCommunicationPreviewAction(resultIds?: string[]) {
  const [recipients, recentNotifications] = await Promise.all([
    resolveRecipientsForResults(resultIds),
    prisma.notification.findMany({
      where: {
        category: 'INTL_EXAM_CERTIFICATE',
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
  ]);

  return {
    recipients,
    recentNotifications: recentNotifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      recipientName: n.user?.fullName || 'Người dùng',
      recipientRole: n.user?.role || 'USER',
      link: n.link || '',
    })),
  };
}

export async function sendIntlExamNotificationsAction(input: SendIntlExamNotificationInput) {
  const session = await getAdminSession();
  const res = await dispatchIntlExamNotifications(input);

  await logActivity({
    action: 'CREATE',
    module: 'INTL_EXAMS',
    description: `Gửi thông báo chứng chỉ quốc tế (${input.scenario}) cho ${res.studentsProcessed} học sinh (GVCN: ${res.gvcnNotificationsSent}, PHHS: ${res.parentNotificationsSent}, Cổng HS: ${res.studentPortalHighlightsCreated})`,
    userId: session?.userId,
    userEmail: session?.email,
    userRole: session?.role,
  });

  revalidatePath('/admin/ktdbcl/international-exams');
  revalidatePath('/teacher/ho-so-hoc-sinh');
  revalidatePath('/parent/children/profile');
  revalidatePath('/hocsinh/portal');
  return res;
}

export async function updateSsmStudentForIntlWorkspaceAction(params: {
  studentId: string;
  studentCode: string;
  studentName: string;
  classId?: string;
}) {
  const session = await getAdminSession();
  const existing = await prisma.student.findUnique({
    where: { id: params.studentId },
    include: { class: { include: { campus: true } } },
  });
  if (!existing) {
    throw new Error('Không tìm thấy học sinh trong SSM.');
  }

  let targetClass = existing.class;
  if (params.classId && params.classId !== existing.classId) {
    const foundCls = await prisma.class.findUnique({
      where: { id: params.classId },
      include: { campus: true },
    });
    if (foundCls) targetClass = foundCls;
  }

  const updated = await prisma.student.update({
    where: { id: params.studentId },
    data: {
      studentCode: params.studentCode.trim(),
      studentName: params.studentName.trim(),
      ...(targetClass
        ? {
            classId: targetClass.id,
            campusId: targetClass.campusId,
          }
        : {}),
    },
  });

  // Sync snapshots on any existing IntlExamResult records of this student
  await prisma.intlExamResult.updateMany({
    where: { studentId: updated.id },
    data: {
      studentCodeSnapshot: updated.studentCode,
      studentNameSnapshot: updated.studentName,
      ...(targetClass
        ? {
            classNameSnapshot: targetClass.className,
            gradeSnapshot: inferGradeFromClassName(targetClass.className, targetClass.grade),
            campusIdSnapshot: targetClass.campusId,
            campusCodeSnapshot: targetClass.campus?.campusCode || undefined,
          }
        : {}),
    },
  });

  await logActivity({
    action: 'UPDATE',
    module: 'INTL_EXAMS',
    description: `Cập nhật thông tin học sinh SSM: ${updated.studentName} (${updated.studentCode})`,
    userId: session?.userId,
    userEmail: session?.email,
    userRole: session?.role,
  });

  revalidatePath('/admin/ktdbcl/international-exams');
  return { success: true };
}

export async function deleteSsmStudentOrResultsForIntlWorkspaceAction(params: {
  studentId: string;
  mode: 'RESULTS_ONLY' | 'HIDE_STUDENT';
}) {
  const session = await getAdminSession();
  const st = await prisma.student.findUnique({ where: { id: params.studentId } });
  if (!st) throw new Error('Không tìm thấy học sinh.');

  await prisma.intlExamResult.deleteMany({
    where: { studentId: params.studentId },
  });

  if (params.mode === 'HIDE_STUDENT') {
    await prisma.student.update({
      where: { id: params.studentId },
      data: { status: 'INACTIVE' },
    });
  }

  await recomputeIeltsLongitudinalFlags();

  await logActivity({
    action: 'DELETE',
    module: 'INTL_EXAMS',
    description:
      params.mode === 'HIDE_STUDENT'
        ? `Xóa/ẩn học sinh ${st.studentName} (${st.studentCode}) khỏi danh sách khảo thí quốc tế`
        : `Xóa toàn bộ kết quả khảo thí quốc tế của học sinh ${st.studentName} (${st.studentCode})`,
    userId: session?.userId,
    userEmail: session?.email,
    userRole: session?.role,
  });

  revalidatePath('/admin/ktdbcl/international-exams');
  return { success: true };
}

export async function bulkDeleteIntlExamStudentsOrResultsAction(params: {
  studentIds: string[];
  mode: 'RESULTS_ONLY' | 'HIDE_STUDENT';
}) {
  const session = await getAdminSession();
  if (!params.studentIds || params.studentIds.length === 0) {
    return { success: true, count: 0 };
  }

  await prisma.intlExamResult.deleteMany({
    where: { studentId: { in: params.studentIds } },
  });

  if (params.mode === 'HIDE_STUDENT') {
    await prisma.student.updateMany({
      where: { id: { in: params.studentIds } },
      data: { status: 'INACTIVE' },
    });
  }

  await recomputeIeltsLongitudinalFlags();

  await logActivity({
    action: 'DELETE',
    module: 'INTL_EXAMS',
    description: `Xóa hàng loạt (${params.mode}) đối với ${params.studentIds.length} học sinh đã chọn`,
    userId: session?.userId,
    userEmail: session?.email,
    userRole: session?.role,
  });

  revalidatePath('/admin/ktdbcl/international-exams');
  return { success: true, count: params.studentIds.length };
}
