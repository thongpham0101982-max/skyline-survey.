import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  getStudentOrientationRecord,
  upsertStudentOrientationRecord,
  getAssignedOrientationTeacher
} from "@/lib/orientation/service";
import { canUserConfirmStage } from "@/lib/entrance-progress/constants";
import { executeEntranceWorkflowAction } from "@/lib/entrance-progress/entranceProgressEngine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ success: false, error: "Thiếu studentId" }, { status: 400 });
    }

    const session = await auth();
    const currentUser = session?.user as any;

    const record = await getStudentOrientationRecord(studentId);
    const assignedOrientation = await getAssignedOrientationTeacher(studentId, currentUser?.id);
    let studentInfo = record?.student || null;

    if (!studentInfo) {
      studentInfo = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          fullName: true,
          studentCode: true,
          grade: true,
          dateOfBirth: true,
          gender: true,
          className: true,
          admissionCriteria: true,
          targetType: true,
          surveySystem: true,
          surveyFormType: true,
          admissionCampus: true,
          registeredCampus: true,
          cityName: true,
          districtName: true,
          wardName: true,
          countryName: true,
          oldSchoolName: true,
          oldSchoolType: true,
          hoSoCtQuocTe: true,
          hocKy: true,
          academicRating: true,
          conductRating: true,
          kqHocTap: true,
          kqRenLuyen: true,
          kqgdTieuHoc: true,
          mathScore: true,
          literatureScore: true,
          writtenEnglishScore: true,
          oralEnglishScore: true,
          psychologyScore: true,
          period: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          batch: {
            select: {
              id: true,
              batchNumber: true,
              name: true,
              campus: {
                select: {
                  id: true,
                  campusName: true,
                  campusCode: true
                }
              }
            }
          },
          scores: {
            include: {
              subject: true
            }
          }
        }
      });
    }

    if (studentInfo) {
      const isCuid = (v?: string | null) => Boolean(v && /^c[a-z0-9]{15,}$/i.test(String(v).trim()));
      let resolvedCampusLabel =
        studentInfo.batch?.campus?.campusCode ||
        studentInfo.batch?.campus?.campusName ||
        "";

      const rawCampusId = isCuid(studentInfo.admissionCampus)
        ? studentInfo.admissionCampus
        : isCuid(studentInfo.registeredCampus)
        ? studentInfo.registeredCampus
        : null;

      if (!resolvedCampusLabel && rawCampusId) {
        try {
          const foundCampus = await (prisma as any).campus.findUnique({
            where: { id: rawCampusId },
            select: { campusCode: true, campusName: true }
          });
          if (foundCampus) {
            resolvedCampusLabel = foundCampus.campusCode || foundCampus.campusName || "";
          }
        } catch (e) {}
      }

      if (resolvedCampusLabel) {
        if (isCuid(studentInfo.admissionCampus)) {
          studentInfo.admissionCampus = resolvedCampusLabel;
        }
        if (isCuid(studentInfo.registeredCampus)) {
          studentInfo.registeredCampus = resolvedCampusLabel;
        }
      }
    }

    const fallbackTeacherName =
      assignedOrientation.primary?.teacherName ||
      record?.interviewerName ||
      currentUser?.fullName ||
      currentUser?.name ||
      "";

    return NextResponse.json({
      success: true,
      data: record,
      student: studentInfo,
      assignedOrientationTeacher: assignedOrientation.primary || (fallbackTeacherName ? { teacherName: fallbackTeacherName, teacherId: currentUser?.id || "" } : null),
      assignedOrientationTeachers: assignedOrientation.list || []
    });
  } catch (error: any) {
    console.error("GET /api/admin/orientation/records error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, ...data } = body;

    if (!studentId) {
      return NextResponse.json({ success: false, error: "Thiếu studentId" }, { status: 400 });
    }

    const user = session.user as any;
    const record = await upsertStudentOrientationRecord({
      studentId,
      ...data,
      interviewerId: data.interviewerId || user?.id,
      interviewerName: data.interviewerName || user?.fullName || user?.name
    });

    // Đồng bộ điểm các môn khảo sát & Quyết định/chỉ đạo của GĐCS vào InputAssessmentStudent
    try {
      const studentUpdates: any = {};
      if (data.writtenEnglishScore !== undefined) {
        studentUpdates.writtenEnglishScore = data.writtenEnglishScore ? String(data.writtenEnglishScore) : null;
      }
      if (data.oralEnglishScore !== undefined) {
        studentUpdates.oralEnglishScore = data.oralEnglishScore ? String(data.oralEnglishScore) : null;
      }
      if (data.mathScore !== undefined) {
        studentUpdates.mathScore = data.mathScore ? String(data.mathScore) : null;
      }
      if (data.literatureScore !== undefined) {
        studentUpdates.literatureScore = data.literatureScore ? String(data.literatureScore) : null;
      }
      // Kiểm soát: Không tự động phê duyệt kết luận nếu người lưu chỉ là Giáo viên nhập điểm/định hướng
      const canApproveStage6 = canUserConfirmStage(user?.role, 6, Boolean(user?.isSuperAdmin));
      if (data.gdcsDecision && canApproveStage6) {
        if (data.gdcsDecision === "TIEP_NHAN_CHUAN") {
          studentUpdates.admissionResult = "Đạt";
        } else if (data.gdcsDecision === "TIEP_NHAN_DONG_HANH") {
          studentUpdates.admissionResult = "Đạt có cam kết";
        } else if (data.gdcsDecision === "TAM_HOAN_DANH_GIA") {
          studentUpdates.admissionResult = "Chờ duyệt";
        }
      }
      if (data.gdcsGeneralNote !== undefined && data.gdcsGeneralNote !== null && canApproveStage6) {
        studentUpdates.directorNote = data.gdcsGeneralNote;
      }
      if (data.proposedEduSystem) {
        studentUpdates.surveyFormType = data.proposedEduSystem;
      }

      if (Object.keys(studentUpdates).length > 0) {
        await (prisma as any).inputAssessmentStudent.update({
          where: { id: studentId },
          data: studentUpdates
        });
      }

      // Đồng bộ Tiến độ Công đoạn 5 (Hoàn thành bản định hướng kết quả)
      if ((record as any)?.status === "COMPLETED" || data.status === "COMPLETED") {
        await executeEntranceWorkflowAction({
          action: "CONFIRM",
          targetScope: "STUDENT",
          periodId: (record as any)?.student?.periodId || data.periodId || "PERIOD_ORIENTATION",
          batchId: (record as any)?.student?.batchId || data.batchId || null,
          studentIds: [studentId],
          stageNumber: 5,
          status: "COMPLETED",
          note: data.overallAssessment || "Hoàn thành phiếu định hướng đầu vào",
          actor: {
            id: user?.id || "interviewer",
            fullName: user?.fullName || user?.name || "Giáo viên định hướng",
            role: user?.role || "TEACHER",
            isSuperAdmin: Boolean(user?.isSuperAdmin),
          },
        });
      }
    } catch (syncErr) {
      console.error("Lỗi đồng bộ sang InputAssessmentStudent:", syncErr);
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error("POST /api/admin/orientation/records error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
