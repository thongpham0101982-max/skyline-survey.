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
      passedCount = students.filter(s => s.admissionResult === "Đạt" || s.admissionResult === "Học thử" || s.admissionResult === "Đạt - Giao lưu").length;
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
        const resultText = s.admissionResult || "Chưa xét duyệt";
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
</head>
<body style="margin:0; padding:0; background-color:#F1F5F9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
<table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F1F5F9" style="background-color:#F1F5F9; padding:24px 0;">
  <tr>
    <td align="center">
      <table width="760" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="max-width:760px; width:100%; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 4px 16px rgba(0,59,58,0.12); border:1px solid #CBD5E1;">

        <!-- HEADER -->
        <tr>
          <td bgcolor="#003B3A" style="background-color:#003B3A; background:linear-gradient(135deg, #003B3A 0%, #064E3B 60%, #007A72 100%); padding:28px 32px; text-align:center; border-bottom:4px solid #00A19A; color:#FFFFFF;">
            <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 10px auto;">
              <tr>
                <td bgcolor="#0B4A47" style="background-color:#0B4A47; border:1px solid #00A19A; border-radius:20px; padding:3px 14px; font-size:10.5px; font-weight:800; color:#5EEAD4; letter-spacing:1px; text-transform:uppercase;">
                  🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                </td>
              </tr>
            </table>
            <h1 style="margin:0; font-size:21px; font-weight:900; line-height:1.3; color:#FFFFFF; text-transform:uppercase;">
              YÊU CẦU XÉT DUYỆT KẾT QUẢ KHẢO SÁT
            </h1>
            <div style="font-size:12.5px; color:#E0F2FE; margin-top:6px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">
              ${isPreschool ? "BẬC MẦM NON" : "BẬC PHỔ THÔNG (K-12)"} &bull; CỔNG THÔNG TIN KHẢO SÁT
            </div>
          </td>
        </tr>

        <!-- GREETINGS & DESCR -->
        <tr>
          <td style="padding:24px 32px 14px 32px; background-color:#FFFFFF;">
            <p style="margin:0; font-size:14px; font-weight:800; color:#0F172A;">👋 Kính gửi Thầy/Cô Giám đốc Cơ sở,</p>
            <p style="margin:8px 0 0 0; font-size:13.5px; color:#334155; line-height:1.6;">
              Hội đồng Tuyển sinh kính gửi báo cáo kết quả khảo sát năng lực đầu vào và đề xuất Thầy/Cô thực hiện xem xét, phê duyệt cho các học sinh thuộc Đợt khảo sát sau:
            </p>
          </td>
        </tr>

        <!-- KY & DOT INFO -->
        <tr>
          <td style="padding:0 32px 18px 32px; background-color:#FFFFFF;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:16px 20px;">
              <tr>
                <td width="50%" style="vertical-align:middle;">
                  <div style="font-size:10px; font-weight:800; color:#64748B; text-transform:uppercase;">Kỳ Khảo Sát</div>
                  <div style="font-size:15px; font-weight:800; color:#003B3A; margin-top:2px;">${periodName}</div>
                </td>
                <td width="50%" align="right" style="vertical-align:middle;">
                  <div style="font-size:10px; font-weight:800; color:#64748B; text-transform:uppercase;">Đợt Khảo Sát</div>
                  <div style="font-size:15px; font-weight:800; color:#003B3A; margin-top:2px;">${batchName}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- STATS CARDS -->
        <tr>
          <td style="padding:0 32px 20px 32px; background-color:#FFFFFF;">
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td width="${isPreschool ? "23.5%" : "18.5%"}" bgcolor="#F0FDFA" style="padding:12px 6px; background-color:#F0FDFA; border:1px solid #CCFBF1; border-radius:10px; text-align:center; vertical-align:top;">
                  <div style="font-size:9.5px; font-weight:800; color:#0F766E; text-transform:uppercase;">Tổng Số HS</div>
                  <div style="font-size:20px; font-weight:900; color:#003B3A; margin-top:3px;">${totalStudentsCount}</div>
                  <div style="font-size:9.5px; color:#14B8A6;">học sinh</div>
                </td>
                <td width="1.8%"></td>
                <td width="${isPreschool ? "23.5%" : "18.5%"}" bgcolor="#ECFDF5" style="padding:12px 6px; background-color:#ECFDF5; border:1px solid #A7F3D0; border-radius:10px; text-align:center; vertical-align:top;">
                  <div style="font-size:9.5px; font-weight:800; color:#065F46; text-transform:uppercase;">Đạt / Học thử</div>
                  <div style="font-size:20px; font-weight:900; color:#047857; margin-top:3px;">${passed}</div>
                  <div style="font-size:9.5px; color:#10B981;">học sinh</div>
                </td>
                ${!isPreschool ? `
                <td width="1.8%"></td>
                <td width="18.5%" bgcolor="#FEF3C7" style="padding:12px 6px; background-color:#FEF3C7; border:1px solid #FDE68A; border-radius:10px; text-align:center; vertical-align:top;">
                  <div style="font-size:9.5px; font-weight:800; color:#92400E; text-transform:uppercase;">Đạt cam kết</div>
                  <div style="font-size:20px; font-weight:900; color:#B45309; margin-top:3px;">${committed}</div>
                  <div style="font-size:9.5px; color:#D97706;">học sinh</div>
                </td>
                ` : ""}
                <td width="1.8%"></td>
                <td width="${isPreschool ? "23.5%" : "18.5%"}" bgcolor="#FEF2F2" style="padding:12px 6px; background-color:#FEF2F2; border:1px solid #FECACA; border-radius:10px; text-align:center; vertical-align:top;">
                  <div style="font-size:9.5px; font-weight:800; color:#991B1B; text-transform:uppercase;">Không đạt</div>
                  <div style="font-size:20px; font-weight:900; color:#DC2626; margin-top:3px;">${failed}</div>
                  <div style="font-size:9.5px; color:#EF4444;">học sinh</div>
                </td>
                <td width="1.8%"></td>
                <td width="${isPreschool ? "23.5%" : "18.5%"}" bgcolor="#FFFBEB" style="padding:12px 6px; background-color:#FFFBEB; border:1px solid #FDE68A; border-radius:10px; text-align:center; vertical-align:top;">
                  <div style="font-size:9.5px; font-weight:800; color:#B45309; text-transform:uppercase;">Chưa duyệt</div>
                  <div style="font-size:20px; font-weight:900; color:#D97706; margin-top:3px;">${pending}</div>
                  <div style="font-size:9.5px; color:#F59E0B;">chờ duyệt</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- STUDENT TABLE -->
        <tr>
          <td style="padding:0 32px 24px 32px; background-color:#FFFFFF;">
            <h2 style="font-size:14px; font-weight:800; color:#003B3A; border-left:4px solid #00A19A; padding-left:10px; margin:0 0 14px 0; text-transform:uppercase; letter-spacing:0.5px;">
              Danh Sách Kết Quả Học Sinh (${totalStudentsCount} HS)
            </h2>
            <div style="border:1px solid #CBD5E1; border-radius:8px; overflow:hidden;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <thead>
                  <tr bgcolor="#003B3A" style="background-color:#003B3A; color:#FFFFFF;">
                    <th style="padding:10px 8px; text-align:center; font-size:11px; font-weight:800; color:#FFFFFF; text-transform:uppercase; width:7%; border-right:1px solid #065F46;">STT</th>
                    <th style="padding:10px 10px; text-align:left; font-size:11px; font-weight:800; color:#FFFFFF; text-transform:uppercase; border-right:1px solid #065F46;">Họ và Tên</th>
                    <th style="padding:10px 8px; text-align:center; font-size:11px; font-weight:800; color:#FFFFFF; text-transform:uppercase; width:15%; border-right:1px solid #065F46;">Mã HS</th>
                    <th style="padding:10px 8px; text-align:center; font-size:11px; font-weight:800; color:#FFFFFF; text-transform:uppercase; width:10%; border-right:1px solid #065F46;">Khối</th>
                    <th style="padding:10px 8px; text-align:center; font-size:11px; font-weight:800; color:#FFFFFF; text-transform:uppercase; width:15%; border-right:1px solid #065F46;">Ngày sinh</th>
                    <th style="padding:10px 8px; text-align:center; font-size:11px; font-weight:800; color:#FFFFFF; text-transform:uppercase; width:20%; border-right:1px solid #065F46;">Đề xuất</th>
                    <th style="padding:10px 10px; text-align:left; font-size:11px; font-weight:800; color:#FFFFFF; text-transform:uppercase; width:20%;">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          </td>
        </tr>

        <!-- ACTION BUTTON & INSTRUCTION -->
        <tr>
          <td style="padding:0 32px 28px 32px; background-color:#FFFFFF; text-align:center;">
            <p style="margin:0 0 16px 0; font-size:13px; color:#64748B; font-style:italic;">
              Vui lòng truy cập cổng thông tin quản lý để thực hiện phê duyệt chính thức kết quả khảo sát cho đợt tuyển sinh này.
            </p>

            <!-- Bulletproof Button -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 20px auto; border-collapse:separate;">
              <tr>
                <td align="center" bgcolor="#00A19A" style="border-radius:10px; background-color:#00A19A;">
                  <a href="${baseUrl}/admin/xet-duyet-ket-qua" target="_blank" style="display:inline-block; padding:13px 32px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size:13px; color:#FFFFFF; font-weight:800; text-decoration:none; border-radius:10px; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #00A19A;">
                    👉 PHÊ DUYỆT KẾT QUẢ KHẢO SÁT NGAY
                  </a>
                </td>
              </tr>
            </table>

            <!-- Instructions Box -->
            <div style="background-color:#F0FDFA; border:1px dashed #00A19A; border-radius:10px; padding:14px 18px; text-align:left; max-width:580px; margin:0 auto;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:top; width:28px; padding-top:2px;">
                    <div style="background-color:#00A19A; color:#FFFFFF; width:20px; height:20px; line-height:20px; border-radius:50%; text-align:center; font-size:11px; font-weight:bold;">i</div>
                  </td>
                  <td style="vertical-align:top;">
                    <div style="font-size:12.5px; font-weight:700; color:#004D47; margin-bottom:4px;">Hướng dẫn đăng nhập hệ thống:</div>
                    <div style="font-size:12px; color:#334155; line-height:1.5;">
                      &bull; Đăng nhập bằng <strong>mã số SKL</strong> của Thầy/Cô.<br>
                      &bull; <strong>Mật khẩu mặc định:</strong> Trùng với <strong>mã số SKL</strong> của Thầy/Cô.<br>
                      <span style="color:#B91C1C; font-weight:600; display:block; margin-top:3px;">* Vui lòng đổi mật khẩu ngay sau khi đăng nhập để đảm bảo an toàn thông tin.</span>
                    </div>
                  </td>
                </tr>
              </table>
            </div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td bgcolor="#003B3A" style="background-color:#003B3A; border-top:3px solid #00A19A; padding:22px 28px; text-align:center; font-size:11px; color:#CCFBF1; line-height:1.6;">
            <div style="font-weight:800; color:#FFFFFF; font-size:12px; text-transform:uppercase; letter-spacing:0.5px;">
              HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
            </div>
            <div style="color:#99F6E4; font-weight:600; margin-top:3px;">
              BAN ĐÀO TẠO &amp; KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
            </div>
            <div style="color:#5EEAD4; margin-top:6px; font-size:10.5px;">
              Email hỗ trợ: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color:#FDE047; text-decoration:none; font-weight:700;">bankhaothi@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" style="color:#FDE047; text-decoration:none; font-weight:700;">skylineschool.edu.vn</a>
            </div>
            <div style="color:#64748B; margin-top:8px; font-size:10px;">
              &copy; ${new Date().getFullYear()} Sky-Line School System. All rights reserved. &bull; Thư yêu cầu phê duyệt tự động từ Hệ thống Khảo sát Tuyển sinh Sky-Line
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
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
        const campusObj = campuses.find(c => c.id === campusId);
        
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
          groupPassed = group.filter(s => s.admissionResult === "Đạt" || s.admissionResult === "Học thử" || s.admissionResult === "Đạt - Giao lưu").length;
          groupFailed = group.filter(s => s.admissionResult === "Không đạt" || s.admissionResult === "Không đạt - Kiểm tra lại" || s.admissionResult === "Không đạt - Không kiểm tra lại").length;
          groupCommitted = group.filter(s => s.admissionResult === "Đạt cam kết").length;
          groupPending = totalGroup - groupPassed - groupFailed - groupCommitted;
        }

        const currentHtml = getEmailHtml(group, totalGroup, groupPassed, groupFailed, groupCommitted, groupPending);

        await sendEmail({
          to: currentGdcsEmail,
          subject: `[Sky-line SMS] Yêu cầu xét duyệt Đợt khảo sát: ${batchName} (${periodName})`,
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
      subject: `[Sky-line SMS] Yêu cầu xét duyệt Đợt khảo sát: ${batchName} (${periodName})`,
      html: emailHtml,
      replyTo: "bankhaothi@skylineschool.edu.vn"
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Batch email send error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
