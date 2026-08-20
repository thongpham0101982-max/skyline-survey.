import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getSurveyFormAgeGroup } from "@/lib/preschool"

function isPreschoolCampusMatch(effCampus: string | null | undefined, cCode: string | null | undefined, cName: string | null | undefined): boolean {
  if (!effCampus) return false;
  const normEff = effCampus.toUpperCase();
  const normCode = (cCode || "").toUpperCase();
  const normName = (cName || "").toUpperCase();
  if (normEff === normCode || normEff === normName) return true;
  if (normEff.includes("CS1") || normEff.includes("RIVERSIDE")) {
    return normCode.includes("CS1") || normCode.includes("RIVERSIDE") || normName.includes("CS1") || normName.includes("RIVERSIDE");
  }
  if (normEff.includes("CS2") || normEff.includes("CENTRAL")) {
    return normCode.includes("CS2") || normCode.includes("CENTRAL") || normName.includes("CS2") || normName.includes("CENTRAL");
  }
  if (normEff.includes("CS3") || normEff.includes("GLOBAL")) {
    return normCode.includes("CS3") || normCode.includes("GLOBAL") || normName.includes("CS3") || normName.includes("GLOBAL");
  }
  if (normEff.includes("CS4") || normEff.includes("HILL")) {
    return normCode.includes("CS4") || normCode.includes("HILL") || normName.includes("CS4") || normName.includes("HILL");
  }
  if (normEff.includes("CS5") || normEff.includes("BEACH")) {
    return normCode.includes("CS5") || normCode.includes("BEACH") || normName.includes("CS5") || normName.includes("BEACH");
  }
  return normEff.includes(normCode) || normEff.includes(normName) || normCode.includes(normEff) || normName.includes(normEff);
}

