import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resolveAdvisoryCaller, isManagementRole } from '@/lib/advisory/rbac-guard';
import { ensureReflectionPrideTables } from '@/lib/reflection-pride/db-sync';
import {
  SKYLINE_5_QUALITIES_CATALOG,
  PRIDE_NPS_DRIVERS,
  REFLECTION_HIGHLIGHT_TAGS,
  IP21_OFFICIAL_CONFIG,
  CRITERIA_VERSION_2026,
  calculateStudentQualityScoresFromRatings,
  aggregatePrideNpsFromRawResponses,
  isEligibleGrade4To12,
  normalizeGradeNumber,
  isStudentInPeriodScope,
  CriteriaRatingMap,
  CriterionRatingEntry,
  PrideNpsRawRecord,
} from '@/lib/reflection-pride/catalog-and-engine';

export const dynamic = 'force-dynamic';

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

function isAdminOrQualityManager(caller: any): boolean {
  if (!caller || !caller.authenticated) return false;
  if (caller.isFullAdmin || caller.actorRole === 'ADMIN') return true;
  const r = String(caller.rawRole || caller.role || caller.actorRole || '').toUpperCase();
  return (
    isManagementRole(r) ||
    r === 'ADMIN' ||
    r === 'SUPER_ADMIN' ||
    r === 'BGH' ||
    r === 'KT_DBCL' ||
    r === 'KTDBCL' ||
    r === 'QA_TESTING' ||
    r === 'HDGD' ||
    r === 'GDCS' ||
    r === 'GĐCS'
  );
}

/**
 * GET /api/reflection-pride/admin
 * Phục vụ Dashboard ADMIN: KPIs Hệ thống -> Phẩm chất HS & Tự hào Sky-Line
 * - Hỗ trợ bộ lọc thống nhất & drill-down: Toàn hệ thống -> Cơ sở -> Khối -> Lớp
 * - Tính lại toàn bộ chỉ số từ dữ liệu gốc trên server
 * - Không lấy trung bình NPS lớp để tính NPS toàn trường/cơ sở/khối
 * - Không dùng NPS để xếp loại phẩm chất học sinh
 * - So sánh Cơ sở, Khối, Lớp và HK1/HK2
 */
