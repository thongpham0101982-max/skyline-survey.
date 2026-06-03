import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/mail"

export async function GET(req) {
  const session = await auth();
  const user = session?.user as any;
  const isGDCS = user?.role === 'GDCS';
  const allowedCampusIds = user?.campusIds || [];
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("get_max_code") === "true") {
      const allStudents = await (prisma as any).inputAssessmentStudent.findMany({
        select: { studentCode: true }
      });
      const nums = allStudents.map((s: any) => {
        const match = String(s.studentCode || "").match(/\d+$/);
        return match ? parseInt(match[0], 10) : 0;
      }).filter((n: number) => !isNaN(n));
      const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
      return NextResponse.json({ nextCode: "HS" + (maxNum + 1).toString().padStart(3, "0") });
    }
    const periodId = searchParams.get("periodId");
    const batchId = searchParams.get("batchId");
    
    if (!periodId && searchParams.get("fetch_all") !== "true") {
       return NextResponse.json({ error: "Missing periodId" }, { status: 400 });
    }
    
    const where: any = periodId ? { periodId } : {};
    if (batchId && batchId !== "all" && batchId !== "null") {
      where.OR = [
        { batchId: batchId },
        { batchId: null }
      ];
    } else if (batchId === "null") {
      where.batchId = null;
    }
    
    const students = await (prisma as any).inputAssessmentStudent.findMany({
      where,
      include: { batch: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(students, { headers: { "X-API-Version": "20260516.1" } });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, data } = body;
    
    if (action === "CREATE") {
      const result = await (prisma as any).inputAssessmentStudent.create({
        data: {
           studentCode: data.studentCode,
           fullName: data.fullName,
           dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
           gender: data.gender || null,
           className: data.className || null,
           grade: data.grade || null,
           academicRating: data.academicRating || null,
           conductRating: data.conductRating || null,
           admissionCriteria: data.admissionCriteria || null,
           surveySystem: data.surveySystem || null,
           targetType: data.targetType || null,
           surveyFormType: data.surveyFormType || null,
           signatureName: data.signatureName || null,
           hocKy: data.hocKy || null,
           kqgdTieuHoc: data.kqgdTieuHoc || null,
           kqHocTap: data.kqHocTap || null,
           hoSoCtQuocTe: data.hoSoCtQuocTe || null,
           hoSoCtQuocTe: data.hoSoCtQuocTe || null,
           kqRenLuyen: data.kqRenLuyen || null,
           psychologyScore: data.psychologyScore ? parseFloat(data.psychologyScore) : null,
           writtenEnglishScore: data.writtenEnglishScore ? parseFloat(data.writtenEnglishScore) : null,
           oralEnglishScore: data.oralEnglishScore ? parseFloat(data.oralEnglishScore) : null,
           mathScore: data.mathScore ? parseFloat(data.mathScore) : null,
           literatureScore: data.literatureScore ? parseFloat(data.literatureScore) : null,
           periodId: data.periodId,
           batchId: data.batchId || null,
        }
      });
      return NextResponse.json(result);
    }
    

    if (action === "BULK_CREATE") {
      const results = [];
      const errors = [];
      
      let maxNum = 0;
      const allStudents = await (prisma as any).inputAssessmentStudent.findMany({
        select: { studentCode: true }
      });
      const nums = allStudents.map((s) => {
        const match = String(s.studentCode || "").match(/\d+$/);
        return match ? parseInt(match[0], 10) : 0;
      }).filter((n) => !isNaN(n));
      if (nums.length > 0) maxNum = Math.max(...nums);
      
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        
        if (!d.studentCode || d.studentCode.trim() === "") {
            maxNum++;
            d.studentCode = "HS" + maxNum.toString().padStart(3, "0");
        }
        
        try {
          const existing = await (prisma as any).inputAssessmentStudent.findFirst({
            where: { studentCode: d.studentCode, periodId: d.periodId }
          });

          const studentData = {
            fullName: d.fullName,
            dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth) : null,
            gender: d.gender || null,
            className: d.className || null,
            grade: d.grade || null,
            academicRating: d.academicRating || null,
            conductRating: d.conductRating || null,
            admissionCriteria: d.admissionCriteria || null,
            surveySystem: d.surveySystem || null,
            targetType: d.targetType || null,
            surveyFormType: d.surveyFormType || null,
            signatureName: d.signatureName || null,
            hocKy: d.hocKy || null,
            kqgdTieuHoc: d.kqgdTieuHoc || null,
            kqHocTap: d.kqHocTap || null,
              hoSoCtQuocTe: d.hoSoCtQuocTe || null,
            hoSoCtQuocTe: d.hoSoCtQuocTe || null,
            kqRenLuyen: d.kqRenLuyen || null,
            psychologyScore: d.psychologyScore ? parseFloat(d.psychologyScore) : null,
            writtenEnglishScore: d.writtenEnglishScore ? parseFloat(d.writtenEnglishScore) : null,
            oralEnglishScore: d.oralEnglishScore ? parseFloat(d.oralEnglishScore) : null,
            mathScore: d.mathScore ? parseFloat(d.mathScore) : null,
            literatureScore: d.literatureScore ? parseFloat(d.literatureScore) : null,
            batchId: d.batchId || null,
          };

          let result;
          if (existing) {
            result = await (prisma as any).inputAssessmentStudent.update({
              where: { id: existing.id },
              data: studentData
            });
          } else {
            result = await (prisma as any).inputAssessmentStudent.create({
              data: {
                studentCode: d.studentCode,
                periodId: d.periodId,
                ...studentData
              }
            });
          }
          results.push(result);
        } catch (err) {
          errors.push({ row: i + 1, code: d.studentCode, error: err.message });
        }
      }
      return NextResponse.json({ success: true, created: results.length, errors });
    }

    if (action === "SEND_APPROVAL_REQUEST") {
      const { studentId, gdcsEmail } = data;
      if (!studentId || !gdcsEmail) {
        return NextResponse.json({ error: "Missing studentId or gdcsEmail" }, { status: 400 });
      }

      // Fetch the student with scores and period/batch details
      const student = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId },
        include: {
          period: true,
          batch: true
        }
      });

      if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      // Fetch the student's scores/results from teacher assignments
      const scores = await (prisma as any).studentAssessmentScore.findMany({
        where: { studentId },
        include: {
          subject: true
        }
      });

      // Prepare scores summary for email
      const scoresList = scores.map((sc) => {
        const subject = sc.subject || {};
        const sName = subject.name || "Môn học";
        const sCode = (subject.code || "").toLowerCase();
        let val = "—";
        try {
          if (sc.scores) {
            const parsed = JSON.parse(sc.scores);
            const vArr = Array.isArray(parsed) ? parsed : [parsed];
            if (sCode.includes("tly")) {
               const scNum = parseFloat(vArr[6] || vArr[20] || "0");
               let lvl = "Bình thường";
               if (scNum > 15 && scNum <= 31) lvl = "Dấu hiệu nhẹ";
               else if (scNum > 31 && scNum <= 47) lvl = "Dấu hiệu vừa";
               else if (scNum > 47 && scNum <= 63) lvl = "Nguy cơ cao";
               else if (scNum > 63) lvl = "Nguy cơ rất cao";
               val = `${lvl} (${scNum} đ)`;
            }
            else if (sCode.includes("tci") || sCode.includes("cpt")) val = vArr.filter(x => x === "3").length + " Đ";
            else if (sCode.includes("nltd")) val = vArr[4] ? vArr[4] + "%" : "—";
            else val = vArr.find(x => x !== undefined && x !== "" && x !== null) || "—";
          }
        } catch { val = sc.scores || "—"; }
        return { name: sName, val };
      });

      const host = req.headers.get("host") || "skyline-survey.vercel.app";
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      const baseUrl = `${protocol}://${host}`;

      const campusName = student.admissionCampus || student.batch?.name?.split("|")[1]?.trim() || "Cơ sở Sky-Line";

      // Prepare email html body
      const scoresRowsHtml = scoresList.map(s => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-size: 14px; color: #1e293b; font-weight: 600;">${s.name}</td>
          <td style="padding: 10px; font-size: 14px; color: #475569; font-weight: bold; text-align: right;">${s.val}</td>
        </tr>
      `).join("");

      const dateOfBirthStr = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "—";

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Yêu cầu phê duyệt kết quả khảo sát</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 20px 0;">
            <tr>
              <td align="center">
                <table width="650" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); padding: 35px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">YÊU CẦU PHÊ DUYỆT KHẢO SÁT</h1>
                      <p style="margin: 5px 0 0 0; color: #e0f7fa; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Hệ Phổ thông - Hệ thống Trường Sky-Line</p>
                    </td>
                  </tr>
                  <!-- Greetings -->
                  <tr>
                    <td style="padding: 30px 30px 15px 30px;">
                      <p style="margin: 0; font-size: 15px; font-weight: 700; color: #1e293b;">Kính gửi thầy/cô Giám đốc Cơ sở,</p>
                      <p style="margin: 10px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                        Hội đồng Tuyển sinh kính gửi yêu cầu phê duyệt kết quả khảo sát năng lực đầu vào cho học sinh sau:
                      </p>
                    </td>
                  </tr>
                  <!-- Student Details Card -->
                  <tr>
                    <td style="padding: 0 30px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 12px; border: 1px solid #e2e8f0; padding: 15px; margin-bottom: 20px;">
                        <tr>
                          <td style="padding-bottom: 8px; width: 40%; font-size: 12px; font-weight: bold; color: #4f46e5; text-transform: uppercase;">Họ và tên học sinh:</td>
                          <td style="padding-bottom: 8px; font-size: 14px; font-weight: bold; color: #1e293b;">${student.fullName}</td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 8px; font-size: 12px; font-weight: bold; color: #4f46e5; text-transform: uppercase;">Mã HS khảo sát:</td>
                          <td style="padding-bottom: 8px; font-size: 14px; font-weight: bold; color: #1e293b;">${student.studentCode}</td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 8px; font-size: 12px; font-weight: bold; color: #4f46e5; text-transform: uppercase;">Ngày sinh:</td>
                          <td style="padding-bottom: 8px; font-size: 14px; font-weight: bold; color: #1e293b;">${dateOfBirthStr}</td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 8px; font-size: 12px; font-weight: bold; color: #4f46e5; text-transform: uppercase;">Khối lớp / Hệ học:</td>
                          <td style="padding-bottom: 8px; font-size: 14px; font-weight: bold; color: #1e293b;">Khối ${student.grade || "—"} / Hệ ${student.surveyFormType || "—"}</td>
                        </tr>
                        <tr>
                          <td style="font-size: 12px; font-weight: bold; color: #4f46e5; text-transform: uppercase;">Cơ sở tuyển sinh:</td>
                          <td style="font-size: 14px; font-weight: bold; color: #1e293b;">${campusName}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Scores Table -->
                  ${scoresList.length > 0 ? `
                  <tr>
                    <td style="padding: 0 30px 15px 30px;">
                      <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: bold; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">Bảng điểm khảo sát các môn</h4>
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <thead>
                          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                            <th style="padding: 12px 10px; text-align: left; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Môn học</th>
                            <th style="padding: 12px 10px; text-align: right; font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; width: 35%;">Kết quả</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${scoresRowsHtml}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  ` : ""}
                  <!-- Action Link -->
                  <tr>
                    <td style="padding: 15px 30px 30px 30px; text-align: center;">
                      <p style="margin: 0 0 15px 0; font-size: 13px; color: #64748b; font-style: italic;">
                        ⚠️ Kính đề xuất Giám Đốc Cơ sở truy cập Portal để xem chi tiết nhận xét của các giáo viên và thực hiện phê duyệt kết quả tuyển sinh.
                      </p>
                      <a href="${baseUrl}/admin/input-assessments" style="display: inline-block; padding: 12px 28px; border-radius: 12px; font-size: 14px; font-weight: bold; color: #ffffff; background-color: #4f46e5; text-decoration: none; border: 1px solid #4338ca; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
                        Phê duyệt trên Portal
                      </a>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b;">
                      <p style="margin: 0;">Email gửi tự động từ Hệ thống Khảo sát Tuyển sinh Sky-Line.</p>
                      <p style="margin: 4px 0 0 0; font-weight: bold; color: #475569;">HỘI ĐỒNG TUYỂN SINH - HỆ THỐNG GIÁO DỤC SKY-LINE</p>
                      <p style="margin: 8px 0 0 0; color: #4f46e5; font-weight: 600;">Mọi thắc mắc vui lòng liên hệ Ban Khảo thí qua email: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #4f46e5; text-decoration: underline;">bankhaothi@skylineschool.edu.vn</a></p>
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
        await sendEmail({
          to: gdcsEmail,
          subject: `[Sky-Line-Approval] Yêu cầu duyệt kết quả khảo sát đầu vào - Học sinh ${student.fullName} (${campusName})`,
          html: emailHtml,
          replyTo: "bankhaothi@skylineschool.edu.vn"
        });
        return NextResponse.json({ success: true });
      } catch(err) {
        console.error("GDCS send email err", err);
        return NextResponse.json({ error: "Lỗi khi gửi email: " + err.message }, { status: 500 });
      }
    }

    if (action === "RETEST_REGISTER") {
      const { studentId, targetPeriodId, targetBatchId } = data;
      if (!studentId || !targetPeriodId) {
        return NextResponse.json({ error: "Missing studentId or targetPeriodId" }, { status: 400 });
      }

      const sourceStudent = await (prisma as any).inputAssessmentStudent.findUnique({
        where: { id: studentId }
      });
      if (!sourceStudent) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      const existing = await (prisma as any).inputAssessmentStudent.findFirst({
        where: {
          studentCode: sourceStudent.studentCode,
          periodId: targetPeriodId,
          batchId: targetBatchId || null
        }
      });
      if (existing) {
        return NextResponse.json({ error: `Học sinh này đã được đăng ký khảo sát ở Kỳ khảo sát được chọn (Mã HS: ${sourceStudent.studentCode})` }, { status: 400 });
      }

      const newStudent = await (prisma as any).inputAssessmentStudent.create({
        data: {
          studentCode: sourceStudent.studentCode,
          fullName: sourceStudent.fullName,
          dateOfBirth: sourceStudent.dateOfBirth,
          gender: sourceStudent.gender,
          className: sourceStudent.className,
          grade: sourceStudent.grade,
          academicRating: sourceStudent.academicRating,
          conductRating: sourceStudent.conductRating,
          admissionCriteria: sourceStudent.admissionCriteria,
          surveySystem: sourceStudent.surveySystem,
          targetType: sourceStudent.targetType,
          surveyFormType: sourceStudent.surveyFormType,
          hocKy: sourceStudent.hocKy,
          kqgdTieuHoc: sourceStudent.kqgdTieuHoc,
          kqHocTap: sourceStudent.kqHocTap,
          hoSoCtQuocTe: sourceStudent.hoSoCtQuocTe,
          kqRenLuyen: sourceStudent.kqRenLuyen,
          periodId: targetPeriodId,
          batchId: targetBatchId || null,
          admissionResult: null,
          directorNote: `Kiểm tra lại đợt trước từ kỳ: ${sourceStudent.periodId}`,
          admissionCampus: sourceStudent.admissionCampus,
        }
      });

      return NextResponse.json({ success: true, newStudent });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = session?.user as any;
  const userRole = (user?.role || "").toUpperCase();

  try {
    const body = await req.json();
    const { id, data } = body;

    // Check if the student belongs to a locked batch
    const student = await (prisma as any).inputAssessmentStudent.findUnique({
      where: { id },
      include: { batch: true }
    });

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const isBatchLocked = student.batch?.status === "LOCKED" || student.batch?.status === "CLOSED";
    // Block everyone if batch is locked (Hard lock feature)
    if (isBatchLocked) {
      return NextResponse.json({ error: "Đợt khảo sát này ĐÃ BỊ KHÓA! Mọi tính năng nhập, chỉnh sửa, xét duyệt đều bị vô hiệu hóa." }, { status: 403 });
    }
    
    const result = await (prisma as any).inputAssessmentStudent.update({
      where: { id },
      data: {
         fullName: data.fullName,
         dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
           gender: data.gender || null,
         className: data.className || null,
           grade: data.grade || null,
         academicRating: data.academicRating || null,
         conductRating: data.conductRating || null,
         admissionCriteria: data.admissionCriteria || null,
         surveySystem: data.surveySystem || null,
         targetType: data.targetType || null,
         surveyFormType: data.surveyFormType || null,
         signatureName: data.signatureName || null,
         hocKy: data.hocKy || null,
         kqgdTieuHoc: data.kqgdTieuHoc || null,
         kqHocTap: data.kqHocTap || null,
           hoSoCtQuocTe: data.hoSoCtQuocTe || null,
           hoSoCtQuocTe: data.hoSoCtQuocTe || null,
         kqRenLuyen: data.kqRenLuyen || null,
         psychologyScore: data.psychologyScore ? parseFloat(data.psychologyScore) : null,
         writtenEnglishScore: data.writtenEnglishScore ? parseFloat(data.writtenEnglishScore) : null,
         oralEnglishScore: data.oralEnglishScore ? parseFloat(data.oralEnglishScore) : null,
         mathScore: data.mathScore ? parseFloat(data.mathScore) : null,
         literatureScore: data.literatureScore ? parseFloat(data.literatureScore) : null,
         batchId: data.batchId || null,
         ...(data.admissionResult !== undefined && { admissionResult: data.admissionResult }),
         ...(data.directorNote !== undefined && { directorNote: data.directorNote }),
         ...(data.admissionCampus !== undefined && { admissionCampus: data.admissionCampus }),
         ...(data.signatureName !== undefined && { signatureName: data.signatureName }),
      }
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const ids = searchParams.get("ids");
    
    if (ids) {
      const idArr = ids.split(",");
      await (prisma as any).inputAssessmentStudent.deleteMany({ where: { id: { in: idArr } } });
      return NextResponse.json({ success: true, count: idArr.length });
    }
    
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await (prisma as any).inputAssessmentStudent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}