function isPreschoolAssignmentMatch(aGrade: string, formAgeGroup: string, isStage2: boolean): boolean {
  const ag = (aGrade || "").trim();
  const form = (formAgeGroup || "").trim();

  if (ag === "Nhà trẻ 12-18 tháng" && form === "12 đến 18 tháng") return true;
  if (ag === "Nhà trẻ 18-24 tháng" && form === "18 đến 24 tháng") return true;
  if (ag === "Nhà trẻ 24-36 tháng") {
    if (isStage2 && form === "24 đến 36 tháng") return true;
    if (!isStage2 && form === "18 đến 24 tháng") return true;
  }

  if (ag === "Nhà trẻ" && ["12 đến 18 tháng", "18 đến 24 tháng", "24 đến 36 tháng"].includes(form)) {
    return true;
  }

  if (isStage2) {
    if (form === "12 đến 18 tháng" && ag === "12 đến 18 tháng") return true;
    if (form === "18 đến 24 tháng" && ag === "18 đến 24 tháng") return true;
    if (form === "24 đến 36 tháng" && ag === "24 đến 36 tháng") return true;
    if (form === "3 đến 4 tuổi" && (ag === "Mẫu giáo bé" || ag === "3 đến 4 tuổi")) return true;
    if (form === "4 đến 5 tuổi" && (ag === "Mẫu giáo nhỡ" || ag === "4 đến 5 tuổi")) return true;
    if (form === "5 đến 6 tuổi" && (ag === "Mẫu giáo lớn" || ag === "5 đến 6 tuổi")) return true;
  } else {
    if (form === "12 đến 18 tháng" && ag === "12 đến 18 tháng") return true;
    if (form === "18 đến 24 tháng" && (ag === "18 đến 24 tháng" || ag === "24 đến 36 tháng")) return true;
    if (form === "24 đến 36 tháng" && (ag === "Mẫu giáo bé" || ag === "3 đến 4 tuổi")) return true;
    if (form === "3 đến 4 tuổi" && (ag === "Mẫu giáo nhỡ" || ag === "4 đến 5 tuổi")) return true;
    if (form === "4 đến 5 tuổi" && (ag === "Mẫu giáo lớn" || ag === "5 đến 6 tuổi")) return true;
  }
  return ag === form;
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    const periodId = searchParams.get("periodId")
    const batchId = searchParams.get("batchId")

    // Mode 1: Get all scores for a specific student
    if (studentId) {
      const student = await (prisma as any).preschoolInputAssessmentStudent.findUnique({
        where: { id: studentId },
        select: { admissionCampus: true }
      });
      if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
      
      const currentUser = session?.user as any;
      const userRole = (currentUser?.role || "").toUpperCase();
      const isGDCSUser = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(userRole);
      
      if (isGDCSUser && currentUser?.id) {
        const assignments = await prisma.userCampusAssignment.findMany({
          where: { userId: currentUser.id },
          include: { campus: true }
        });
        const hasMatch = assignments.some(a => 
          isPreschoolCampusMatch(student.admissionCampus, a.campus.campusCode, a.campus.campusName) ||
          student.admissionCampus === a.campusId
        );
        if (!hasMatch) {
          return NextResponse.json({ error: "Forbidden: Bạn không có quyền xem học sinh của cơ sở khác." }, { status: 403 });
        }
      }

      const scores = await (prisma as any).preschoolDevScore.findMany({
        where: { studentId },
        include: { criteria: { include: { area: true } } }
      })
      return NextResponse.json(scores)
    }

    // Mode 2: Get summary for all students in a period
    if (periodId) {
      const where: any = {}
      if (periodId !== "all") {
        where.periodId = periodId;
      }
      if (batchId && batchId !== "all" && batchId !== "null") {
        where.OR = [
          { batchId: batchId },
          { batchId: null }
        ];
      } else if (batchId === "null") {
        where.batchId = null;
      }

            const students = await (prisma as any).preschoolInputAssessmentStudent.findMany({
        where: {
          ...where,
          isAbsent: { not: true }
        },
        select: { 
          id: true, 
          studentCode: true, 
          fullName: true, 
          grade: true, 
          gender: true, 
          dateOfBirth: true, 
          admissionCampus: true, 
          batchId: true, 
          periodId: true,
          devProfessionalComment: true, 
          devPsychologyComment: true, 
          devImportantNote: true, 
          devAssessmentResult: true, 
          admissionResult: true,
          enrollmentStatus: true,
          bghApprovalStatus: true,
          bghApprovalComment: true,
          bghApprovalUser: true,
          bghApprovalDate: true,
          gdcsApprovalStatus: true,
          gdcsApprovalComment: true,
          gdcsApprovalUser: true,
          gdcsApprovalDate: true,
          probationaryResult: true,
          probationaryClass: true,
          probationaryTeacher: true,
          probationaryPeriod: true,
          probationaryComment: true,
          probationaryBghStatus: true,
          probationaryBghComment: true,
          probationaryBghUser: true,
          probationaryBghDate: true,
          probationaryBghLog: true,
          probationaryTeacherLog: true,
          probationaryScoreText: true,
          batch: {
            select: {
              startDate: true,
              endDate: true
            }
          }
        }
      })

      const studentIds = students.map((s: any) => s.id)
      
      // Fetch all scores for all students in this period
      const scores = await (prisma as any).preschoolDevScore.findMany({
        where: { studentId: { in: studentIds } },
        include: { criteria: { include: { area: true } } }
      })

      // Count scores per student
      const scoreCounts = await (prisma as any).preschoolDevScore.groupBy({
        by: ["studentId"],
        where: { studentId: { in: studentIds } },
        _count: { id: true }
      })

      const scoreMap: Record<string, number> = {}
      for (const sc of scoreCounts) {
        scoreMap[sc.studentId] = sc._count.id
      }

      // Get total criteria count per ageGroup
      const criteriaCounts = await (prisma as any).preschoolDevCriteria.groupBy({
        by: ["ageGroup"],
        where: { status: "ACTIVE" },
        _count: { id: true }
      })
      const criteriaMap: Record<string, number> = {}
      for (const cc of criteriaCounts) {
        criteriaMap[cc.ageGroup] = cc._count.id
      }

      // Fetch all teacher assignments for this period
      const assignments = await (prisma as any).preschoolInputAssessmentTeacherAssignment.findMany({
        where: periodId !== "all" ? { periodId } : {},
        select: {
          periodId: true,
          batchId: true,
          grade: true,
          user: { select: { fullName: true } }
        }
      })

      // Map scores by studentId
      const studentScoresMap: Record<string, any[]> = {}
      for (const sc of scores) {
        if (!studentScoresMap[sc.studentId]) {
          studentScoresMap[sc.studentId] = []
        }
        studentScoresMap[sc.studentId].push(sc)
      }

      let result = students.map((s: any) => {
        const studentScoresList = studentScoresMap[s.id] || []
        
        const theChatScores = studentScoresList.filter((sc: any) => sc.criteria?.area?.code === "THE_CHAT")
        const nhanThucScores = studentScoresList.filter((sc: any) => sc.criteria?.area?.code === "NHAN_THUC")
        const ngonNguScores = studentScoresList.filter((sc: any) => sc.criteria?.area?.code === "NGON_NGU")
        const tinhCamXhTmScores = studentScoresList.filter((sc: any) => sc.criteria?.area?.code === "TINH_CAM_XH_TM")

        const formatSummary = (arr: any[]) => {
          if (arr.length === 0) return "Chưa đánh giá"
          return arr.map(sc => {
            const critName = sc.criteria?.name || ""
            const resLabel = sc.result === "DAT" ? "Đạt" : sc.result === "KHONG_DAT" ? "Không đạt" : "Chưa thể hiện"
            let noteText = ""
            if (sc.note) {
              if (sc.note.includes("|")) {
                const parts = sc.note.split("|")
                const metric = parts[0]?.trim()
                const obs = parts[1]?.trim()
                noteText = metric && obs ? `(${metric} - ${obs})` : metric ? `(${metric})` : `(${obs})`
              } else {
                noteText = `(${sc.note})`
              }
            }
            return `${critName}: ${resLabel} ${noteText}`.trim()
          }).join("; ")
        }

        const teacherComment = [
          s.devProfessionalComment ? `Chuyên môn: ${s.devProfessionalComment}` : "",
          s.devPsychologyComment ? `Tâm lý: ${s.devPsychologyComment}` : "",
          s.devImportantNote ? `Lưu ý: ${s.devImportantNote}` : ""
        ].filter(Boolean).join(". ")

        let generalResult = "";
        const bgh = s.bghApprovalStatus || "";
        const gdcs = s.gdcsApprovalStatus || "";
        const isApproved = (val: string) => val === "DAT" || val === "DAT_MIEN_HOC_THU" || val === "DAT_HOC_THU";

        if (bgh && gdcs) {
          if (isApproved(bgh) && isApproved(gdcs)) {
            if (bgh === "DAT_MIEN_HOC_THU" || gdcs === "DAT_MIEN_HOC_THU" || bgh === "DAT" || gdcs === "DAT") {
              generalResult = "Đạt - Miễn Học Thử";
            } else if (bgh === "DAT_HOC_THU" || gdcs === "DAT_HOC_THU") {
              generalResult = "Đạt - Học Thử";
            } else {
              generalResult = "Đạt";
            }
          }
        }
        
        if (!generalResult) {
          if (bgh === "KHONG_DAT" || gdcs === "KHONG_DAT") {
            generalResult = "Không đạt";
          } else if (bgh === "Y_KIEN_KHAC" || gdcs === "Y_KIEN_KHAC") {
            generalResult = "Ý kiến khác";
          } else {
            generalResult = "Chưa duyệt";
          }
        }

        const firstScore = studentScoresList[0];
        const surveyDate = firstScore ? firstScore.createdAt : new Date();
        const sAgeGroup = getSurveyFormAgeGroup(s.grade, surveyDate);
        const batchStartDate = s.batch?.startDate ? new Date(s.batch.startDate) : null;
        const isStage2 = batchStartDate ? (!isNaN(batchStartDate.getTime()) && batchStartDate.getMonth() >= 0 && batchStartDate.getMonth() <= 4) : false;
        const matches = assignments.filter((a: any) => {
          if (a.periodId !== s.periodId) return false;
          if (!isPreschoolAssignmentMatch(a.grade, sAgeGroup, isStage2)) return false;
          return !a.batchId || a.batchId === s.batchId;
        });
        const assignedTeachers = Array.from(new Set(matches.map((m: any) => m.user?.fullName || "Chưa rõ"))).filter(Boolean).join(", ") || "Chưa phân công";

        return {
          ...s,
          assignedTeachers,
                    scoredCount: scoreMap[s.id] || 0,
          totalCriteria: criteriaMap[sAgeGroup] || 0,
          resolvedAgeGroup: sAgeGroup,
          theChatSummary: formatSummary(theChatScores),
          nhanThucSummary: formatSummary(nhanThucScores),
          ngonNguSummary: formatSummary(ngonNguScores),
          tinhCamXhTmSummary: formatSummary(tinhCamXhTmScores),
          scores: studentScoresList.map((sc) => ({
            id: sc.id,
            criteriaId: sc.criteriaId,
            result: sc.result,
            note: sc.note,
            criteria: sc.criteria ? {
              id: sc.criteria.id,
              code: sc.criteria.code,
              name: sc.criteria.name,
              ageGroup: sc.criteria.ageGroup,
              area: sc.criteria.area ? {
                id: sc.criteria.area.id,
                code: sc.criteria.area.code,
                name: sc.criteria.area.name
              } : null
            } : null
          })),
          teacherComment,
          generalResult
        }
      })

      // GĐCS restriction: only see students belonging to their assigned campus(es)
      const currentUser = session?.user as any;
      const userRole = (currentUser?.role || "").toUpperCase();
      const isGDCSUser = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(userRole);

      if (isGDCSUser && currentUser?.id) {
        const assignments = await prisma.userCampusAssignment.findMany({
          where: { userId: currentUser.id },
          include: { campus: true }
        });
        result = result.filter((s: any) => {
          if (!s.admissionCampus) return false;
          return assignments.some(a => 
            isPreschoolCampusMatch(s.admissionCampus, a.campus.campusCode, a.campus.campusName) ||
            s.admissionCampus === a.campusId
          );
        });
      }

      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "Need studentId or periodId" }, { status: 400 })
  } catch (e: any) {
    console.error("Preschool Dev Scores API error:", e);
    return NextResponse.json({ error: "Đã xảy ra lỗi hệ thống khi lưu trữ/truy xuất dữ liệu." }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const currentUser = session?.user as any
    const userRole = (currentUser?.role || "").toUpperCase()
    let isBghRole = ["ADMIN", "KT_DBCL", "KTDBCL", "BGH MN", "BGH_MN", "BGH_MAM_NON", "BGH MẦM NON", "BGH MÂM NON", "BGH", "BGH_CS"].includes(userRole)
    if (!isBghRole && userRole) {
      try {
        const dbPerms = await prisma.permission.findMany({
          where: { roleCode: userRole, module: { in: ["XET_DUYET_MAM_NON", "XET_DUYET_KET_QUA"] } }
        })
        isBghRole = dbPerms.some((p: any) => p.canRead || p.canUpdate || p.canCreate)
      } catch (e) {
        console.error("Error fetching permissions for BGH check in dev scores API:", e)
      }
    }
    const isGlobalAdmin = isBghRole

    const body = await req.json()
    const { studentId, scores, devProfessionalComment, devPsychologyComment, devImportantNote, devAssessmentResult, bghApprovalStatus, bghApprovalComment, gdcsApprovalStatus, gdcsApprovalComment } = body

    if (!studentId || !Array.isArray(scores)) {
      return NextResponse.json({ error: "Cần studentId và mảng scores" }, { status: 400 })
    }

    // Fetch student's current record to verify and safeguard permissions
    const student = await (prisma as any).preschoolInputAssessmentStudent.findUnique({
      where: { id: studentId },
      include: { period: true, batch: true }
    })
    if (!student) {
      return NextResponse.json({ error: "Không tìm thấy học sinh" }, { status: 404 })
    }

    // Kiểm tra khóa kỳ/đợt khảo sát mầm non
    const isPeriodLocked = student.period?.status !== "ACTIVE";
    const isBatchLocked = student.batch?.status === "LOCKED" || student.batch?.status === "CLOSED";
    if (isPeriodLocked || isBatchLocked) {
      return NextResponse.json({ error: "Hạng mục khảo sát mầm non (Kỳ/Đợt) đã bị Khóa. Không thể sửa điểm!" }, { status: 403 })
    }

    // Upsert each score in transaction
    const results = await prisma.$transaction(
      scores
        .filter((s) => s.criteriaId && s.result)
        .map((s) =>
          (prisma as any).preschoolDevScore.upsert({
            where: {
              studentId_criteriaId: { studentId, criteriaId: s.criteriaId }
            },
            create: {
              studentId,
              criteriaId: s.criteriaId,
              result: s.result,
              note: s.note || null,
              assessorId: s.assessorId || null
            },
            update: {
              result: s.result,
              note: s.note || null,
              assessorId: s.assessorId || null
            }
          })
        )
    )

    // Fetch user campus assignments to check for campus-bound rules
    const userAssignments = await prisma.userCampusAssignment.findMany({
      where: { userId: currentUser?.id || "" },
      include: { campus: true }
    });

    const hasCampusMatch = userAssignments.length === 0 || userAssignments.some(ca => 
      isPreschoolCampusMatch(student.admissionCampus, ca.campus.campusCode, ca.campus.campusName) ||
      student.admissionCampus === ca.campusId
    );

    // BGH check: role must be ADMIN or KT_DBCL, AND must have campus match (if assigned to specific campuses)
    const canApproveBGH = isGlobalAdmin && hasCampusMatch;

    // GDCS check: role must be ADMIN or GDCS roles, AND must have campus match (if assigned to specific campuses)
    const isGDCSUser = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(userRole);
    const canApproveGDCS = isGlobalAdmin ? hasCampusMatch : (isGDCSUser && hasCampusMatch);

    // Determine final values with safety protection (if unauthorized, preserve database values)
    const updatedBghStatus = bghApprovalStatus !== undefined 
      ? (canApproveBGH ? bghApprovalStatus : student.bghApprovalStatus) 
      : undefined;
    const updatedBghComment = bghApprovalComment !== undefined 
      ? (canApproveBGH ? bghApprovalComment : student.bghApprovalComment) 
      : undefined;

    const updatedGdcsStatus = gdcsApprovalStatus !== undefined 
      ? (canApproveGDCS ? gdcsApprovalStatus : student.gdcsApprovalStatus) 
      : undefined;
    const updatedGdcsComment = gdcsApprovalComment !== undefined 
      ? (canApproveGDCS ? gdcsApprovalComment : student.gdcsApprovalComment) 
      : undefined;

    // Recalculate final admissionResult
    const finalBgh = updatedBghStatus !== undefined ? updatedBghStatus : student.bghApprovalStatus;
    const finalGdcs = updatedGdcsStatus !== undefined ? updatedGdcsStatus : student.gdcsApprovalStatus;

    const finalBghUser = updatedBghStatus !== undefined 
      ? (canApproveBGH ? (updatedBghStatus ? (currentUser?.name || currentUser?.email || "BGH") : null) : student.bghApprovalUser) 
      : undefined;
    const finalBghDate = updatedBghStatus !== undefined 
      ? (canApproveBGH ? (updatedBghStatus ? new Date() : null) : student.bghApprovalDate) 
      : undefined;

    const finalGdcsUser = updatedGdcsStatus !== undefined 
      ? (canApproveGDCS ? (updatedGdcsStatus ? (currentUser?.name || currentUser?.email || "GĐCS") : null) : student.gdcsApprovalUser) 
      : undefined;
    const finalGdcsDate = updatedGdcsStatus !== undefined 
      ? (canApproveGDCS ? (updatedGdcsStatus ? new Date() : null) : student.gdcsApprovalDate) 
      : undefined;

    let finalAdmissionResult = undefined;
    const hasBghOrGdcsStatus = (finalBgh !== undefined && finalBgh !== null && finalBgh !== "") || 
                               (finalGdcs !== undefined && finalGdcs !== null && finalGdcs !== "");

    if (hasBghOrGdcsStatus) {
      const bgh = finalBgh || "";
      const gdcs = finalGdcs || "";
      const isApproved = (s: string) => s === "DAT" || s === "DAT_MIEN_HOC_THU" || s === "DAT_HOC_THU";

      if (isApproved(bgh) && isApproved(gdcs)) {
        if (bgh === "DAT_MIEN_HOC_THU" || gdcs === "DAT_MIEN_HOC_THU" || bgh === "DAT" || gdcs === "DAT") {
          finalAdmissionResult = "Đạt - Miễn Học Thử";
        } else if (bgh === "DAT_HOC_THU" || gdcs === "DAT_HOC_THU") {
          finalAdmissionResult = "Đạt - Học Thử";
        } else {
          finalAdmissionResult = "Đạt";
        }
      } else if (bgh === "KHONG_DAT" || gdcs === "KHONG_DAT") {
        finalAdmissionResult = "Không đạt";
      } else if (bgh === "Y_KIEN_KHAC" || gdcs === "Y_KIEN_KHAC") {
        finalAdmissionResult = "Ý kiến khác";
      } else {
        finalAdmissionResult = "Chưa duyệt";
      }
    } else {
      const finalDevResult = devAssessmentResult !== undefined ? devAssessmentResult : student.devAssessmentResult;
      if (finalDevResult === "DAT") {
        finalAdmissionResult = "Đạt"
      } else if (finalDevResult === "KHONG_DAT") {
        finalAdmissionResult = "Chưa duyệt"
      } else if (finalDevResult === "HOC_THU") {
        finalAdmissionResult = "Học thử"
      } else {
        finalAdmissionResult = ""
      }
    }

    // Save general comments and approvals to student record
    await (prisma as any).preschoolInputAssessmentStudent.update({
      where: { id: studentId },
      data: {
        devProfessionalComment: devProfessionalComment !== undefined ? devProfessionalComment : undefined,
        devPsychologyComment: devPsychologyComment !== undefined ? devPsychologyComment : undefined,
        devImportantNote: devImportantNote !== undefined ? devImportantNote : undefined,
        devAssessmentResult: devAssessmentResult !== undefined ? devAssessmentResult : undefined,
        admissionResult: finalAdmissionResult,
        bghApprovalStatus: updatedBghStatus,
        bghApprovalComment: updatedBghComment,
        bghApprovalUser: finalBghUser,
        bghApprovalDate: finalBghDate,
        gdcsApprovalStatus: updatedGdcsStatus,
        gdcsApprovalComment: updatedGdcsComment,
        gdcsApprovalUser: finalGdcsUser,
        gdcsApprovalDate: finalGdcsDate,
      }
    })
    return NextResponse.json({ success: true, count: results.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const currentUser = session?.user as any
  const userRole = (currentUser?.role || "").toUpperCase()
  const isGlobalAdmin = userRole === "ADMIN" || userRole === "KT_DBCL" || userRole === "BGH MN" || userRole === "BGH_MN"
  if (!isGlobalAdmin) {
    return NextResponse.json({ error: "Forbidden: Chỉ quản trị viên mới được phép xóa điểm." }, { status: 403 })
  }
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    
    if (studentId) {
      await (prisma as any).preschoolDevScore.deleteMany({ where: { studentId } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Need studentId" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