export async function GET(request: NextRequest) {
  try {
    await ensureReflectionPrideTables();

    const caller = await resolveAdvisoryCaller();
    if (!caller || !caller.authenticated || caller.actorRole === 'STUDENT' || caller.actorRole === 'PARENT') {
      return NextResponse.json(
        { error: 'Truy cập bị từ chối. Chỉ dành cho Ban Giám hiệu, Ban KT&ĐBCL và Quản trị hệ thống.' },
        { status: 403 }
      );
    }

    if (!isAdminOrQualityManager(caller)) {
      return NextResponse.json(
        { error: 'Tài khoản không có quyền truy cập phân hệ KPIs Hệ thống -> Phẩm chất HS & Tự hào Sky-Line.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedYearId = searchParams.get('academicYearId');
    const requestedPeriodId = searchParams.get('periodId');
    const requestedSemester = searchParams.get('semester') || 'ALL';
    const requestedCampusId = searchParams.get('campusId') || 'ALL';
    const requestedGrade = searchParams.get('gradeLevel') || 'ALL';
    const requestedClassId = searchParams.get('classId') || 'ALL';
    const requestedCriteriaVersion = searchParams.get('criteriaVersion') || 'ALL';

    const effectiveCampusFilter =
      !caller.isFullAdmin && caller.campusIds?.length === 1 && requestedCampusId === 'ALL'
        ? caller.campusIds[0]
        : requestedCampusId;

    const [academicYearsRaw, campusesRaw] = await Promise.all([
      prisma.academicYear.findMany({
        where: { isOff: false },
        orderBy: { startDate: 'desc' },
      }),
      prisma.campus.findMany({
        orderBy: { campusName: 'asc' },
      }),
    ]);

    const academicYears = academicYearsRaw.map((y: any) => ({
      id: y.id,
      name: y.name,
      code: y.name,
      isCurrent: y.status === 'ACTIVE',
    }));

    const campuses = campusesRaw.map((c: any) => ({
      id: c.id,
      code: c.campusCode || c.id,
      name: c.campusName || c.name || 'Cơ sở Sky-Line',
    }));

    const activeYear =
      (requestedYearId && academicYears.find((y) => y.id === requestedYearId)) ||
      academicYears.find((y) => y.isCurrent) ||
      academicYears[0] ||
      null;

    const selectedYearId = activeYear?.id || requestedYearId || '2026-2027';

    // 2. Lấy tất cả các kỳ khảo sát từ bảng reflection_pride_periods
    const allPeriodsRaw = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "reflection_pride_periods" ORDER BY "createdAt" DESC`
    );

    const allPeriods = allPeriodsRaw.map((p) => ({
      ...p,
      title: p.name || p.title || p.code,
      name: p.name || p.title || p.code,
      ip21TargetRatePct: Number(p.ip21TargetRate ?? p.ip21TargetRatePct ?? 90),
      ip21PassThresholdPct: Number(p.ip21PassThreshold ?? p.ip21PassThresholdPct ?? 72),
      minNpsAnonymityCount: Number(p.minNpsAnonSample ?? p.minNpsAnonymityCount ?? 5),
      targetCampusesJson: p.targetCampusIdsJson ?? p.targetCampusesJson ?? '["ALL"]',
      targetClassesJson: p.targetClassIdsJson ?? p.targetClassesJson ?? '["ALL"]',
    }));

    const yearPeriods = allPeriods.filter((p) => p.academicYearId === selectedYearId);

    const selectedPeriod =
      requestedPeriodId && requestedPeriodId !== 'ALL'
        ? allPeriods.find((p) => p.id === requestedPeriodId) || yearPeriods[0] || allPeriods[0] || null
        : yearPeriods.find((p) => p.status === 'OPEN' || p.status === 'PUBLISHED') ||
          yearPeriods[0] ||
          allPeriods[0] ||
          null;

    // 3. Lấy danh sách lớp Khối 4–12
    const allClassesRaw = await prisma.class.findMany({
      where: {
        status: 'ACTIVE',
        ...(activeYear ? { academicYearId: activeYear.id } : {}),
      },
      include: {
        campus: true,
      },
      orderBy: [{ grade: 'asc' }, { className: 'asc' }],
    });

    const classesPool =
      allClassesRaw.length > 0
        ? allClassesRaw
        : await prisma.class.findMany({
            where: { status: 'ACTIVE' },
            include: { campus: true },
            orderBy: [{ grade: 'asc' }, { className: 'asc' }],
          });

    // Lấy thông tin GVCN
    const teachersAll = await prisma.teacher.findMany({
      select: { id: true, teacherName: true, homeroomClass: true },
    });
    const teacherById = new Map(teachersAll.map((t) => [t.id, t.teacherName]));

    const eligibleClassesAll = classesPool
      .filter((cls: any) => isEligibleGrade4To12(cls.grade, cls.className))
      .map((cls: any) => ({
        ...cls,
        name: cls.className || cls.name || '',
        campusName: cls.campus?.campusName || 'Sky-Line',
        campusCode: cls.campus?.campusCode || '',
        homeroomTeacherName:
          (cls.homeroomTeacherId && teacherById.get(cls.homeroomTeacherId)) ||
          teachersAll.find((t) => t.homeroomClass === cls.className)?.teacherName ||
          'GVCN Sky-Line',
      }));

    const periodScopedClasses = eligibleClassesAll.filter((cls) => {
      if (!selectedPeriod || requestedPeriodId === 'ALL') return true;
      return isStudentInPeriodScope(selectedPeriod, {
        gradeLevel: cls.grade || cls.name,
        className: cls.name,
        campusId: cls.campusId,
        classId: cls.id,
      }).eligible;
    });

    const filteredClasses = periodScopedClasses.filter((cls) => {
      if (effectiveCampusFilter !== 'ALL' && cls.campusId !== effectiveCampusFilter) {
        return false;
      }
      if (requestedGrade !== 'ALL') {
        const gNum = normalizeGradeNumber(cls.grade, cls.name);
        if (String(gNum) !== String(normalizeGradeNumber(requestedGrade))) {
          return false;
        }
      }
      if (requestedClassId !== 'ALL' && cls.id !== requestedClassId) {
        return false;
      }
      return true;
    });

    const filteredClassIds = new Set(filteredClasses.map((c) => c.id));
    const allEligibleClassIds = eligibleClassesAll.map((c) => c.id);

    const allStudentsInEligibleClasses =
      allEligibleClassIds.length > 0
        ? await prisma.student.findMany({
            where: {
              classId: { in: allEligibleClassIds },
              status: 'ACTIVE',
            },
            select: {
              id: true,
              studentCode: true,
              studentName: true,
              classId: true,
              campusId: true,
            },
          })
        : [];

    // 5. Truy vấn dữ liệu gốc `student_quality_reflections` và `pride_nps_anonymous_responses`
    const [rawReflectionsAllYear, rawNpsResponsesAllYear] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "student_quality_reflections"`),
      prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "pride_nps_anonymous_responses"`),
    ]);

    const passThresholdPct =
      selectedPeriod?.ip21PassThresholdPct ?? IP21_OFFICIAL_CONFIG.studentPassThresholdPct;
    const targetKpiPct =
      selectedPeriod?.ip21TargetRatePct ?? IP21_OFFICIAL_CONFIG.schoolKpiTargetPct;
    const minNpsAnonThreshold = selectedPeriod?.minNpsAnonymityCount ?? 5;

    const recalcReflectionsAllYear = rawReflectionsAllYear.map((ref) => {
      const ratingsMap = safeJsonParse<CriteriaRatingMap>(ref.criteriaRatingsJson, {});
      const calc = calculateStudentQualityScoresFromRatings(ratingsMap, passThresholdPct);
      return {
        ...ref,
        ratingsMap,
        calc,
        gradeNum: normalizeGradeNumber(ref.gradeLevel),
      };
    });

    const activeReflectionsFiltered = recalcReflectionsAllYear.filter((r) => {
      if (requestedPeriodId && requestedPeriodId !== 'ALL') {
        if (r.periodId !== requestedPeriodId) return false;
      } else if (selectedPeriod && requestedSemester === 'ALL') {
        if (r.periodId !== selectedPeriod.id) return false;
      }
      if (requestedSemester !== 'ALL' && r.semester !== requestedSemester) return false;
      if (requestedCriteriaVersion !== 'ALL' && r.criteriaVersion !== requestedCriteriaVersion)
        return false;
      if (effectiveCampusFilter !== 'ALL' && r.campusId !== effectiveCampusFilter) return false;
      if (
        requestedGrade !== 'ALL' &&
        String(r.gradeNum) !== String(normalizeGradeNumber(requestedGrade))
      ) {
        return false;
      }
      if (requestedClassId !== 'ALL' && r.classId !== requestedClassId) return false;
      if (r.classId && filteredClassIds.size > 0 && !filteredClassIds.has(r.classId)) return false;
      return true;
    });

    const activeNpsFiltered = rawNpsResponsesAllYear.filter((n) => {
      if (requestedPeriodId && requestedPeriodId !== 'ALL') {
        if (n.periodId !== requestedPeriodId) return false;
      } else if (selectedPeriod && requestedSemester === 'ALL') {
        if (n.periodId !== selectedPeriod.id) return false;
      }
      if (requestedSemester !== 'ALL' && n.semester !== requestedSemester) return false;
      if (requestedCriteriaVersion !== 'ALL' && n.criteriaVersion !== requestedCriteriaVersion)
        return false;
      if (effectiveCampusFilter !== 'ALL' && n.campusId !== effectiveCampusFilter) return false;
      if (
        requestedGrade !== 'ALL' &&
        String(normalizeGradeNumber(n.gradeLevel)) !== String(normalizeGradeNumber(requestedGrade))
      ) {
        return false;
      }
      if (requestedClassId !== 'ALL' && n.classId !== requestedClassId) return false;
      if (n.classId && filteredClassIds.size > 0 && !filteredClassIds.has(n.classId)) return false;
      return true;
    });

    function computeGroupMetrics(
      studentsInGroup: typeof allStudentsInEligibleClasses,
      reflectionsInGroup: typeof recalcReflectionsAllYear,
      npsRawInGroup: typeof rawNpsResponsesAllYear
    ) {
      const totalStudents = studentsInGroup.length;
      const submittedList = reflectionsInGroup.filter(
        (r) => String(r.status).toUpperCase() === 'SUBMITTED'
      );
      const draftList = reflectionsInGroup.filter(
        (r) => String(r.status).toUpperCase() === 'DRAFT'
      );

      const submittedCount = submittedList.length;
      const draftCount = draftList.length;
      const notStartedCount = Math.max(0, totalStudents - submittedCount - draftCount);
      const completionRatePct =
        totalStudents > 0 ? round2((submittedCount / totalStudents) * 100) : 0;

      const ip21PassedCount = submittedList.filter((r) => r.calc.ip21Passed).length;
      const ip21PassRatePct =
        submittedCount > 0 ? round2((ip21PassedCount / submittedCount) * 100) : 0;
      const ip21MeetsSchoolTarget = submittedCount > 0 && ip21PassRatePct >= targetKpiPct;

      const avgIp21Score16 =
        submittedCount > 0
          ? round2(
              submittedList.reduce((acc, r) => acc + r.calc.ip21TotalScore16, 0) / submittedCount
            )
          : 0;
      const avgIp21Percentage =
        submittedCount > 0
          ? round2(
              submittedList.reduce((acc, r) => acc + r.calc.ip21Percentage, 0) / submittedCount
            )
          : 0;
      const avgExtendedScore20 =
        submittedCount > 0
          ? round2(
              submittedList.reduce((acc, r) => acc + r.calc.extended5TotalScore20, 0) /
                submittedCount
            )
          : 0;
      const avgExtendedPercentage =
        submittedCount > 0
          ? round2(
              submittedList.reduce((acc, r) => acc + r.calc.extended5Percentage, 0) /
                submittedCount
            )
          : 0;
      const avgPrideQualityScore4 =
        submittedCount > 0
          ? round2(
              submittedList.reduce((acc, r) => acc + r.calc.prideQualityScore4, 0) / submittedCount
            )
          : 0;

      const levelCounts: Record<string, number> = {
        LAN_TOA: 0,
        VUNG_VANG: 0,
        DANG_REN_LUYEN: 0,
        CAN_DONG_HANH: 0,
      };
      for (const r of submittedList) {
        levelCounts[r.calc.ip21LevelCode] = (levelCounts[r.calc.ip21LevelCode] || 0) + 1;
      }

      const qualitiesBreakdown = SKYLINE_5_QUALITIES_CATALOG.map((q) => {
        const scores = submittedList
          .map((r) => {
            const qRes = r.calc.qualities.find((item) => item.qualityCode === q.code);
            return qRes && qRes.ratedCriteriaCount > 0 ? qRes.averageScore : null;
          })
          .filter((v): v is number => v !== null);

        const avgScore4 =
          scores.length > 0 ? round2(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const passCount = scores.filter((s) => (s / 4) * 100 >= passThresholdPct).length;
        const passRate = scores.length > 0 ? round2((passCount / scores.length) * 100) : 0;

        const criteriaBreakdown = q.criteria.map((crit) => {
          const critScores: number[] = [];
          const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

          for (const r of submittedList) {
            const scoreNum = r.calc.criterionScores[crit.code];
            if ([1, 2, 3, 4].includes(scoreNum)) {
              critScores.push(scoreNum);
              dist[scoreNum] = (dist[scoreNum] || 0) + 1;
            }
          }

          const critAvg =
            critScores.length > 0
              ? round2(critScores.reduce((a, b) => a + b, 0) / critScores.length)
              : 0;
          const critPassCount = critScores.filter((s) => s >= 3).length;

          return {
            code: crit.code,
            shortName: crit.shortName,
            statement: crit.statement,
            avgScore4: critAvg,
            percentage: round2((critAvg / 4) * 100),
            passRatePct:
              critScores.length > 0 ? round2((critPassCount / critScores.length) * 100) : 0,
            ratedCount: critScores.length,
            distribution: dist,
          };
        });

        return {
          code: q.code,
          name: q.name,
          englishName: q.englishName,
          includedInOfficialIp21: q.includedInOfficialIp21,
          avgScore4,
          percentage: round2((avgScore4 / 4) * 100),
          passRatePct: passRate,
          ratedCount: scores.length,
          criteria: criteriaBreakdown,
        };
      });

      const npsRawFormatted: PrideNpsRawRecord[] = npsRawInGroup.map((item) => ({
        npsScore: Number(item.npsScore ?? item.score),
        campusId: item.campusId,
        classId: item.classId,
        gradeLevel: item.gradeLevel,
        semester: item.semester,
        prideDriversJson: item.prideDriversJson ?? item.reasonsJson,
        proudMomentText: item.proudMomentText ?? item.proudMoments,
        improvementSuggestion: item.improvementSuggestion ?? item.improvementIdeas,
      }));
      const npsSummary = aggregatePrideNpsFromRawResponses(npsRawFormatted, minNpsAnonThreshold);

      const npsParticipationRateVsTotalPct =
        totalStudents > 0 ? round2((npsRawInGroup.length / totalStudents) * 100) : 0;

      const gvcnReviewedCount = submittedList.filter((r) =>
        Boolean(r.gvcnComment || r.gvcnFeedback)
      ).length;
      const cvhtLinkedCount = submittedList.filter((r) => Boolean(r.cvhtLinkedGoalId)).length;

      return {
        totalStudents,
        submittedCount,
        draftCount,
        notStartedCount,
        completionRatePct,
        ip21PassedCount,
        ip21PassRatePct,
        ip21TargetRatePct: targetKpiPct,
        ip21PassThresholdPct: passThresholdPct,
        ip21MeetsSchoolTarget,
        avgIp21Score16,
        avgIp21Percentage,
        avgExtendedScore20,
        avgExtendedPercentage,
        avgPrideQualityScore4,
        levelCounts,
        qualitiesBreakdown,
        npsSummary,
        npsParticipationRateVsTotalPct,
        gvcnReviewedCount,
        cvhtLinkedCount,
      };
    }

    const filteredStudents = allStudentsInEligibleClasses.filter(
      (s) => s.classId && filteredClassIds.has(s.classId)
    );
    const overallMetrics = computeGroupMetrics(
      filteredStudents,
      activeReflectionsFiltered,
      activeNpsFiltered
    );

    const classSummaries = filteredClasses.map((cls) => {
      const clsStudents = allStudentsInEligibleClasses.filter((s) => s.classId === cls.id);
      const clsReflections = activeReflectionsFiltered.filter((r) => r.classId === cls.id);
      const clsNps = activeNpsFiltered.filter((n) => n.classId === cls.id);

      const m = computeGroupMetrics(clsStudents, clsReflections, clsNps);
      const gradeNum = normalizeGradeNumber(cls.grade, cls.name);

      return {
        classId: cls.id,
        className: cls.name,
        gradeLevel: gradeNum ? String(gradeNum) : cls.grade || '',
        campusId: cls.campusId || '',
        campusCode: cls.campusCode || '',
        campusName: cls.campusName || 'Sky-Line',
        homeroomTeacherName: cls.homeroomTeacherName,
        totalStudents: m.totalStudents,
        submittedCount: m.submittedCount,
        draftCount: m.draftCount,
        notStartedCount: m.notStartedCount,
        completionRatePct: m.completionRatePct,
        avgIp21Score16: m.avgIp21Score16,
        avgIp21Percentage: m.avgIp21Percentage,
        ip21PassedCount: m.ip21PassedCount,
        ip21PassRatePct: m.ip21PassRatePct,
        ip21MeetsSchoolTarget: m.ip21MeetsSchoolTarget,
        avgExtendedScore20: m.avgExtendedScore20,
        avgPrideQualityScore4: m.avgPrideQualityScore4,
        qualitiesAvg: m.qualitiesBreakdown.reduce(
          (acc, q) => {
            acc[q.code] = q.avgScore4;
            return acc;
          },
          {} as Record<string, number>
        ),
        nps: {
          totalResponses: m.npsSummary.totalResponses,
          isAnonymityMet: m.npsSummary.isAnonymityMet,
          npsScore: m.npsSummary.npsScore,
          promoterPct: m.npsSummary.promoterPct,
          passivePct: m.npsSummary.passivePct,
          detractorPct: m.npsSummary.detractorPct,
          averageScore10: m.npsSummary.averageScore10,
        },
        gvcnReviewedCount: m.gvcnReviewedCount,
        cvhtLinkedCount: m.cvhtLinkedCount,
      };
    });

    const campusComparison = campuses
      .map((cp) => {
        const cpClasses = periodScopedClasses.filter((c) => c.campusId === cp.id);
        const cpClassIds = new Set(cpClasses.map((c) => c.id));
        const cpStudents = allStudentsInEligibleClasses.filter(
          (s) => (s.classId && cpClassIds.has(s.classId)) || s.campusId === cp.id
        );
        const cpReflections = recalcReflectionsAllYear.filter((r) => {
          if (requestedPeriodId && requestedPeriodId !== 'ALL') {
            if (r.periodId !== requestedPeriodId) return false;
          } else if (selectedPeriod && requestedSemester === 'ALL') {
            if (r.periodId !== selectedPeriod.id) return false;
          }
          if (requestedSemester !== 'ALL' && r.semester !== requestedSemester) return false;
          return r.campusId === cp.id || (r.classId && cpClassIds.has(r.classId));
        });
        const cpNps = rawNpsResponsesAllYear.filter((n) => {
          if (requestedPeriodId && requestedPeriodId !== 'ALL') {
            if (n.periodId !== requestedPeriodId) return false;
          } else if (selectedPeriod && requestedSemester === 'ALL') {
            if (n.periodId !== selectedPeriod.id) return false;
          }
          if (requestedSemester !== 'ALL' && n.semester !== requestedSemester) return false;
          return n.campusId === cp.id || (n.classId && cpClassIds.has(n.classId));
        });

        const m = computeGroupMetrics(cpStudents, cpReflections, cpNps);
        return {
          campusId: cp.id,
          campusCode: cp.code,
          campusName: cp.name,
          classCount: cpClasses.length,
          totalStudents: m.totalStudents,
          submittedCount: m.submittedCount,
          completionRatePct: m.completionRatePct,
          avgIp21Score16: m.avgIp21Score16,
          ip21PassRatePct: m.ip21PassRatePct,
          ip21MeetsSchoolTarget: m.ip21MeetsSchoolTarget,
          avgExtendedScore20: m.avgExtendedScore20,
          avgPrideQualityScore4: m.avgPrideQualityScore4,
          nps: {
            totalResponses: m.npsSummary.totalResponses,
            isAnonymityMet: m.npsSummary.isAnonymityMet,
            npsScore: m.npsSummary.npsScore,
            promoterPct: m.npsSummary.promoterPct,
            passivePct: m.npsSummary.passivePct,
            detractorPct: m.npsSummary.detractorPct,
          },
        };
      })
      .filter((cp) => cp.classCount > 0 || cp.submittedCount > 0 || cp.nps.totalResponses > 0);

    const gradeNumbers = [4, 5, 6, 7, 8, 9, 10, 11, 12];
    const gradeComparison = gradeNumbers
      .map((gNum) => {
        const gClasses = periodScopedClasses.filter((c) => {
          if (effectiveCampusFilter !== 'ALL' && c.campusId !== effectiveCampusFilter) return false;
          return normalizeGradeNumber(c.grade, c.name) === gNum;
        });
        const gClassIds = new Set(gClasses.map((c) => c.id));
        const gStudents = allStudentsInEligibleClasses.filter(
          (s) => s.classId && gClassIds.has(s.classId)
        );
        const gReflections = recalcReflectionsAllYear.filter((r) => {
          if (requestedPeriodId && requestedPeriodId !== 'ALL') {
            if (r.periodId !== requestedPeriodId) return false;
          } else if (selectedPeriod && requestedSemester === 'ALL') {
            if (r.periodId !== selectedPeriod.id) return false;
          }
          if (requestedSemester !== 'ALL' && r.semester !== requestedSemester) return false;
          if (effectiveCampusFilter !== 'ALL' && r.campusId !== effectiveCampusFilter) return false;
          return r.gradeNum === gNum || (r.classId && gClassIds.has(r.classId));
        });
        const gNps = rawNpsResponsesAllYear.filter((n) => {
          if (requestedPeriodId && requestedPeriodId !== 'ALL') {
            if (n.periodId !== requestedPeriodId) return false;
          } else if (selectedPeriod && requestedSemester === 'ALL') {
            if (n.periodId !== selectedPeriod.id) return false;
          }
          if (requestedSemester !== 'ALL' && n.semester !== requestedSemester) return false;
          if (effectiveCampusFilter !== 'ALL' && n.campusId !== effectiveCampusFilter) return false;
          return (
            normalizeGradeNumber(n.gradeLevel) === gNum || (n.classId && gClassIds.has(n.classId))
          );
        });

        const m = computeGroupMetrics(gStudents, gReflections, gNps);
        return {
          gradeLevel: String(gNum),
          gradeLabel: `Khối ${gNum}`,
          educationStage:
            gNum <= 5 ? 'Tiểu học (K4-5)' : gNum <= 9 ? 'THCS (K6-9)' : 'THPT (K10-12)',
          classCount: gClasses.length,
          totalStudents: m.totalStudents,
          submittedCount: m.submittedCount,
          completionRatePct: m.completionRatePct,
          avgIp21Score16: m.avgIp21Score16,
          ip21PassRatePct: m.ip21PassRatePct,
          ip21MeetsSchoolTarget: m.ip21MeetsSchoolTarget,
          avgExtendedScore20: m.avgExtendedScore20,
          avgPrideQualityScore4: m.avgPrideQualityScore4,
          qualitiesAvg: m.qualitiesBreakdown.reduce(
            (acc, q) => {
              acc[q.code] = q.avgScore4;
              return acc;
            },
            {} as Record<string, number>
          ),
          nps: {
            totalResponses: m.npsSummary.totalResponses,
            isAnonymityMet: m.npsSummary.isAnonymityMet,
            npsScore: m.npsSummary.npsScore,
            promoterPct: m.npsSummary.promoterPct,
            passivePct: m.npsSummary.passivePct,
            detractorPct: m.npsSummary.detractorPct,
          },
        };
      })
      .filter((g) => g.classCount > 0 || g.submittedCount > 0 || g.nps.totalResponses > 0);

    const buildSemesterComparisonItem = (semCode: 'HK1' | 'HK2') => {
      const semReflections = recalcReflectionsAllYear.filter((r) => {
        if (r.semester !== semCode) return false;
        if (effectiveCampusFilter !== 'ALL' && r.campusId !== effectiveCampusFilter) return false;
        if (
          requestedGrade !== 'ALL' &&
          String(r.gradeNum) !== String(normalizeGradeNumber(requestedGrade))
        ) {
          return false;
        }
        if (requestedClassId !== 'ALL' && r.classId !== requestedClassId) return false;
        return true;
      });

      const semNps = rawNpsResponsesAllYear.filter((n) => {
        if (n.semester !== semCode) return false;
        if (effectiveCampusFilter !== 'ALL' && n.campusId !== effectiveCampusFilter) return false;
        if (
          requestedGrade !== 'ALL' &&
          String(normalizeGradeNumber(n.gradeLevel)) !== String(normalizeGradeNumber(requestedGrade))
        ) {
          return false;
        }
        if (requestedClassId !== 'ALL' && n.classId !== requestedClassId) return false;
        return true;
      });

      const m = computeGroupMetrics(filteredStudents, semReflections, semNps);
      return {
        semester: semCode,
        label: semCode === 'HK1' ? 'Học kỳ I (HK1)' : 'Học kỳ II (HK2)',
        totalStudents: m.totalStudents,
        submittedCount: m.submittedCount,
        completionRatePct: m.completionRatePct,
        avgIp21Score16: m.avgIp21Score16,
        ip21PassRatePct: m.ip21PassRatePct,
        avgExtendedScore20: m.avgExtendedScore20,
        avgPrideQualityScore4: m.avgPrideQualityScore4,
        qualitiesAvg: m.qualitiesBreakdown.reduce(
          (acc, q) => {
            acc[q.code] = q.avgScore4;
            return acc;
          },
          {} as Record<string, number>
        ),
        nps: {
          totalResponses: m.npsSummary.totalResponses,
          isAnonymityMet: m.npsSummary.isAnonymityMet,
          npsScore: m.npsSummary.npsScore,
          promoterPct: m.npsSummary.promoterPct,
          passivePct: m.npsSummary.passivePct,
          detractorPct: m.npsSummary.detractorPct,
        },
      };
    };

    const hk1Metrics = buildSemesterComparisonItem('HK1');
    const hk2Metrics = buildSemesterComparisonItem('HK2');

    const criteriaVersionsSet = new Set<string>([CRITERIA_VERSION_2026]);
    allPeriods.forEach((p) => {
      if (p.criteriaVersion) criteriaVersionsSet.add(p.criteriaVersion);
    });
    recalcReflectionsAllYear.forEach((r) => {
      if (r.criteriaVersion) criteriaVersionsSet.add(r.criteriaVersion);
    });

    const periodsWithStats = allPeriods.map((p) => {
      const refSubmitted = rawReflectionsAllYear.filter(
        (r) => r.periodId === p.id && String(r.status).toUpperCase() === 'SUBMITTED'
      ).length;
      const refDraft = rawReflectionsAllYear.filter(
        (r) => r.periodId === p.id && String(r.status).toUpperCase() === 'DRAFT'
      ).length;
      const npsCount = rawNpsResponsesAllYear.filter((n) => n.periodId === p.id).length;

      return {
        ...p,
        targetGrades: safeJsonParse<string[]>(p.targetGradesJson, [
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
          '10',
          '11',
          '12',
        ]),
        targetCampuses: safeJsonParse<string[]>(p.targetCampusesJson, []),
        targetClasses: safeJsonParse<string[]>(p.targetClassesJson, []),
        stats: {
          submittedCount: refSubmitted,
          draftCount: refDraft,
          npsResponsesCount: npsCount,
        },
      };
    });

    return NextResponse.json({
      caller: {
        userId: caller.userId,
        role: caller.actorRole,
        name: caller.actorName,
      },
      filters: {
        academicYearId: selectedYearId,
        periodId: requestedPeriodId || selectedPeriod?.id || 'ALL',
        semester: requestedSemester,
        campusId: effectiveCampusFilter,
        gradeLevel: requestedGrade,
        classId: requestedClassId,
        criteriaVersion: requestedCriteriaVersion,
      },
      filterOptions: {
        academicYears,
        campuses,
        grades: [
          { value: '4', label: 'Khối 4' },
          { value: '5', label: 'Khối 5' },
          { value: '6', label: 'Khối 6' },
          { value: '7', label: 'Khối 7' },
          { value: '8', label: 'Khối 8' },
          { value: '9', label: 'Khối 9' },
          { value: '10', label: 'Khối 10' },
          { value: '11', label: 'Khối 11' },
          { value: '12', label: 'Khối 12' },
        ],
        classes: eligibleClassesAll.map((c) => ({
          id: c.id,
          name: c.name,
          grade: String(normalizeGradeNumber(c.grade, c.name) || c.grade || ''),
          campusId: c.campusId || '',
          campusName: c.campusName || '',
        })),
        criteriaVersions: Array.from(criteriaVersionsSet),
      },
      selectedPeriod: selectedPeriod
        ? {
            ...selectedPeriod,
            targetGrades: safeJsonParse<string[]>(selectedPeriod.targetGradesJson, [
              '4',
              '5',
              '6',
              '7',
              '8',
              '9',
              '10',
              '11',
              '12',
            ]),
            targetCampuses: safeJsonParse<string[]>(selectedPeriod.targetCampusesJson, []),
            targetClasses: safeJsonParse<string[]>(selectedPeriod.targetClassesJson, []),
          }
        : null,
      periods: periodsWithStats,
      catalog: {
        qualities: SKYLINE_5_QUALITIES_CATALOG,
        prideNpsDrivers: PRIDE_NPS_DRIVERS,
        highlightTags: REFLECTION_HIGHLIGHT_TAGS,
        ip21Config: IP21_OFFICIAL_CONFIG,
      },
      overview: overallMetrics,
      classSummaries,
      comparisons: {
        byCampus: campusComparison,
        byGrade: gradeComparison,
        bySemester: {
          hk1: hk1Metrics,
          hk2: hk2Metrics,
          deltaIp21Score16: round2(hk2Metrics.avgIp21Score16 - hk1Metrics.avgIp21Score16),
          deltaIp21PassRatePct: round2(hk2Metrics.ip21PassRatePct - hk1Metrics.ip21PassRatePct),
          deltaNpsScore:
            hk1Metrics.nps.npsScore !== null && hk2Metrics.nps.npsScore !== null
              ? hk2Metrics.nps.npsScore - hk1Metrics.nps.npsScore
              : null,
        },
      },
    });
  } catch (error: unknown) {
    console.error('[GET /api/reflection-pride/admin] Error:', error);
    return NextResponse.json(
      {
        error: 'Không thể tải dữ liệu KPI Phẩm chất & Pride NPS',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureReflectionPrideTables();

    const caller = await resolveAdvisoryCaller();
    if (!caller || !isAdminOrQualityManager(caller)) {
      return NextResponse.json(
        { error: 'Chỉ Admin / Ban KT&ĐBCL / BGH mới có quyền quản lý kỳ khảo sát.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = String(body.action || '').toUpperCase();

    if (action === 'CREATE_PERIOD') {
      const code = String(body.code || '').trim().toUpperCase();
      const title = String(body.title || body.name || '').trim();
      const academicYearId = String(body.academicYearId || '2026-2027').trim();
      const semester = String(body.semester || 'HK1').trim().toUpperCase();
      const criteriaVersion = String(body.criteriaVersion || CRITERIA_VERSION_2026).trim();
      const description = body.description ? String(body.description).trim() : null;

      if (!code || !title) {
        return NextResponse.json(
          { error: 'Vui lòng nhập đầy đủ Mã kỳ khảo sát (code) và Tên kỳ khảo sát (title).' },
          { status: 400 }
        );
      }

      const existingRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "id" FROM "reflection_pride_periods" WHERE "code" = ? LIMIT 1`,
        code
      );
      if (existingRows.length > 0) {
        return NextResponse.json(
          { error: `Mã kỳ khảo sát "${code}" đã tồn tại. Vui lòng chọn mã khác.` },
          { status: 409 }
        );
      }

      const rawGrades = Array.isArray(body.targetGrades)
        ? body.targetGrades.map(String).filter((g: string) => isEligibleGrade4To12(g))
        : ['4', '5', '6', '7', '8', '9', '10', '11', '12'];
      const targetGrades =
        rawGrades.length > 0 ? rawGrades : ['4', '5', '6', '7', '8', '9', '10', '11', '12'];
      const targetCampuses = Array.isArray(body.targetCampuses) && body.targetCampuses.length > 0
        ? body.targetCampuses.map(String)
        : ['ALL'];
      const targetClasses = Array.isArray(body.targetClasses) && body.targetClasses.length > 0
        ? body.targetClasses.map(String)
        : ['ALL'];

      const startDate = body.startDate
        ? new Date(body.startDate).toISOString()
        : new Date().toISOString();
      const endDate = body.endDate
        ? new Date(body.endDate).toISOString()
        : new Date(Date.now() + 14 * 86400000).toISOString();

      const initialStatus = ['DRAFT', 'OPEN'].includes(String(body.status || 'DRAFT').toUpperCase())
        ? String(body.status).toUpperCase()
        : 'DRAFT';

      const newId = `rpp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await prisma.$executeRawUnsafe(
        `INSERT INTO "reflection_pride_periods" (
          "id", "code", "name", "academicYearId", "semester", "criteriaVersion",
          "status", "startDate", "endDate",
          "targetGradesJson", "targetCampusIdsJson", "targetClassIdsJson",
          "ip21TargetRate", "ip21PassThreshold", "minNpsAnonSample",
          "description", "createdByUserId", "createdByName", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        newId,
        code,
        title,
        academicYearId,
        semester,
        criteriaVersion,
        initialStatus,
        startDate,
        endDate,
        JSON.stringify(targetGrades),
        JSON.stringify(targetCampuses),
        JSON.stringify(targetClasses),
        Number(body.ip21TargetRatePct ?? 90),
        Number(body.ip21PassThresholdPct ?? 72),
        Math.max(3, Number(body.minNpsAnonymityCount ?? 5)),
        description,
        caller.userId,
        caller.actorName
      );

      return NextResponse.json({
        success: true,
        message: `Đã khởi tạo kỳ khảo sát "${title}" (${code}).`,
        period: { id: newId, code, title, name: title, status: initialStatus },
      });
    }

    if (action === 'CHANGE_STATUS') {
      const periodId = String(body.periodId || '').trim();
      const newStatus = String(body.status || '').trim().toUpperCase();

      if (!periodId || !['DRAFT', 'OPEN', 'CLOSED', 'PUBLISHED'].includes(newStatus)) {
        return NextResponse.json(
          { error: 'Trạng thái không hợp lệ. Chỉ chấp nhận DRAFT, OPEN, CLOSED, PUBLISHED.' },
          { status: 400 }
        );
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "reflection_pride_periods"
         SET "status" = ?,
             "publishedAt" = CASE WHEN ? = 'PUBLISHED' THEN CURRENT_TIMESTAMP ELSE "publishedAt" END,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = ?`,
        newStatus,
        newStatus,
        periodId
      );

      const statusLabels: Record<string, string> = {
        DRAFT: 'Bản nháp (Chưa mở)',
        OPEN: 'Đang mở (Học sinh thuộc phạm vi đã thấy nhiệm vụ mới)',
        CLOSED: 'Đã đóng kỳ',
        PUBLISHED: 'Đã công bố kết quả chính thức',
      };

      return NextResponse.json({
        success: true,
        message: `Đã chuyển trạng thái kỳ khảo sát sang: ${statusLabels[newStatus] || newStatus}.`,
      });
    }

    if (action === 'EXTEND_DEADLINE') {
      const periodId = String(body.periodId || '').trim();
      const extendedUntilRaw = body.extendedUntil || body.endDate;

      if (!periodId || !extendedUntilRaw) {
        return NextResponse.json(
          { error: 'Vui lòng chọn kỳ khảo sát và thời hạn gia hạn mới.' },
          { status: 400 }
        );
      }

      const newDeadline = new Date(extendedUntilRaw);
      if (isNaN(newDeadline.getTime())) {
        return NextResponse.json({ error: 'Ngày gia hạn không hợp lệ.' }, { status: 400 });
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "reflection_pride_periods"
         SET "extendedUntil" = ?,
             "endDate" = ?,
             "status" = CASE WHEN ? = 1 THEN 'OPEN' ELSE "status" END,
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "id" = ?`,
        newDeadline.toISOString(),
        newDeadline.toISOString(),
        body.reopenPeriod ? 1 : 0,
        periodId
      );

      return NextResponse.json({
        success: true,
        message: `Đã gia hạn kỳ khảo sát đến ${newDeadline.toLocaleDateString('vi-VN')}.`,
      });
    }

    return NextResponse.json({ error: `Hành động không hợp lệ: ${action}` }, { status: 400 });
  } catch (error: unknown) {
    console.error('[POST /api/reflection-pride/admin] Error:', error);
    return NextResponse.json(
      {
        error: 'Lỗi xử lý quản trị kỳ khảo sát Phẩm chất & Pride NPS',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
