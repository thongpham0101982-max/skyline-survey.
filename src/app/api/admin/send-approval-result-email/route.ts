// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";

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
          <td style="padding: 10px 12px; font-size: 12px; font-weight: 700; color: #64748B; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px 12px; font-size: 12px; font-family: monospace; font-weight: 800; color: #0284C7; text-align: center;">${s.studentCode || "—"}</td>
          <td style="padding: 10px 12px; font-size: 13px; font-weight: 800; color: #0F172A;">
            ${s.fullName || "—"}
          </td>
          <td style="padding: 10px 12px; font-size: 12px; color: #475569; text-align: center;">${dob}</td>
          <td style="padding: 10px 12px; font-size: 12px; color: #475569; text-align: center;">${gender}</td>
          <td style="padding: 10px 12px; font-size: 12px; font-weight: 700; color: #0369A1; text-align: center;">${grade}</td>
          <td style="padding: 10px 12px; font-size: 11px; font-weight: 600; color: #475569; text-align: center;">${system}</td>
          <td style="padding: 10px 12px; font-size: 11px; color: #475569; line-height: 1.4;">${scoreDetailHtml}</td>
          <td style="padding: 10px 12px; text-align: center;">
            <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; border-radius: 6px; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
              ${statusLabel}
            </span>
          </td>
          <td style="padding: 10px 12px; font-size: 11px; font-style: italic; color: #334155; line-height: 1.4;">
            ${directorNoteHtml}
          </td>
        </tr>
      `;
    }).join("");

    // 5. HTML Toàn thể Email chuyên nghiệp, hiện đại, thương hiệu Sky-Line
    const emailHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kết quả xét duyệt khảo sát</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 960px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); border: 1px solid #E2E8F0;">
          
          <!-- HEADER WITH BRAND GRADIENT -->
          <tr>
            <td style="background: linear-gradient(135deg, #007A87 0%, #0098A6 60%, #48BFE3 100%); padding: 32px 36px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #A5F3FC; margin-bottom: 6px;">
                      HỆ THỐNG GIÁO DỤC SKY-LINE • QUẢN LÝ KHẢO SÁT & XÉT TUYỂN
                    </div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #FFFFFF; line-height: 1.3; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      THÔNG BÁO KẾT QUẢ XÉT DUYỆT KHẢO SÁT ĐẦU VÀO
                    </h1>
                    <div style="margin-top: 8px; font-size: 13px; color: #E0F2FE; font-weight: 500;">
                      Đợt: <b style="color: #FFFFFF;">${finalBatchName}</b> • Cơ sở: <b style="color: #FFFFFF;">${finalCampusName}</b>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- APPROVER & CONTEXT INFO CARD -->
          <tr>
            <td style="padding: 24px 32px 16px 32px; background-color: #F8FAFC; border-bottom: 1px solid #E2E8F0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-size: 13px; line-height: 1.6; color: #334155;">
                    <div style="margin-bottom: 6px;">
                      <b>Kính gửi:</b> Giám đốc Cơ sở, Bộ phận Tư vấn Tuyển sinh và Ban Kiểm tra & Đảm bảo Chất lượng (KT&ĐBCL),
                    </div>
                    <div>
                      Hệ thống ghi nhận <b>${currentUserName}</b> (${approverRole || "Giám đốc Cơ sở"}) đã hoàn tất xét duyệt kết quả cho các học sinh thuộc <b>${finalBatchName}</b> (${finalPeriodName}) tại cơ sở <b>${finalCampusName}</b> vào lúc <b>${nowFormatted}</b>.
                    </div>
                    <div style="margin-top: 8px; padding: 10px 14px; background-color: #F0FDFA; border-left: 4px solid #007A87; border-radius: 6px; font-size: 12px; color: #0F766E;">
                      📌 <b>Các bên phối hợp:</b> Bộ phận Tư vấn Cơ sở căn cứ kết quả đã phê duyệt để liên hệ phụ huynh và triển khai thủ tục nhập học; Ban KT&ĐBCL theo dõi và lưu trữ hồ sơ theo quy chế.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- KPI SUMMARY METRICS -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 18px;">
                <tr>
                  <td align="center" style="padding: 4px;">
                    <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 12px; padding: 12px 16px; text-align: center;">
                      <div style="font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">Tổng hồ sơ</div>
                      <div style="font-size: 20px; font-weight: 900; color: #0284C7; margin-top: 2px;">${totalCount}</div>
                    </div>
                  </td>
                  <td align="center" style="padding: 4px;">
                    <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 12px 16px; text-align: center;">
                      <div style="font-size: 10px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 1px;">Đạt</div>
                      <div style="font-size: 20px; font-weight: 900; color: #059669; margin-top: 2px;">${passedCount}</div>
                    </div>
                  </td>
                  <td align="center" style="padding: 4px;">
                    <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 12px 16px; text-align: center;">
                      <div style="font-size: 10px; font-weight: 800; color: #B45309; text-transform: uppercase; letter-spacing: 1px;">Đạt cam kết</div>
                      <div style="font-size: 20px; font-weight: 900; color: #D97706; margin-top: 2px;">${committedCount}</div>
                    </div>
                  </td>
                  <td align="center" style="padding: 4px;">
                    <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 12px 16px; text-align: center;">
                      <div style="font-size: 10px; font-weight: 800; color: #B91C1C; text-transform: uppercase; letter-spacing: 1px;">Không đạt</div>
                      <div style="font-size: 20px; font-weight: 900; color: #DC2626; margin-top: 2px;">${failedCount}</div>
                    </div>
                  </td>
                  ${absentCount > 0 ? `
                  <td align="center" style="padding: 4px;">
                    <div style="background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 12px; padding: 12px 16px; text-align: center;">
                      <div style="font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 1px;">Vắng KS</div>
                      <div style="font-size: 20px; font-weight: 900; color: #64748B; margin-top: 2px;">${absentCount}</div>
                    </div>
                  </td>` : ""}
                </tr>
              </table>
            </td>
          </tr>

          <!-- TABLE TITLE -->
          <tr>
            <td style="padding: 24px 32px 12px 32px;">
              <h2 style="margin: 0; font-size: 15px; font-weight: 900; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px;">
                📋 Danh Sách Học Sinh & Kết Quả Xét Duyệt Chi Tiết
              </h2>
            </td>
          </tr>

          <!-- DATA TABLE (10 COLUMNS) -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="overflow-x: auto; border: 1px solid #CBD5E1; border-radius: 12px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; min-width: 860px; font-size: 12px;">
                  <thead>
                    <tr style="background: #F1F5F9; border-bottom: 2px solid #CBD5E1;">
                      <th style="padding: 10px 8px; font-weight: 800; color: #334155; text-align: center; width: 36px;">STT</th>
                      <th style="padding: 10px 8px; font-weight: 800; color: #334155; text-align: center; width: 90px;">Mã HS</th>
                      <th style="padding: 10px 12px; font-weight: 800; color: #334155; text-align: left; width: 140px;">Họ và Tên</th>
                      <th style="padding: 10px 8px; font-weight: 800; color: #334155; text-align: center; width: 80px;">Ngày sinh</th>
                      <th style="padding: 10px 8px; font-weight: 800; color: #334155; text-align: center; width: 60px;">Giới tính</th>
                      <th style="padding: 10px 8px; font-weight: 800; color: #334155; text-align: center; width: 60px;">Khối</th>
                      <th style="padding: 10px 8px; font-weight: 800; color: #334155; text-align: center; width: 80px;">Hệ</th>
                      <th style="padding: 10px 10px; font-weight: 800; color: #334155; text-align: left; width: 140px;">Điểm khảo sát</th>
                      <th style="padding: 10px 8px; font-weight: 800; color: #334155; text-align: center; width: 100px;">Kết quả</th>
                      <th style="padding: 10px 12px; font-weight: 800; color: #334155; text-align: left; width: 140px;">Ý kiến & Chỉ đạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>

          <!-- ACTION BUTTON & FOOTER -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; background-color: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center;">
              <a href="https://ssm.skylineschool.edu.vn/admin/xet-duyet-ket-qua" target="_blank" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #007A87 0%, #00B5E2 100%); color: #FFFFFF; font-size: 13px; font-weight: 800; text-decoration: none; border-radius: 12px; box-shadow: 0 4px 14px rgba(0, 122, 135, 0.25); text-transform: uppercase; letter-spacing: 0.5px;">
                🔗 Truy cập Cổng Quản lý để Xem Hồ sơ & Biên bản
              </a>
              <div style="margin-top: 18px; font-size: 11px; color: #94A3B8; line-height: 1.5;">
                Email này được gửi tự động từ <b>Hệ thống Quản lý Khảo sát Tuyển sinh Sky-line (Sky-line SMS)</b> khi Giám đốc Cơ sở xét duyệt kết quả.<br/>
                <b>Người nhận:</b> GĐCS, Tư vấn Cơ sở • <b>Đồng kính gửi (CC):</b> Ban KT&ĐBCL.<br/>
                Vui lòng không trả lời trực tiếp email này. Mọi thắc mắc xin liên hệ Ban KT&ĐBCL hoặc Bộ phận IT.
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
