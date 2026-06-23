// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { periodId, batchId, gdcsEmail, isPreschool } = await req.json();
    if (!periodId || !batchId || !gdcsEmail) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    let periodName = "Kỳ khảo sát";
    let batchName = "Tất cả các đợt";
    let students = [];

    if (isPreschool) {
      const periodObj = await prisma.preschoolInputAssessmentPeriod.findUnique({
        where: { id: periodId }
      });
      if (periodObj) periodName = periodObj.name;

      if (batchId !== "all") {
        const batchObj = await prisma.preschoolInputAssessmentBatch.findUnique({
          where: { id: batchId }
        });
        if (batchObj) batchName = batchObj.name;
      }

      const whereClause = { periodId };
      if (batchId && batchId !== "all") {
        whereClause.batchId = batchId;
      }
      students = await prisma.preschoolInputAssessmentStudent.findMany({
        where: whereClause,
        orderBy: { fullName: "asc" }
      });
    } else {
      const periodObj = await prisma.inputAssessmentPeriod.findUnique({
        where: { id: periodId }
      });
      if (periodObj) periodName = periodObj.name;

      if (batchId !== "all") {
        const batchObj = await prisma.inputAssessmentBatch.findUnique({
          where: { id: batchId }
        });
        if (batchObj) batchName = batchObj.name;
      }

      const whereClause = { periodId };
      if (batchId && batchId !== "all") {
        whereClause.batchId = batchId;
      }
      students = await prisma.inputAssessmentStudent.findMany({
        where: whereClause,
        orderBy: { fullName: "asc" }
      });
    }

    const totalStudents = students.length;
    let passedCount = 0;
    let failedCount = 0;
    let committedCount = 0;
    let pendingCount = 0;

    if (isPreschool) {
      passedCount = students.filter(s => s.admissionResult && (s.admissionResult.toUpperCase().includes("ĐẠT") || s.admissionResult === "Học thử")).length;
      failedCount = students.filter(s => s.admissionResult && s.admissionResult.toUpperCase().includes("KHÔNG")).length;
      pendingCount = totalStudents - passedCount - failedCount;
    } else {
      passedCount = students.filter(s => s.admissionResult === "Đạt" || s.admissionResult === "Học thử").length;
      failedCount = students.filter(s => s.admissionResult === "Không đạt" || s.admissionResult === "Không đạt - Kiểm tra lại" || s.admissionResult === "Không đạt - Không kiểm tra lại").length;
      committedCount = students.filter(s => s.admissionResult === "Đạt cam kết").length;
      pendingCount = totalStudents - passedCount - failedCount - committedCount;
    }

    const host = req.headers.get("host") || "skyline-survey-rh4k.vercel.app";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;

    const isOpenDay = !isPreschool && (periodName.toLowerCase().includes("open day") || periodName.toLowerCase().includes("openday"));

    const getEmailHtml = (studentGroup: any[], totalStudentsCount: number, passed: number, failed: number, committed: number, pending: number) => {
      const rowsHtml = studentGroup.map((s, idx) => {
        const dob = s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN") : "—";
        let resultText = s.admissionResult || "Chưa xét duyệt";
        let resColor = "#4b5563", resBg = "#f3f4f6", resBorder = "#e5e7eb";

        if (isPreschool) {
          if (resultText.toUpperCase().includes("ĐẠT")) {
            resColor = "#047857"; resBg = "#ecfdf5"; resBorder = "#a7f3d0";
          } else if (resultText.toUpperCase().includes("KHÔNG")) {
            resColor = "#b91c1c"; resBg = "#fef2f2"; resBorder = "#fecaca";
          } else if (resultText === "Học thử") {
            resColor = "#4338ca"; resBg = "#e0e7ff"; resBorder = "#c7d2fe";
          }
        } else {
          if (resultText === "Đạt") {
            resColor = "#047857"; resBg = "#ecfdf5"; resBorder = "#a7f3d0";
          } else if (resultText === "Đạt cam kết") {
            resColor = "#b45309"; resBg = "#fef3c7"; resBorder = "#fde68a";
          } else if (resultText.includes("Không đạt")) {
            resColor = "#b91c1c"; resBg = "#fef2f2"; resBorder = "#fecaca";
          } else if (resultText === "Học thử") {
            resColor = "#4338ca"; resBg = "#e0e7ff"; resBorder = "#c7d2fe";
          }
        }

        let detailNote = "";
        if (isPreschool) {
          detailNote = s.devAssessmentResult || s.devImportantNote || s.directorNote || "—";
        } else {
          detailNote = s.directorNote || "—";
        }
        if (detailNote.length > 50) {
          detailNote = detailNote.substring(0, 47) + "...";
        }

        return `
          <tr style="border-bottom:1px solid #f1f5f9; background:${idx % 2 === 0 ? "#fff" : "#f8fafc"};">
            <td style="padding:12px 10px; text-align:center; font-size:13px; font-weight:600; color:#64748b;" className="p-2 border border-slate-200">${idx + 1}</td>
            <td style="padding:12px 10px; font-size:13px; font-weight:700; color:#1E1B4B;" className="p-2 border border-slate-200">${s.fullName || "—"}</td>
            <td style="padding:12px 10px; text-align:center; font-size:13px; color:#334155;" className="p-2 border border-slate-200">${s.studentCode || "—"}</td>
            <td style="padding:12px 10px; text-align:center; font-size:13px; color:#334155;" className="p-2 border border-slate-200">K${s.grade || "—"}</td>
            <td style="padding:12px 10px; text-align:center; font-size:13px; color:#334155;" className="p-2 border border-slate-200">${dob}</td>
            <td style="padding:12px 10px; text-align:center;" className="p-2 border border-slate-200">
              <span style="display:inline-block; padding:4px 10px; border-radius:50px; font-size:10px; font-weight:700; color:${resColor}; background:${resBg}; border:1px solid ${resBorder}; text-transform:uppercase;">
                ${resultText}
              </span>
            </td>
            <td style="padding:12px 10px; font-size:13px; color:#4b5563;" className="p-2 border border-slate-200">${detailNote}</td>
          </tr>
        `;
      }).join("");

      return `
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Yêu cầu xét duyệt Đợt khảo sát</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
body{margin:0;padding:0;background:#f1f5f9;font-family:'Be Vietnam Pro', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;}
*{box-sizing:border-box;}
</style>
</head>
<body>
<div style="padding:32px 12px;background:#f1f5f9;">
  <div style="max-width:860px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,122,135,.1);border:1px solid #e2e8f0;">

    <!-- HEADER -->
    <div style="background-color: #00A6A9; background: linear-gradient(135deg, #00A6A9 0%, #007A87 100%); padding: 35px 30px; text-align: center; border-bottom: 3px solid #007A87;">
      <div style="display:inline-block;background:rgba(255,255,255,0.15);padding:5px 16px;border-radius:50px;margin-bottom:14px;border:1px solid rgba(255,255,255,0.2);">
        <span style="color:#ffffff !important; color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:2px;">Sky-Line Education System</span>
      </div>
      <h1 style="margin:0;color:#ffffff !important; color:#ffffff;font-size:22px;font-weight:800;text-transform:uppercase;letter-spacing:-0.5px;">Yêu cầu xét duyệt kết quả khảo sát</h1>
      <p style="margin:8px 0 0;color:#e0f7fa !important; color:#e0f7fa;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
        ${isPreschool ? "Bậc Mầm non" : "Bậc Phổ thông (K-12)"} - CỔNG THÔNG TIN KHẢO SÁT
      </p>
    </div>

    <!-- GREETINGS & DESCR -->
    <div style="padding:30px 32px 15px 32px;">
      <p style="margin:0;font-size:15px;font-weight:700;color:#1e293b;">Kính gửi Thầy/Cô Giám đốc Cơ sở,</p>
      <p style="margin:10px 0 0;font-size:14px;color:#475569;line-height:1.6;">
        Hội đồng Tuyển sinh kính gửi báo cáo kết quả khảo sát năng lực đầu vào và đề xuất Thầy/Cô thực hiện xem xét, phê duyệt cho các học sinh thuộc Đợt khảo sát sau:
      </p>
    </div>

    <!-- KY & DOT INFO -->
    <div style="padding:0 32px 20px 32px;">
      <div style="padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" className="border border-slate-200 border-collapse">
          <tr>
            <td width="50%" style="vertical-align:middle;padding-right:12px;" className="p-2 border border-slate-200">
              <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;">Kỳ Khảo sát</div>
              <div style="font-size:16px;font-weight:800;color:#1E1B4B;margin-top:3px;">${periodName}</div>
            </td>
            <td width="50%" style="vertical-align:middle;text-align:right;" className="p-2 border border-slate-200">
              <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;text-align:right;">Đợt Khảo sát</div>
              <div style="font-size:16px;font-weight:800;color:#1E1B4B;margin-top:3px;text-align:right;">${batchName}</div>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- STATS CARDS -->
    <div style="padding:0 32px 20px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" className="border border-slate-200 border-collapse">
        <tr>
          <td width="20%" style="padding-right:8px;" className="p-2 border border-slate-200">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center;">
              <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;">Tổng số HS</div>
              <div style="font-size:20px;font-weight:800;color:#1E1B4B;margin-top:4px;">${totalStudentsCount}</div>
            </div>
          </td>
          <td width="20%" style="padding-right:8px;" className="p-2 border border-slate-200">
            <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:12px;text-align:center;">
              <div style="font-size:9px;font-weight:700;color:#047857;text-transform:uppercase;">Đạt / Học thử</div>
              <div style="font-size:20px;font-weight:800;color:#059669;margin-top:4px;">${passed}</div>
            </div>
          </td>
          ${!isPreschool ? `
          <td width="20%" style="padding-right:8px;" className="p-2 border border-slate-200">
            <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:12px;text-align:center;">
              <div style="font-size:9px;font-weight:700;color:#b45309;text-transform:uppercase;">Đạt cam kết</div>
              <div style="font-size:20px;font-weight:800;color:#d97706;margin-top:4px;">${committed}</div>
            </div>
          </td>
          ` : ""}
          <td width="20%" style="padding-right:8px;" className="p-2 border border-slate-200">
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px;text-align:center;">
              <div style="font-size:9px;font-weight:700;color:#b91c1c;text-transform:uppercase;">Không đạt</div>
              <div style="font-size:20px;font-weight:800;color:#dc2626;margin-top:4px;">${failed}</div>
            </div>
          </td>
          <td width="20%" className="p-2 border border-slate-200">
            <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:10px;padding:12px;text-align:center;">
              <div style="font-size:9px;font-weight:700;color:#d97706;text-transform:uppercase;">Chưa duyệt</div>
              <div style="font-size:20px;font-weight:800;color:#b45309;margin-top:4px;">${pending}</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- STUDENT TABLE -->
    <div style="padding:10px 32px 30px 32px;">
      <h2 style="font-size:15px;font-weight:800;color:#1E1B4B;border-left:4px solid #00A6A9;padding-left:12px;margin:0 0 16px;text-transform:uppercase;letter-spacing:0.5px;">Danh sách kết quả học sinh</h2>
      <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;" className="border border-slate-200 border-collapse">
          <thead>
            <tr style="background:#00A6A9;">
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;width:7%;" className="p-2 border border-slate-200">STT</th>
              <th style="padding:12px 10px;text-align:left;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;" className="p-2 border border-slate-200">Họ và Tên</th>
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;width:15%;" className="p-2 border border-slate-200">Mã HS</th>
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;width:10%;" className="p-2 border border-slate-200">Khối</th>
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;width:15%;" className="p-2 border border-slate-200">Ngày sinh</th>
              <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;width:20%;" className="p-2 border border-slate-200">Đề xuất</th>
              <th style="padding:12px 10px;text-align:left;font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;width:20%;" className="p-2 border border-slate-200">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ACTION BUTTON & INSTRUCTION -->
    <div style="padding: 10px 32px 30px 32px; text-align: center;">
      <p style="margin: 0 0 15px 0; font-size: 13px; color: #64748b; font-style: italic;">
        Vui lòng truy cập cổng thông tin quản lý để thực hiện phê duyệt chính thức kết quả khảo sát cho đợt tuyển sinh này.
      </p>
      <a href="${baseUrl}/admin/xet-duyet-ket-qua" style="display: inline-block; padding: 12px 28px; border-radius: 12px; font-size: 14px; font-weight: bold; color: #ffffff; background-color: #00A6A9; text-decoration: none; border: 1px solid #007A87; box-shadow: 0 4px 6px -1px rgba(0, 166, 169, 0.2); margin-bottom: 25px;">
        Phê Duyệt Kết Quả Khảo Sát
      </a>

      <!-- Premium Login Instruction Box -->
      <div style="background: #f0fdfa; border: 1px dashed #0d9488; border-radius: 12px; padding: 16px 20px; text-align: left; max-width: 600px; margin: 0 auto;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" className="border border-slate-200 border-collapse">
          <tr>
            <td style="vertical-align: top; width: 32px; padding-top: 2px;" className="p-2 border border-slate-200">
              <span style="display: inline-block; background: #0d9488; color: #fff; width: 22px; height: 22px; line-height: 22px; border-radius: 50%; text-align: center; font-size: 12px; font-weight: bold;">i</span>
            </td>
            <td style="vertical-align: top;" className="p-2 border border-slate-200">
              <div style="font-size: 13px; font-weight: 700; color: #0f766e; margin-bottom: 6px;">Hướng dẫn đăng nhập hệ thống:</div>
              <div style="font-size: 12px; color: #374151; line-height: 1.6;">
                • Để đăng nhập Hệ thống vui lòng đăng nhập <strong>mã số SKL</strong> của Thầy/Cô.<br>
                • <strong>Pass:</strong> Trùng với <strong>mã số SKL</strong> của Thầy/Cô.<br>
                <span style="color: #b91c1c; font-weight: 600; display: block; margin-top: 4px;">* Vui lòng đổi Mật khẩu ngay sau khi đăng nhập để bảo mật thông tin.</span>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="background:#f8fafc;padding:24px 32px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#1E1B4B;text-transform:uppercase;letter-spacing:.5px;">Hệ thống Quản trị Chất lượng Dạy và Học</p>
      <p style="margin:6px 0 0;font-size:11px;color:#cbd5e1;">Email tự động gửi từ Hệ thống Khảo sát Tuyển sinh Sky-Line</p>
    </div>
  </div>
</div>
</body>
</html>`;
    };

    if (isOpenDay) {
      // Group students by registeredCampus
      // Load all campuses
      const campuses = await prisma.campus.findMany({
        include: {
          manager: {
            include: {
              teacher: {
                select: {
                  email: true
                }
              }
            }
          }
        }
      });

      // Find batch's default campus as fallback
      let fallbackCampusId = null;
      if (!isPreschool) {
        if (batchId !== "all") {
          const batchObj = await prisma.inputAssessmentBatch.findUnique({
            where: { id: batchId }
          });
          if (batchObj) fallbackCampusId = batchObj.campusId;
        }
        if (!fallbackCampusId) {
          const periodObj = await prisma.inputAssessmentPeriod.findUnique({
            where: { id: periodId }
          });
          if (periodObj) fallbackCampusId = periodObj.campusId;
        }
      }

      // Grouping dictionary
      const groupedStudents: Record<string, typeof students> = {};
      for (const s of students) {
        const cId = s.registeredCampus || fallbackCampusId || "DEFAULT";
        if (!groupedStudents[cId]) {
          groupedStudents[cId] = [];
        }
        groupedStudents[cId].push(s);
      }

      const staticEmails: Record<string, string> = {
        CS1: "gdcs.cs1@skylineschool.edu.vn",
        CS2: "gdcs.cs2@skylineschool.edu.vn",
        CS3: "gdcs.cs3@skylineschool.edu.vn",
        CS4: "gdcs.cs4@skylineschool.edu.vn",
        CS5: "gdcs.cs5@skylineschool.edu.vn",
      };

      const sentSummary: Record<string, number> = {};

      for (const [campusId, group] of Object.entries(groupedStudents)) {
        let currentGdcsEmail = null;
        let campusObj = campuses.find(c => c.id === campusId);
        
        if (campusObj) {
          const managerEmail = campusObj.manager?.teacher?.email || campusObj.manager?.email;
          if (managerEmail && managerEmail.includes('@')) {
            currentGdcsEmail = managerEmail;
          } else {
            const code = campusObj.campusCode?.toUpperCase();
            currentGdcsEmail = staticEmails[code];
          }
        }
        
        if (!currentGdcsEmail) {
          currentGdcsEmail = gdcsEmail || staticEmails.CS1;
        }

        const totalGroup = group.length;
        let groupPassed = 0;
        let groupFailed = 0;
        let groupCommitted = 0;
        let groupPending = 0;

        if (isPreschool) {
          groupPassed = group.filter(s => s.admissionResult && (s.admissionResult.toUpperCase().includes("ĐẠT") || s.admissionResult === "Học thử")).length;
          groupFailed = group.filter(s => s.admissionResult && s.admissionResult.toUpperCase().includes("KHÔNG")).length;
          groupPending = totalGroup - groupPassed - groupFailed;
        } else {
          groupPassed = group.filter(s => s.admissionResult === "Đạt" || s.admissionResult === "Học thử").length;
          groupFailed = group.filter(s => s.admissionResult === "Không đạt" || s.admissionResult === "Không đạt - Kiểm tra lại" || s.admissionResult === "Không đạt - Không kiểm tra lại").length;
          groupCommitted = group.filter(s => s.admissionResult === "Đạt cam kết").length;
          groupPending = totalGroup - groupPassed - groupFailed - groupCommitted;
        }

        const currentHtml = getEmailHtml(group, totalGroup, groupPassed, groupFailed, groupCommitted, groupPending);

        await sendEmail({
          to: currentGdcsEmail,
          subject: `[Sky-Line] Yêu cầu xét duyệt Đợt khảo sát: ${batchName} (${periodName})`,
          html: currentHtml,
          replyTo: "bankhaothi@skylineschool.edu.vn"
        });

        sentSummary[currentGdcsEmail] = (sentSummary[currentGdcsEmail] || 0) + totalGroup;
      }

      return NextResponse.json({ success: true, groupedSent: sentSummary });
    }

    const emailHtml = getEmailHtml(students, totalStudents, passedCount, failedCount, committedCount, pendingCount);

    await sendEmail({
      to: gdcsEmail,
      subject: `[Sky-Line] Yêu cầu xét duyệt Đợt khảo sát: ${batchName} (${periodName})`,
      html: emailHtml,
      replyTo: "bankhaothi@skylineschool.edu.vn"
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Batch email send error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
