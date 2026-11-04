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
  getGdcsCampusList
} from "@/lib/orientation/service";
import { questionsData, defaultQuestions } from "@/lib/orientation/psychologyQuestions";

export const dynamic = "force-dynamic";

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
      assignmentRole: t.assignmentRole || "Phân công đợt KS",
      grade: t.grade || "",
      subjectName: t.subjectName || "Tâm lý",
      isPeriodAssigned: true
    }));

    // Hợp nhất danh sách GV: Nếu có phân công đợt thì đưa lên đầu, kết hợp toàn bộ GV Tổ TLHN
    const assignedTeachers = [
      ...assignedInPeriod,
      ...tlhnTeachers.filter((tt: any) => !assignedInPeriod.some((ap: any) => ap.teacherId === tt.teacherId))
    ];

    // 4. Lấy bộ câu hỏi Tâm lý theo khối
    const rawGrade = String(student.grade || "").toLowerCase().replace("khối", "").replace("khoi", "").trim();
    const currentGrade = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"].includes(rawGrade) ? rawGrade : "default";
    const psychQuestions = questionsData[currentGrade] || defaultQuestions;

    // 5. Lấy thông tin bản ghi định hướng hiện tại nếu có
    const orientationRecord = await getStudentOrientationRecord(studentId);
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

    return NextResponse.json({
      success: true,
      departments,
      selectedDepartmentCode: departmentCodeOrId,
      assignedTeachers,
      tlhnTeachers,
      psychologyQuestions: psychQuestions,
      gdcsList,
      referralStatus: orientationRecord?.psychologyReferralStatus || (parsedPsychData ? "COMPLETED" : "NONE"),
      referralReason: orientationRecord?.psychologyReferralReason || "",
      referralTeacherId: orientationRecord?.psychologyTeacherId || "",
      referralTeacherName: orientationRecord?.psychologyTeacherName || "",
      psychologyData: parsedPsychData,
      data: {
        student,
        departments,
        assignedTeachers,
        tlhnTeachers,
        psychQuestions,
        gdcsList,
        psychologyData: parsedPsychData,
        currentReferral: {
          status: orientationRecord?.psychologyReferralStatus || (parsedPsychData ? "COMPLETED" : "NONE"),
          reason: orientationRecord?.psychologyReferralReason || "",
          teacherId: orientationRecord?.psychologyTeacherId || "",
          teacherName: orientationRecord?.psychologyTeacherName || ""
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

      const assessorName =
        teacherName ||
        (session.user as any)?.fullName ||
        session.user?.name ||
        "Giáo viên Tâm lý";
      const assessorId = teacherId || (session.user as any)?.id || null;
      const nowStr = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

      const psychDataObj = {
        scores,
        sectionScores,
        totalScore,
        evaluation,
        conclusion,
        recommendation,
        notes,
        assessedBy: assessorName,
        assessedById: assessorId,
        assessedAt: new Date().toISOString(),
        assessedAtFormatted: nowStr
      };

      const updatedRecord = await upsertStudentOrientationRecord({
        studentId,
        psychologyReferralStatus: "COMPLETED",
        psychologyTeacherId: assessorId,
        psychologyTeacherName: assessorName,
        psychologyReferralReason:
          reason || conclusion || evaluation?.suggestion || "Đã hoàn thành đánh giá tâm lý theo Form chuẩn",
        psychologyData: JSON.stringify(psychDataObj)
      });

      // Đồng bộ điểm psychologyScore sang InputAssessmentStudent & InputAssessmentScore (môn TLY)
      try {
        await (prisma as any).inputAssessmentStudent.update({
          where: { id: studentId },
          data: { psychologyScore: String(totalScore) }
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
          teacherName: assessorName
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

      const psychDataObj = {
        scores,
        sectionScores,
        totalScore,
        evaluation,
        conclusion,
        recommendation,
        notes,
        reportedToGdcs: {
          gdcsName: gdcsName || "Giám đốc Cơ sở",
          gdcsEmail,
          campusCode: campusCode || student.admissionCampus || "",
          reportedAt: new Date().toISOString(),
          reportedAtFormatted: nowStr,
          reporterName,
          messageToGdcs
        }
      };

      // 2. Cập nhật vào StudentOrientationRecord
      await upsertStudentOrientationRecord({
        studentId,
        psychologyScore: totalScore,
        psychologyReferralStatus: "COMPLETED",
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
            <title>[Sky-line SSM] Báo cáo kết quả đánh giá tâm lý & Đề xuất định hướng - HS ${student.fullName}</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#f1f5f9">
              <tr>
                <td align="center" style="padding: 24px 12px;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 680px; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
                    
                    <!-- HEADER BANNER CHUYÊN NGHIỆP -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #004d40 0%, #00796b 55%, #0f766e 100%); color: #ffffff; padding: 26px 28px; text-align: left;">
                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                          <tr>
                            <td>
                              <span style="display: inline-block; padding: 3px 12px; background-color: rgba(255, 255, 255, 0.18); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 9999px; font-size: 10px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">
                                HỆ THỐNG GIÁO DỤC SKY-LINE • SSM
                              </span>
                              <h1 style="margin: 10px 0 4px 0; font-size: 19px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.3;">
                                BÁO CÁO KẾT QUẢ ĐÁNH GIÁ TÂM LÝ &amp; ĐỀ XUẤT ĐỊNH HƯỚNG
                              </h1>
                              <div style="font-size: 13px; color: #ccfbf1; font-weight: 600;">
                                Kính gửi Giám Đốc Cơ Sở: <strong>${gdcsName || 'Thầy/Cô GĐCS'}</strong> — Cơ sở ${campusCode || student.admissionCampus || 'Sky-Line'}
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- NỘI DUNG CHÍNH -->
                    <tr>
                      <td style="padding: 26px 28px; color: #1e293b;">
                        <p style="margin: 0 0 16px 0; font-size: 13.5px; line-height: 1.6; color: #334155;">
                          Kính gửi <strong>Thầy/Cô ${gdcsName || 'Giám Đốc Cơ Sở'}</strong>,<br/>
                          Giáo viên Tâm lý học đường (<strong>${reporterName}</strong>) vừa hoàn thành bài đánh giá tâm lý chuyên sâu cho học sinh và trân trọng chuyển gửi báo cáo kết quả kèm <strong>Phiếu Định Hướng Học Sinh</strong> đến Giám Đốc Cơ Sở để xem xét và chỉ đạo phương án tiếp nhận.
                        </p>

                        <!-- ========================================================= -->
                        <!-- KHỐI 1: FORM ĐỊNH HƯỚNG HỌC SINH (HỒ SƠ ĐẦU VÀO) -->
                        <!-- ========================================================= -->
                        <div style="margin-bottom: 22px; border: 1px solid #cbd5e1; border-radius: 14px; overflow: hidden;">
                          <div style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 16px; font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                            📋 FORM ĐỊNH HƯỚNG HỌC SINH (HỒ SƠ KHẢO SÁT ĐẦU VÀO)
                          </div>
                          
                          <div style="padding: 14px 16px; background-color: #ffffff;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 12.5px; border-collapse: collapse;">
                              <tr>
                                <td style="padding: 5px 0; color: #64748b; width: 28%;">Họ và tên học sinh:</td>
                                <td style="padding: 5px 0; font-weight: 800; color: #0f172a; font-size: 13.5px;">${student.fullName}</td>
                                <td style="padding: 5px 0; color: #64748b; width: 22%;">Mã hồ sơ (Mã HS):</td>
                                <td style="padding: 5px 0; font-weight: 700; color: #00796b; font-family: monospace;">${student.studentCode || '—'}</td>
                              </tr>
                              <tr>
                                <td style="padding: 5px 0; color: #64748b;">Ngày sinh / Giới tính:</td>
                                <td style="padding: 5px 0; font-weight: 600; color: #1e293b;">${dobFormatted} • ${student.gender || '—'}</td>
                                <td style="padding: 5px 0; color: #64748b;">Khối đăng ký:</td>
                                <td style="padding: 5px 0; font-weight: 700; color: #1e293b;">Khối ${student.grade || '1'}</td>
                              </tr>
                              <tr>
                                <td style="padding: 5px 0; color: #64748b;">Hệ khảo sát / Tiếp nhận:</td>
                                <td style="padding: 5px 0; font-weight: 600; color: #1e293b;">${student.surveyFormType || student.surveySystem || 'Chất lượng cao'}</td>
                                <td style="padding: 5px 0; color: #64748b;">Cơ sở tiếp nhận:</td>
                                <td style="padding: 5px 0; font-weight: 700; color: #0f766e;">${student.admissionCampus || campusCode || 'Sky-Line'}</td>
                              </tr>
                              <tr>
                                <td style="padding: 5px 0; color: #64748b;">Trường trước đây:</td>
                                <td style="padding: 5px 0; font-weight: 600; color: #1e293b;" colspan="3">${student.oldSchoolName || 'Chưa ghi nhận'}</td>
                              </tr>
                            </table>

                            <!-- GHI NHẬN TỪ PHIẾU ĐỊNH HƯỚNG -->
                            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e2e8f0; font-size: 12px; line-height: 1.55; color: #334155;">
                              <div style="margin-bottom: 6px;">
                                <strong style="color: #047857;">• Điểm mạnh &amp; Tiềm năng học sinh:</strong>
                                <span>${orientationRecord?.studentStrengths?.trim() || 'Học sinh có phản xạ tương tác tốt, tự tin.'}</span>
                              </div>
                              <div style="margin-bottom: 6px;">
                                <strong style="color: #b45309;">• Nhu cầu cần hỗ trợ bước đầu:</strong>
                                <span>${orientationRecord?.studentNeedsSupport?.trim() || 'Cần chú ý thích ứng môi trường nề nếp và giao tiếp trong giai đoạn đầu.'}</span>
                              </div>
                              ${orientationRecord?.parentExpectations?.trim() ? `
                                <div style="margin-bottom: 6px;">
                                  <strong style="color: #6366f1;">• Nguyện vọng &amp; Kỳ vọng từ PHHS:</strong>
                                  <span>${orientationRecord.parentExpectations.trim()}</span>
                                </div>
                              ` : ''}
                              ${orientationRecord?.parentPersonalityNotes?.trim() ? `
                                <div>
                                  <strong style="color: #475569;">• Thói quen &amp; Tính cách ở nhà (từ PHHS):</strong>
                                  <span>${orientationRecord.parentPersonalityNotes.trim()}</span>
                                </div>
                              ` : ''}
                            </div>
                          </div>
                        </div>

                        <!-- ========================================================= -->
                        <!-- KHỐI 2: BƯỚC 1 — CHI TIẾT KẾT QUẢ TÂM LÝ (GV TÂM LÝ -> GĐCS) -->
                        <!-- ========================================================= -->
                        <div style="margin-bottom: 22px; border: 2px solid #fbbf24; border-radius: 14px; overflow: hidden; background-color: #fffbeb;">
                          <div style="background-color: #f59e0b; color: #ffffff; padding: 10px 16px; font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                            🧠 BƯỚC 1 — CHI TIẾT KẾT QUẢ TÂM LÝ (BÁO CÁO TỪ GV TÂM LÝ &rarr; GĐCS)
                          </div>
                          
                          <div style="padding: 16px; background-color: #ffffff;">
                            
                            <!-- TRẠNG THÁI THÔNG BÁO GỬI EMAIL -->
                            <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-left: 4px solid #16a34a; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; font-size: 12px;">
                              <div style="font-weight: 800; color: #166534; font-size: 12.5px; margin-bottom: 6px;">
                                ✓ THÔNG TIN CHUYỂN BÁO CÁO ĐẾN GIÁM ĐỐC CƠ SỞ
                              </div>
                              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 11.5px; line-height: 1.5; color: #14532d;">
                                <tr>
                                  <td style="width: 25%; font-weight: 700; color: #166534;">GĐCS tiếp nhận:</td>
                                  <td style="font-weight: 700;">${gdcsName} (${gdcsEmail})</td>
                                </tr>
                                <tr>
                                  <td style="font-weight: 700; color: #166534;">Người gửi (GV Tâm lý):</td>
                                  <td><strong>${reporterName}</strong> • Thời gian gửi: <strong>${nowStr}</strong></td>
                                </tr>
                                ${messageToGdcs ? `
                                  <tr>
                                    <td style="font-weight: 700; color: #166534; vertical-align: top; padding-top: 4px;">Nội dung đề xuất của GV:</td>
                                    <td style="padding-top: 4px; font-style: italic; color: #78350f; font-weight: 600;">
                                      &quot;${messageToGdcs}&quot;
                                    </td>
                                  </tr>
                                ` : ''}
                              </table>
                            </div>

                            <!-- TỔNG HỢP ĐIỂM SÀNG LỌC & MỨC ĐỘ -->
                            <div style="display: flex; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px; margin-bottom: 16px;">
                              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                  <td style="width: 50%; vertical-align: top; border-right: 1px solid #e2e8f0; padding-right: 12px;">
                                    <span style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #64748b; display: block; margin-bottom: 2px;">
                                      Tổng điểm sàng lọc tâm lý:
                                    </span>
                                    <div style="font-size: 22px; font-weight: 900; color: #004d40;">
                                      ${totalScore} <span style="font-size: 13px; font-weight: 700; color: #64748b;">/ 80 điểm</span>
                                    </div>
                                    <div style="font-size: 11.5px; color: #0f766e; margin-top: 2px; font-weight: 600;">
                                      Thang đo 20 tiêu chí chuyên sâu
                                    </div>
                                  </td>
                                  <td style="width: 50%; vertical-align: top; padding-left: 14px;">
                                    <span style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #64748b; display: block; margin-bottom: 4px;">
                                      Phân loại mức độ nhận diện:
                                    </span>
                                    <span style="display: inline-block; padding: 4px 12px; background-color: ${levelBadgeBg}; color: ${levelBadgeColor}; border: 1px solid ${levelBadgeBorder}; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase;">
                                      ${levelTitle}
                                    </span>
                                    <div style="font-size: 11.5px; color: #475569; margin-top: 5px; line-height: 1.4;">
                                      ${evaluation?.suggestion || 'Theo dõi và xây dựng kế hoạch hỗ trợ tâm lý học đường.'}
                                    </div>
                                  </td>
                                </tr>
                              </table>
                            </div>

                            <!-- THANG ĐO SÀNG LỌC ĐIỂM SỐ 6 PHẦN CHI TIẾT -->
                            <div style="margin-bottom: 16px;">
                              <div style="font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 8px;">
                                📊 THANG ĐO SÀNG LỌC ĐIỂM SỐ 6 PHẦN CHI TIẾT:
                              </div>
                              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 11.5px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; border-collapse: collapse;">
                                <thead>
                                  <tr style="background-color: #f1f5f9; color: #334155; font-weight: 800; border-bottom: 1px solid #cbd5e1; text-align: left;">
                                    <th style="padding: 8px 12px; width: 45px; text-align: center;">STT</th>
                                    <th style="padding: 8px 12px;">Nội dung Thang đo thành phần</th>
                                    <th style="padding: 8px 12px; width: 100px; text-align: center;">Điểm ghi nhận</th>
                                    <th style="padding: 8px 12px; width: 140px; text-align: left;">Đánh giá sơ bộ</th>
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
                                    const statusColor = isHigh ? "#b91c1c" : isMed ? "#b45309" : "#047857";
                                    return `
                                      <tr style="border-bottom: 1px solid #f1f5f9; background-color: ${idx % 2 === 0 ? '#ffffff' : '#fafafa'};">
                                        <td style="padding: 8px 12px; text-align: center; font-weight: 700; color: #64748b;">${sec.no}</td>
                                        <td style="padding: 8px 12px;">
                                          <strong style="color: #0f172a; font-size: 12px;">${sec.title}</strong>
                                          <div style="font-size: 10.5px; color: #64748b;">${sec.en}</div>
                                        </td>
                                        <td style="padding: 8px 12px; text-align: center; font-weight: 800; font-size: 13px; color: #00796b;">
                                          ${sScore} <span style="font-size: 10.5px; font-weight: normal; color: #94a3b8;">/ ${sec.max}đ</span>
                                        </td>
                                        <td style="padding: 8px 12px;">
                                          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 10.5px; color: ${statusColor}; background-color: ${isHigh ? '#fef2f2' : isMed ? '#fffbeb' : '#ecfdf5'}; border: 1px solid ${isHigh ? '#fecaca' : isMed ? '#fde68a' : '#a7f3d0'};">
                                            ${statusText}
                                          </span>
                                        </td>
                                      </tr>
                                    `;
                                  }).join('')}
                                </tbody>
                              </table>
                            </div>

                            <!-- KẾT LUẬN & KHUYẾN NGHỊ -->
                            <div style="margin-top: 14px; space-y: 10px;">
                              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px;">
                                <strong style="color: #92400e; font-size: 11.5px; text-transform: uppercase; display: block; margin-bottom: 3px;">
                                  📌 Kết luận chuyên môn của GV Tâm lý:
                                </strong>
                                <div style="font-size: 12.5px; color: #78350f; line-height: 1.5; font-style: italic;">
                                  &quot;${conclusion || 'Học sinh có phản xạ tương tác tốt, chưa ghi nhận dấu hiệu bất thường cần can thiệp.'}&quot;
                                </div>
                              </div>

                              <div style="background-color: #f0fdf4; border: 1px solid #dcfce7; border-left: 4px solid #16a34a; border-radius: 8px; padding: 10px 12px;">
                                <strong style="color: #166534; font-size: 11.5px; text-transform: uppercase; display: block; margin-bottom: 3px;">
                                  💡 Khuyến nghị hành động của GV Tâm lý:
                                </strong>
                                <div style="font-size: 12.5px; color: #14532d; line-height: 1.5;">
                                  ${recommendation || 'Tiếp tục tạo môi trường khuyến khích học sinh giao tiếp tự tin, đồng hành cùng nhà trường trong giai đoạn đầu nhập học.'}
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>

                        <!-- ========================================================= -->
                        <!-- KHỐI 3: BƯỚC 2 — PHƯƠNG ÁN XỬ LÝ & CHỈ ĐẠO CỦA GĐCS -->
                        <!-- ========================================================= -->
                        <div style="margin-bottom: 24px; border: 2px solid #818cf8; border-radius: 14px; overflow: hidden; background-color: #eef2ff;">
                          <div style="background-color: #4f46e5; color: #ffffff; padding: 10px 16px; font-size: 12.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                            🏛️ BƯỚC 2 — PHƯƠNG ÁN XỬ LÝ &amp; CHỈ ĐẠO CỦA GĐCS
                          </div>

                          <div style="padding: 16px; background-color: #ffffff; font-size: 12.5px;">
                            <p style="margin: 0 0 12px 0; color: #334155; line-height: 1.5;">
                              Kính đề nghị Giám Đốc Cơ Sở xem xét kết quả và lựa chọn chỉ đạo theo các phương án nghiệp vụ sau trên hệ thống SSM:
                            </p>

                            <!-- 3 HÌNH THỨC CHỈ ĐẠO -->
                            <div style="margin-bottom: 12px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px;">
                              <div style="font-weight: 800; color: #4338ca; font-size: 12px; margin-bottom: 4px;">
                                1. Ủy quyền Giáo viên:
                              </div>
                              <div style="color: #475569; font-size: 11.5px; line-height: 1.5;">
                                • Chỉ định giáo viên đồng hành &amp; hỗ trợ chuyên biệt học sinh trong thời gian đầu nhập học.<br/>
                                • Nhập nội dung chỉ đạo, mục tiêu theo dõi và nhiệm vụ phân công cho giáo viên chuyên trách.
                              </div>
                            </div>

                            <div style="margin-bottom: 12px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px;">
                              <div style="font-weight: 800; color: #7c3aed; font-size: 12px; margin-bottom: 4px;">
                                2. Gặp trực tiếp Phụ huynh học sinh (PHHS):
                              </div>
                              <div style="color: #475569; font-size: 11.5px; line-height: 1.5;">
                                • Thiết lập thời gian, địa điểm hẹn gặp trực tiếp Phụ huynh học sinh.<br/>
                                • Nội dung trọng tâm cần trao đổi, thỏa thuận nhập học và cam kết phối hợp giáo dục giữa Gia đình &amp; Nhà trường.
                              </div>
                            </div>

                            <div style="margin-bottom: 16px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px;">
                              <div style="font-weight: 800; color: #0d9488; font-size: 12px; margin-bottom: 4px;">
                                3. Hẹn lịch làm việc / Hội chẩn chuyên môn:
                              </div>
                              <div style="color: #475569; font-size: 11.5px; line-height: 1.5;">
                                • Xác định thời gian, địa điểm tổ chức buổi hội chẩn chuyên môn.<br/>
                                • Thành phần tham dự: Ban Giám đốc Cơ sở, Chuyên viên Tâm lý, Giáo viên bộ môn/chủ nhiệm và Tổ chuyên môn.
                              </div>
                            </div>

                            <!-- NÚT CTA MỞ PHIẾU ĐỊNH HƯỚNG TRỰC TIẾP -->
                            <div style="text-align: center; padding: 10px 0 6px 0;">
                              <a href="${directOrientationLink}" target="_blank" style="display: inline-block; padding: 13px 32px; background: linear-gradient(135deg, #00796b 0%, #004d40 100%); color: #ffffff; font-size: 13.5px; font-weight: 800; text-decoration: none; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(0, 77, 64, 0.35);">
                                MỞ PHIẾU ĐỊNH HƯỚNG &amp; PHÊ DUYỆT CHỈ ĐẠO TRÊN SSM &rarr;
                              </a>
                            </div>
                            <div style="text-align: center; margin-top: 8px;">
                              <a href="${directOrientationLink}" target="_blank" style="font-size: 11px; color: #0f766e; text-decoration: underline; word-break: break-all;">
                                ${directOrientationLink}
                              </a>
                            </div>

                          </div>
                        </div>

                        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                          Sau khi Giám Đốc Cơ Sở hoàn tất phê duyệt chỉ đạo tại <strong>Bước 2</strong>, thông tin sẽ được cập nhật đồng bộ cho Bộ phận Tư vấn Tuyển sinh và Giáo viên chuyên trách để kịp thời thực hiện theo đúng kế hoạch.
                        </p>
                      </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 28px; font-size: 11.5px; color: #64748b; text-align: center; line-height: 1.5;">
                        Email thông báo tự động từ <strong>Phân hệ Khảo sát &amp; Định hướng Học sinh Đầu vào — Sky-Line SSM</strong>.<br/>
                        Người lập báo cáo: <strong>${reporterName}</strong> • Thời gian gửi: ${nowStr}<br/>
                        Mọi thắc mắc kỹ thuật vui lòng liên hệ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #00796b; text-decoration: none;">ktdbcl@skylineschool.edu.vn</a>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        await sendEmail({
          to: gdcsEmail,
          cc: ["ktdbcl@skylineschool.edu.vn"],
          subject: `[Sky-line SSM] Báo cáo kết quả đánh giá tâm lý đầu vào - HS ${student.fullName} (Khối ${student.grade || '1'})`,
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

    // 2. Cập nhật trạng thái chuyển tiếp trong StudentOrientationRecord
    const updatedRecord = await upsertStudentOrientationRecord({
      studentId,
      psychologyReferralStatus: "REQUESTED",
      psychologyReferralReason: reason,
      psychologyTeacherId: teacherId || null,
      psychologyTeacherName: teacherName || null
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
