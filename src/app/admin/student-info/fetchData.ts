import { prisma } from "@/lib/db"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { auth } from "@/lib/auth"
import { suggestPreschoolForm, PRESCHOOL_FORM_REGISTRY } from "@/lib/preschool-workflow"

export async function fetchStudentInfoPageData(options?: {
  pageMode?: "danh-sach" | "ket-qua";
}) {
  const isKetQuaMode = options?.pageMode === "ket-qua";
  const isDanhSachMode = options?.pageMode === "danh-sach";
  let session: any = null;
  try {
    session = await auth();
  } catch (e) {
    console.error("Auth error:", e);
  }
  
  const user = session?.user as any;
  const isGDCS = user?.role === 'GDCS';
  const allowedCampusIds = user?.campusIds || [];
  let liveCampusIds = [...allowedCampusIds];

  // --- FETCH CHUNG ---
  let academicYears: any[] = [];
  let campuses: any[] = [];
  let giaoVuCSUsers: any[] = [];
  let teachers: any[] = [];
  let departments: any[] = [];

  // --- FETCH K12 RIÊNG ---
  let examBoardUsers: any[] = [];
  let gdcsUsers: any[] = [];
  let subjects: any[] = [];
  let allSubjects: any[] = [];
  let eduSystems: any[] = [];
  let grades: string[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  let configs: any[] = [];
  let preschoolConfigs: any[] = [];
  let rolePermissions: any[] = [];

  // --- FETCH STUDENT-INFO RIÊNG ---
  let generalStudents: any[] = [];
  let preschoolStudents: any[] = [];
  let generalPeriods: any[] = [];
  let preschoolPeriods: any[] = [];
  let destinationSchools: any[] = [];
  let activeYear: any = null;

  // --- FETCH MẦM NON RIÊNG ---
  const gradesPreschool = ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng", "3 đến 4 tuổi", "4 đến 5 tuổi", "5 đến 6 tuổi"];

  try {
    const pAny = prisma as any;
    if (pAny) {
      const roleCode = user?.role || "ADMIN";
      activeYear = await getDefaultAcademicYear(pAny);

      if (pAny.destinationSchool) {
        destinationSchools = await pAny.destinationSchool.findMany({
          orderBy: [{ level: "desc" }, { name: "asc" }]
        }).catch(() => []);
      }

      const activeYearId = activeYear ? activeYear.id : null;

      // Trigger metadata fetches in parallel (skip unused lookups in ket-qua mode to reduce DB load & RSC payload)
      const [
        dbAssignments,
        academicYearsResult,
        campusesResult,
        giaoVuCSUsersResult,
        departmentsResult,
        teachersResult,
        examBoardUsersResult,
        gdcsUsersResult,
        allSubjectsResult,
        configsResult,
        preschoolConfigsResult,
        eduSystemsResult,
        rolePermissionsResult,
        generalPeriodsResult,
        preschoolPeriodsResult
      ] = await Promise.all([
        user?.id && pAny.userCampusAssignment ? pAny.userCampusAssignment.findMany({ where: { userId: user.id } }).catch(() => []) : Promise.resolve([]),
        pAny.academicYear ? pAny.academicYear.findMany({ orderBy: { startDate: "desc" } }).catch(() => []) : Promise.resolve([]),
        pAny.campus ? pAny.campus.findMany({
          where: isGDCS ? { id: { in: allowedCampusIds } } : { status: "ACTIVE" },
          include: {
            manager: { select: { id: true, fullName: true, email: true } }
          },
          orderBy: { campusName: "asc" }
        }).catch(() => []) : Promise.resolve([]),
        !isKetQuaMode && pAny.user ? pAny.user.findMany({
          where: { role: { in: ["GĐ_CS", "GIAO_VU", "GDCS", "GIAO_VU_CS"] } },
          select: { id: true, fullName: true }
        }).catch(() => []) : Promise.resolve([]),
        !isKetQuaMode && pAny.department ? pAny.department.findMany({
          where: { status: "ACTIVE" }, orderBy: { name: "asc" }
        }).catch(() => []) : Promise.resolve([]),
        !isKetQuaMode && pAny.teacher ? pAny.teacher.findMany({
          where: { status: "ACTIVE" },
          select: {
            id: true,
            teacherCode: true,
            teacherName: true,
            email: true,
            phone: true,
            position: true,
            positions: true,
            campusId: true,
            departmentId: true,
            userId: true,
            status: true,
            departmentRel: { select: { id: true, name: true } },
            campus: { select: { id: true, campusName: true, campusCode: true } },
            user: { select: { id: true, fullName: true, email: true, role: true } }
          },
          orderBy: { teacherName: "asc" }
        }).catch(() => []) : Promise.resolve([]),
        !isKetQuaMode && pAny.user ? pAny.user.findMany({
          where: { role: { in: ["KT_DBCL", "KHAO_THI", "ĐBCL", "DBCL", "ADMIN"] } },
          select: { id: true, fullName: true }
        }).catch(() => []) : Promise.resolve([]),
        !isKetQuaMode && pAny.user ? pAny.user.findMany({
          where: { OR: [{ role: { in: ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "gdcs", "gđcs", "gđ_cs", "gd_cs"] } }, { teacher: { position: { in: ["GĐCS", "GDCS", "GĐ_CS", "GD_CS"] } } }, { teacher: { positions: { contains: "GĐCS" } } }, { teacher: { positions: { contains: "GDCS" } } }] },
          select: { id: true, fullName: true, email: true }
        }).catch(() => []) : Promise.resolve([]),
        pAny.assessmentSubject ? pAny.assessmentSubject.findMany({
          orderBy: { sortOrder: "asc" }
        }).catch(() => []) : Promise.resolve([]),
        pAny.assessmentConfig ? pAny.assessmentConfig.findMany({
          orderBy: [{ categoryType: "asc" }, { sortOrder: "asc" }]
        }).catch(() => []) : Promise.resolve([]),
        pAny.preschoolAssessmentConfig ? pAny.preschoolAssessmentConfig.findMany({
          where: {
            categoryType: {
              notIn: ["target", "LOAI_TUYEN_SINH", "DOI_TUONG_TS", "loai_tuyen_sinh", "doi_tuong_ts", "target_type", "TARGET_TYPE", "targetType"]
            }
          },
          orderBy: [{ categoryType: "asc" }, { sortOrder: "asc" }]
        }).catch(() => []) : Promise.resolve([]),
        pAny.educationSystem ? pAny.educationSystem.findMany({
          orderBy: { createdAt: "asc" }
        }).catch(() => []) : Promise.resolve([]),
        import("@/lib/permissions").then(m => m.getRolePermissions(roleCode)).catch(() => []),
        pAny.inputAssessmentPeriod ? pAny.inputAssessmentPeriod.findMany({
          where: activeYearId ? { academicYearId: activeYearId } : {},
          include: { batches: { select: { id: true, name: true, status: true, campusId: true, startDate: true, endDate: true } } },
          orderBy: { name: 'asc' }
        }).catch(() => []) : Promise.resolve([]),
        pAny.preschoolInputAssessmentPeriod ? pAny.preschoolInputAssessmentPeriod.findMany({
          where: activeYearId ? { academicYearId: activeYearId } : {},
          include: { batches: { select: { id: true, name: true, status: true, campusId: true, startDate: true, endDate: true } } },
          orderBy: { name: 'asc' }
        }).catch(() => []) : Promise.resolve([])
      ]);

      academicYears = academicYearsResult;
      campuses = campusesResult;
      giaoVuCSUsers = giaoVuCSUsersResult;
      departments = departmentsResult;
      teachers = teachersResult;
      examBoardUsers = examBoardUsersResult;
      gdcsUsers = gdcsUsersResult;
      allSubjects = allSubjectsResult;
      subjects = allSubjectsResult.filter((s: any) => s.status === "ACTIVE");
      configs = configsResult;
      preschoolConfigs = preschoolConfigsResult;
      eduSystems = eduSystemsResult;
      rolePermissions = rolePermissionsResult;
      generalPeriods = generalPeriodsResult;
      preschoolPeriods = preschoolPeriodsResult;

      if (dbAssignments && dbAssignments.length > 0) {
        liveCampusIds = dbAssignments.map((a: any) => a.campusId);
      }

      if (activeYearId) {
        [generalStudents, preschoolStudents] = await Promise.all([
          isDanhSachMode
            ? pAny.inputAssessmentStudent.findMany({
                where: {
                  period: { academicYearId: activeYearId }
                },
                select: {
                  id: true,
                  periodId: true,
                  batchId: true,
                  className: true,
                  admissionCriteria: true,
                  surveySystem: true,
                  surveyFormType: true,
                  targetType: true,
                  grade: true,
                  registeredCampus: true,
                  admissionCampus: true
                },
                orderBy: { createdAt: 'desc' }
              })
            : pAny.inputAssessmentStudent.findMany({
                where: {
                  period: { academicYearId: activeYearId }
                },
                include: {
                  enrollmentClass: { select: { className: true } },
                  scores: {
                    select: {
                      id: true,
                      studentId: true,
                      subjectId: true,
                      scores: true,
                      comments: true,
                      updatedAt: true,
                      teacherId: true,
                      teacherName: true
                    }
                  }
                },
                orderBy: { createdAt: 'desc' }
              }),
          isDanhSachMode
            ? pAny.preschoolInputAssessmentStudent.findMany({
                where: {
                  period: { academicYearId: activeYearId }
                },
                select: {
                  id: true,
                  periodId: true,
                  batchId: true
                },
                orderBy: { createdAt: 'desc' }
              })
            : pAny.preschoolInputAssessmentStudent.findMany({
                where: {
                  period: { academicYearId: activeYearId }
                },
                include: {
                  enrollmentClass: { select: { className: true } }
                },
                orderBy: { createdAt: 'desc' }
              })
        ]);

        // Enrich preschoolStudents with Tên biểu mẫu khảo sát & tiêu chí Đạt / Chưa thể hiện / Không đạt
        if (!isDanhSachMode && preschoolStudents.length > 0) {
          const psIds = preschoolStudents.map((s: any) => s.id);
          const [psDevScores, psRoundRows] = await Promise.all([
            pAny.preschoolDevScore
              ? pAny.preschoolDevScore.findMany({
                  where: { studentId: { in: psIds } },
                  select: { studentId: true, result: true },
                }).catch(() => [])
              : Promise.resolve([]),
            (async () => {
              try {
                const placeholders = psIds.map(() => "?").join(",");
                return await prisma.$queryRawUnsafe<any[]>(
                  `SELECT "studentId", "roundNumber", "formCode", "suggestedFormCode"
                   FROM "PreschoolAssessmentRound"
                   WHERE "studentId" IN (${placeholders})
                   ORDER BY "roundNumber" ASC`,
                  ...psIds
                );
              } catch {
                return [];
              }
            })(),
          ]);

          const scoreAggByStudent: Record<string, { total: number; dat: number; chuaTheHien: number; khongDat: number }> = {};
          for (const sc of psDevScores || []) {
            const agg = scoreAggByStudent[sc.studentId] || { total: 0, dat: 0, chuaTheHien: 0, khongDat: 0 };
            agg.total += 1;
            if (sc.result === "DAT") agg.dat += 1;
            else if (sc.result === "KHONG_DAT") agg.khongDat += 1;
            else agg.chuaTheHien += 1;
            scoreAggByStudent[sc.studentId] = agg;
          }

          const roundByStudent: Record<string, any> = {};
          for (const r of psRoundRows || []) {
            roundByStudent[r.studentId] = r;
          }

          preschoolStudents = preschoolStudents.map((s: any) => {
            const agg = scoreAggByStudent[s.id] || { total: 0, dat: 0, chuaTheHien: 0, khongDat: 0 };
            const rnd = roundByStudent[s.id] || null;
            const sug = suggestPreschoolForm({
              dateOfBirth: s.dateOfBirth,
              grade: s.grade,
              surveySystem: s.surveySystem || s.surveyFormType || "Hệ S",
            });
            const formCode = rnd?.formCode || rnd?.suggestedFormCode || sug.suggestedFormCode;
            const formDef = PRESCHOOL_FORM_REGISTRY[formCode];
            return {
              ...s,
              devScoreSummary: {
                totalScored: agg.total,
                datCount: agg.dat,
                chuaTheHienCount: agg.chuaTheHien,
                khongDatCount: agg.khongDat,
                formCode,
                formTitle: formDef?.shortTitle || formCode,
              },
            };
          });
        }

        if (pAny.class) {
          const uniqueGrades = await pAny.class.findMany({
            where: { academicYearId: activeYearId },
            select: { grade: true },
            distinct: ["grade"],
            orderBy: { grade: "asc" }
          }).catch(() => []);
          
          try {
            const dbGrades = uniqueGrades.map((g: any) => g.grade).filter(Boolean);
            if (dbGrades.length > 0) {
              grades = dbGrades.sort((a: any, b: any) => {
                const na = parseInt(a);
                const nb = parseInt(b);
                if (isNaN(na) || isNaN(nb)) return String(a).localeCompare(String(b));
                return na - nb;
              });
            }
          } catch (sortError) {
            console.error("Sorting grades error handled:", sortError);
          }
        }
      }
    }
  } catch (error) {
    console.error("Fetch Student Info Error:", error);
  }

  const safeJson = (data: any) => {
    try {
      if (!data) return [];
      return JSON.parse(JSON.stringify(data));
    } catch (e) {
      return [];
    }
  }

  const currentUser = session?.user 
    ? { 
        id: session.user.id, 
        role: (session.user as any).role, 
        campusIds: liveCampusIds, 
        fullName: session.user.name || '' 
      } 
    : null;

  return {
    initialGeneralStudents: safeJson(generalStudents), 
    initialPreschoolStudents: safeJson(preschoolStudents), 
    generalPeriods: safeJson(generalPeriods),
    preschoolPeriods: safeJson(preschoolPeriods),
    activeYearName: activeYear ? activeYear.name : "",
    activeYearId: activeYear ? activeYear.id : "",
    configs: safeJson(configs),
    preschoolConfigs: safeJson(preschoolConfigs),
    eduSystems: safeJson(eduSystems),
    campuses: safeJson(campuses),
    grades: safeJson(grades),
    academicYears: safeJson(academicYears),
    examBoardUsers: safeJson(examBoardUsers),
    giaoVuCSUsers: safeJson(giaoVuCSUsers),
    gdcsUsers: safeJson(gdcsUsers),
    subjects: safeJson(subjects),
    allSubjects: safeJson(allSubjects),
    teachers: safeJson(teachers),
    departments: safeJson(departments),
    currentUser,
    rolePermissions: safeJson(rolePermissions),
    gradesPreschool,
    destinationSchools: safeJson(destinationSchools)
  };
}
