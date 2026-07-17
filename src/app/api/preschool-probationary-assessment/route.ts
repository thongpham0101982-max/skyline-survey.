import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

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

    return NextResponse.json(student)
  } catch (error: any) {
    console.error("Preschool probationary assessment GET error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
      probationaryBghComment
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
    const isGlobalAdmin = userRole === "ADMIN" || userRole === "KT_DBCL" || userRole === "BGH MN" || userRole === "BGH_MN"

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

    return NextResponse.json({ success: true, studentId: updated.id })
  } catch (error: any) {
    console.error("Preschool probationary assessment POST error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
