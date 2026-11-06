// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/mail";
import { 
  getAssignedPsychologyTeachers, 
  getStudentOrientationRecord, 
  upsertStudentOrientationRecord,
  getDepartments,
  getDepartmentTeachers,
  getGdcsCampusList,
  getCampusGiaovuEmail,
  getCampusTuyensinhEmail,
  getStudentAssignedSurveyTeachers
} from "@/lib/orientation/service";
import { questionsData, defaultQuestions } from "@/lib/orientation/psychologyQuestions";

export const dynamic = "force-dynamic";

/**
 * Đồng bộ việc gán GV Tâm lý từ Phiếu Định Hướng vào bảng phân công khảo sát (InputAssessmentTeacherAssignment)
 * và tạo Thông báo hệ thống (Notification) để GV Tâm lý thấy ngay học sinh trong danh sách Khảo sát: Tâm lý
 */
async function ensurePsychTeacherSurveyAssignment(params: {
  student: any;
  teacherId?: string | null;
  teacherName?: string | null;
  actorName?: string | null;
  reason?: string | null;
  createNotification?: boolean;
}) {
  const { student, teacherId, teacherName, actorName, reason, createNotification = true } = params;
  if (!student?.id || !student?.periodId) return { assignedUserId: teacherId || null, syncedAssignment: false };

  const pAny = prisma as any;
  let targetUserId: string | null = null;
  let resolvedTeacherName = teacherName || "Giáo viên Tâm lý";
  let resolvedEmail = "";

  try {
    if (teacherId) {
      const u = await pAny.user.findUnique({
        where: { id: teacherId },
        include: { teacher: true }
      });
      if (u) {
        targetUserId = u.id;
        resolvedTeacherName = u.fullName || u.name || u.teacher?.teacherName || resolvedTeacherName;
        resolvedEmail = u.teacher?.email || u.email || "";
      } else {
        const t = await pAny.teacher.findUnique({
          where: { id: teacherId },
          include: { user: true }
        });
        if (t) {
          targetUserId = t.userId || null;
          resolvedTeacherName = t.teacherName || t.user?.fullName || resolvedTeacherName;
          resolvedEmail = t.email || t.user?.email || "";
        }
      }
    }

    if (!targetUserId && teacherName) {
      const uByName = await pAny.user.findFirst({
        where: {
          OR: [
            { fullName: teacherName },
            { name: teacherName }
          ]
        },
        include: { teacher: true }
      });
      if (uByName) {
        targetUserId = uByName.id;
        resolvedEmail = uByName.teacher?.email || uByName.email || "";
      }
    }

    if (!targetUserId) {
      return { assignedUserId: teacherId || null, resolvedTeacherName, resolvedEmail, syncedAssignment: false };
    }

    // Tìm môn Tâm lý (TLY)
    const tlySubject = await pAny.inputAssessmentSubject.findFirst({
      where: {
        OR: [
          { code: "TLY" },
          { name: { contains: "Tâm lý" } },
          { name: { contains: "tâm lý" } }
        ]
      }
    });

    const rawGrade = String(student.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim() || "1";
    const eduSys = student.surveyFormType || student.surveySystem || "HNS";

    let syncedAssignment = false;
    if (tlySubject) {
      const existingAss = await pAny.inputAssessmentTeacherAssignment.findFirst({
        where: {
          periodId: student.periodId,
          batchId: student.batchId || null,
          userId: targetUserId,
          subjectId: tlySubject.id,
          grade: rawGrade
        }
      });

      if (!existingAss) {
        await pAny.inputAssessmentTeacherAssignment.create({
          data: {
            periodId: student.periodId,
            batchId: student.batchId || null,
            userId: targetUserId,
            subjectId: tlySubject.id,
            grade: rawGrade,
            educationSystem: eduSys
          }
        });
      }
      syncedAssignment = true;
    }

    // Tạo thông báo trên chuông hệ thống cho GV Tâm lý được gán
    if (createNotification && targetUserId) {
      const link = `/teacher/input-assessments?periodId=${student.periodId}&batchId=${student.batchId || ""}&studentCode=${encodeURIComponent(student.studentCode || "")}&autoOpen=true`;
      await pAny.notification.create({
        data: {
          userId: targetUserId,
          title: `[Phân công Khảo sát Tâm lý] HS ${student.fullName} (Khối ${rawGrade})`,
          message: `${actorName || "GV Định hướng"} đã gán Thầy/Cô thực hiện khảo sát & đánh giá tâm lý cho học sinh ${student.fullName} (${student.studentCode || ""}).${reason ? ` Lưu ý: ${reason}` : ""}`,
          link,
          type: "TASK",
          category: "ASSESSMENT",
          priority: "HIGH",
          sourceModule: "ORIENTATION_PSYCHOLOGY",
          sourceId: student.id
        }
      });
    }

    return {
      assignedUserId: targetUserId,
      resolvedTeacherName,
      resolvedEmail,
      syncedAssignment
    };
  } catch (err) {
    console.error("ensurePsychTeacherSurveyAssignment error:", err);
    return {
      assignedUserId: targetUserId || teacherId || null,
      resolvedTeacherName,
      resolvedEmail,
      syncedAssignment: false
    };
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const departmentCodeOrId = searchParams.get("departmentId") || searchParams.get("departmentCode") || "TO_TLHN";
    const action = searchParams.get("action");

    // Lấy danh sách GĐCS
    const gdcsList = await getGdcsCampusList();

    if (action === "getGdcsList") {
      return NextResponse.json({ success: true, gdcsList });
    }

    if (action === "getDepartmentTeachers") {
      const teachers = await getDepartmentTeachers(departmentCodeOrId);
      return NextResponse.json({ success: true, teachers, departmentCode: departmentCodeOrId });
    }

    if (!studentId) {
      return NextResponse.json({ success: true, gdcsList });
    }

    const student = await (prisma as any).inputAssessmentStudent.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        grade: true,
        surveySystem: true,
        surveyFormType: true,
        admissionCampus: true,
        periodId: true,
        batchId: true
      }
    });

    if (!student) {
      return NextResponse.json({ success: false, error: "Không tìm thấy học sinh", gdcsList }, { status: 404 });
    }

    // 1. Lấy danh sách các Tổ / Bộ phận (ưu tiên đưa Tổ TLHN lên đầu)
    const departments = await getDepartments();

    // 2. Lấy danh sách GV thuộc Tổ được chọn (mặc định Tổ TLHN)
    const tlhnTeachers = await getDepartmentTeachers(departmentCodeOrId);

    // 3. Lấy phân công môn Tâm lý theo đợt khảo sát (nếu có)
    const rawAssigned = await getAssignedPsychologyTeachers(studentId);
    const assignedInPeriod = (rawAssigned || []).map((t: any) => ({
      teacherId: t.userId || t.teacherId || "",
      teacherName: t.fullName || t.teacherName || "GV Tâm lý",
      teacherEmail: t.email || t.teacherEmail || "",
      teacherPhone: t.phone || t.teacherPhone || "",
      assignmentRole: t.isBatchAssigned ? "Đã phân công đúng đợt KS" : "Đã phân công kỳ KS",
      grade: t.grade || "",
      batchId: t.batchId || null,
      isBatchAssigned: Boolean(t.isBatchAssigned),
      subjectName: t.subjectName || "Tâm lý",
      isPeriodAssigned: true
    }));

    // 4. Lấy bộ câu hỏi Tâm lý theo khối
    const rawGrade = String(student.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim();
    const currentGrade = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].includes(rawGrade) ? rawGrade : "default";
    const psychQuestions = questionsData[currentGrade] || defaultQuestions;

    // 5. Lấy thông tin bản ghi định hướng hiện tại nếu có
    const orientationRecord = await getStudentOrientationRecord(studentId);

    // Kiểm tra GV Tâm lý đã được gán trên Phiếu Định Hướng (nếu có)
    const recordTeacherId = orientationRecord?.psychologyTeacherId || "";
    const recordTeacherName = orientationRecord?.psychologyTeacherName || "";

    // Hợp nhất danh sách GV: Đưa GV đã gán trên hồ sơ HS và GV phân công đợt lên đầu, kết hợp toàn bộ GV Tổ TLHN
    const combinedMap = new Map<string, any>();

    if (recordTeacherId || recordTeacherName) {
      const matchedFromPeriod = assignedInPeriod.find(
        (ap: any) => (recordTeacherId && ap.teacherId === recordTeacherId) || (recordTeacherName && ap.teacherName === recordTeacherName)
      );
      const matchedFromDept = tlhnTeachers.find(
        (tt: any) => (recordTeacherId && (tt.teacherId === recordTeacherId || tt.realTeacherId === recordTeacherId)) || (recordTeacherName && tt.teacherName === recordTeacherName)
      );
      const key = matchedFromPeriod?.teacherId || matchedFromDept?.teacherId || recordTeacherId || recordTeacherName;
      combinedMap.set(key, {
        teacherId: matchedFromPeriod?.teacherId || matchedFromDept?.teacherId || recordTeacherId,
        teacherName: recordTeacherName || matchedFromPeriod?.teacherName || matchedFromDept?.teacherName || "GV Tâm lý",
        teacherEmail: matchedFromPeriod?.teacherEmail || matchedFromDept?.teacherEmail || "",
        teacherPhone: matchedFromPeriod?.teacherPhone || matchedFromDept?.teacherPhone || "",
        assignmentRole: matchedFromPeriod
          ? "Đã phân công đợt KS & Gán cho HS"
          : "Đã gán trực tiếp từ Phiếu định hướng",
        grade: matchedFromPeriod?.grade || student.grade || "",
        subjectName: "Tâm lý",
        isPeriodAssigned: Boolean(matchedFromPeriod),
        isStudentAssigned: true
      });
    }

    assignedInPeriod.forEach((ap: any) => {
      if (ap.teacherId && !combinedMap.has(ap.teacherId)) {
        combinedMap.set(ap.teacherId, {
          ...ap,
          isStudentAssigned: false
        });
      }
    });

    tlhnTeachers.forEach((tt: any) => {
      if (tt.teacherId && !combinedMap.has(tt.teacherId)) {
        combinedMap.set(tt.teacherId, {
          ...tt,
          isPeriodAssigned: false,
          isStudentAssigned: false
        });
      }
    });

    const assignedTeachers = Array.from(combinedMap.values());

    // Phân loại rõ trường hợp ĐÃ ĐƯỢC PHÂN CÔNG vs CHƯA ĐƯỢC PHÂN CÔNG
    let assignmentSource: "PERIOD_ASSIGNED" | "ORIENTATION_ASSIGNED" | "UNASSIGNED" = "UNASSIGNED";
    let activeAssignedTeacher: any = null;

    if (recordTeacherId || recordTeacherName) {
      const isAlsoInPeriod = assignedInPeriod.some(
        (ap: any) => (recordTeacherId && ap.teacherId === recordTeacherId) || (recordTeacherName && ap.teacherName === recordTeacherName)
      );
      assignmentSource = isAlsoInPeriod ? "PERIOD_ASSIGNED" : "ORIENTATION_ASSIGNED";
      activeAssignedTeacher = assignedTeachers[0] || {
        teacherId: recordTeacherId,
        teacherName: recordTeacherName
      };
    } else if (assignedInPeriod.length > 0) {
      assignmentSource = "PERIOD_ASSIGNED";
      activeAssignedTeacher = assignedInPeriod[0];
    }

    let parsedPsychData: any = null;
    if (orientationRecord?.psychologyData) {
      try {
        parsedPsychData = typeof orientationRecord.psychologyData === "string"
          ? JSON.parse(orientationRecord.psychologyData)
          : orientationRecord.psychologyData;
      } catch (e) {}
    }

    // Fallback: Nếu chưa có psychologyData trên phiếu định hướng nhưng đã có điểm môn TLY trong InputAssessmentScore
    if (!parsedPsychData && orientationRecord?.student?.scores) {
      const tlyScoreRec = orientationRecord.student.scores.find(
        (sc: any) => sc.subject?.code === "TLY" || String(sc.subject?.name || "").toLowerCase().includes("tâm lý")
      );
      if (tlyScoreRec) {
        try {
          const arrScores = JSON.parse(tlyScoreRec.scores || "[]");
          const arrComments = JSON.parse(tlyScoreRec.comments || "[]");
          const raw20 = arrScores.length >= 27 ? arrScores.slice(7, 27).map(Number) : arrScores.slice(0, 20).map(Number);
          const secScores = arrScores.length >= 7 ? arrScores.slice(0, 6).map(Number) : [];
          const tot = arrScores.length >= 7 ? Number(arrScores[6]) : raw20.reduce((s: number, v: number) => s + (Number(v) || 0), 0);
          parsedPsychData = {
            scores: raw20,
            sectionScores: secScores,
            totalScore: tot,
            conclusion: arrComments[0] || "",
            recommendation: arrComments[1] || "",
            notes: arrComments.slice(2, 22)
          };
        } catch (e) {}
      }
    }

    const assignedSurveyTeachers = await getStudentAssignedSurveyTeachers(studentId);

    return NextResponse.json({
      success: true,
      departments,
      selectedDepartmentCode: departmentCodeOrId,
      assignedTeachers,
      assignedSurveyTeachers,
      assignedInPeriodCount: assignedInPeriod.length,
      assignmentSource,
      isAlreadyAssigned: assignmentSource !== "UNASSIGNED",
      activeAssignedTeacher,
      tlhnTeachers,
      psychologyQuestions: psychQuestions,
      gdcsList,
      referralStatus: orientationRecord?.psychologyReferralStatus || (parsedPsychData ? "COMPLETED" : (assignmentSource !== "UNASSIGNED" ? "ASSIGNED" : "NONE")),
      referralReason: orientationRecord?.psychologyReferralReason || "",
      referralTeacherId: activeAssignedTeacher?.teacherId || orientationRecord?.psychologyTeacherId || "",
      referralTeacherName: activeAssignedTeacher?.teacherName || orientationRecord?.psychologyTeacherName || "",
      defaultGiaovuEmail: getCampusGiaovuEmail(student.admissionCampus),
      campusTeachers: await (prisma as any).teacher.findMany({
        where: {
          OR: [
            { campus: { campusCode: { contains: String(student.admissionCampus || "").slice(0, 3) } } },
            { campus: { campusName: { contains: String(student.admissionCampus || "") } } }
          ]
        },
        select: { id: true, teacherName: true, email: true, userId: true, position: true },
        orderBy: { teacherName: "asc" },
        take: 100
      }).catch(() => []),
      psychologyData: parsedPsychData,
      data: {
        student,
        departments,
        assignedTeachers,
        assignmentSource,
        isAlreadyAssigned: assignmentSource !== "UNASSIGNED",
        activeAssignedTeacher,
        tlhnTeachers,
        psychQuestions,
        gdcsList,
        psychologyData: parsedPsychData,
        currentReferral: {
          status: orientationRecord?.psychologyReferralStatus || (parsedPsychData ? "COMPLETED" : "NONE"),
          reason: orientationRecord?.psychologyReferralReason || "",
          teacherId: activeAssignedTeacher?.teacherId || orientationRecord?.psychologyTeacherId || "",
          teacherName: activeAssignedTeacher?.teacherName || orientationRecord?.psychologyTeacherName || ""
        }
      }
    });
  } catch (error: any) {
    console.error("GET /api/admin/orientation/psychology-referral error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const actorName = (session.user as any)?.fullName || session.user?.name || "Giáo viên Định hướng";

    // NHÁNH A-ASSIGN: KHI GV ĐỊNH HƯỚNG CHỌN GÁN GV TÂM LÝ TRỰC TIẾP TRÊN PHIẾU
    if (body.action === "assignPsychTeacher") {
      const { studentId, teacherId, teacherName, reason } = body;
      if (!studentId || (!teacherId && !teacherName)) {
        return NextResponse.json({ success: false, error: "Vui lòng chọn Giáo viên Tâm lý để gán." }, { status: 400 });
      }

      const student = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId },
        include: { period: true, batch: true }
      });

      if (!student) {
        return NextResponse.json({ success: false, error: "Không tìm thấy học sinh." }, { status: 404 });
      }

      const existingRecord = await getStudentOrientationRecord(studentId);
      const syncResult = await ensurePsychTeacherSurveyAssignment({
        student,
        teacherId,
        teacherName,
        actorName,
        reason: reason || existingRecord?.psychologyReferralReason || "Gán từ Phiếu định hướng đầu vào",
        createNotification: true
      });

      const finalStatus =
        existingRecord?.psychologyReferralStatus === "COMPLETED"
          ? "COMPLETED"
          : "REQUESTED";

      const updatedRecord = await upsertStudentOrientationRecord({
        studentId,
        psychologyReferralStatus: finalStatus,
        psychologyTeacherId: syncResult.assignedUserId || teacherId || null,
        psychologyTeacherName: syncResult.resolvedTeacherName || teacherName || null,
        psychologyReferralReason:
          reason || existingRecord?.psychologyReferralReason || "Phân công GV Tâm lý khảo sát từ Phiếu định hướng"
      });

      return NextResponse.json({
        success: true,
        message: `Đã gán GV Tâm lý ${syncResult.resolvedTeacherName || teacherName} phụ trách khảo sát & đánh giá tâm lý cho học sinh ${student.fullName}!`,
        data: {
          record: updatedRecord,
          teacherId: syncResult.assignedUserId || teacherId,
          teacherName: syncResult.resolvedTeacherName || teacherName,
          assignmentSource: "ORIENTATION_ASSIGNED",
          syncedSurveyAssignment: syncResult.syncedAssignment
        }
      });
    }

    // NHÁNH A0: LƯU TRỰC TIẾP KẾT QUẢ ĐÁNH GIÁ TÂM LÝ THEO FORM TÂM LÝ
    if (body.action === "savePsychologyAssessment") {
      const {
        studentId,
        teacherId,
        teacherName,
        reason,
        scores = [],
        sectionScores = [],
        totalScore = 0,
        evaluation = {},
        conclusion = "",
        recommendation = "",
        notes = []
      } = body;

      if (!studentId) {
        return NextResponse.json({ success: false, error: "Thiếu studentId." }, { status: 400 });
      }

      const studentForSync = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId }
      });

      const assessorName =
        teacherName ||
        (session.user as any)?.fullName ||
        session.user?.name ||
        "Giáo viên Tâm lý";
      const assessorId = teacherId || (session.user as any)?.id || null;

      // Đồng bộ phân công khảo sát nếu GV Tâm lý được chọn chưa có trong đợt
      let resolvedAssessorId = assessorId;
      let resolvedAssessorName = assessorName;
      if (studentForSync) {
        const syncRes = await ensurePsychTeacherSurveyAssignment({
          student: studentForSync,
          teacherId: assessorId,
          teacherName: assessorName,
          actorName,
          reason: reason || conclusion,
          createNotification: false
        });
        if (syncRes.assignedUserId) resolvedAssessorId = syncRes.assignedUserId;
        if (syncRes.resolvedTeacherName) resolvedAssessorName = syncRes.resolvedTeacherName;
      }

      const nowStr = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

      const psychDataObj = {
        scores,
        sectionScores,
        totalScore,
        evaluation,
        conclusion,
        recommendation,
        notes,
        assessedBy: resolvedAssessorName,
        assessedById: resolvedAssessorId,
        assessedAt: new Date().toISOString(),
        assessedAtFormatted: nowStr,
        digitalSignature: {
          isSigned: true,
          signedBy: resolvedAssessorName,
          signerId: resolvedAssessorId,
          signerRole: "Giáo viên Tâm lý học đường",
          signedAt: new Date().toISOString(),
          signedAtFormatted: nowStr,
          signatureHash: `SQMS-SIGN-TLY-${studentForSync?.studentCode || studentId.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`,
          status: "VERIFIED",
          stage: "STAGE_4_EVALUATED"
        }
      };

      const updatedRecord = await upsertStudentOrientationRecord({
        studentId,
        psychologyReferralStatus: "COMPLETED",
        psychologyTeacherId: resolvedAssessorId,
        psychologyTeacherName: resolvedAssessorName,
        psychologyReferralReason:
          reason || conclusion || evaluation?.suggestion || "Đã hoàn thành đánh giá tâm lý theo Form chuẩn",
        psychologyData: JSON.stringify(psychDataObj)
      });

      // Đồng bộ điểm psychologyScore sang InputAssessmentStudent & InputAssessmentScore (môn TLY)
      try {
        await (prisma as any).inputAssessmentStudent.update({
          where: { id: studentId },
          data: { psychologyScore: Number(totalScore) || 0 }
        });

        const tlySubject = await (prisma as any).inputAssessmentSubject.findFirst({
          where: {
            OR: [
              { code: "TLY" },
              { name: { contains: "Tâm lý" } },
              { name: { contains: "tâm lý" } }
            ]
          }
        });

        if (tlySubject) {
          const finalScoresArr = [...sectionScores, totalScore, ...scores];
          const finalCommentsArr = [conclusion, recommendation, ...notes];
          const existingScore = await (prisma as any).inputAssessmentScore.findFirst({
            where: { studentId, subjectId: tlySubject.id }
          });

          if (existingScore) {
            await (prisma as any).inputAssessmentScore.update({
              where: { id: existingScore.id },
              data: {
                scores: JSON.stringify(finalScoresArr),
                comments: JSON.stringify(finalCommentsArr),
                status: "COMPLETED"
              }
            });
          } else {
            await (prisma as any).inputAssessmentScore.create({
              data: {
                studentId,
                subjectId: tlySubject.id,
                scores: JSON.stringify(finalScoresArr),
                comments: JSON.stringify(finalCommentsArr),
                status: "COMPLETED"
              }
            });
          }
        }
      } catch (syncErr) {
        console.error("Lỗi đồng bộ điểm Tâm lý:", syncErr);
      }

      return NextResponse.json({
        success: true,
        message: "Đã lưu kết quả khảo sát & đánh giá tâm lý thành công!",
        data: {
          record: updatedRecord,
          psychologyData: psychDataObj,
          teacherId: resolvedAssessorId,
          teacherName: resolvedAssessorName
        }
      });
    }

    // NHÁNH A: BÁO CÁO KẾT QUẢ ĐÁNH GIÁ TÂM LÝ ĐẾN GĐCS & GỬI EMAIL
    if (body.action === "reportToGdcs") {
      const {
        studentId,
        gdcsName,
        gdcsEmail,
        campusCode,
        giaovuEmail: inputGiaovuEmail,
        needGdcsDirective = false,
        directiveTopic = "",
        proposedAction = "DIRECT_PARENT_MEETING",
        scores = [],
        sectionScores = [],
        totalScore = 0,
        evaluation = {},
        conclusion = "",
        recommendation = "",
        notes = [],
        messageToGdcs = ""
      } = body;

      if (!studentId || !gdcsEmail) {
        return NextResponse.json({ success: false, error: "Thiếu studentId hoặc email GĐCS tiếp nhận." }, { status: 400 });
      }

      // 1. Tìm thông tin học sinh
      const student = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId },
        include: {
          period: true,
          batch: true
        }
      });

      if (!student) {
        return NextResponse.json({ success: false, error: "Không tìm thấy thông tin học sinh." }, { status: 404 });
      }

      const reporterName = session.user?.name || session.user?.fullName || "Giáo viên Tâm lý";
      const nowStr = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

      const resolvedGiaovuEmail = (inputGiaovuEmail || getCampusGiaovuEmail(campusCode || student.admissionCampus)).trim();
      const existingRecordForPrev = await getStudentOrientationRecord(studentId);
      let prevPsychData: any = {};
      try {
        if (existingRecordForPrev?.psychologyData) {
          prevPsychData = typeof existingRecordForPrev.psychologyData === "string" 
            ? JSON.parse(existingRecordForPrev.psychologyData) 
            : existingRecordForPrev.psychologyData;
        }
      } catch (e) {}

      const proposedActionLabels: Record<string, string> = {
        DIRECT_PARENT_MEETING: "Trao đổi trực tiếp PHHS",
        SCHEDULE_MEETING: "Hẹn lịch làm việc / Hội chẩn chuyên môn",
        DELEGATE_TEACHER: "Ủy quyền Giáo viên đồng hành"
      };

      const psychDataObj = {
        scores,
        sectionScores,
        totalScore,
        evaluation,
        conclusion,
        recommendation,
        notes,
        digitalSignature: prevPsychData?.digitalSignature || {
          isSigned: true,
          signedBy: reporterName,
          signerRole: "Giáo viên Tâm lý học đường",
          signedAt: new Date().toISOString(),
          signedAtFormatted: nowStr,
          signatureHash: `SQMS-SIGN-TLY-${student.studentCode || studentId.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`,
          status: "VERIFIED",
          stage: "STAGE_4_EVALUATED"
        },
        reportedToGdcs: {
          gdcsName: gdcsName || "Giám đốc Cơ sở",
          gdcsEmail,
          campusCode: campusCode || student.admissionCampus || "",
          giaovuEmail: resolvedGiaovuEmail,
          reportedAt: new Date().toISOString(),
          reportedAtFormatted: nowStr,
          reporterName,
          messageToGdcs
        },
        gdcsDirectiveRequest: needGdcsDirective ? {
          requested: true,
          topic: directiveTopic || conclusion || "Học sinh cần theo dõi / hỗ trợ tâm lý chuyên sâu",
          proposedAction: proposedAction || "DIRECT_PARENT_MEETING",
          proposedActionLabel: proposedActionLabels[proposedAction] || proposedAction,
          requestedAt: new Date().toISOString(),
          requestedAtFormatted: nowStr,
          requesterName: reporterName,
          status: "PENDING"
        } : (prevPsychData?.gdcsDirectiveRequest || null),
        gdcsResponse: prevPsychData?.gdcsResponse || null
      };

      // 2. Cập nhật vào StudentOrientationRecord
      const nextStatus = needGdcsDirective ? "REQUESTED_DIRECTIVE" : "COMPLETED";
      await upsertStudentOrientationRecord({
        studentId,
        psychologyReferralStatus: nextStatus,
        psychologyTeacherName: reporterName,
        psychologyReferralReason: conclusion || evaluation?.suggestion || "Đã hoàn thành đánh giá tâm lý chuyên sâu",
        psychologyData: JSON.stringify(psychDataObj)
      });

      // 3. Cập nhật trực tiếp điểm psychologyScore vào InputAssessmentStudent
      try {
        await (prisma as any).inputAssessmentStudent.update({
          where: { id: studentId },
          data: { psychologyScore: totalScore }
        });
      } catch (errUpd) {}

      // Lấy bản ghi định hướng chi tiết để đưa vào Form Định Hướng Học Sinh trong email
      const orientationRecord = await getStudentOrientationRecord(studentId);

      // Cấu hình Base URL và đường dẫn trực tiếp mở Phiếu định hướng cho GĐCS
      const host = req.headers.get("host") || "ssm.skylineschool.edu.vn";
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      const baseUrl = `${protocol}://${host}`;
      const directOrientationLink = `${baseUrl}/admin/xet-duyet-ket-qua?tab=k12&studentId=${studentId}`;

      const dobFormatted = student.dateOfBirth
        ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN")
        : "—";

      // 6 phần thang đo sàng lọc điểm số chuẩn xác
      const psychologicalSections = [
        { no: 1, title: "Cảm xúc & điều hòa", en: "Emotion & Self-regulation", max: 16 },
        { no: 2, title: "Hành vi", en: "Behavior & Self-control", max: 12 },
        { no: 3, title: "Giao tiếp xã hội", en: "Social Communication", max: 12 },
        { no: 4, title: "Chú ý & kỹ năng học tập", en: "Attention & Learning Skills", max: 12 },
        { no: 5, title: "Vận động & giác quan", en: "Motor & Sensory", max: 12 },
        { no: 6, title: "Thích ứng & tự lập", en: "Adaptation & Autonomy", max: 16 }
      ];

      const levelTitle = evaluation?.level || (
        totalScore > 47 ? "Cần can thiệp chuyên sâu" :
        totalScore > 31 ? "Cần hỗ trợ học đường" :
        totalScore > 15 ? "Dấu hiệu nhẹ cần lưu ý" : "Bình thường / Theo dõi thích nghi"
      );

      const levelBadgeColor = totalScore > 47 ? "#b91c1c" : totalScore > 31 ? "#c2410c" : totalScore > 15 ? "#b45309" : "#047857";
      const levelBadgeBg = totalScore > 47 ? "#fef2f2" : totalScore > 31 ? "#fff7ed" : totalScore > 15 ? "#fffbeb" : "#ecfdf5";
      const levelBadgeBorder = totalScore > 47 ? "#fecaca" : totalScore > 31 ? "#ffedd5" : totalScore > 15 ? "#fde68a" : "#a7f3d0";

      // 4. Gửi Email thông báo chuyên nghiệp đến GĐCS
      let emailSuccess = false;
      let emailError = "";
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html lang="vi">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>[Sky-line SMS] Báo cáo kết quả đánh giá tâm lý & Đề xuất định hướng - HS ${student.fullName}</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f8fafc" style="background-color: #f8fafc; padding: 24px 0;">
              <tr>
                <td align="center" style="padding: 0 12px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 660px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    
                    <!-- DẢI VIỀN ĐIỂM NHẤN BRAND TEAL -->
                    <tr>
                      <td height="4" bgcolor="#00A19A" style="background-color: #00A19A; font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>

                    <!-- MASTHEAD CHÍNH: DEEP PINE -->
                    <tr>
                      <td bgcolor="#003B3A" style="background-color: #003B3A; color: #ffffff; padding: 22px 28px; text-align: left;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td>
                              <div style="font-size: 11px; font-weight: 700; color: #a7f3d0; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                                HỆ THỐNG GIÁO DỤC SKY-LINE &bull; BAN KHẢO THÍ &amp; ĐBCL
                              </div>
                              <h1 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 800; color: #ffffff; text-transform: uppercase; line-height: 1.35; letter-spacing: 0.3px;">
                                Báo Cáo Khảo Sát Tâm Lý &amp; Đề Xuất Chỉ Đạo Tiếp Nhận
                              </h1>
                              <div style="font-size: 12.5px; color: #e2e8f0; font-weight: 500;">
                                Kính gửi Giám đốc Cơ sở: <strong style="color: #ffffff;">${gdcsName || 'Thầy/Cô GĐCS'}</strong> &bull; Cơ sở ${campusCode || student.admissionCampus || 'Sky-Line'}
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- THÔNG TIN ĐIỀU PHỐI (ROUTING STRIP) -->
                    <tr>
                      <td style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 12px 24px;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 11.5px; color: #475569; line-height: 1.5;">
                          <tr>
                            <td style="width: 50%; vertical-align: top; padding-right: 10px;">
                              <span style="color: #64748b; font-weight: 600;">Người lập báo cáo:</span> <strong style="color: #0f172a;">${reporterName}</strong> (GV Tâm lý)<br/>
                              <span style="color: #64748b; font-weight: 600;">Thời gian gửi:</span> <span style="color: #0f172a; font-variant-numeric: tabular-nums;">${nowStr}</span>
                            </td>
                            <td style="width: 50%; vertical-align: top; padding-left: 10px; border-left: 1px solid #e2e8f0;">
                              <span style="color: #64748b; font-weight: 600;">GĐCS tiếp nhận:</span> <strong style="color: #003B3A;">${gdcsName}</strong> (${gdcsEmail})<br/>
                              <span style="color: #64748b; font-weight: 600;">Đồng gửi (CC):</span> Ban KT&amp;ĐBCL &bull; Giáo vụ Cơ sở (${resolvedGiaovuEmail})
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- NỘI DUNG CHÍNH -->
                    <tr>
                      <td style="padding: 24px 28px; color: #1e293b;">

                        <!-- LỜI DẪN NHẬP -->
                        <p style="margin: 0 0 18px 0; font-size: 13px; line-height: 1.6; color: #334155;">
                          Kính gửi <strong>Thầy/Cô ${gdcsName || 'Giám Đốc Cơ Sở'}</strong>,<br/>
                          Bộ phận Chuyên viên Tâm lý học đường (<strong>${reporterName}</strong>) vừa hoàn thành bài khảo sát đánh giá tâm lý chuyên sâu và trân trọng chuyển gửi báo cáo kết quả kèm Phiếu Định Hướng Học Sinh đến Giám Đốc Cơ Sở để xem xét và ban hành chỉ đạo phương án tiếp nhận.
                        </p>

                        <!-- ========================================================= -->
                        <!-- MỤC 1: HỒ SƠ HỌC SINH ĐẦU VÀO -->
                        <!-- ========================================================= -->
                        <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                          <div style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 16px; font-size: 12px; font-weight: 800; color: #003B3A; text-transform: uppercase; letter-spacing: 0.5px;">
                            📋 Hồ sơ học sinh khảo sát đầu vào
                          </div>
                          
                          <div style="padding: 14px 16px; background-color: #ffffff;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 12.5px; border-collapse: collapse;">
                              <tr>
                                <td style="padding: 5px 0; color: #64748b; width: 26%;">Họ và tên học sinh:</td>
                                <td style="padding: 5px 0; font-weight: 800; color: #0f172a; font-size: 13.5px; width: 34%;">${student.fullName}</td>
                                <td style="padding: 5px 0; color: #64748b; width: 20%;">Mã học sinh:</td>
                                <td style="padding: 5px 0; font-weight: 700; color: #003B3A; font-family: monospace; font-size: 12.5px; width: 20%;">${student.studentCode || '—'}</td>
                              </tr>
                              <tr>
                                <td style="padding: 5px 0; color: #64748b;">Ngày sinh &bull; Giới tính:</td>
                                <td style="padding: 5px 0; font-weight: 600; color: #1e293b; font-variant-numeric: tabular-nums;">${dobFormatted} &bull; ${student.gender || '—'}</td>
                                <td style="padding: 5px 0; color: #64748b;">Khối đăng ký:</td>
                                <td style="padding: 5px 0; font-weight: 700; color: #1e293b;">Khối ${student.grade || '1'}</td>
                              </tr>
                              <tr>
                                <td style="padding: 5px 0; color: #64748b;">Hệ khảo sát:</td>
                                <td style="padding: 5px 0; font-weight: 600; color: #1e293b;">${student.surveyFormType || student.surveySystem || 'Chất lượng cao'}</td>
                                <td style="padding: 5px 0; color: #64748b;">Cơ sở tiếp nhận:</td>
                                <td style="padding: 5px 0; font-weight: 700; color: #00A19A;">${student.admissionCampus || campusCode || 'Sky-Line'}</td>
                              </tr>
                              <tr>
                                <td style="padding: 5px 0; color: #64748b;">Trường trước đây:</td>
                                <td style="padding: 5px 0; font-weight: 500; color: #334155;" colspan="3">${student.oldSchoolName || 'Chưa ghi nhận'}</td>
                              </tr>
                            </table>

                            <!-- GHI NHẬN TỪ PHIẾU ĐỊNH HƯỚNG -->
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0; font-size: 12px; line-height: 1.55; color: #334155;">
                              <div style="margin-bottom: 4px;">
                                <strong style="color: #059669;">&bull; Điểm mạnh &amp; Tiềm năng học sinh:</strong>
                                <span>${orientationRecord?.studentStrengths?.trim() || 'Học sinh có phản xạ tương tác tốt, tự tin.'}</span>
                              </div>
                              <div>
                                <strong style="color: #d97706;">&bull; Nhu cầu cần hỗ trợ bước đầu:</strong>
                                <span>${orientationRecord?.studentNeedsSupport?.trim() || 'Cần chú ý thích ứng môi trường nề nếp và giao tiếp trong giai đoạn đầu.'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- ========================================================= -->
                        <!-- MỤC 2: KẾT QUẢ KHẢO SÁT TÂM LÝ CHUYÊN SÂU -->
                        <!-- ========================================================= -->
                        <div style="margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                          <div style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 16px; font-size: 12px; font-weight: 800; color: #003B3A; text-transform: uppercase; letter-spacing: 0.5px;">
                            🧠 Kết quả khảo sát tâm lý chuyên sâu
                          </div>
                          
                          <div style="padding: 16px; background-color: #ffffff;">
                            
                            <!-- BẢNG TỔNG HỢP ĐIỂM SÀNG LỌC (LEDGER STRIP) -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 14px;">
                              <tr>
                                <td style="width: 50%; padding: 12px 16px; border-right: 1px solid #e2e8f0; vertical-align: middle;">
                                  <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; display: block; margin-bottom: 2px;">
                                    Tổng điểm sàng lọc tâm lý:
                                  </span>
                                  <div style="font-size: 24px; font-weight: 800; color: #003B3A; font-variant-numeric: tabular-nums;">
                                    ${totalScore} <span style="font-size: 13px; font-weight: 600; color: #64748b;">/ 80 điểm</span>
                                  </div>
                                  <div style="font-size: 11px; color: #00A19A; font-weight: 600; margin-top: 2px;">
                                    Thang đo 20 tiêu chí chuyên sâu
                                  </div>
                                </td>
                                <td style="width: 50%; padding: 12px 16px; vertical-align: middle;">
                                  <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; display: block; margin-bottom: 4px;">
                                    Phân loại mức độ nhận diện:
                                  </span>
                                  <span style="display: inline-block; padding: 4px 10px; background-color: ${levelBadgeBg}; color: ${levelBadgeColor}; border: 1px solid ${levelBadgeBorder}; border-radius: 4px; font-size: 11.5px; font-weight: 800; text-transform: uppercase;">
                                    ${levelTitle}
                                  </span>
                                  <div style="font-size: 11px; color: #475569; margin-top: 4px; line-height: 1.4;">
                                    ${evaluation?.suggestion || 'Theo dõi và xây dựng kế hoạch hỗ trợ tâm lý học đường.'}
                                  </div>
                                </td>
                              </tr>
                            </table>

                            <!-- THANG ĐO SÀNG LỌC ĐIỂM SỐ 6 PHẦN CHI TIẾT -->
                            <div style="margin-bottom: 14px;">
                              <div style="font-size: 11.5px; font-weight: 700; color: #334155; text-transform: uppercase; margin-bottom: 6px;">
                                Thang đo sàng lọc điểm số 6 phần chi tiết:
                              </div>
                              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 11.5px; border: 1px solid #e2e8f0; border-collapse: collapse;">
                                <thead>
                                  <tr style="background-color: #f8fafc; color: #334155; font-weight: 700; border-bottom: 1px solid #cbd5e1; text-align: left;">
                                    <th style="padding: 7px 10px; width: 40px; text-align: center;">STT</th>
                                    <th style="padding: 7px 10px;">Nội dung Thang đo thành phần</th>
                                    <th style="padding: 7px 10px; width: 90px; text-align: center;">Điểm số</th>
                                    <th style="padding: 7px 10px; width: 110px; text-align: center;">Đánh giá sơ bộ</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${psychologicalSections.map((sec, idx) => {
                                    const sScore = (Array.isArray(sectionScores) && sectionScores[idx] !== undefined)
                                      ? Number(sectionScores[idx])
                                      : 0;
                                    const sRate = sec.max > 0 ? (sScore / sec.max) : 0;
                                    const isHigh = sRate > 0.5;
                                    const isMed = sRate > 0.25;
                                    const statusText = isHigh ? "Dấu hiệu rõ" : isMed ? "Cần lưu ý" : "Bình thường";
                                    const statusColor = isHigh ? "#e11d48" : isMed ? "#d97706" : "#059669";
                                    return `
                                      <tr style="border-bottom: 1px solid #f1f5f9; background-color: ${idx % 2 === 0 ? '#ffffff' : '#fafafa'};">
                                        <td style="padding: 6px 10px; text-align: center; font-weight: 600; color: #64748b;">${sec.no}</td>
                                        <td style="padding: 6px 10px;">
                                          <strong style="color: #0f172a; font-size: 12px;">${sec.title}</strong>
                                          <span style="font-size: 10px; color: #94a3b8; margin-left: 4px;">(${sec.en})</span>
                                        </td>
                                        <td style="padding: 6px 10px; text-align: center; font-weight: 800; font-size: 12.5px; color: #003B3A; font-variant-numeric: tabular-nums;">
                                          ${sScore} <span style="font-size: 10px; font-weight: normal; color: #94a3b8;">/ ${sec.max}đ</span>
                                        </td>
                                        <td style="padding: 6px 10px; text-align: center;">
                                          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 10.5px; color: ${statusColor}; background-color: ${isHigh ? '#fff1f2' : isMed ? '#fffbeb' : '#f0fdf4'}; border: 1px solid ${isHigh ? '#fecdd3' : isMed ? '#fde68a' : '#bbf7d0'};">
                                            ${statusText}
                                          </span>
                                        </td>
                                      </tr>
                                    `;
                                  }).join('')}
                                </tbody>
                              </table>
                            </div>

                            <!-- KẾT LUẬN & KHUYẾN NGHỊ CHUYÊN MÔN -->
                            <div style="margin-top: 12px;">
                              <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-left: 3px solid #00A19A; border-radius: 4px; padding: 10px 12px; margin-bottom: 8px;">
                                <strong style="color: #003B3A; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 3px;">
                                  📌 Kết luận chuyên môn của GV Tâm lý:
                                </strong>
                                <div style="font-size: 12px; color: #134e4a; line-height: 1.5; font-style: italic;">
                                  &quot;${conclusion || 'Học sinh có phản xạ tương tác tốt, chưa ghi nhận dấu hiệu bất thường cần can thiệp.'}&quot;
                                </div>
                              </div>

                              <div style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-left: 3px solid #059669; border-radius: 4px; padding: 10px 12px;">
                                <strong style="color: #065f46; font-size: 11px; text-transform: uppercase; display: block; margin-bottom: 3px;">
                                  💡 Khuyến nghị hành động của GV Tâm lý:
                                </strong>
                                <div style="font-size: 12px; color: #064e3b; line-height: 1.5;">
                                  ${recommendation || 'Tiếp tục tạo môi trường khuyến khích học sinh giao tiếp tự tin, đồng hành cùng nhà trường trong giai đoạn đầu nhập học.'}
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>

                        ${needGdcsDirective ? `
                          <!-- ========================================================= -->
                          <!-- MỤC 3: XIN Ý KIẾN CHỈ ĐẠO CỦA GIÁM ĐỐC CƠ SỞ -->
                          <!-- ========================================================= -->
                          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #d97706; border-radius: 6px; padding: 12px 14px; margin-bottom: 20px; font-size: 12px;">
                            <div style="font-weight: 800; color: #92400e; font-size: 12px; margin-bottom: 6px; text-transform: uppercase;">
                              🚨 Xin ý kiến chỉ đạo của Giám đốc Cơ sở (Học sinh cần hỗ trợ tâm lý)
                            </div>
                            <div style="color: #78350f; line-height: 1.55;">
                              <div style="margin-bottom: 4px;">&bull; <strong>Vấn đề tâm lý &amp; Lý do xin ý kiến:</strong> ${directiveTopic || conclusion || 'Học sinh có biểu hiện tâm lý cần theo dõi & can thiệp thích ứng'}</div>
                              <div>&bull; <strong>Đề xuất hình thức mong muốn từ GV:</strong> <span style="background-color: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-weight: 800; border: 1px solid #fde68a;">${proposedActionLabels[proposedAction] || '1. Trao đổi trực tiếp PHHS'}</span></div>
                            </div>
                          </div>
                        ` : ''}

                        <!-- ========================================================= -->
                        <!-- MỤC 4: 3 PHƯƠNG ÁN CHỈ ĐẠO DÀNH CHO GIÁM ĐỐC CƠ SỞ -->
                        <!-- ========================================================= -->
                        <div style="margin-bottom: 22px; border: 1px solid #e2e8f0; border-top: 3px solid #003B3A; border-radius: 6px; overflow: hidden; background-color: #ffffff;">
                          <div style="padding: 12px 16px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 800; color: #003B3A; text-transform: uppercase; letter-spacing: 0.5px;">
                            🏛️ Phương án xử lý &amp; Chỉ đạo dành cho Giám đốc Cơ sở
                          </div>

                          <div style="padding: 14px 16px; font-size: 12px;">
                            <p style="margin: 0 0 10px 0; color: #334155; line-height: 1.5;">
                              Kính đề nghị Giám Đốc Cơ Sở xem xét kết quả và lựa chọn <strong>1 trong 3 phương án chỉ đạo</strong> trên hệ thống SSM:
                            </p>

                            <!-- 3 PHƯƠNG ÁN CHỈ ĐẠO THEO ĐÚNG THỨ TỰ -->
                            <div style="margin-bottom: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
                              <div style="font-weight: 800; color: #003B3A; font-size: 12px; margin-bottom: 3px;">
                                1. Trao đổi trực tiếp Phụ huynh học sinh (PHHS):
                              </div>
                              <div style="color: #475569; font-size: 11.5px; line-height: 1.45;">
                                &bull; Thiết lập thời gian, địa điểm hẹn gặp trực tiếp Phụ huynh học sinh.<br/>
                                &bull; Thỏa thuận nội dung cam kết phối hợp giáo dục giữa Gia đình &amp; Nhà trường.
                              </div>
                            </div>

                            <div style="margin-bottom: 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
                              <div style="font-weight: 800; color: #003B3A; font-size: 12px; margin-bottom: 3px;">
                                2. Hẹn lịch làm việc / Hội chẩn chuyên môn:
                              </div>
                              <div style="color: #475569; font-size: 11.5px; line-height: 1.45;">
                                &bull; Xác định thời gian, địa điểm tổ chức buổi hội chẩn chuyên môn.<br/>
                                &bull; Thành phần tham dự: Ban Giám đốc Cơ sở, Chuyên viên Tâm lý, GVCN và Tổ chuyên môn.
                              </div>
                            </div>

                            <div style="margin-bottom: 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
                              <div style="font-weight: 800; color: #003B3A; font-size: 12px; margin-bottom: 3px;">
                                3. Ủy quyền Giáo viên:
                              </div>
                              <div style="color: #475569; font-size: 11.5px; line-height: 1.45;">
                                &bull; Chỉ định giáo viên đồng hành &amp; hỗ trợ chuyên biệt học sinh trong thời gian đầu năm học.<br/>
                                &bull; Phân công nhiệm vụ cụ thể, mục tiêu theo dõi và báo cáo định kỳ.
                              </div>
                            </div>

                            <!-- NÚT BẤM CTA BULLETPROOF OUTLOOK COMPATIBLE (TABLE + SOLID BG) -->
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 20px auto 10px auto;">
                              <tr>
                                <td align="center" bgcolor="#003B3A" style="background-color: #003B3A; border-radius: 6px; padding: 0;">
                                  <!--[if mso]>
                                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${directOrientationLink}" style="height:46px;v-text-anchor:middle;width:420px;" arcsize="14%" stroke="f" fillcolor="#003B3A">
                                  <w:anchorlock/>
                                  <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;">MỞ PHIẾU ĐỊNH HƯỚNG &amp; PHÊ DUYỆT CHỈ ĐẠO TRÊN SSM &rarr;</center>
                                  </v:roundrect>
                                  <![endif]-->
                                  <a href="${directOrientationLink}" target="_blank" style="mso-hide:all; display: inline-block; padding: 14px 28px; background-color: #003B3A; border: 1px solid #003B3A; border-radius: 6px; color: #ffffff !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 800; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px; text-align: center;">
                                    <span style="color: #ffffff !important; font-weight: 800;">MỞ PHIẾU ĐỊNH HƯỚNG &amp; PHÊ DUYỆT CHỈ ĐẠO TRÊN SSM &rarr;</span>
                                  </a>
                                </td>
                              </tr>
                            </table>

                            <div style="text-align: center; margin-top: 6px;">
                              <a href="${directOrientationLink}" target="_blank" style="font-size: 11px; color: #00A19A; text-decoration: underline; word-break: break-all;">
                                ${directOrientationLink}
                              </a>
                            </div>

                          </div>
                        </div>

                        <p style="margin: 0; font-size: 11.5px; color: #64748b; line-height: 1.5;">
                          Sau khi Giám Đốc Cơ Sở hoàn tất phê duyệt chỉ đạo trên hệ thống, thông tin sẽ được cập nhật đồng bộ cho Bộ phận Tư vấn Tuyển sinh và Giáo viên chuyên trách để kịp thời thực hiện theo đúng kế hoạch.
                        </p>
                      </td>
                    </tr>

                    <!-- FOOTER SỔ CÁI HỌC THUẬT -->
                    <tr>
                      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5;">
                        Email thông báo tự động từ <strong>Phân hệ Khảo sát &amp; Định hướng Học sinh Đầu vào &bull; Sky-Line SSM</strong>.<br/>
                        Ban Khảo thí &amp; Đảm bảo Chất lượng Giáo dục &bull; Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #003B3A; font-weight: 700; text-decoration: none;">ktdbcl@skylineschool.edu.vn</a>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        const ccList = Array.from(new Set(["ktdbcl@skylineschool.edu.vn", resolvedGiaovuEmail].filter(Boolean)));
        const emailSubject = needGdcsDirective
          ? `[XIN Ý KIẾN CHỈ ĐẠO] Báo cáo khảo sát tâm lý & Đề xuất tiếp nhận - HS ${student.fullName} (Khối ${student.grade || '1'})`
          : `Báo cáo kết quả khảo sát tâm lý đầu vào - HS ${student.fullName} (Khối ${student.grade || '1'})`;

        await sendEmail({
          to: gdcsEmail,
          cc: ccList,
          subject: emailSubject,
          html: emailHtml
        });
        emailSuccess = true;
      } catch (errMail: any) {
        console.error("Lỗi khi gửi email đến GĐCS:", errMail);
        emailError = errMail.message || "Lỗi gửi email";
      }

      return NextResponse.json({
        success: true,
        message: `Đã cập nhật kết quả tâm lý lên Phiếu định hướng và ${emailSuccess ? `gửi Email báo cáo đến GĐCS ${gdcsName}` : 'lưu trữ báo cáo (email gửi sau)'}.`,
        emailSuccess,
        emailError: emailError || null,
        data: psychDataObj
      });
    }

    // NHÁNH A-DIRECTIVE: GĐCS TIẾP NHẬN & PHẢN HỒI Ý KIẾN CHỈ ĐẠO
    if (body.action === "respondGdcsDirective") {
      const {
        studentId,
        responseType = "DIRECT_PARENT_MEETING", // "DIRECT_PARENT_MEETING" | "SCHEDULE_MEETING" | "DELEGATE_TEACHER"
        meetingTime = "",
        meetingLocation = "",
        parentMeetingContent = "",
        meetingParticipants = "",
        meetingAgenda = "",
        delegatedTeacherId = "",
        delegatedTeacherName = "",
        delegationDuration = "",
        delegationNote = "",
        generalDirectiveNote = "",
        directorName = "",
        directorEmail = ""
      } = body;

      if (!studentId) {
        return NextResponse.json({ success: false, error: "Thiếu studentId." }, { status: 400 });
      }

      const student = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId },
        include: { period: true, batch: true }
      });

      if (!student) {
        return NextResponse.json({ success: false, error: "Không tìm thấy thông tin học sinh." }, { status: 404 });
      }

      const orientationRecord = await getStudentOrientationRecord(studentId);
      const nowStr = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
      const currentDirectorName = directorName || session.user?.name || (session.user as any)?.fullName || "Giám Đốc Cơ Sở";
      const currentDirectorEmail = directorEmail || session.user?.email || "";

      let currentPsychData: any = {};
      try {
        if (orientationRecord?.psychologyData) {
          currentPsychData = typeof orientationRecord.psychologyData === "string"
            ? JSON.parse(orientationRecord.psychologyData)
            : orientationRecord.psychologyData;
        }
      } catch (e) {}

      const responseTypeTitles: Record<string, string> = {
        DIRECT_PARENT_MEETING: "Trao đổi trực tiếp PHHS",
        SCHEDULE_MEETING: "Hẹn lịch làm việc / Hội chẩn chuyên môn",
        DELEGATE_TEACHER: "Ủy quyền Giáo viên đồng hành"
      };

      const chosenTitle = responseTypeTitles[responseType] || responseType;

      const gdcsResponseObj = {
        responseType,
        responseTypeName: chosenTitle,
        respondedAt: new Date().toISOString(),
        respondedAtFormatted: nowStr,
        directorName: currentDirectorName,
        directorEmail: currentDirectorEmail,
        generalDirectiveNote,
        details: {
          meetingTime,
          meetingLocation,
          parentMeetingContent,
          meetingParticipants,
          meetingAgenda,
          delegatedTeacherId,
          delegatedTeacherName,
          delegationDuration,
          delegationNote
        }
      };

      currentPsychData.gdcsResponse = gdcsResponseObj;
      if (currentPsychData.gdcsDirectiveRequest) {
        currentPsychData.gdcsDirectiveRequest.status = "RESPONDED";
        currentPsychData.gdcsDirectiveRequest.respondedAt = new Date().toISOString();
      }

      // Cập nhật StudentOrientationRecord & đồng bộ vào admissionConsultantNote
      const legacyNotePayload = JSON.stringify({
        gdcsDecision: "TIEP_NHAN_DONG_HANH",
        gdcsGeneralNote: generalDirectiveNote,
        directParentMeeting: responseType === "DIRECT_PARENT_MEETING",
        parentMeetingTime: meetingTime,
        parentMeetingLocation: meetingLocation,
        parentMeetingContent,
        scheduleMeeting: responseType === "SCHEDULE_MEETING",
        meetingTime,
        meetingLocation,
        meetingParticipants,
        meetingAgenda,
        delegateTeacher: responseType === "DELEGATE_TEACHER",
        delegatedTeacherId,
        delegatedTeacherName,
        delegationNote
      });

      await upsertStudentOrientationRecord({
        studentId,
        psychologyReferralStatus: "DIRECTED",
        psychologyData: JSON.stringify(currentPsychData),
        admissionConsultantNote: legacyNotePayload
      });

      // Tạo thông báo chuông hệ thống cho GV Tâm lý (người thực hiện đánh giá)
      const targetTeacherUserId = orientationRecord?.psychologyTeacherId || currentPsychData.reportedToGdcs?.reporterId;
      if (targetTeacherUserId) {
        try {
          await (prisma as any).notification.create({
            data: {
              userId: targetTeacherUserId,
              title: `[Chỉ đạo GĐCS] Phản hồi khảo sát tâm lý HS ${student.fullName}`,
              message: `${currentDirectorName} đã phê duyệt chỉ đạo: "${chosenTitle}". ${generalDirectiveNote ? `Lưu ý: "${generalDirectiveNote}"` : ""}`,
              link: `/teacher/input-assessments?periodId=${student.periodId}&batchId=${student.batchId || ""}&studentCode=${encodeURIComponent(student.studentCode)}&autoOpen=true`,
              type: "TASK",
              category: "ASSESSMENT",
              priority: "HIGH",
              sourceModule: "ORIENTATION_PSYCHOLOGY",
              sourceId: student.id
            }
          });
        } catch (nErr) {}
      }

      // Nếu là Ủy quyền, tạo thông báo cho Giáo viên được ủy quyền
      if (responseType === "DELEGATE_TEACHER" && delegatedTeacherId) {
        try {
          // Check if teacher has userId
          const tRec = await (prisma as any).teacher.findUnique({
            where: { id: delegatedTeacherId },
            include: { user: true }
          });
          const targetUId = tRec?.userId || tRec?.user?.id;
          if (targetUId) {
            await (prisma as any).notification.create({
              data: {
                userId: targetUId,
                title: `[Ủy quyền GĐCS] Phân công đồng hành HS ${student.fullName}`,
                message: `${currentDirectorName} đã ủy quyền Thầy/Cô đồng hành hỗ trợ tâm lý & thích ứng cho HS ${student.fullName} (Khối ${student.grade || '1'}). ${delegationNote ? `Nhiệm vụ: "${delegationNote}"` : ""}`,
                link: `/teacher/input-assessments?periodId=${student.periodId}&studentCode=${encodeURIComponent(student.studentCode)}&autoOpen=true`,
                type: "TASK",
                category: "ASSESSMENT",
                priority: "HIGH",
                sourceModule: "ORIENTATION_PSYCHOLOGY",
                sourceId: student.id
              }
            });
          }
        } catch (nErr2) {}
      }

      // Gửi Email xác nhận phản hồi chỉ đạo đến GV Tâm lý + CC Ban KT&ĐBCL + Giáo vụ cơ sở
      let emailSuccess = false;
      const reporterEmail = currentPsychData.reportedToGdcs?.reporterEmail || orientationRecord?.interviewerId || "";
      const campusCodeNorm = student.admissionCampus || "";
      const giaovuEmail = currentPsychData.reportedToGdcs?.giaovuEmail || getCampusGiaovuEmail(campusCodeNorm);
      const ccList = Array.from(new Set(["ktdbcl@skylineschool.edu.vn", giaovuEmail, currentDirectorEmail].filter(Boolean)));

      try {
        const confirmEmailHtml = `
          <!DOCTYPE html>
          <html lang="vi">
          <head><meta charset="utf-8"><title>[Sky-line SSM] Ý kiến chỉ đạo của GĐCS - HS ${student.fullName}</title></head>
          <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9">
              <tr>
                <td align="center" style="padding: 24px 12px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08);">
                    <tr>
                      <td height="4" bgcolor="#00A19A" style="background-color: #00A19A; font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>
                    <tr>
                      <td bgcolor="#003B3A" style="background-color: #003B3A; color: #ffffff; padding: 22px 26px;">
                        <span style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #a7f3d0;">HỆ THỐNG GIÁO DỤC SKY-LINE &bull; BAN KHẢO THÍ &amp; ĐBCL</span>
                        <h2 style="margin: 8px 0 4px 0; font-size: 18px; font-weight: 800; color: #ffffff;">Ý KIẾN CHỈ ĐẠO CỦA GIÁM ĐỐC CƠ SỞ (GĐCS)</h2>
                        <div style="font-size: 12px; color: #e2e8f0;">Khảo sát &amp; Định hướng Học sinh Đầu vào &bull; HS ${student.fullName} (Khối ${student.grade || '1'})</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 22px 26px; color: #1e293b; font-size: 13px; line-height: 1.6;">
                        <p style="margin: 0 0 12px 0;">Kính gửi Quý Thầy/Cô và các bộ phận chuyên môn liên quan,</p>
                        <p style="margin: 0 0 14px 0;">Giám Đốc Cơ Sở (<strong>${currentDirectorName}</strong>) đã xem xét kết quả đánh giá tâm lý của học sinh <strong>${student.fullName}</strong> và ban hành ý kiến chỉ đạo xử lý tiếp nhận như sau:</p>

                        <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-left: 4px solid #00a19a; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px;">
                          <div style="font-size: 11px; font-weight: 800; color: #007a87; text-transform: uppercase; margin-bottom: 4px;">PHƯƠNG ÁN CHỈ ĐẠO CHÍNH THỨC:</div>
                          <div style="font-size: 15px; font-weight: 800; color: #003b3a; margin-bottom: 8px;">${chosenTitle}</div>
                          ${responseType === "DIRECT_PARENT_MEETING" ? `
                            <div style="font-size: 12px; color: #334155; line-height: 1.5;">
                              • <strong>Thời gian hẹn gặp:</strong> ${meetingTime || 'Chưa ấn định'}<br/>
                              • <strong>Địa điểm:</strong> ${meetingLocation || 'Phòng Giám đốc Cơ sở'}<br/>
                              • <strong>Nội dung trao đổi với PHHS:</strong> ${parentMeetingContent || 'Trao đổi kế hoạch phối hợp giáo dục & cam kết đồng hành'}
                            </div>
                          ` : ''}
                          ${responseType === "SCHEDULE_MEETING" ? `
                            <div style="font-size: 12px; color: #334155; line-height: 1.5;">
                              • <strong>Thời gian làm việc:</strong> ${meetingTime || 'Chưa ấn định'}<br/>
                              • <strong>Địa điểm:</strong> ${meetingLocation || 'Văn phòng chuyên môn'}<br/>
                              • <strong>Thành phần tham gia:</strong> ${meetingParticipants || 'GĐCS, GV Tâm lý, GVCN, Tổ chuyên môn'}<br/>
                              • <strong>Nội dung hội chẩn:</strong> ${meetingAgenda || 'Đánh giá mức độ thích ứng và giải pháp can thiệp'}
                            </div>
                          ` : ''}
                          ${responseType === "DELEGATE_TEACHER" ? `
                            <div style="font-size: 12px; color: #334155; line-height: 1.5;">
                              • <strong>Giáo viên được ủy quyền:</strong> <strong>${delegatedTeacherName || 'Giáo viên phụ trách'}</strong><br/>
                              • <strong>Thời hạn ủy quyền:</strong> ${delegationDuration || '4 tuần đầu năm học'}<br/>
                              • <strong>Nhiệm vụ đồng hành:</strong> ${delegationNote || 'Theo dõi hành vi, hỗ trợ thích nghi và báo cáo định kỳ'}
                            </div>
                          ` : ''}
                        </div>

                        ${generalDirectiveNote ? `
                          <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 10px; padding: 12px 14px; margin-bottom: 16px;">
                            <strong style="font-size: 11px; text-transform: uppercase; color: #92400e; display: block; margin-bottom: 4px;">Ghi chú &amp; Chỉ đạo chung của GĐCS:</strong>
                            <div style="font-style: italic; color: #78350f;">&quot;${generalDirectiveNote}&quot;</div>
                          </div>
                        ` : ''}

                        <p style="margin: 0; font-size: 12px; color: #64748b;">
                          Đề nghị Ban KT&amp;ĐBCL, Giáo vụ Cơ sở và Giáo viên chuyên trách cập nhật thông tin và triển khai thực hiện theo đúng kế hoạch.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #003b3a; color: rgba(255,255,255,0.7); padding: 16px 26px; text-align: center; font-size: 11px;">
                        HỆ THỐNG GIÁO DỤC SKY-LINE • BAN KT&amp;ĐBCL<br/>
                        Email gửi tự động từ Hệ thống Quản trị Khảo sát &amp; Định hướng Đầu vào (Sky-Line SSM)
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        // Gửi email nếu có người nhận hợp lệ
        const targetTo = reporterEmail || currentDirectorEmail || "ktdbcl@skylineschool.edu.vn";
        await sendEmail({
          to: targetTo,
          cc: ccList,
          subject: `[Sky-line SSM] Ý kiến chỉ đạo của GĐCS - HS ${student.fullName} (${chosenTitle})`,
          html: confirmEmailHtml
        });
        emailSuccess = true;
      } catch (emErr) {
        console.error("Lỗi gửi email xác nhận chỉ đạo GĐCS:", emErr);
      }

      return NextResponse.json({
        success: true,
        message: `Đã ghi nhận ý kiến chỉ đạo của GĐCS (${chosenTitle}) thành công!`,
        emailSuccess,
        data: gdcsResponseObj
      });
    }

    // NHÁNH C-DELEGATION-EMAIL: GĐCS GỬI EMAIL ỦY QUYỀN CHO GIÁO VIÊN ĐỒNG HÀNH
    if (body.action === "sendDelegationEmail") {
      const {
        studentId,
        teacherId,
        teacherName,
        teacherEmail,
        delegationDuration = "4 tuần đầu năm học",
        delegationNote = "",
        parentRepresentative = "",
        parentPhone = "",
        directorName = "",
        directorEmail = ""
      } = body;

      if (!studentId || (!teacherEmail && !teacherId)) {
        return NextResponse.json({ success: false, error: "Thiếu studentId hoặc thông tin Giáo viên được ủy quyền." }, { status: 400 });
      }

      const student = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId },
        include: { period: true, batch: true }
      });

      if (!student) {
        return NextResponse.json({ success: false, error: "Không tìm thấy thông tin học sinh." }, { status: 404 });
      }

      const orientationRecord = await getStudentOrientationRecord(studentId);
      const curDirectorName = directorName || session.user?.name || (session.user as any)?.fullName || "Giám Đốc Cơ Sở";
      const curDirectorEmail = directorEmail || session.user?.email || "";
      const campusCodeNorm = student.admissionCampus || "";
      const giaovuEmail = getCampusGiaovuEmail(campusCodeNorm);
      const resolvedParentRep = parentRepresentative || orientationRecord?.parentRepresentativeName || "Phụ huynh học sinh";
      const resolvedParentPhone = parentPhone || orientationRecord?.parentPhone || "Đang cập nhật";

      let resolvedTeacherEmail = teacherEmail;
      let targetUserId = teacherId;
      if (!resolvedTeacherEmail && teacherId) {
        try {
          const u = await (prisma as any).user.findFirst({
            where: { id: teacherId },
            include: { teacher: true }
          });
          if (u) {
            resolvedTeacherEmail = u.teacher?.email || u.email || "";
          }
        } catch (e) {}
      }

      if (!resolvedTeacherEmail) {
        return NextResponse.json({ success: false, error: "Không tìm thấy địa chỉ email của Giáo viên được ủy quyền." }, { status: 400 });
      }

      let currentConsultantNote: any = {};
      try {
        if (orientationRecord?.admissionConsultantNote && orientationRecord.admissionConsultantNote.trim().startsWith("{")) {
          currentConsultantNote = JSON.parse(orientationRecord.admissionConsultantNote);
        }
      } catch (e) {}

      currentConsultantNote.delegateTeacher = true;
      currentConsultantNote.delegatedTeacherId = teacherId || "";
      currentConsultantNote.delegatedTeacherName = teacherName || "";
      currentConsultantNote.delegatedTeacherEmail = resolvedTeacherEmail;
      currentConsultantNote.delegationDuration = delegationDuration;
      currentConsultantNote.delegationNote = delegationNote;
      currentConsultantNote.delegatedAt = new Date().toISOString();
      currentConsultantNote.delegatedBy = curDirectorName;

      await upsertStudentOrientationRecord({
        studentId,
        parentRepresentativeName: resolvedParentRep,
        parentPhone: resolvedParentPhone,
        admissionConsultantNote: JSON.stringify(currentConsultantNote)
      });

      // Tạo thông báo chuông cho Giáo viên
      if (targetUserId) {
        try {
          await (prisma as any).notification.create({
            data: {
              userId: targetUserId,
              title: `[Ủy quyền GĐCS] Đồng hành & Phối hợp PHHS ${student.fullName}`,
              message: `${curDirectorName} đã ủy quyền Thầy/Cô trực tiếp làm việc, trao đổi với PHHS ${student.fullName} (Khối ${student.grade || '1'}). Nhiệm vụ: "${delegationNote || 'Trao đổi định hướng & phối hợp giáo dục'}"`,
              link: `/teacher/orientation/delegation-feedback?studentId=${student.id}`,
              type: "TASK",
              category: "ASSESSMENT",
              priority: "HIGH",
              sourceModule: "ORIENTATION_DELEGATION",
              sourceId: student.id
            }
          });
        } catch (nErr) {}
      }

      const baseUrl = process.env.NEXTAUTH_URL || "https://ssm.skylineschool.edu.vn";
      const feedbackUrl = `${baseUrl}/teacher/orientation/delegation-feedback?studentId=${student.id}`;
      const ccList = Array.from(new Set(["ktdbcl@skylineschool.edu.vn", giaovuEmail, curDirectorEmail].filter(Boolean)));

      const delegationEmailHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>[Sky-line SMS] Thư ủy quyền đồng hành & Phối hợp PHHS - ${student.fullName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08);">
          <tr>
            <td height="5" style="background-color: #00A19A; line-height: 5px; font-size: 5px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 24px 28px; background-color: #003B3A; color: #ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <div style="font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #5eead4; margin-bottom: 4px;">
                      HỆ THỐNG GIÁO DỤC SKY-LINE • BAN GIÁM ĐỐC CƠ SỞ
                    </div>
                    <h1 style="margin: 0; font-size: 19px; font-weight: 800; line-height: 1.35; color: #ffffff;">
                      THƯ ỦY QUYỀN ĐỒNG HÀNH & PHỐI HỢP PHỤ HUYNH
                    </h1>
                    <div style="font-size: 12.5px; color: #ccfbf1; margin-top: 6px;">
                      Kính gửi Thầy/Cô: <strong style="color: #ffffff;">${teacherName || "Giáo viên"}</strong>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 28px; background-color: #ffffff; color: #1e293b; font-size: 13.5px; line-height: 1.6;">
              <p style="margin: 0 0 16px 0;">
                Kính gửi <strong>Thầy/Cô ${teacherName || "Giáo viên"}</strong>,<br/>
                Ban Giám Đốc Cơ Sở (GĐCS <strong>${curDirectorName}</strong>) trân trọng thông báo quyết định <strong>Ủy quyền Thầy/Cô phụ trách đồng hành và làm việc trực tiếp với Phụ huynh học sinh</strong> đối với trường hợp khảo sát tiếp nhận đầu vào dưới đây:
              </p>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
                <tr>
                  <td colspan="2" style="padding: 10px 14px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #003B3A; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                    📋 Thông tin học sinh khảo sát đầu vào
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #64748b; width: 38%; border-bottom: 1px dashed #e2e8f0;">Họ và tên học sinh:</td>
                  <td style="padding: 8px 14px; font-size: 13px; font-weight: 700; color: #003B3A; border-bottom: 1px dashed #e2e8f0;">${student.fullName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #64748b; border-bottom: 1px dashed #e2e8f0;">Mã hồ sơ / Khối:</td>
                  <td style="padding: 8px 14px; font-size: 12.5px; font-family: monospace; font-weight: 600; color: #334155; border-bottom: 1px dashed #e2e8f0;">${student.studentCode} • Khối ${student.grade || '1'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #64748b; border-bottom: 1px dashed #e2e8f0;">Cơ sở tiếp nhận:</td>
                  <td style="padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: #003B3A; border-bottom: 1px dashed #e2e8f0;">${student.admissionCampus || "Cơ sở Sky-Line"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #64748b;">Hệ đào tạo khảo sát:</td>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #334155;">${student.surveyFormType || student.surveySystem || "Chất lượng cao (CLC)"}</td>
                </tr>
              </table>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ecfdf5; border-radius: 10px; border: 1px solid #a7f3d0; margin-bottom: 16px;">
                <tr>
                  <td colspan="2" style="padding: 10px 14px; background-color: #d1fae5; border-bottom: 1px solid #a7f3d0; font-weight: 700; color: #065f46; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                    📞 Thông tin liên hệ Phụ huynh học sinh (PHHS)
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #047857; width: 38%; border-bottom: 1px dashed #a7f3d0;">Người đại diện PHHS:</td>
                  <td style="padding: 8px 14px; font-size: 13px; font-weight: 700; color: #065f46; border-bottom: 1px dashed #a7f3d0;">${resolvedParentRep}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #047857;">Số điện thoại liên hệ:</td>
                  <td style="padding: 8px 14px; font-size: 14px; font-weight: 800; color: #003B3A; font-family: monospace;">${resolvedParentPhone}</td>
                </tr>
              </table>

              <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px; margin-bottom: 22px;">
                <div style="font-size: 12px; font-weight: 700; color: #92400e; text-transform: uppercase; margin-bottom: 6px;">
                  🎯 Nhiệm vụ ủy quyền từ Ban Giám Đốc Cơ Sở
                </div>
                <div style="font-size: 12.5px; color: #78350f; margin-bottom: 6px;">
                  • <strong>Thời hạn ủy quyền:</strong> ${delegationDuration}
                </div>
                <div style="font-size: 13px; color: #451a03; line-height: 1.5; background-color: #ffffff; padding: 10px 12px; border-radius: 6px; border: 1px solid #fef3c7;">
                  &quot;${delegationNote || "Thầy/Cô chủ động liên hệ PHHS, trao đổi cởi mở về kết quả khảo sát, thống nhất kế hoạch đồng hành và nề nếp thích ứng cho học sinh trong giai đoạn đầu nhập học."}&quot;
                </div>
              </div>

              <!-- BULLETPROOF BUTTON CTA CHO OUTLOOK VÀ MỌI EMAIL CLIENT -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 24px auto 14px auto;">
                <tr>
                  <td align="center" bgcolor="#003B3A" style="background-color: #003B3A; border-radius: 8px; padding: 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${feedbackUrl}" style="height:46px;v-text-anchor:middle;width:360px;" arcsize="14%" stroke="f" fillcolor="#003B3A">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:13.5px;font-weight:bold;">
                        MỞ FORM NHẬP KẾT QUẢ TRAO ĐỔI PHHS &rarr;
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <a href="${feedbackUrl}" target="_blank" style="mso-hide:all; display: inline-block; padding: 13px 28px; font-size: 13.5px; font-weight: 700; color: #ffffff !important; text-decoration: none; border-radius: 8px; background-color: #003B3A; border: 1px solid #003B3A; letter-spacing: 0.3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                      <span style="color: #ffffff !important; font-weight: 700;">MỞ FORM NHẬP KẾT QUẢ TRAO ĐỔI PHHS &rarr;</span>
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 11.5px; color: #64748b; text-align: center;">
                Sau khi hoàn tất trao đổi với Phụ huynh, Thầy/Cô vui lòng cập nhật kết quả vào biểu mẫu trên hệ thống để Ban Giám Đốc Cơ Sở và Ban KT&ĐBCL theo dõi tiến độ.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11.5px; color: #64748b;">
              Email thông báo từ <strong>Hệ thống Quản lý Khảo sát & Định hướng Học sinh Đầu vào — Sky-Line SSM</strong><br/>
              Người phê duyệt ủy quyền: <strong>${curDirectorName}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      let emailSuccess = false;
      try {
        const sendRes = await sendEmail({
          to: resolvedTeacherEmail,
          cc: ccList,
          subject: `[Sky-line SMS] Thư ủy quyền đồng hành & Phối hợp PHHS - HS ${student.fullName}`,
          html: delegationEmailHtml
        });
        emailSuccess = Boolean(sendRes && (sendRes as any).success !== false);
      } catch (mErr) {
        console.error("sendDelegationEmail error:", mErr);
      }

      return NextResponse.json({
        success: true,
        message: emailSuccess
          ? `Đã gửi Email ủy quyền thành công đến GV ${teacherName} (${resolvedTeacherEmail})!`
          : `Đã lưu thông tin ủy quyền cho GV ${teacherName}. (Email đang chờ xử lý)`,
        emailSuccess,
        teacherEmail: resolvedTeacherEmail
      });
    }

    // NHÁNH D-MEETING-EMAIL: GĐCS GỬI EMAIL THÔNG BÁO LỊCH LÀM VIỆC / HỘI CHẨN CHO BAN TƯ VẤN & GIÁO VỤ CƠ SỞ
    if (body.action === "sendMeetingScheduleEmail") {
      const {
        studentId,
        meetingTime = "",
        meetingLocation = "",
        meetingParticipants = "",
        meetingAgenda = "",
        directorName = "",
        directorEmail = ""
      } = body;

      if (!studentId || !meetingTime) {
        return NextResponse.json({ success: false, error: "Thiếu studentId hoặc thời gian làm việc." }, { status: 400 });
      }

      const student = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId },
        include: { period: true, batch: true }
      });

      if (!student) {
        return NextResponse.json({ success: false, error: "Không tìm thấy thông tin học sinh." }, { status: 404 });
      }

      const orientationRecord = await getStudentOrientationRecord(studentId);
      const curDirectorName = directorName || session.user?.name || (session.user as any)?.fullName || "Giám Đốc Cơ Sở";
      const curDirectorEmail = directorEmail || session.user?.email || "";
      const campusCodeNorm = student.admissionCampus || "";
      const giaovuEmail = getCampusGiaovuEmail(campusCodeNorm);
      const tuyensinhEmail = getCampusTuyensinhEmail(campusCodeNorm);

      let currentConsultantNote: any = {};
      try {
        if (orientationRecord?.admissionConsultantNote && orientationRecord.admissionConsultantNote.trim().startsWith("{")) {
          currentConsultantNote = JSON.parse(orientationRecord.admissionConsultantNote);
        }
      } catch (e) {}

      currentConsultantNote.scheduleMeeting = true;
      currentConsultantNote.meetingTime = meetingTime;
      currentConsultantNote.meetingLocation = meetingLocation;
      currentConsultantNote.meetingParticipants = meetingParticipants;
      currentConsultantNote.meetingAgenda = meetingAgenda;
      currentConsultantNote.meetingScheduledAt = new Date().toISOString();
      currentConsultantNote.meetingScheduledBy = curDirectorName;

      await upsertStudentOrientationRecord({
        studentId,
        admissionConsultantNote: JSON.stringify(currentConsultantNote)
      });

      const baseUrl = process.env.NEXTAUTH_URL || "https://ssm.skylineschool.edu.vn";
      const studentUrl = `${baseUrl}/admin/xet-duyet-ket-qua?tab=ks17&studentId=${student.id}`;
      const toRecipients = Array.from(new Set([tuyensinhEmail, giaovuEmail].filter(Boolean)));
      const ccList = Array.from(new Set(["ktdbcl@skylineschool.edu.vn", curDirectorEmail].filter(Boolean)));

      const meetingEmailHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>[Sky-line SMS] Thông báo lịch làm việc & Hội chẩn chuyên môn - HS ${student.fullName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08);">
          <tr>
            <td height="5" style="background-color: #00A19A; line-height: 5px; font-size: 5px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 24px 28px; background-color: #003B3A; color: #ffffff;">
              <div style="font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #5eead4; margin-bottom: 4px;">
                HỆ THỐNG GIÁO DỤC SKY-LINE • BAN GIÁM ĐỐC CƠ SỞ
              </div>
              <h1 style="margin: 0; font-size: 19px; font-weight: 800; line-height: 1.35; color: #ffffff;">
                THÔNG BÁO LỊCH LÀM VIỆC / HỘI CHẨN CHUYÊN MÔN
              </h1>
              <div style="font-size: 12.5px; color: #ccfbf1; margin-top: 6px;">
                Kính gửi: <strong>Ban Tư Vấn Tuyển Sinh & Bộ Phận Giáo Vụ Cơ Sở</strong>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 28px; background-color: #ffffff; color: #1e293b; font-size: 13.5px; line-height: 1.6;">
              <p style="margin: 0 0 16px 0;">
                Kính gửi <strong>Ban Tư Vấn Tuyển Sinh & Bộ Phận Giáo Vụ Cơ Sở</strong>,<br/>
                Ban Giám Đốc Cơ Sở (GĐCS <strong>${curDirectorName}</strong>) trân trọng thông báo lịch tổ chức buổi <strong>Làm việc & Hội chẩn chuyên môn tiếp nhận</strong> đối với học sinh:
              </p>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdfa; border-radius: 10px; border: 1px solid #99f6e4; margin-bottom: 16px;">
                <tr>
                  <td colspan="2" style="padding: 10px 14px; background-color: #ccfbf1; border-bottom: 1px solid #99f6e4; font-weight: 700; color: #0f766e; font-size: 12px; text-transform: uppercase;">
                    📅 Thông tin chi tiết buổi làm việc
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #0f766e; width: 35%; border-bottom: 1px dashed #99f6e4;">Thời gian làm việc:</td>
                  <td style="padding: 8px 14px; font-size: 13.5px; font-weight: 800; color: #003B3A; border-bottom: 1px dashed #99f6e4;">${meetingTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #0f766e; border-bottom: 1px dashed #99f6e4;">Địa điểm:</td>
                  <td style="padding: 8px 14px; font-size: 13px; font-weight: 700; color: #134e4a; border-bottom: 1px dashed #99f6e4;">${meetingLocation || "Phòng Hội đồng Chuyên môn Cơ sở"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #0f766e; border-bottom: 1px dashed #99f6e4;">Thành phần tham gia:</td>
                  <td style="padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: #003B3A; border-bottom: 1px dashed #99f6e4;">${meetingParticipants || "GĐCS, Ban KT&ĐBCL, Ban Tư vấn Tuyển sinh, Giáo vụ cơ sở, GV Tâm lý"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #0f766e;">Nội dung & Mục tiêu:</td>
                  <td style="padding: 8px 14px; font-size: 12.5px; color: #1e293b;">${meetingAgenda || "Hội chẩn kết quả khảo sát đầu vào, định hướng tiếp nhận và thỏa thuận kế hoạch đồng hành cùng học sinh."}</td>
                </tr>
              </table>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 22px;">
                <tr>
                  <td colspan="2" style="padding: 10px 14px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #003B3A; font-size: 12px; text-transform: uppercase;">
                    👤 Tóm tắt hồ sơ học sinh
                  </td>
                </tr>
                <tr>
                  <td style="padding: 7px 14px; font-size: 12.5px; color: #64748b; width: 35%; border-bottom: 1px dashed #e2e8f0;">Họ tên / Mã HS:</td>
                  <td style="padding: 7px 14px; font-size: 13px; font-weight: 700; color: #003B3A; border-bottom: 1px dashed #e2e8f0;">${student.fullName} (${student.studentCode})</td>
                </tr>
                <tr>
                  <td style="padding: 7px 14px; font-size: 12.5px; color: #64748b; border-bottom: 1px dashed #e2e8f0;">Khối / Cơ sở:</td>
                  <td style="padding: 7px 14px; font-size: 12.5px; color: #334155; border-bottom: 1px dashed #e2e8f0;">Khối ${student.grade || '1'} • ${student.admissionCampus || "Cơ sở Sky-Line"}</td>
                </tr>
                <tr>
                  <td style="padding: 7px 14px; font-size: 12.5px; color: #64748b;">Đại diện PHHS & SĐT:</td>
                  <td style="padding: 7px 14px; font-size: 12.5px; font-weight: 600; color: #003B3A;">${orientationRecord?.parentRepresentativeName || "Phụ huynh"} • ${orientationRecord?.parentPhone || "Đang cập nhật"}</td>
                </tr>
              </table>

              <!-- CTA BUTTON CHO OUTLOOK VÀ MỌI EMAIL CLIENT -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 24px auto 14px auto;">
                <tr>
                  <td align="center" bgcolor="#003B3A" style="background-color: #003B3A; border-radius: 8px; padding: 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${studentUrl}" style="height:46px;v-text-anchor:middle;width:360px;" arcsize="14%" stroke="f" fillcolor="#003B3A">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:13.5px;font-weight:bold;">
                        XEM PHIẾU ĐỊNH HƯỚNG CỦA HỌC SINH
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <a href="${studentUrl}" target="_blank" style="mso-hide:all; display: inline-block; padding: 13px 28px; font-size: 13.5px; font-weight: 700; color: #ffffff !important; text-decoration: none; border-radius: 8px; background-color: #003B3A; border: 1px solid #003B3A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                      <span style="color: #ffffff !important; font-weight: 700;">XEM PHIẾU ĐỊNH HƯỚNG CỦA HỌC SINH &rarr;</span>
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 11.5px; color: #64748b; text-align: center;">
                Kính đề nghị các bộ phận liên quan sắp xếp tham gia đúng giờ để buổi hội chẩn đạt kết quả tốt nhất.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11.5px; color: #64748b;">
              Email thông báo tự động từ <strong>Hệ thống Quản lý Khảo sát & Định hướng — Sky-Line SSM</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      let emailSuccess = false;
      try {
        const sendRes = await sendEmail({
          to: toRecipients,
          cc: ccList,
          subject: `[Sky-line SMS] Thông báo lịch làm việc & Hội chẩn chuyên môn tiếp nhận - HS ${student.fullName}`,
          html: meetingEmailHtml
        });
        emailSuccess = Boolean(sendRes && (sendRes as any).success !== false);
      } catch (mErr) {
        console.error("sendMeetingScheduleEmail error:", mErr);
      }

      return NextResponse.json({
        success: true,
        message: emailSuccess
          ? `Đã gửi Email thông báo lịch làm việc thành công đến Ban Tư vấn & Giáo vụ (${toRecipients.join(", ")})!`
          : `Đã lưu lịch làm việc thành công. (Email đang chờ xử lý)`,
        emailSuccess
      });
    }

    // NHÁNH E-FEEDBACK: GIÁO VIÊN ĐƯỢC ỦY QUYỀN (HOẶC GĐCS) NHẬP KẾT QUẢ TRAO ĐỔI VỚI PHHS
    if (body.action === "saveDelegationFeedback") {
      const {
        studentId,
        feedbackDate = new Date().toISOString(),
        meetingType = "DIRECT",
        parentRepresentative = "",
        parentPhone = "",
        agreementContent = "",
        parentConsentLevel = "HIGH",
        followUpPlan = "",
        additionalNote = "",
        reporterName = ""
      } = body;

      if (!studentId || !agreementContent) {
        return NextResponse.json({ success: false, error: "Thiếu studentId hoặc nội dung cam kết thỏa thuận với PHHS." }, { status: 400 });
      }

      const student = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId }
      });

      if (!student) {
        return NextResponse.json({ success: false, error: "Không tìm thấy thông tin học sinh." }, { status: 404 });
      }

      const orientationRecord = await getStudentOrientationRecord(studentId);
      const curUserName = reporterName || session.user?.name || (session.user as any)?.fullName || "Giáo viên ủy quyền";

      let currentConsultantNote: any = {};
      try {
        if (orientationRecord?.admissionConsultantNote && orientationRecord.admissionConsultantNote.trim().startsWith("{")) {
          currentConsultantNote = JSON.parse(orientationRecord.admissionConsultantNote);
        }
      } catch (e) {}

      const feedbackObj = {
        feedbackDate,
        meetingType,
        parentRepresentative: parentRepresentative || orientationRecord?.parentRepresentativeName || "",
        parentPhone: parentPhone || orientationRecord?.parentPhone || "",
        agreementContent,
        parentConsentLevel,
        followUpPlan,
        additionalNote,
        updatedAt: new Date().toISOString(),
        updatedBy: curUserName
      };

      currentConsultantNote.delegationFeedback = feedbackObj;

      let currentPsychData: any = {};
      try {
        if (orientationRecord?.psychologyData) {
          currentPsychData = typeof orientationRecord.psychologyData === "string"
            ? JSON.parse(orientationRecord.psychologyData)
            : orientationRecord.psychologyData;
          if (!currentPsychData.gdcsResponse) currentPsychData.gdcsResponse = {};
          currentPsychData.gdcsResponse.delegationFeedback = feedbackObj;
        }
      } catch (e) {}

      await upsertStudentOrientationRecord({
        studentId,
        parentRepresentativeName: feedbackObj.parentRepresentative || undefined,
        parentPhone: feedbackObj.parentPhone || undefined,
        admissionConsultantNote: JSON.stringify(currentConsultantNote),
        psychologyData: Object.keys(currentPsychData).length > 0 ? JSON.stringify(currentPsychData) : undefined
      });

      return NextResponse.json({
        success: true,
        message: "Đã lưu kết quả trao đổi và cam kết với PHHS thành công!",
        data: feedbackObj
      });
    }

    // NHÁNH B: ĐỀ XUẤT KHẢO SÁT TÂM LÝ TỪ HỘI ĐỒNG TUYỂN SINH CHO GV TÂM LÝ
    const { studentId, reason, teacherId, teacherName, notifyEmail = true } = body;

    if (!studentId || !reason) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập lý do/dấu hiệu đề xuất khảo sát tâm lý." }, { status: 400 });
    }

    // 1. Lấy thông tin học sinh & bản ghi định hướng
    const student = await (prisma as any).inputAssessmentStudent.findUnique({
      where: { id: studentId },
      include: {
        period: true,
        batch: true
      }
    });

    if (!student) {
      return NextResponse.json({ success: false, error: "Không tìm thấy học sinh" }, { status: 404 });
    }

    const record = await getStudentOrientationRecord(studentId);

    // Đồng bộ phân công khảo sát môn Tâm lý & thông báo hệ thống cho GV Tâm lý được chọn
    const syncRefResult = await ensurePsychTeacherSurveyAssignment({
      student,
      teacherId,
      teacherName,
      actorName,
      reason,
      createNotification: true
    });

    // 2. Cập nhật trạng thái chuyển tiếp trong StudentOrientationRecord
    const updatedRecord = await upsertStudentOrientationRecord({
      studentId,
      psychologyReferralStatus: "REQUESTED",
      psychologyReferralReason: reason,
      psychologyTeacherId: syncRefResult.assignedUserId || teacherId || null,
      psychologyTeacherName: syncRefResult.resolvedTeacherName || teacherName || null
    });

    // 3. Gửi email thông báo cho GV Tâm lý nếu có
    let emailSent = false;
    let targetTeacherEmail = "";

    if (body.teacherEmail) {
      targetTeacherEmail = String(body.teacherEmail).trim();
    }

    if (!targetTeacherEmail && teacherId) {
      const teacherUser = await (prisma as any).user.findUnique({
        where: { id: teacherId },
        include: { teacher: true }
      });
      if (teacherUser) {
        targetTeacherEmail = (teacherUser?.teacher?.email || teacherUser?.email || "").trim();
      } else {
        const teacherRec = await (prisma as any).teacher.findUnique({
          where: { id: teacherId },
          include: { user: true }
        });
        if (teacherRec) {
          targetTeacherEmail = (teacherRec.email || teacherRec.user?.email || "").trim();
        }
      }
    }

    if (targetTeacherEmail) {
      if (targetTeacherEmail.includes("0201000094") || targetTeacherEmail.includes("thongpn") || teacherName?.includes("Phạm Nguyên Thông")) {
        targetTeacherEmail = "thongpn@skylineschool.edu.vn";
      } else if (!targetTeacherEmail.includes("@")) {
        targetTeacherEmail = `${targetTeacherEmail}@skylineschool.edu.vn`;
      }
    }


    // Lấy bộ câu hỏi Tâm lý theo khối để đưa vào email
    const rawGrade = String(student.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim();
    const currentGrade = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].includes(rawGrade) ? rawGrade : "default";
    const psychSections = questionsData[currentGrade] || defaultQuestions;

    const host = req.headers.get("host") || "skyline-survey.vercel.app";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;
    const directAssessmentLink = `${baseUrl}/teacher/input-assessments?periodId=${student.periodId}&batchId=${student.batchId || ""}&studentCode=${encodeURIComponent(student.studentCode)}&autoOpen=true`;

    if (notifyEmail && targetTeacherEmail && targetTeacherEmail.includes("@")) {
      const psychSectionsHtml = psychSections.map((sec: any, sIdx: number) => {
        const qListHtml = sec.questions.slice(0, 3).map((q: any) => `<li style="margin-bottom: 4px; color: #475569; font-size: 11.5px;">${q.text}</li>`).join("");
        return `
          <div style="margin-bottom: 10px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px;">
            <div style="font-size: 12px; font-weight: 800; color: #4338CA; margin-bottom: 6px;">${sec.title}</div>
            <ul style="margin: 0; padding-left: 18px;">
              ${qListHtml}
            </ul>
          </div>
        `;
      }).join("");

      const emailHtml = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="utf-8">
          <title>[Sky-line SMS] Chuyển tiếp Khảo sát Tâm lý Học sinh: ${student.fullName}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F1F5F9">
            <tr>
              <td align="center" style="padding: 24px 10px;">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 660px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(67, 56, 202, 0.08); border: 1px solid #E2E8F0;">
                  
                  <!-- HEADER BANNER -->
                  <tr>
                    <td bgcolor="#4338CA" style="padding: 24px 20px; text-align: center; background: linear-gradient(135deg, #312E81 0%, #4338CA 60%, #6366F1 100%);">
                      <span style="display: inline-block; padding: 3px 12px; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; font-size: 10.5px; font-weight: 700; color: #FFFFFF; text-transform: uppercase;">
                        🧠 PHÂN HỆ TÂM LÝ HỌC ĐƯỜNG • SKY-LINE
                      </span>
                      <h1 style="margin: 8px 0 2px 0; font-size: 19px; font-weight: 800; color: #FFFFFF; text-transform: uppercase;">
                        THÔNG BÁO CHUYỂN TIẾP KHẢO SÁT TÂM LÝ
                      </h1>
                      <div style="font-size: 12px; color: #E0E7FF; font-weight: 600;">
                        Tiếp nhận hồ sơ học sinh cần hỗ trợ & đánh giá tâm lý chuyên sâu
                      </div>
                    </td>
                  </tr>

                  <!-- BODY -->
                  <tr>
                    <td style="padding: 22px 24px; color: #1E293B;">
                      <p style="margin: 0 0 12px 0; font-size: 14.5px; font-weight: 700; color: #312E81;">
                        Kính gửi Thầy/Cô ${teacherName || "Chuyên viên Tâm lý"},
                      </p>
                      <p style="margin: 0 0 16px 0; font-size: 13px; color: #475569; line-height: 1.6;">
                        Trong quá trình thực hiện <strong>Phiếu định hướng đầu vào</strong>, Giáo viên tiếp nhận nhận thấy học sinh có một số biểu hiện tâm lý cần được chuyên viên tâm lý hỗ trợ và đánh giá chuyên biệt. Dưới đây là thông tin chi tiết:
                      </p>

                      <!-- STUDENT CARD -->
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #EEF2FF; border-radius: 12px; border: 1px solid #C7D2FE; border-left: 4px solid #4F46E5; padding: 14px 16px; margin-bottom: 18px;">
                        <tr>
                          <td style="padding: 3px 0; width: 35%; font-size: 11px; font-weight: 800; color: #4338CA; text-transform: uppercase;">HỌC SINH:</td>
                          <td style="padding: 3px 0; font-size: 14px; font-weight: 800; color: #1E1B4B;">${student.fullName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 3px 0; font-size: 11px; font-weight: 800; color: #4338CA; text-transform: uppercase;">MÃ HỌC SINH:</td>
                          <td style="padding: 3px 0; font-size: 12.5px; font-weight: 700; color: #312E81; font-family: monospace;">${student.studentCode}</td>
                        </tr>
                        <tr>
                          <td style="padding: 3px 0; font-size: 11px; font-weight: 800; color: #4338CA; text-transform: uppercase;">KHỐI & HỆ:</td>
                          <td style="padding: 3px 0; font-size: 12.5px; font-weight: 700; color: #4338CA;">Khối ${student.grade || "—"} • ${student.surveySystem || student.surveyFormType || "Tiêu chuẩn"}</td>
                        </tr>
                        <tr>
                          <td style="padding: 3px 0; font-size: 11px; font-weight: 800; color: #DC2626; text-transform: uppercase;">LÝ DO ĐỀ XUẤT:</td>
                          <td style="padding: 3px 0; font-size: 13px; font-weight: 700; color: #B91C1C; line-height: 1.5;">${reason}</td>
                        </tr>
                      </table>

                      <!-- ORIENTATION RESULTS SUMMARY -->
                      <div style="font-size: 12px; font-weight: 800; color: #312E81; text-transform: uppercase; margin-bottom: 8px;">
                        📋 KẾT QUẢ ĐỊNH HƯỚNG ĐẦU VÀO ĐÃ GHI NHẬN
                      </div>
                      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; font-size: 12px; margin-bottom: 18px; line-height: 1.6;">
                        <p style="margin: 0 0 6px 0;"><strong>• Điểm mạnh & Tiềm năng:</strong> ${record?.studentStrengths || "Chưa có ghi nhận"}</p>
                        <p style="margin: 0 0 6px 0;"><strong>• Nhu cầu cần hỗ trợ sớm:</strong> ${record?.studentNeedsSupport || "Chưa có ghi nhận"}</p>
                        <p style="margin: 0 0 6px 0;"><strong>• Nhận xét GV phỏng vấn:</strong> <em>${record?.interviewerGeneralRemark || "Chưa có ghi nhận"}</em></p>
                        <p style="margin: 0 0 6px 0;"><strong>• Nguyện vọng & Kỳ vọng PHHS:</strong> ${record?.parentExpectations || "Chưa có ghi nhận"}</p>
                        <p style="margin: 0 0 6px 0;"><strong>• Thói quen & Tính cách (từ PHHS):</strong> ${record?.parentPersonalityNotes || "Chưa có ghi nhận"}</p>
                        <p style="margin: 0;"><strong>• Đề xuất từ PHHS:</strong> ${record?.parentSpecialRequests || "Chưa có ghi nhận"}</p>
                      </div>

                      <!-- PSYCHOLOGY QUESTION SECTIONS -->
                      <div style="font-size: 12px; font-weight: 800; color: #312E81; text-transform: uppercase; margin-bottom: 8px;">
                        🧠 BỘ CÔNG CỤ ĐÁNH GIÁ TÂM LÝ THEO KHỐI (${student.grade ? `KHỐI ${student.grade}` : "MẪU CHUẨN"})
                      </div>
                      <div style="margin-bottom: 20px;">
                        ${psychSectionsHtml}
                      </div>

                      <!-- CTA BUTTON -->
                      <div style="text-align: center; padding: 10px 0 20px 0;">
                        <a href="${directAssessmentLink}" target="_blank" style="display: inline-block; padding: 13px 28px; background-color: #4F46E5; color: #FFFFFF; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);">
                          TRUY CẬP ĐÁNH GIÁ TÂM LÝ HỌC SINH &rarr;
                        </a>
                      </div>

                    </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                    <td bgcolor="#312E81" style="padding: 16px 20px; text-align: center; color: rgba(255, 255, 255, 0.7); font-size: 10.5px;">
                      Email gửi tự động từ Phân hệ Định hướng & Tư vấn Tâm lý Học đường Sky-Line.
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      try {
        const mailRes = await sendEmail({
          to: targetTeacherEmail,
          subject: `[Sky-line SMS] Chuyển tiếp Khảo sát Tâm lý Học sinh: ${student.fullName} (Khối ${student.grade})`,
          html: emailHtml,
          replyTo: "ktdbcl@skylineschool.edu.vn"
        });
        emailSent = !!mailRes?.success;
      } catch (mErr) {
        console.error("Lỗi gửi email cho GV Tâm lý:", mErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Đã đề xuất chuyển tiếp khảo sát tâm lý thành công!",
      data: {
        record: updatedRecord,
        teacherName: teacherName || null,
        targetEmail: targetTeacherEmail || null,
        emailSent
      }
    });
  } catch (error: any) {
    console.error("POST /api/admin/orientation/psychology-referral error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
