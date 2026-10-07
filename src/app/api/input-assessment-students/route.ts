import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/mail"

function parseSmartDate(d: any): Date | null {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
  const str = String(d).trim();
  if (!str) return null;
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const dt = new Date(year, month, day);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

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
    
    const where: any = (periodId && periodId !== "all") ? { periodId } : {};
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
      include: { 
        batch: { select: { name: true, status: true } },
        scores: {
          include: {
            subject: true
          }
        }
      },
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
    

    if (action === "SYNC_WITH_MASTER_STUDENTS") {
      const masterStudents = await prisma.student.findMany({
        select: {
          studentCode: true,
          studentName: true,
          gender: true,
          dateOfBirth: true
        }
      });

      const masterMap = new Map();
      for (const ms of masterStudents) {
        if (ms.studentCode) {
          masterMap.set(ms.studentCode.trim().toUpperCase(), ms);
        }
      }

      const k12Students = await (prisma as any).inputAssessmentStudent.findMany({
        select: { id: true, studentCode: true, fullName: true, gender: true, dateOfBirth: true }
      });

      let updatedK12Count = 0;
      for (const student of k12Students) {
        const sCode = (student.studentCode || "").trim().toUpperCase();
        const master = masterMap.get(sCode);
        if (master) {
          const nameChanged = master.studentName && master.studentName !== student.fullName;
          const genderChanged = master.gender && master.gender !== student.gender;
          const dobMasterStr = master.dateOfBirth ? new Date(master.dateOfBirth).toISOString().split("T")[0] : null;
          const dobCurrStr = student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split("T")[0] : null;
          const dobChanged = dobMasterStr && dobMasterStr !== dobCurrStr;

          if (nameChanged || genderChanged || dobChanged) {
            await (prisma as any).inputAssessmentStudent.update({
              where: { id: student.id },
              data: {
                fullName: master.studentName,
                gender: master.gender || student.gender,
                dateOfBirth: master.dateOfBirth || student.dateOfBirth
              }
            });
            updatedK12Count++;
          }
        }
      }

      let updatedPreschoolCount = 0;
      try {
        const preschoolStudents = await (prisma as any).preschoolInputAssessmentStudent.findMany({
          select: { id: true, studentCode: true, fullName: true, gender: true, dateOfBirth: true }
        });
        for (const child of preschoolStudents) {
          const sCode = (child.studentCode || "").trim().toUpperCase();
          const master = masterMap.get(sCode);
          if (master) {
            const nameChanged = master.studentName && master.studentName !== child.fullName;
            const genderChanged = master.gender && master.gender !== child.gender;
            const dobMasterStr = master.dateOfBirth ? new Date(master.dateOfBirth).toISOString().split("T")[0] : null;
            const dobCurrStr = child.dateOfBirth ? new Date(child.dateOfBirth).toISOString().split("T")[0] : null;
            const dobChanged = dobMasterStr && dobMasterStr !== dobCurrStr;

            if (nameChanged || genderChanged || dobChanged) {
              await (prisma as any).preschoolInputAssessmentStudent.update({
                where: { id: child.id },
                data: {
                  fullName: master.studentName,
                  gender: master.gender || child.gender,
                  dateOfBirth: master.dateOfBirth || child.dateOfBirth
                }
              });
              updatedPreschoolCount++;
            }
          }
        }
      } catch (e) {
        console.error("Preschool sync error:", e);
      }

      const totalUpdated = updatedK12Count + updatedPreschoolCount;
      return NextResponse.json({
        success: true,
        message: `Đã đồng bộ thành công ${totalUpdated} học sinh khớp với danh sách Học sinh gốc (Họ và tên, Giới tính, Ngày sinh)!`,
        updatedK12Count,
        updatedPreschoolCount
      });
    }

    if (action === "CREATE") {
      if (!data.periodId) {
        return NextResponse.json({ error: "Kỳ khảo sát là bắt buộc" }, { status: 400 });
      }
      let finalStudentCode = (data.studentCode || "").trim();
      if (!finalStudentCode) {
        const allStudents = await (prisma as any).inputAssessmentStudent.findMany({ select: { studentCode: true } });
        const nums = allStudents.map((s: any) => {
          const match = String(s.studentCode || "").match(/\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        }).filter((n: number) => !isNaN(n));
        const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
        finalStudentCode = "HS" + (maxNum + 1).toString().padStart(3, "0");
      }

      const result = await (prisma as any).inputAssessmentStudent.create({
        data: {
           studentCode: finalStudentCode,
           fullName: data.fullName,
           dateOfBirth: parseSmartDate(data.dateOfBirth),
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
           kqRenLuyen: data.kqRenLuyen || null,
           psychologyScore: data.psychologyScore ? parseFloat(data.psychologyScore) : null,
           writtenEnglishScore: data.writtenEnglishScore ? parseFloat(data.writtenEnglishScore) : null,
           oralEnglishScore: data.oralEnglishScore ? parseFloat(data.oralEnglishScore) : null,
           mathScore: data.mathScore ? parseFloat(data.mathScore) : null,
           literatureScore: data.literatureScore ? parseFloat(data.literatureScore) : null,
           periodId: data.periodId,
         batchId: data.batchId || null,
           registeredCampus: data.registeredCampus || null,
           isAbsent: data.isAbsent || false,
            cityName: data.cityName || null,
            districtName: data.districtName || null,
            wardName: data.wardName || null,
            countryName: data.countryName || null,
            oldSchoolName: data.oldSchoolName || null,
            oldSchoolType: data.oldSchoolType || null,
        }
      });
      return NextResponse.json(result);
    }
    

    if (action === "BULK_CREATE") {
      if (!Array.isArray(data)) {
          return NextResponse.json({ error: "data must be an array" }, { status: 400 });
      }
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
            registeredCampus: d.registeredCampus || null,
            isAbsent: d.isAbsent || false,
            cityName: d.cityName || null,
            districtName: d.districtName || null,
            wardName: d.wardName || null,
            countryName: d.countryName || null,
            oldSchoolName: d.oldSchoolName || null,
            oldSchoolType: d.oldSchoolType || null,
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
            else if (sCode.includes("nltd")) {
              const pctVal = vArr.length >= 5 ? vArr[4] : vArr[0];
              val = pctVal !== undefined && pctVal !== null && pctVal !== "" ? pctVal + "%" : "—";
            }
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
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px 14px; font-size: 13px; color: #1E293B; font-weight: 600;">${s.name}</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #003B3A; font-weight: 700; text-align: right;">${s.val}</td>
        </tr>
      `).join("");

      const dateOfBirthStr = student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("vi-VN") : "—";

      const emailHtml = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Yêu cầu phê duyệt kết quả khảo sát đầu vào</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #334155;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
            <tr>
              <td align="center">
                <table role="presentation" width="620" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0; border-collapse: separate;">
                  <!-- Header -->
                  <tr>
                    <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 32px 28px; text-align: center;">
                      <div style="display: inline-block; padding: 4px 14px; background-color: rgba(255,255,255,0.12); border-radius: 20px; color: #CCFBF1; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                        🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                      </div>
                      <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; line-height: 1.3;">
                        YÊU CẦU PHÊ DUYỆT KẾT QUẢ KHẢO SÁT
                      </h1>
                      <p style="margin: 8px 0 0 0; color: #99F6E4; font-size: 13px; font-weight: 500;">
                        Khảo sát Năng lực Đầu vào K-12 • ${campusName}
                      </p>
                    </td>
                  </tr>

                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 28px 30px 16px 30px;">
                      <p style="margin: 0; font-size: 15px; font-weight: 700; color: #003B3A;">Kính gửi Thầy/Cô Giám đốc Cơ sở,</p>
                      <p style="margin: 10px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                        Hội đồng Tuyển sinh kính chuyển hồ sơ và kết quả khảo sát năng lực đầu vào của học sinh dưới đây để Thầy/Cô xem xét và phê duyệt kết quả tuyển sinh:
                      </p>
                    </td>
                  </tr>

                  <!-- Student Profile Card -->
                  <tr>
                    <td style="padding: 0 30px 20px 30px;">
                      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F0FDFA; border-radius: 12px; border: 1px solid #99F6E4; padding: 18px 20px; border-collapse: separate;">
                        <tr>
                          <td style="padding-bottom: 10px; width: 40%; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Họ và tên học sinh:</td>
                          <td style="padding-bottom: 10px; font-size: 14px; font-weight: 800; color: #003B3A;">${student.fullName}</td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 10px; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Mã HS khảo sát:</td>
                          <td style="padding-bottom: 10px; font-size: 14px; font-weight: 700; color: #1E293B;">${student.studentCode}</td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 10px; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Ngày sinh:</td>
                          <td style="padding-bottom: 10px; font-size: 14px; font-weight: 600; color: #334155;">${dateOfBirthStr}</td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 10px; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Khối lớp / Hệ học:</td>
                          <td style="padding-bottom: 10px; font-size: 14px; font-weight: 600; color: #334155;">Khối ${student.grade || "—"} / Hệ ${student.surveyFormType || "—"}</td>
                        </tr>
                        <tr>
                          <td style="font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Cơ sở tiếp nhận:</td>
                          <td style="font-size: 14px; font-weight: 700; color: #003B3A;">${campusName}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Scores Table -->
                  ${scoresList.length > 0 ? `
                  <tr>
                    <td style="padding: 0 30px 22px 30px;">
                      <div style="font-size: 12px; font-weight: 800; color: #003B3A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                        📊 BẢNG ĐIỂM CHI TIẾT CÁC MÔN KHẢO SÁT
                      </div>
                      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #E2E8F0; border-radius: 10px; overflow: hidden; border-collapse: collapse;">
                        <thead>
                          <tr bgcolor="#003B3A" style="background-color: #003B3A;">
                            <th align="left" style="padding: 10px 14px; font-size: 11px; font-weight: 700; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.5px;">Môn khảo sát</th>
                            <th align="right" style="padding: 10px 14px; font-size: 11px; font-weight: 700; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.5px; width: 35%;">Kết quả</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${scoresRowsHtml}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  ` : ""}

                  <!-- Callout Note -->
                  <tr>
                    <td style="padding: 0 30px 24px 30px;">
                      <div style="background-color: #FEF9C3; border-left: 4px solid #CA8A04; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #854D0E; line-height: 1.5;">
                        📌 <strong>Lưu ý:</strong> Thầy/Cô vui lòng đăng nhập Cổng quản lý để xem đầy đủ nhận xét chuyên môn của hội đồng giáo viên khảo sát và quyết định kết quả tuyển sinh.
                      </div>
                    </td>
                  </tr>

                  <!-- Bulletproof CTA Button -->
                  <tr>
                    <td align="center" style="padding: 0 30px 32px 30px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                        <tr>
                          <td align="center" bgcolor="#00A19A" style="background-color: #00A19A; border-radius: 10px;">
                            <a href="${baseUrl}/admin/input-assessments" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                              Truy cập Portal Phê duyệt &rarr;
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 28px; text-align: center; border-top: 3px solid #00A19A;">
                      <p style="margin: 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                        HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                      </p>
                      <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #99F6E4;">
                        BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
                      </p>
                      <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                        Email hỗ trợ: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #99F6E4; text-decoration: underline;">bankhaothi@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #99F6E4; text-decoration: none;">skylineschool.edu.vn</a>
                      </p>
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
          subject: `[Sky-line SMS - Xét Duyệt] Yêu cầu duyệt kết quả khảo sát đầu vào - Học sinh ${student.fullName} (${campusName})`,
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
    const { id, ids, data } = body;

    // Hỗ trợ cập nhật hàng loạt (Batch Approval)
    if (ids && Array.isArray(ids) && ids.length > 0) {
      const updatePayload: any = {};
      if (data.admissionResult !== undefined) updatePayload.admissionResult = data.admissionResult;
      if (data.admissionCampus !== undefined) updatePayload.admissionCampus = data.admissionCampus;
      if (data.signatureName !== undefined) updatePayload.signatureName = data.signatureName;
      if (data.directorNote !== undefined) updatePayload.directorNote = data.directorNote;

      const batchRes = await (prisma as any).inputAssessmentStudent.updateMany({
        where: { id: { in: ids } },
        data: updatePayload
      });
      return NextResponse.json({ success: true, count: batchRes.count });
    }

    // Check if the student belongs to a locked batch
    const student = await (prisma as any).inputAssessmentStudent.findUnique({
      where: { id },
      include: { batch: true }
    });

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const session = await auth();
    const userRole = (session?.user as any)?.role || "";
    const isManagerOrAdmin = ["ADMIN", "KTDBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU", "GIAO_VU_CS"].includes(userRole) || (session?.user as any)?.isSuperAdmin;

    const isBatchLocked = student.batch?.status === "LOCKED" || student.batch?.status === "CLOSED";
    if (isBatchLocked && !isManagerOrAdmin) {
      return NextResponse.json({ error: "Đợt khảo sát này ĐÃ BỊ KHÓA! Mọi tính năng nhập, chỉnh sửa, xét duyệt đều bị vô hiệu hóa." }, { status: 403 });
    }
    
    // Clean relational & undefined fields from payload
    const updatePayload: any = {};
    if (data.fullName !== undefined) updatePayload.fullName = data.fullName;
    if (data.dateOfBirth !== undefined) updatePayload.dateOfBirth = parseSmartDate(data.dateOfBirth);
    if (data.gender !== undefined) updatePayload.gender = data.gender || null;
    if (data.className !== undefined) updatePayload.className = data.className || null;
    if (data.grade !== undefined) updatePayload.grade = data.grade || null;
    if (data.academicRating !== undefined) updatePayload.academicRating = data.academicRating || null;
    if (data.conductRating !== undefined) updatePayload.conductRating = data.conductRating || null;
    if (data.admissionCriteria !== undefined) updatePayload.admissionCriteria = data.admissionCriteria || null;
    if (data.surveySystem !== undefined) updatePayload.surveySystem = data.surveySystem || null;
    if (data.targetType !== undefined) updatePayload.targetType = data.targetType || null;
    if (data.surveyFormType !== undefined) updatePayload.surveyFormType = data.surveyFormType || null;
    if (data.signatureName !== undefined) updatePayload.signatureName = data.signatureName || null;
    if (data.hocKy !== undefined) updatePayload.hocKy = data.hocKy || null;
    if (data.kqgdTieuHoc !== undefined) updatePayload.kqgdTieuHoc = data.kqgdTieuHoc || null;
    if (data.kqHocTap !== undefined) updatePayload.kqHocTap = data.kqHocTap || null;
    if (data.hoSoCtQuocTe !== undefined) updatePayload.hoSoCtQuocTe = data.hoSoCtQuocTe || null;
    if (data.kqRenLuyen !== undefined) updatePayload.kqRenLuyen = data.kqRenLuyen || null;
    if (data.batchId !== undefined) updatePayload.batchId = data.batchId || null;
    if (data.registeredCampus !== undefined) updatePayload.registeredCampus = data.registeredCampus || null;
    if (data.admissionResult !== undefined) updatePayload.admissionResult = data.admissionResult;
    if (data.directorNote !== undefined) updatePayload.directorNote = data.directorNote;
    if (data.admissionCampus !== undefined) updatePayload.admissionCampus = data.admissionCampus;
    if (data.isAbsent !== undefined) updatePayload.isAbsent = Boolean(data.isAbsent);
    if (data.cityName !== undefined) updatePayload.cityName = data.cityName || null;
    if (data.districtName !== undefined) updatePayload.districtName = data.districtName || null;
    if (data.wardName !== undefined) updatePayload.wardName = data.wardName || null;
    if (data.countryName !== undefined) updatePayload.countryName = data.countryName || null;
    if (data.oldSchoolName !== undefined) updatePayload.oldSchoolName = data.oldSchoolName || null;
    if (data.oldSchoolType !== undefined) updatePayload.oldSchoolType = data.oldSchoolType || null;

    if (data.psychologyScore !== undefined && data.psychologyScore !== null && !isNaN(parseFloat(data.psychologyScore))) {
      updatePayload.psychologyScore = parseFloat(data.psychologyScore);
    }
    if (data.writtenEnglishScore !== undefined && data.writtenEnglishScore !== null && !isNaN(parseFloat(data.writtenEnglishScore))) {
      updatePayload.writtenEnglishScore = parseFloat(data.writtenEnglishScore);
    }
    if (data.oralEnglishScore !== undefined && data.oralEnglishScore !== null && !isNaN(parseFloat(data.oralEnglishScore))) {
      updatePayload.oralEnglishScore = parseFloat(data.oralEnglishScore);
    }
    if (data.mathScore !== undefined && data.mathScore !== null && !isNaN(parseFloat(data.mathScore))) {
      updatePayload.mathScore = parseFloat(data.mathScore);
    }
    if (data.literatureScore !== undefined && data.literatureScore !== null && !isNaN(parseFloat(data.literatureScore))) {
      updatePayload.literatureScore = parseFloat(data.literatureScore);
    }

    const result = await (prisma as any).inputAssessmentStudent.update({
      where: { id },
      data: updatePayload
    });

    // Auto-sync Student.studentType if admissionResult is updated
    if (data.admissionResult !== undefined) {
      try {
        const candidateCodes = [result.enrollmentCode, result.studentCode].map((c: any) => (c || "").trim().toUpperCase()).filter(Boolean);
        const matchingStudents = await prisma.student.findMany({
          where: {
            OR: [
              { studentCode: { in: candidateCodes } },
              result.enrollmentClassId && result.fullName ? {
                classId: result.enrollmentClassId,
                studentName: result.fullName.trim()
              } : undefined
            ].filter(Boolean) as any
          }
        });

        const resLower = String(data.admissionResult || "").toLowerCase();
        const isGiaoLuu = resLower.includes("giao lưu") || resLower.includes("giao luu");

        for (const ms of matchingStudents) {
          if (isGiaoLuu && ms.studentType !== "GIAO_LUU") {
            await prisma.student.update({
              where: { id: ms.id },
              data: {
                studentType: "GIAO_LUU",
                studentTypeNote: "Học giao lưu theo kết quả khảo sát đầu vào"
              }
            });
          } else if (!isGiaoLuu && ms.studentType === "GIAO_LUU" && (ms.studentTypeNote || "").includes("khảo sát")) {
            await prisma.student.update({
              where: { id: ms.id },
              data: {
                studentType: "CHINH_KHOA",
                studentTypeNote: null
              }
            });
          }
        }
      } catch (syncErr) {
        console.error("Auto sync Student.studentType error:", syncErr);
      }
    }

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
export async function PATCH(req: any) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, ids, targetPeriodId, targetBatchId } = body;

    if (action === "BULK_UPDATE_BATCH") {
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "Danh sách học sinh không hợp lệ" }, { status: 400 });
      }

      if (!targetPeriodId) {
        return NextResponse.json({ error: "Vui lòng chọn Kỳ khảo sát đích" }, { status: 400 });
      }

      const result = await (prisma as any).inputAssessmentStudent.updateMany({
        where: { id: { in: ids } },
        data: {
          periodId: targetPeriodId,
          batchId: targetBatchId || null
        }
      });

      return NextResponse.json({ success: true, count: result.count });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}