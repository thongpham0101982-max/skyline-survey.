// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { executeEntranceWorkflowAction } from "@/lib/entrance-progress/entranceProgressEngine";
import { isOfficiallyApprovedConclusion } from "@/lib/entrance-progress/constants";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      periodId,
      periodName,
      batchId,
      batchName,
      campusId,
      campusName,
      students, // Array of student objects with details
      isPreschool,
      approverName,
      approverRole
    } = body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: "Không có dữ liệu học sinh để thông báo" }, { status: 400 });
    }

    const currentUserName = approverName || session.user.name || "Giám đốc Cơ sở";
    const currentUserEmail = session.user.email;

    // 1. Xác định chính xác Cơ sở (Campus) của đợt xét duyệt
    let targetCampus: any = null;
    try {
      if (campusId && campusId !== "all") {
        targetCampus = await prisma.campus.findUnique({
          where: { id: campusId },
          include: { 
            manager: {
              include: { teacher: true }
            } 
          }
        });
      }

      if (!targetCampus) {
        // Thử tìm theo campusName hoặc thông tin cơ sở của học sinh đầu tiên
        const rawSearch = (campusName || students[0]?.admissionCampus || students[0]?.registeredCampus || "").toUpperCase();
        let targetCode = "";
        if (rawSearch.includes("CS1") || rawSearch.includes("RIVERSIDE") || rawSearch.includes("CƠ SỞ 1")) targetCode = "CS1";
        else if (rawSearch.includes("CS2") || rawSearch.includes("CENTRAL") || rawSearch.includes("CƠ SỞ 2")) targetCode = "CS2";
        else if (rawSearch.includes("CS3") || rawSearch.includes("GLOBAL") || rawSearch.includes("CƠ SỞ 3")) targetCode = "CS3";
        else if (rawSearch.includes("CS4") || rawSearch.includes("HILL") || rawSearch.includes("CƠ SỞ 4")) targetCode = "CS4";
        else if (rawSearch.includes("CS5") || rawSearch.includes("BEACH") || rawSearch.includes("CƠ SỞ 5")) targetCode = "CS5";

        if (targetCode) {
          targetCampus = await prisma.campus.findFirst({
            where: { campusCode: targetCode },
            include: { 
              manager: {
                include: { teacher: true }
              } 
            }
          });
        }
      }
    } catch (campusErr) {
      console.warn("Could not resolve target campus:", campusErr);
    }

    const campusCode = (targetCampus?.campusCode || "").toUpperCase();
    const finalCampusName = targetCampus?.campusName || campusName || (campusCode ? `Cơ sở ${campusCode}` : "Sky-Line Education System");

    // 2. Thu thập danh sách email: GĐCS, Tư vấn Cơ sở, và Ban KT&ĐBCL
    const gdcsEmails = new Set<string>();
    const tuvanEmails = new Set<string>();
    const ktdbclEmails = new Set<string>();

    // --- A. Giám đốc Cơ sở (GĐCS) ---
    // (1) Manager từ Campus
    if (targetCampus?.manager?.teacher?.email && targetCampus.manager.teacher.email.includes("@")) {
      gdcsEmails.add(targetCampus.manager.teacher.email.trim());
    }
    if (targetCampus?.manager?.email && targetCampus.manager.email.includes("@")) {
      gdcsEmails.add(targetCampus.manager.email.trim());
    }

    // (2) User có vai trò GDCS phân công cho cơ sở này
    try {
      if (targetCampus?.id) {
        const gdcsAssignments = await prisma.userCampusAssignment.findMany({
          where: {
            campusId: targetCampus.id,
            user: { role: { in: ["GDCS", "GĐCS", "GD_CS", "GĐ_CS"] } }
          },
          include: { user: { include: { teacher: true } } }
        });
        gdcsAssignments.forEach((a: any) => {
          if (a.user?.teacher?.email && a.user.teacher.email.includes("@")) gdcsEmails.add(a.user.teacher.email.trim());
          if (a.user?.email && a.user.email.includes("@")) gdcsEmails.add(a.user.email.trim());
        });
      }
    } catch (e) {
      console.warn("Error fetching GDCS assignments:", e);
    }

    // (3) Nếu người đang đăng nhập duyệt là GDCS
    try {
      const userRole = (session?.user as any)?.role?.toUpperCase() || "";
      if (userRole.includes("GD") || userRole.includes("GĐ")) {
        const curTeacher = await prisma.teacher.findFirst({ where: { userId: session.user.id } });
        if (curTeacher?.email && curTeacher.email.includes("@")) gdcsEmails.add(curTeacher.email.trim());
        if (currentUserEmail && currentUserEmail.includes("@")) gdcsEmails.add(currentUserEmail.trim());
      }
    } catch (e) {}

    // (4) Danh bạ email GĐCS chính thức của Sky-Line (đảm bảo không bị thất lạc)
    const officialGdcsMap: Record<string, string[]> = {
      CS1: ["longtt@skylineschool.edu.vn", "gdcs.cs1@skylineschool.edu.vn"],
      CS2: ["khanhpt@skylineschool.edu.vn", "gdcs.cs2@skylineschool.edu.vn"],
      CS3: ["thanhtt@skylineschool.edu.vn", "gdcs.cs3@skylineschool.edu.vn"],
      CS4: ["trungct@skylineschool.edu.vn", "gdcs.cs4@skylineschool.edu.vn"],
      CS5: ["trungdq1@skylineschool.edu.vn", "gdcs.cs5@skylineschool.edu.vn"],
    };
    if (campusCode && officialGdcsMap[campusCode]) {
      officialGdcsMap[campusCode].forEach(e => gdcsEmails.add(e));
    }

    // --- B. Bộ phận Tư vấn Cơ sở (Tư vấn Tuyển sinh) ---
    // (1) Tra cứu giáo viên/nhân viên thuộc phòng ban Tư vấn / Tuyển sinh của cơ sở
    try {
      if (targetCampus?.id) {
        const tuvanTeachers = await prisma.teacher.findMany({
          where: {
            campusId: targetCampus.id,
            status: "ACTIVE",
            OR: [
              { departmentRel: { code: { in: ["TVAN", "TUVAN", "TUYENSINH", "TVTS"] } } },
              { departmentRel: { name: { contains: "tư vấn" } } },
              { departmentRel: { name: { contains: "tuyển sinh" } } },
              { departmentRel: { name: { contains: "Tư vấn" } } },
              { departmentRel: { name: { contains: "Tuyển sinh" } } },
              { user: { role: { in: ["TVAN", "TU_VAN", "TUYEN_SINH", "TVTS"] } } }
            ]
          },
          select: { email: true, teacherName: true, user: { select: { email: true } } }
        });
        tuvanTeachers.forEach((t: any) => {
          if (t.email && t.email.includes("@")) tuvanEmails.add(t.email.trim());
          if (t.user?.email && t.user.email.includes("@")) tuvanEmails.add(t.user.email.trim());
        });
      }
    } catch (tuvanErr) {
      console.warn("Error fetching Tu Van teachers:", tuvanErr);
    }

    // (2) Danh bạ email Tư vấn Tuyển sinh chuẩn theo từng Cơ sở
    const officialTuvanMap: Record<string, string[]> = {
      CS1: ["thuongttn@skylineschool.edu.vn", "tuyensinh.cs1@skylineschool.edu.vn"],
      CS2: ["hoaipt@skylineschool.edu.vn", "dinhnth@dkylineschool.edu.vn", "tuyensinh.cs2@skylineschool.edu.vn"],
      CS3: ["thungatt@skylineschool.edu.vn", "tuyensinh.cs3@skylineschool.edu.vn"],
      CS4: ["senttt@skylineschool.edu.vn", "tuyensinh.cs4@skylineschool.edu.vn"],
      CS5: ["linhnmh@skylineschool.edu.vn", "quyenttx@skylineschool.edu.vn", "tuyensinh.cs5@skylineschool.edu.vn"],
    };
    if (campusCode && officialTuvanMap[campusCode]) {
      officialTuvanMap[campusCode].forEach(e => tuvanEmails.add(e));
    }

    // --- C. Ban Kiểm tra & Đảm bảo Chất lượng (Ban KT&ĐBCL) ---
    // Theo yêu cầu chỉ định: Ban KT&ĐBCL chỉ gửi đến 3 địa chỉ:
    // 1. Thầy Dương Xuân Thắng: thangdx@skylineschool.edu.vn
    // 2. Hòm thư ban: ktdbcl@skylineschool.edu.vn
    // 3. Hòm thư khảo thí: bankhaothi@skylineschool.edu.vn
    ktdbclEmails.add("thangdx@skylineschool.edu.vn");
    ktdbclEmails.add("ktdbcl@skylineschool.edu.vn");
    ktdbclEmails.add("bankhaothi@skylineschool.edu.vn");

    // Phân bổ Người nhận chính (To: GĐCS & Tư vấn Cơ sở) và Đồng kính gửi (CC: Ban KT&ĐBCL)
    const toEmails = new Set<string>([...gdcsEmails, ...tuvanEmails]);
    const ccEmails = new Set<string>([...ktdbclEmails]);

    // Fallback an toàn nếu chưa có email nào
    if (toEmails.size === 0) {
      if (currentUserEmail && currentUserEmail.includes("@")) {
        toEmails.add(currentUserEmail.trim());
      } else {
        toEmails.add("ktdbcl@skylineschool.edu.vn");
      }
    }

    // 3. Thống kê số lượng kết quả
    const totalCount = students.length;
    let passedCount = 0;
    let committedCount = 0;
    let failedCount = 0;
    let absentCount = 0;
    let pendingCount = 0;

    students.forEach(s => {
      const res = String(s.admissionResult || "").trim().toLowerCase();
      if (s.isAbsent) {
        absentCount++;
      } else if (res.includes("cam kết")) {
        committedCount++;
      } else if (res.includes("đạt") || res.includes("miễn") || res.includes("học thử")) {
        passedCount++;
      } else if (res.includes("không đạt")) {
        failedCount++;
      } else {
        pendingCount++;
      }
    });

    const nowFormatted = new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Asia/Ho_Chi_Minh"
    }).format(new Date());

    const finalPeriodName = periodName || "Kỳ Khảo sát Tuyển sinh";
    const finalBatchName = batchName || "Đợt khảo sát";

    const emailSubject = `[Sky-line SMS - Xét Duyệt] Thông báo Kết quả Xét duyệt: ${finalBatchName} - ${finalCampusName}`;

    // 4. Xây dựng Bảng HTML 10 cột dữ liệu chuẩn mực, sang trọng
    const rowsHtml = students.map((s, idx) => {
      const dob = s.dateOfBirth
        ? new Date(s.dateOfBirth).toLocaleDateString("vi-VN")
        : (s.dob || "—");

      const gender = s.gender ? (s.gender === "FEMALE" || s.gender === "Nữ" ? "Nữ" : "Nam") : "—";
      const grade = s.grade ? `Khối ${s.grade}` : (s.className || "—");
      const system = s.surveySystem || s.surveyFormType || "—";
      const criteria = s.admissionCriteria || s.targetType || "—";

      // Trạng thái duyệt badge
      const rawRes = (s.admissionResult || "").trim();
      let badgeBg = "#F1F5F9";
      let badgeColor = "#475569";
      let badgeBorder = "#CBD5E1";
      let statusLabel = rawRes || "Chưa duyệt";

      if (s.isAbsent) {
        badgeBg = "#F1F5F9";
        badgeColor = "#64748B";
        badgeBorder = "#CBD5E1";
        statusLabel = "Vắng khảo sát";
      } else if (rawRes.toLowerCase().includes("cam kết")) {
        badgeBg = "#FEF3C7";
        badgeColor = "#92400E";
        badgeBorder = "#FCD34D";
        statusLabel = rawRes || "Đạt cam kết";
      } else if (rawRes.toLowerCase().includes("không đạt")) {
        badgeBg = "#FEE2E2";
        badgeColor = "#991B1B";
        badgeBorder = "#FCA5A5";
        statusLabel = rawRes || "Không đạt";
      } else if (rawRes.toLowerCase().includes("đạt") || rawRes.toLowerCase().includes("học thử") || rawRes.toLowerCase().includes("miễn")) {
        badgeBg = "#D1FAE5";
        badgeColor = "#065F46";
        badgeBorder = "#6EE7B7";
        statusLabel = rawRes || "Đạt";
      }

      // Kết quả chi tiết (Điểm chi tiết hoặc nhận xét đánh giá)
      let scoreDetailHtml = "—";
      if (s.detailedScoresText) {
        scoreDetailHtml = s.detailedScoresText;
      } else if (Array.isArray(s.scores) && s.scores.length > 0) {
        scoreDetailHtml = s.scores.map((sc: any) => {
          const subName = sc.subject?.name || sc.subjectName || "Môn";
          let scoreVal = "";
          try {
            const arr = Array.isArray(sc.scores) ? sc.scores : JSON.parse(sc.scores || "[]");
            scoreVal = arr.filter(Boolean).join(" | ") || "Chưa có điểm";
          } catch {
            scoreVal = String(sc.scores || "—");
          }
          return `<b>${subName}:</b> ${scoreVal}`;
        }).join("<br/>");
      }

      const directorNoteHtml = s.directorNote || s.notes || s.comment || "—";

      return `
        <tr style="border-bottom: 1px solid #E2E8F0; background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
          <td style="padding: 11px 8px; font-size: 12px; font-weight: 700; color: #64748B; text-align: center;">${idx + 1}</td>
          <td style="padding: 11px 8px; font-size: 12px; font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; font-weight: 800; color: #007A87; text-align: center;">${s.studentCode || "—"}</td>
          <td style="padding: 11px 12px; font-size: 13px; font-weight: 800; color: #0F172A;">
            ${s.fullName || "—"}
          </td>
          <td style="padding: 11px 8px; font-size: 12px; color: #475569; text-align: center;">${dob}</td>
          <td style="padding: 11px 8px; font-size: 12px; color: #475569; text-align: center;">${gender}</td>
          <td style="padding: 11px 8px; font-size: 12px; font-weight: 800; color: #003B3A; text-align: center;">${grade}</td>
          <td style="padding: 11px 8px; font-size: 11.5px; font-weight: 600; color: #475569; text-align: center;">${system}</td>
          <td style="padding: 11px 10px; font-size: 11.5px; color: #334155; line-height: 1.45;">${scoreDetailHtml}</td>
          <td style="padding: 11px 8px; text-align: center;">
            <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; border-radius: 6px; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
              ${statusLabel}
            </span>
          </td>
          <td style="padding: 11px 12px; font-size: 11.5px; font-style: italic; color: #334155; line-height: 1.45;">
            ${directorNoteHtml}
          </td>
        </tr>
      `;
    }).join("");

    // 5. HTML Toàn thể Email chuyên nghiệp, hiện đại, bám sát Brandname Sky-Line & tương thích 100% Microsoft Outlook
    const emailHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Thông báo Kết quả Xét duyệt Khảo sát Tuyển sinh - Hệ thống Giáo dục Sky-Line</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, h1, h2, p, a, div, span { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; color: #1E293B;">
  
  <!-- Preheader text (preview in email client) -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #FFFFFF; opacity: 0;">
    Thông báo Kết quả Xét duyệt Khảo sát Tuyển sinh Sky-Line: ${finalBatchName} - ${finalCampusName}. Kết quả: ${passedCount}/${totalCount} Đạt.
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9; padding: 24px 12px; min-width: 100%;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="max-width: 960px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0, 59, 58, 0.08); border: 1px solid #CBD5E1;">
          
          <!-- BRAND HEADER (OUTLOOK-PROOF DEEP PINE BGCOLOR + GRADIENT) -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; background: linear-gradient(135deg, #003B3A 0%, #064E3B 50%, #007A87 100%); padding: 32px 36px; text-align: left; border-bottom: 4px solid #00A19A;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                <tr>
                  <td bgcolor="#064E3B" style="background-color: #064E3B; border: 1px solid #00A19A; border-radius: 20px; padding: 4px 14px; font-size: 11px; font-weight: 800; color: #5EEAD4; letter-spacing: 1px; text-transform: uppercase;">
                    🏫 HỆ THỐNG GIÁO DỤC SKY-LINE &bull; QUẢN LÝ KHẢO SÁT &amp; XÉT TUYỂN
                  </td>
                </tr>
              </table>
              <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #FFFFFF; line-height: 1.35; letter-spacing: 0.5px; text-transform: uppercase;">
                THÔNG BÁO KẾT QUẢ XÉT DUYỆT KHẢO SÁT ĐẦU VÀO
              </h1>
              <div style="margin-top: 10px; font-size: 13px; color: #CCFBF1; font-weight: 500; line-height: 1.5;">
                Đợt: <strong style="color: #FDE047;">${finalBatchName}</strong> &bull; Cơ sở: <strong style="color: #FFFFFF;">${finalCampusName}</strong>
              </div>
            </td>
          </tr>

          <!-- APPROVER & CONTEXT INFO CARD -->
          <tr>
            <td style="padding: 24px 32px 20px 32px; background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
              <div style="font-size: 13.5px; line-height: 1.6; color: #334155;">
                <div style="margin-bottom: 8px;">
                  <strong style="color: #003B3A;">Kính gửi:</strong> Giám đốc Cơ sở, Bộ phận Tư vấn Tuyển sinh và Ban Kiểm tra &amp; Đảm bảo Chất lượng (KT&amp;ĐBCL),
                </div>
                <div>
                  Hệ thống ghi nhận <strong style="color: #003B3A;">${currentUserName}</strong> (${approverRole || "Giám đốc Cơ sở"}) đã hoàn tất xét duyệt kết quả cho các học sinh thuộc <strong style="color: #003B3A;">${finalBatchName}</strong> (${finalPeriodName}) tại cơ sở <strong style="color: #003B3A;">${finalCampusName}</strong> vào lúc <strong>${nowFormatted}</strong>.
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 14px; background-color: #F0FDFA; border-left: 4px solid #00A19A; border-radius: 6px;">
                  <tr>
                    <td style="padding: 12px 16px; font-size: 12.5px; color: #0F766E; line-height: 1.6;">
                      📌 <strong style="color: #003B3A;">Phân công trách nhiệm &amp; Phối hợp xử lý:</strong><br/>
                      &bull; <strong>Bộ phận Tư vấn Tuyển sinh Cơ sở:</strong> Căn cứ kết quả đã phê duyệt chính thức để liên hệ Quý Phụ huynh, thông báo kết quả và hướng dẫn triển khai thủ tục nhập học theo đúng thời hạn quy định.<br/>
                      &bull; <strong>Ban KT&amp;ĐBCL:</strong> Tiếp nhận dữ liệu, theo dõi và lưu trữ hồ sơ theo quy chuẩn bảo đảm chất lượng của Hệ thống Sky-Line.
                    </td>
                  </tr>
                </table>
              </div>

              <!-- KPI SUMMARY METRICS (TABLE-BASED WITH SOLID BGCOLORS) -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 18px;">
                <tr>
                  <td width="${absentCount > 0 ? '20%' : '24%'}" align="center" style="padding: 4px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#F0FDFA" align="center" style="background-color: #F0FDFA; border: 1px solid #CCFBF1; border-radius: 12px; padding: 12px 8px; text-align: center;">
                          <div style="font-size: 10px; font-weight: 800; color: #0F766E; text-transform: uppercase; letter-spacing: 0.8px;">Tổng hồ sơ</div>
                          <div style="font-size: 22px; font-weight: 900; color: #003B3A; margin-top: 3px;">${totalCount}</div>
                          <div style="font-size: 10px; color: #007A87; font-weight: 600;">học sinh</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="${absentCount > 0 ? '20%' : '24%'}" align="center" style="padding: 4px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#ECFDF5" align="center" style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 12px 8px; text-align: center;">
                          <div style="font-size: 10px; font-weight: 800; color: #065F46; text-transform: uppercase; letter-spacing: 0.8px;">Đạt / Học thử</div>
                          <div style="font-size: 22px; font-weight: 900; color: #059669; margin-top: 3px;">${passedCount}</div>
                          <div style="font-size: 10px; color: #10B981; font-weight: 600;">học sinh</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="${absentCount > 0 ? '20%' : '24%'}" align="center" style="padding: 4px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#FFFBEB" align="center" style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 12px 8px; text-align: center;">
                          <div style="font-size: 10px; font-weight: 800; color: #92400E; text-transform: uppercase; letter-spacing: 0.8px;">Đạt cam kết</div>
                          <div style="font-size: 22px; font-weight: 900; color: #D97706; margin-top: 3px;">${committedCount}</div>
                          <div style="font-size: 10px; color: #B45309; font-weight: 600;">học sinh</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="${absentCount > 0 ? '20%' : '24%'}" align="center" style="padding: 4px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#FEF2F2" align="center" style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 12px 8px; text-align: center;">
                          <div style="font-size: 10px; font-weight: 800; color: #991B1B; text-transform: uppercase; letter-spacing: 0.8px;">Không đạt</div>
                          <div style="font-size: 22px; font-weight: 900; color: #DC2626; margin-top: 3px;">${failedCount}</div>
                          <div style="font-size: 10px; color: #EF4444; font-weight: 600;">học sinh</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  ${absentCount > 0 ? `
                  <td width="20%" align="center" style="padding: 4px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#F1F5F9" align="center" style="background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 12px; padding: 12px 8px; text-align: center;">
                          <div style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">Vắng KS</div>
                          <div style="font-size: 22px; font-weight: 900; color: #64748B; margin-top: 3px;">${absentCount}</div>
                          <div style="font-size: 10px; color: #94A3B8; font-weight: 600;">học sinh</div>
                        </td>
                      </tr>
                    </table>
                  </td>` : ""}
                </tr>
              </table>
            </td>
          </tr>

          <!-- TABLE TITLE -->
          <tr>
            <td style="padding: 24px 32px 14px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left">
                    <h2 style="margin: 0; font-size: 15px; font-weight: 900; color: #003B3A; text-transform: uppercase; letter-spacing: 0.5px;">
                      📋 Danh Sách Học Sinh &amp; Kết Quả Xét Duyệt Chi Tiết
                    </h2>
                  </td>
                  <td align="right" style="font-size: 12px; font-weight: 700; color: #64748B;">
                    Tổng số: <strong style="color: #007A87;">${totalCount}</strong> học sinh
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DATA TABLE (10 COLUMNS WITH SKY-LINE DEEP PINE THEME) -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="overflow-x: auto; border: 1px solid #CBD5E1; border-radius: 10px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; min-width: 860px; font-size: 12px;">
                  <thead>
                    <tr bgcolor="#003B3A" style="background-color: #003B3A; border-bottom: 2px solid #00A19A;">
                      <th style="padding: 11px 8px; font-size: 11px; font-weight: 800; color: #FFFFFF; text-align: center; width: 36px; text-transform: uppercase; letter-spacing: 0.5px;">STT</th>
                      <th style="padding: 11px 8px; font-size: 11px; font-weight: 800; color: #FFFFFF; text-align: center; width: 90px; text-transform: uppercase; letter-spacing: 0.5px;">Mã HS</th>
                      <th style="padding: 11px 12px; font-size: 11px; font-weight: 800; color: #FFFFFF; text-align: left; width: 140px; text-transform: uppercase; letter-spacing: 0.5px;">Họ và Tên</th>
                      <th style="padding: 11px 8px; font-size: 11px; font-weight: 800; color: #FFFFFF; text-align: center; width: 80px; text-transform: uppercase; letter-spacing: 0.5px;">Ngày sinh</th>
                      <th style="padding: 11px 8px; font-size: 11px; font-weight: 800; color: #FFFFFF; text-align: center; width: 60px; text-transform: uppercase; letter-spacing: 0.5px;">Giới tính</th>
                      <th style="padding: 11px 8px; font-size: 11px; font-weight: 800; color: #FFFFFF; text-align: center; width: 60px; text-transform: uppercase; letter-spacing: 0.5px;">Khối</th>
                      <th style="padding: 11px 8px; font-size: 11px; font-weight: 800; color: #FFFFFF; text-align: center; width: 80px; text-transform: uppercase; letter-spacing: 0.5px;">Hệ</th>
                      <th style="padding: 11px 10px; font-size: 11px; font-weight: 800; color: #FFFFFF; text-align: left; width: 140px; text-transform: uppercase; letter-spacing: 0.5px;">Điểm khảo sát</th>
                      <th style="padding: 11px 8px; font-size: 11px; font-weight: 800; color: #FFFFFF; text-align: center; width: 110px; text-transform: uppercase; letter-spacing: 0.5px;">Kết quả</th>
                      <th style="padding: 11px 12px; font-size: 11px; font-weight: 800; color: #FFFFFF; text-align: left; width: 140px; text-transform: uppercase; letter-spacing: 0.5px;">Ý kiến &amp; Chỉ đạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>

          <!-- BULLETPROOF ACTION BUTTON (OUTLOOK COMPATIBLE) -->
          <tr>
            <td style="padding: 26px 32px 30px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                <tr>
                  <td align="center" bgcolor="#007A87" style="background-color: #007A87; background: linear-gradient(135deg, #003B3A 0%, #007A87 100%); border-radius: 10px; box-shadow: 0 4px 14px rgba(0, 59, 58, 0.25);">
                    <a href="https://ssm.skylineschool.edu.vn/admin/xet-duyet-ket-qua" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 800; color: #FFFFFF; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                      🔗 Truy Cập Cổng Quản Lý Để Xem Hồ Sơ &amp; Biên Bản &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- OFFICIAL SKY-LINE BRAND FOOTER -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; border-top: 3px solid #00A19A; padding: 24px 28px; text-align: center; font-size: 11px; color: #CCFBF1; line-height: 1.6;">
              <div style="font-weight: 800; color: #FFFFFF; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
              </div>
              <div style="color: #99F6E4; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 3px;">
                BAN ĐÀO TẠO &amp; KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC (KT&amp;ĐBCL)
              </div>
              <div style="margin-top: 8px; color: rgba(255, 255, 255, 0.85); font-size: 11px;">
                Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #FDE047; text-decoration: none; font-weight: 700;">ktdbcl@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #FDE047; text-decoration: none; font-weight: 700;">skylineschool.edu.vn</a>
              </div>
              <div style="margin-top: 10px; font-size: 10px; color: rgba(255, 255, 255, 0.5); line-height: 1.5;">
                Email này được gửi tự động từ <b>Hệ thống Quản lý Khảo sát Tuyển sinh Sky-Line (Sky-line SMS)</b> khi Giám đốc Cơ sở hoàn tất xét duyệt kết quả.<br/>
                <b>Người nhận chính (To):</b> Ban Giám đốc Cơ sở, Bộ phận Tư vấn Tuyển sinh &bull; <b>Đồng kính gửi (CC):</b> Ban KT&amp;ĐBCL.<br/>
                Vui lòng không trả lời trực tiếp email này. &copy; ${new Date().getFullYear()} Sky-Line Education System. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // 6. Gửi email qua SMTP
    const recipientsTo = Array.from(toEmails);
    const recipientsCc = Array.from(ccEmails);

    try {
      const actor = {
        id: (session.user as any)?.id || "gdcs_approver",
        fullName: currentUserName,
        role: (session.user as any)?.role || "GDCS",
        isSuperAdmin: Boolean((session.user as any)?.isSuperAdmin),
      };
      for (const st of students) {
        const stId = st.id ? String(st.id) : null;
        if (!stId) continue;
        const conclusion = st.admissionResult || st.surveyResult || "";
        if (isOfficiallyApprovedConclusion(conclusion)) {
          await executeEntranceWorkflowAction({
            action: "CONFIRM",
            targetScope: "STUDENT",
            isPreschool: Boolean(isPreschool),
            periodId: periodId || "PERIOD_APPROVAL",
            batchId: batchId || null,
            studentIds: [stId],
            stageNumber: 6,
            status: "COMPLETED",
            admissionResult: conclusion,
            note: st.directorNote || `GĐCS phê duyệt kết luận: ${conclusion}`,
            actor,
          });
          await executeEntranceWorkflowAction({
            action: "CONFIRM",
            targetScope: "STUDENT",
            isPreschool: Boolean(isPreschool),
            periodId: periodId || "PERIOD_APPROVAL",
            batchId: batchId || null,
            studentIds: [stId],
            stageNumber: 7,
            status: "COMPLETED",
            note: `Đã bàn giao kết quả xét duyệt qua email cho Tư vấn (${recipientsTo.join(", ")})`,
            actor,
          });
        }
      }
    } catch (wfSyncErr) {
      console.warn("Workflow Stage 6/7 sync warning:", wfSyncErr);
    }

    const sendResult = await sendEmail({
      to: recipientsTo,
      cc: recipientsCc.length > 0 ? recipientsCc : undefined,
      subject: emailSubject,
      html: emailHtml
    });

    return NextResponse.json({
      success: sendResult.success,
      sentToCount: recipientsTo.length,
      sentCcCount: recipientsCc.length,
      toRecipients: recipientsTo,
      ccRecipients: recipientsCc,
      error: sendResult.error
    });

  } catch (error: any) {
    console.error("API send-approval-result-email error:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ khi gửi email" }, { status: 500 });
  }
}
