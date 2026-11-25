import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/mail"
import {
  ensurePreschoolWorkflowSchema,
  appendPreschoolAuditLog,
} from "@/lib/preschool-workflow-db"
import { renderPreschoolPsychologyScreeningEmailHtml } from "@/lib/preschool-approval-service"

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

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await ensurePreschoolWorkflowSchema()

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")

    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId parameter" }, { status: 400 })
    }

    const student = await (prisma as any).preschoolInputAssessmentStudent.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        grade: true,
        admissionCampus: true,
        probationaryScoreText: true,
        probationaryResult: true,
        probationaryComment: true,
        probationaryPeriod: true,
        probationaryClass: true,
        probationaryTeacher: true,
        probationaryBghStatus: true,
        probationaryBghComment: true,
        probationaryBghUser: true,
        probationaryBghDate: true,
        probationaryBghLog: true,
        probationaryTeacherLog: true
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    let psyExtra: any = {}
    try {
      const psyRows = await prisma.$queryRawUnsafe<any[]>(
        `SELECT "trialPsychologyScreening", "trialPsychologistId", "trialPsychologistName",
                "trialPsychologistEmail", "trialPsychologyEmailSentAt", "trialPsychologyStatus",
                "trialPsychologyConfirmedAt", "trialPsychologyFeedback", "trialPsychologyConclusion",
                "trialPsychologyCriteriaJson"
         FROM "PreschoolInputAssessmentStudent" WHERE "id" = ? LIMIT 1`,
        studentId
      )
      if (psyRows && psyRows[0]) {
        psyExtra = {
          trialPsychologyScreening: Boolean(Number(psyRows[0].trialPsychologyScreening || 0)),
          trialPsychologistId: psyRows[0].trialPsychologistId || "",
          trialPsychologistName: psyRows[0].trialPsychologistName || "",
          trialPsychologistEmail: psyRows[0].trialPsychologistEmail || "",
          trialPsychologyEmailSentAt: psyRows[0].trialPsychologyEmailSentAt || null,
          trialPsychologyStatus: psyRows[0].trialPsychologyStatus || "",
          trialPsychologyConfirmedAt: psyRows[0].trialPsychologyConfirmedAt || null,
          trialPsychologyFeedback: psyRows[0].trialPsychologyFeedback || "",
          trialPsychologyConclusion: psyRows[0].trialPsychologyConclusion || "",
          trialPsychologyCriteriaJson: psyRows[0].trialPsychologyCriteriaJson || "",
        }
      }
    } catch {}

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

    return NextResponse.json({ ...student, ...psyExtra })
  } catch (error: any) {
    console.error("Preschool probationary assessment GET error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await ensurePreschoolWorkflowSchema()

    const body = await req.json()
    const {
      studentId,
      probationaryScoreText,
      probationaryResult,
      probationaryComment,
      probationaryPeriod,
      probationaryClass,
      probationaryTeacher,
      probationaryBghStatus,
      probationaryBghComment,
      trialPsychologyScreening,
      trialPsychologistId,
      trialPsychologistName,
      trialPsychologistEmail,
      trialPsychologyCriteriaJson,
      flaggedCriteriaNames,
      sendPsychologyEmail,
      psychologyNote,
    } = body

    if (!studentId) {
      return NextResponse.json({ error: "Missing studentId parameter" }, { status: 400 })
    }

    const student = await (prisma as any).preschoolInputAssessmentStudent.findUnique({
      where: { id: studentId }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const currentUser = session?.user as any
    const userRole = (currentUser?.role || "").toUpperCase()
    let isBghRole = ["ADMIN", "KT_DBCL", "KHAO_THI", "ĐBCL", "DBCL", "KTDBCL", "BGH MN", "BGH_MN", "BGH_MAM_NON", "BGH MẦM NON", "BGH MÂM NON", "BGH", "BGH_CS"].includes(userRole)
    if (!isBghRole && userRole) {
      try {
        const dbPerms = await prisma.permission.findMany({
          where: { roleCode: userRole, module: { in: ["XET_DUYET_MAM_NON", "XET_DUYET_KET_QUA"] } }
        })
        isBghRole = dbPerms.some((p: any) => p.canRead || p.canUpdate || p.canCreate)
      } catch (e) {
        console.error("Error fetching permissions for BGH check in probationary assessment API:", e)
      }
    }
    const isGlobalAdmin = isBghRole

    // Fetch user campus assignments to check for campus-bound rules
    const userAssignments = await prisma.userCampusAssignment.findMany({
      where: { userId: currentUser?.id || "" },
      include: { campus: true }
    })

    const hasCampusMatch = userAssignments.length === 0 || userAssignments.some(ca => 
      isPreschoolCampusMatch(student.admissionCampus, ca.campus.campusCode, ca.campus.campusName) ||
      student.admissionCampus === ca.campusId
    )

    const canApproveBGH = isGlobalAdmin && hasCampusMatch

    const dataToUpdate: any = {
      probationaryScoreText: probationaryScoreText !== undefined ? probationaryScoreText : undefined,
      probationaryResult: probationaryResult !== undefined ? probationaryResult : undefined,
      probationaryComment: probationaryComment !== undefined ? probationaryComment : undefined,
      probationaryPeriod: probationaryPeriod !== undefined ? probationaryPeriod : undefined,
      probationaryClass: probationaryClass !== undefined ? probationaryClass : undefined,
      probationaryTeacher: probationaryTeacher !== undefined ? probationaryTeacher : undefined
    }

    const isTeacherUpdate = probationaryScoreText !== undefined || 
                            probationaryResult !== undefined || 
                            probationaryComment !== undefined || 
                            probationaryClass !== undefined || 
                            probationaryTeacher !== undefined;

    if (isTeacherUpdate) {
      const logEntry = {
        user: currentUser?.name || currentUser?.email || probationaryTeacher || "Giáo viên",
        result: probationaryResult !== undefined ? probationaryResult : (student.probationaryResult || ""),
        comment: probationaryComment !== undefined ? probationaryComment : (student.probationaryComment || ""),
        class: probationaryClass !== undefined ? probationaryClass : (student.probationaryClass || ""),
        teacher: probationaryTeacher !== undefined ? probationaryTeacher : (student.probationaryTeacher || ""),
        period: probationaryPeriod !== undefined ? probationaryPeriod : (student.probationaryPeriod || ""),
        date: new Date().toISOString()
      };
      let currentLog = [];
      if (student.probationaryTeacherLog) {
        try {
          currentLog = JSON.parse(student.probationaryTeacherLog);
        } catch (e) {}
      }
      currentLog.push(logEntry);
      dataToUpdate.probationaryTeacherLog = JSON.stringify(currentLog);
    }

    if (canApproveBGH) {
      if (probationaryBghStatus !== undefined) {
        dataToUpdate.probationaryBghStatus = probationaryBghStatus
        if (probationaryBghStatus) {
          dataToUpdate.probationaryBghUser = currentUser?.name || currentUser?.email || "BGH"
          dataToUpdate.probationaryBghDate = new Date()

          // Append to log history
          const logEntry = {
            user: currentUser?.name || currentUser?.email || "BGH",
            status: probationaryBghStatus,
            comment: probationaryBghComment || "",
            date: new Date().toISOString()
          }
          let currentLog = []
          if (student.probationaryBghLog) {
            try {
              currentLog = JSON.parse(student.probationaryBghLog)
            } catch (e) {}
          }
          currentLog.push(logEntry)
          dataToUpdate.probationaryBghLog = JSON.stringify(currentLog)
        } else {
          dataToUpdate.probationaryBghUser = null;
          dataToUpdate.probationaryBghDate = null;
        }
      }
      if (probationaryBghComment !== undefined) {
        dataToUpdate.probationaryBghComment = probationaryBghComment
      }
    }

    // Recalculate final admissionResult
    const finalBghStatus = probationaryBghStatus !== undefined && canApproveBGH ? probationaryBghStatus : student.probationaryBghStatus;
    if (finalBghStatus === "DAT") {
      dataToUpdate.admissionResult = "Đạt - Sau học thử"
    } else if (finalBghStatus === "KHONG_DAT") {
      dataToUpdate.admissionResult = "Không đạt"
    } else if (finalBghStatus === "Y_KIEN_KHAC") {
      dataToUpdate.admissionResult = "Ý kiến khác"
    } else {
      // Fallback to teacher result if no BGH status set
      const finalTeacherResult = probationaryResult !== undefined ? probationaryResult : student.probationaryResult;
      if (finalTeacherResult === "DAT") {
        dataToUpdate.admissionResult = "Đạt - Sau học thử"
      } else if (finalTeacherResult === "CHUA_DAT") {
        dataToUpdate.admissionResult = "Không đạt"
      }
    }

    const updated = await (prisma as any).preschoolInputAssessmentStudent.update({
      where: { id: studentId },
      data: dataToUpdate
    })

    // Save additive trial psychology screening fields & optionally send confirmation email to psychologist
    let emailSent = false
    let emailError = ""
    let resolvedPsyEmail = (trialPsychologistEmail || "").trim()
    let resolvedPsyName = (trialPsychologistName || "").trim()

    if (trialPsychologyScreening !== undefined || trialPsychologistId !== undefined || trialPsychologyCriteriaJson !== undefined) {
      // Resolve psychologist name/email from Teacher & User tables if ID provided
      if (trialPsychologistId) {
        const teacherRec = await prisma.teacher
          .findFirst({
            where: {
              OR: [{ id: trialPsychologistId }, { userId: trialPsychologistId }],
            },
            include: { user: { select: { email: true, fullName: true } } },
          })
          .catch(() => null)
        if (teacherRec) {
          if (!resolvedPsyName) resolvedPsyName = teacherRec.teacherName || teacherRec.user?.fullName || ""
          if (!resolvedPsyEmail) resolvedPsyEmail = (teacherRec.email || teacherRec.user?.email || "").trim()
        }
      }

      // Check existing psychology row so we don't clobber an already-confirmed status unless psychologist changed
      let existingPsy: any = null
      try {
        const rows = await prisma.$queryRawUnsafe<any[]>(
          `SELECT "trialPsychologistId", "trialPsychologyStatus", "trialPsychologyEmailSentAt"
           FROM "PreschoolInputAssessmentStudent" WHERE "id" = ? LIMIT 1`,
          studentId
        )
        existingPsy = rows?.[0] || null
      } catch {}

      const isScreeningEnabled = Boolean(trialPsychologyScreening)
      const psychologistChanged = Boolean(
        trialPsychologistId && existingPsy?.trialPsychologistId && existingPsy.trialPsychologistId !== trialPsychologistId
      )

      let nextStatus = existingPsy?.trialPsychologyStatus || ""
      let nextSentAt = existingPsy?.trialPsychologyEmailSentAt || null

      if (!isScreeningEnabled) {
        nextStatus = ""
      } else if (!nextStatus || psychologistChanged) {
        nextStatus = "PENDING"
      }

      const shouldSendEmail = Boolean(
        isScreeningEnabled &&
        resolvedPsyEmail &&
        (sendPsychologyEmail === true || (sendPsychologyEmail !== false && (!existingPsy?.trialPsychologyEmailSentAt || psychologistChanged)))
      )

      if (shouldSendEmail) {
        const originUrl = String(
          process.env.NEXTAUTH_URL ||
            process.env.NEXT_PUBLIC_APP_URL ||
            req.headers.get("origin") ||
            "https://ssm.skylineschool.edu.vn"
        ).replace(/\/+$/, "")

        const html = renderPreschoolPsychologyScreeningEmailHtml({
          student: {
            id: updated.id,
            fullName: updated.fullName,
            studentCode: updated.studentCode,
            grade: updated.grade,
            admissionCampus: updated.admissionCampus,
            probationaryClass: updated.probationaryClass,
            probationaryTeacher: updated.probationaryTeacher,
            probationaryPeriod: updated.probationaryPeriod,
          },
          psychologistId: trialPsychologistId || undefined,
          psychologistName: resolvedPsyName || "Giáo viên Tâm lý",
          psychologistEmail: resolvedPsyEmail,
          flaggedCriteriaNames: Array.isArray(flaggedCriteriaNames) ? flaggedCriteriaNames : [],
          note: psychologyNote || probationaryComment || "",
          assignedByName: currentUser?.name || currentUser?.email || "Ban Giám Hiệu Mầm non",
          baseUrl: originUrl,
        })

        const mailRes = await sendEmail({
          to: resolvedPsyEmail,
          subject: `[Sky-Line SSM] Yêu cầu Sàng lọc tâm lý học thử - Bé ${updated.fullName} (${updated.studentCode})`,
          html,
        }).catch((err: any) => ({ success: false, error: err?.message || "Lỗi gửi email" }))

        if (mailRes?.success) {
          emailSent = true
          nextSentAt = new Date().toISOString()
          if (!nextStatus || psychologistChanged) nextStatus = "PENDING"
        } else {
          emailError = (mailRes as any)?.error || "Không thể gửi email tới GV Tâm lý"
        }
      }

      await prisma.$executeRawUnsafe(
        `UPDATE "PreschoolInputAssessmentStudent"
         SET "trialPsychologyScreening" = ?,
             "trialPsychologistId" = ?,
             "trialPsychologistName" = ?,
             "trialPsychologistEmail" = ?,
             "trialPsychologyEmailSentAt" = ?,
             "trialPsychologyStatus" = ?,
             "trialPsychologyCriteriaJson" = ?
         WHERE "id" = ?`,
        isScreeningEnabled ? 1 : 0,
        isScreeningEnabled ? (trialPsychologistId || null) : null,
        isScreeningEnabled ? (resolvedPsyName || null) : null,
        isScreeningEnabled ? (resolvedPsyEmail || null) : null,
        nextSentAt,
        nextStatus || null,
        trialPsychologyCriteriaJson !== undefined ? trialPsychologyCriteriaJson : null,
        studentId
      ).catch(err => console.error("Update trial psychology columns error:", err))

      if (isScreeningEnabled) {
        await appendPreschoolAuditLog({
          studentId,
          action: emailSent ? "TRIAL_PSYCHOLOGY_EMAIL_SENT" : "TRIAL_PSYCHOLOGY_ASSIGNED",
          actorId: currentUser?.id || null,
          actorName: currentUser?.name || currentUser?.email || "Admin",
          actorRole: currentUser?.role || "ADMIN",
          source: "WEB_UI",
          detail: {
            assignedPsychologistName: resolvedPsyName,
            psychologistEmail: resolvedPsyEmail,
            emailSent,
            probationaryClass: updated.probationaryClass,
            probationaryTeacher: updated.probationaryTeacher,
          },
        }).catch(() => {})
      }
    }

    return NextResponse.json({
      success: true,
      studentId: updated.id,
      emailSent,
      emailError,
      psychologistEmail: resolvedPsyEmail,
      psychologistName: resolvedPsyName,
    })
  } catch (error: any) {
    console.error("Preschool probationary assessment POST error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
