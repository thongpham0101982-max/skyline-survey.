// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roleCode = (session.user as any)?.role || "";
  const isAdmin = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(roleCode);
  
  const currentTeacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: { id: true, position: true, departmentAssignments: true }
  }).catch(() => null);

  const isTTCM = currentTeacher?.position === "TTCM" || (currentTeacher?.departmentAssignments || []).some((da: any) => da.position === "TTCM");

  if (!isAdmin && !isTTCM) {
    return NextResponse.json({ error: "Bạn không có quyền thực hiện chức năng này." }, { status: 403 });
  }

  try {
    const { blockTab, academicYearId, month, toEmail, ccEmails, notes, departmentSummaries } = await req.json();

    if (!toEmail || !toEmail.includes("@")) {
      return NextResponse.json({ error: "Địa chỉ email người nhận không hợp lệ" }, { status: 400 });
    }

    const isSurpriseSlot = (slot: any) => {
      if (!slot) return false;
      return (
        slot.requestOrigin === "SURPRISE" ||
        (typeof slot.description === "string" && (slot.description.includes("[SURPRISE]") || slot.description.toLowerCase().includes("dự giờ đột xuất"))) ||
        (typeof slot.topic === "string" && slot.topic.toLowerCase().includes("đột xuất"))
      );
    };

    let deptSummaries = [];

    if (departmentSummaries && Array.isArray(departmentSummaries) && departmentSummaries.length > 0) {
      deptSummaries = departmentSummaries.map((d: any) => ({
        id: d.id,
        name: d.name,
        teacherCount: d.teacherCount || 0,
        ttcmName: d.ttcm?.teacherName || d.ttcmName || "Chưa gán TTCM",
        totalTaught: d.totalTaught || 0,
        taughtSurprise: d.taughtSurprise || 0,
        totalObserved: d.totalObserved || 0,
        observedSurprise: d.observedSurprise || 0
      }));
    } else {
      // 1. Fetch active Academic Year
      let activeYear = null;
      if (academicYearId) {
        activeYear = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
      }

      // 2. Fetch all departments with accurate blockCM match
      const allDepartments = await prisma.department.findMany({
        orderBy: { name: "asc" }
      });

      const activeDepartments = allDepartments.filter(dept => {
        if (!dept.blockCM || dept.blockCM === "" || dept.blockCM === "Hỗ trợ người học") return false;
        if (blockTab === "Mầm non" || blockTab === "mamnon") return dept.blockCM === "Mầm Non" || dept.blockCM === "MAM_NON";
        if (blockTab === "Điều hành" || blockTab === "dieuhanh") return dept.blockCM === "Điều hành" || dept.blockCM === "DIEU_HANH";
        return dept.blockCM === "Phổ thông" || dept.blockCM === "K12" || dept.blockType !== "MAM_NON";
      });

      // 3. Fetch all active teachers
      const allTeachers = await prisma.teacher.findMany({
        where: { status: "ACTIVE" },
        include: {
          departmentAssignments: true,
          departmentRel: true
        },
        orderBy: { teacherName: "asc" }
      });

      // 4. Fetch observation slots
      const whereSlotClause: any = {
        status: { in: ["ACTIVE", "PENDING_TEACHER_APPROVAL", "COMPLETED", "REJECTED", "OPEN", "EXPIRED"] }
      };

      if (activeYear) {
        whereSlotClause.OR = [
          { academicYearId: activeYear.id },
          {
            AND: [
              { academicYearId: null },
              {
                date: {
                  gte: activeYear.startDate,
                  lte: activeYear.endDate
                }
              }
            ]
          }
        ];
      }

      const allSlots = await prisma.observationSlot.findMany({
        where: whereSlotClause,
        include: {
          teacher: {
            select: { id: true, teacherName: true, teacherCode: true, departmentId: true }
          },
          registrations: {
            include: {
              teacher: {
                select: { id: true, teacherName: true, teacherCode: true, departmentId: true }
              },
              evaluation: true
            }
          }
        },
        orderBy: { date: "desc" }
      });

      // Filter slots by month
      const slots = month && month !== "all"
        ? allSlots.filter(s => {
            if (!s.date) return false;
            const d = new Date(s.date);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            return `${yyyy}-${mm}` === month;
          })
        : allSlots;

      // 5. Compute summary for each department
      deptSummaries = activeDepartments.map(dept => {
        const deptTeachersList = allTeachers.filter(t => 
          t.departmentId === dept.id || t.departmentAssignments?.some(da => da.departmentId === dept.id)
        );
        const teacherIds = new Set(deptTeachersList.map(t => t.id));

        const ttcm = deptTeachersList.find(t => 
          t.position === "TTCM" || t.departmentAssignments?.some(da => da.departmentId === dept.id && da.position === "TTCM")
        );

        let totalTaught = 0;
        let taughtSurprise = 0;
        let totalObserved = 0;
        let observedSurprise = 0;

        slots.forEach(slot => {
          const isHost = teacherIds.has(slot.teacherId);
          const increment = slot.isDoublePeriod ? 2 : 1;
          const hasEvaluations = slot.registrations?.some(
            r => r.evaluation !== null && r.evaluation !== undefined && r.evaluation?.reEvaluationStatus !== "DRAFT"
          );
          const isSurprise = isSurpriseSlot(slot);

          if (isHost && hasEvaluations) {
            totalTaught += increment;
            if (isSurprise) taughtSurprise += increment;
          }

          slot.registrations?.forEach(reg => {
            if (reg.isApproved && reg.evaluation && reg.evaluation?.reEvaluationStatus !== "DRAFT" && teacherIds.has(reg.teacherId)) {
              totalObserved += increment;
              if (isSurprise) observedSurprise += increment;
            }
          });
        });

        return {
          id: dept.id,
          name: dept.name,
          teacherCount: deptTeachersList.length,
          ttcmName: ttcm?.teacherName || "Chưa gán TTCM",
          totalTaught,
          taughtSurprise,
          totalObserved,
          observedSurprise
        };
      });
    }

    // Grand totals
    let grandTeachers = 0;
    let grandTaught = 0;
    let grandTaughtSurprise = 0;
    let grandObserved = 0;
    let grandObservedSurprise = 0;

    deptSummaries.forEach(d => {
      grandTeachers += d.teacherCount;
      grandTaught += d.totalTaught;
      grandTaughtSurprise += (d.taughtSurprise || 0);
      grandObserved += d.totalObserved;
      grandObservedSurprise += (d.observedSurprise || 0);
    });

    let monthLabel = "Toàn bộ năm học";
    if (month && month !== "all") {
      const [yyyy, mm] = month.split("-");
      monthLabel = `Tháng ${mm}/${yyyy}`;
    }

    const blockName = blockTab === "mamnon" ? "Bậc Mầm non" : (blockTab === "dieuhanh" ? "Khối Điều hành" : "Khối Phổ thông K-12");

    const host = req.headers.get("host") || "skyline-survey.vercel.app";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;
    const reportLink = `${baseUrl}/admin/tong-hop-du-gio`;

    const emailSubject = `[Sky-line SMS] Báo cáo Thống kê Tiến độ Các Tổ Chuyên Môn - Ban ĐHCM (${monthLabel})`;

    // 6. Generate HTML
    const deptRowsHtml = deptSummaries.map((dept, idx) => {
      return `
        <tr bgcolor="${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'}" style="border-bottom:1px solid #E2E8F0;">
          <td align="center" style="padding:10px 8px; font-size:12px; font-weight:700; color:#64748B;">${idx + 1}</td>
          <td style="padding:10px 12px; font-size:12px; font-weight:700; color:#0F172A;">
            <div style="font-size:13px; color:#003B3A; font-weight:800;">${dept.name}</div>
            <div style="font-size:10px; color:#64748B; font-weight:600; margin-top:2px;">
              TTCM: <span style="color:#047857; font-weight:700;">${dept.ttcmName}</span>
            </div>
          </td>
          <td align="center" style="padding:10px 8px; font-size:12px; font-weight:800; color:#334155;">
            <span style="display:inline-block; background-color:#F1F5F9; color:#1E293B; padding:3px 8px; border-radius:8px; border:1px solid #E2E8F0;">
              ${dept.teacherCount} GV
            </span>
          </td>
          <td align="center" style="padding:10px 8px;">
            <span style="display:inline-block; background-color:#ECFDF5; color:#047857; padding:4px 10px; border-radius:10px; font-weight:800; font-size:11px; border:1px solid #A7F3D0;">
              ${dept.totalTaught} tiết
            </span>
          </td>
          <td align="center" style="padding:10px 8px;">
            ${dept.taughtSurprise > 0 ? `
              <span style="display:inline-block; background-color:#FEF3C7; color:#92400E; padding:4px 8px; border-radius:10px; font-weight:800; font-size:11px; border:1px solid #FCD34D;">
                ⚡ ${dept.taughtSurprise} tiết
              </span>
            ` : `<span style="color:#94A3B8; font-size:11px; font-weight:600;">0</span>`}
          </td>
          <td align="center" style="padding:10px 8px;">
            <span style="display:inline-block; background-color:#F0F9FF; color:#0369A1; padding:4px 10px; border-radius:10px; font-weight:800; font-size:11px; border:1px solid #BAE6FD;">
              ${dept.totalObserved} lượt
            </span>
          </td>
          <td align="center" style="padding:10px 8px;">
            ${dept.observedSurprise > 0 ? `
              <span style="display:inline-block; background-color:#FEF3C7; color:#92400E; padding:4px 8px; border-radius:10px; font-weight:800; font-size:11px; border:1px solid #FCD34D;">
                ⚡ ${dept.observedSurprise} lượt
              </span>
            ` : `<span style="color:#94A3B8; font-size:11px; font-weight:600;">0</span>`}
          </td>
        </tr>
      `;
    }).join("");

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin:0; padding:0; background-color:#F1F5F9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F1F5F9" style="background-color:#F1F5F9; padding:24px 0;">
    <tr>
      <td align="center">
        <table width="740" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="max-width:740px; width:100%; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 4px 16px rgba(0,59,58,0.12); border:1px solid #CBD5E1;">
          
          <!-- Sky-Line Branded Header Banner -->
          <tr>
            <td bgcolor="#003B3A" style="background-color:#003B3A; background:linear-gradient(135deg, #003B3A 0%, #064E3B 60%, #007A72 100%); padding:28px 32px; color:#FFFFFF; border-bottom:4px solid #00A19A;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <!-- Skyline Logo Badge -->
                    <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                      <tr>
                        <td bgcolor="#0B4A47" style="background-color:#0B4A47; border:1px solid #00A19A; border-radius:20px; padding:3px 12px; font-size:10.5px; font-weight:800; color:#5EEAD4; letter-spacing:1px; text-transform:uppercase;">
                          🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                        </td>
                      </tr>
                    </table>
                    <h1 style="margin:0; font-size:21px; font-weight:900; line-height:1.3; color:#FFFFFF; text-transform:uppercase;">
                      📊 BÁO CÁO TIẾN ĐỘ CÁC TỔ CHUYÊN MÔN - BAN ĐIỀU HÀNH CHUYÊN MÔN
                    </h1>
                    <div style="font-size:13px; color:#E0F2FE; margin-top:6px; font-weight:600;">
                      Phạm vi: <strong style="color:#FDE047;">${blockName}</strong> &bull; Kỳ báo cáo: <strong style="color:#FDE047;">${monthLabel}</strong>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding:28px 32px; background-color:#FFFFFF;">
              <!-- Greeting -->
              <p style="margin:0 0 10px 0; font-size:14px; line-height:1.6; color:#0F172A;">
                👋 Kính gửi Quý Thầy/Cô <strong>Ban Điều hành Chuyên môn (Ban ĐHCM)</strong>, Ban Giám hiệu,
              </p>
              <p style="margin:0 0 20px 0; font-size:13px; line-height:1.6; color:#334155;">
                Ban Khảo thí &amp; ĐBCL kính gửi Ban Điều hành Chuyên môn bảng tổng hợp tiến độ thực hiện chỉ tiêu <strong>Tiết dạy</strong> và <strong>Tiết dự giờ</strong> của <strong>Tất cả các Tổ Chuyên môn</strong> thuộc <strong>${blockName}</strong> trong kỳ <strong>${monthLabel}</strong>:
              </p>

              <!-- Stats Summary Cards (Outlook-safe table grid) -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td width="23.5%" bgcolor="#F0FDFA" style="padding:14px 10px; background-color:#F0FDFA; border-radius:12px; border:1px solid #CCFBF1; text-align:center; vertical-align:top;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#0F766E;">Tổng Tổ &amp; GV</div>
                    <div style="font-size:18px; font-weight:900; color:#003B3A; margin-top:4px;">${deptSummaries.length} Tổ / ${grandTeachers} GV</div>
                  </td>
                  <td width="2%"></td>
                  <td width="23.5%" bgcolor="#ECFDF5" style="padding:14px 10px; background-color:#ECFDF5; border-radius:12px; border:1px solid #A7F3D0; text-align:center; vertical-align:top;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#065F46;">Tổng Tiết Dạy</div>
                    <div style="font-size:18px; font-weight:900; color:#047857; margin-top:4px;">${grandTaught} tiết</div>
                    <div style="font-size:10px; font-weight:700; color:#B45309; margin-top:2px;">⚡ ${grandTaughtSurprise} đột xuất</div>
                  </td>
                  <td width="2%"></td>
                  <td width="23.5%" bgcolor="#F0F9FF" style="padding:14px 10px; background-color:#F0F9FF; border-radius:12px; border:1px solid #BAE6FD; text-align:center; vertical-align:top;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#0369A1;">Tổng Tiết Dự</div>
                    <div style="font-size:18px; font-weight:900; color:#0284C7; margin-top:4px;">${grandObserved} lượt</div>
                    <div style="font-size:10px; font-weight:700; color:#B45309; margin-top:2px;">⚡ ${grandObservedSurprise} đột xuất</div>
                  </td>
                  <td width="2%"></td>
                  <td width="23.5%" bgcolor="#FEF3C7" style="padding:14px 10px; background-color:#FEF3C7; border-radius:12px; border:1px solid #FCD34D; text-align:center; vertical-align:top;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#92400E;">Tiết Đột Xuất (⚡)</div>
                    <div style="font-size:16px; font-weight:900; color:#B45309; margin-top:4px;">Dạy: ${grandTaughtSurprise} | Dự: ${grandObservedSurprise}</div>
                  </td>
                </tr>
              </table>

              <!-- Table: BẢNG THỐNG KÊ TIẾN ĐỘ CÁC TỔ CHUYÊN MÔN THEO THÁNG -->
              <div style="margin-bottom:24px;">
                <h3 style="margin:0 0 10px 0; font-size:13px; font-weight:900; text-transform:uppercase; color:#003B3A; letter-spacing:0.5px;">
                  BẢNG THỐNG KÊ TIẾN ĐỘ CÁC TỔ CHUYÊN MÔN THEO THÁNG (${deptSummaries.length} Tổ)
                </h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse; border:1px solid #CBD5E1; border-radius:8px; overflow:hidden;">
                  <thead>
                    <tr bgcolor="#003B3A" style="background-color:#003B3A; color:#FFFFFF; font-size:11px; font-weight:800; text-transform:uppercase;">
                      <th style="padding:10px 8px; text-align:center; width:35px; border-right:1px solid #065F46; color:#FFFFFF;">STT</th>
                      <th style="padding:10px 12px; text-align:left; border-right:1px solid #065F46; color:#FFFFFF;">Tổ Chuyên Môn</th>
                      <th style="padding:10px 8px; text-align:center; width:80px; border-right:1px solid #065F46; color:#FFFFFF;">Giáo Viên</th>
                      <th style="padding:10px 8px; text-align:center; width:95px; border-right:1px solid #065F46; color:#FFFFFF;">Tổng Dạy</th>
                      <th style="padding:10px 8px; text-align:center; width:95px; border-right:1px solid #065F46; color:#FDE047;">Dạy ĐX ⚡</th>
                      <th style="padding:10px 8px; text-align:center; width:95px; border-right:1px solid #065F46; color:#FFFFFF;">Tổng Dự</th>
                      <th style="padding:10px 8px; text-align:center; width:95px; color:#FDE047;">Dự ĐX ⚡</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${deptRowsHtml}
                  </tbody>
                  <tfoot>
                    <tr bgcolor="#F1F5F9" style="background-color:#F1F5F9; border-top:2px solid #94A3B8; font-weight:900; font-size:11px; color:#0F172A;">
                      <td colspan="2" style="padding:10px 12px; text-transform:uppercase; color:#003B3A;">TỔNG TOÀN BỘ (${deptSummaries.length} TỔ)</td>
                      <td align="center" style="padding:10px 8px;">${grandTeachers} GV</td>
                      <td align="center" style="padding:10px 8px; color:#047857;">${grandTaught} tiết</td>
                      <td align="center" style="padding:10px 8px; color:#92400E;">⚡ ${grandTaughtSurprise} tiết</td>
                      <td align="center" style="padding:10px 8px; color:#0369A1;">${grandObserved} lượt</td>
                      <td align="center" style="padding:10px 8px; color:#92400E;">⚡ ${grandObservedSurprise} lượt</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <!-- Important Explanation: Quy định tính Tiết dạy & Tiết dự -->
              <div style="margin-bottom:24px; padding:16px 20px; background-color:#F0FDFA; border:1px solid #CCFBF1; border-left:5px solid #00A19A; border-radius:10px;">
                <div style="font-size:12px; font-weight:900; color:#003B3A; text-transform:uppercase; margin-bottom:8px;">
                  📌 QUY ĐỊNH TÍNH TIẾT DẠY VÀ TIẾT DỰ GIỜ TRONG BÁO CÁO:
                </div>
                <ul style="margin:0; padding-left:18px; font-size:12px; color:#004D47; line-height:1.6;">
                  <li style="margin-bottom:4px;">
                    <strong>Tiết dạy hoàn thành:</strong> Chỉ được tính khi tiết dạy đã diễn ra, có người tham gia dự <strong>VÀ người dự ĐÃ NỘP PHIẾU ĐÁNH GIÁ</strong> trên hệ thống. <em>(Tiết đơn tính 1 tiết, tiết đôi tính 2 tiết)</em>.
                  </li>
                  <li style="margin-bottom:4px;">
                    <strong>Tiết dự hoàn thành:</strong> Chỉ được tính khi Giáo viên đã được duyệt dự <strong>VÀ ĐÃ HOÀN TẤT GỬI PHIẾU ĐÁNH GIÁ</strong> cho tiết học đó. <em>(Tiết đơn tính 1 lượt, tiết đôi tính 2 lượt)</em>.
                  </li>
                  <li style="margin-bottom:4px;">
                    <strong>Tiết đột xuất (⚡):</strong> Báo cáo tự động phân loại và thống kê riêng biệt số tiết dự giờ đột xuất và tiết dạy của GV được dự đột xuất.
                  </li>
                  <li>
                    <strong>Chỉ tiêu định mức:</strong> Được đối chiếu theo định mức (tháng hoặc năm học) đã được thiết lập cho từng Giáo viên bộ môn.
                  </li>
                </ul>
              </div>

              <!-- Note from sender if any -->
              ${notes ? `
              <div style="margin-bottom:24px; padding:14px 18px; background-color:#F0FDFA; border-left:4px solid #00A19A; border-radius:8px;">
                <strong style="font-size:12px; color:#0F766E; text-transform:uppercase; display:block; margin-bottom:4px;">💬 Ghi chú &amp; Lời nhắn:</strong>
                <p style="margin:0; font-size:12px; color:#003B3A; line-height:1.5; white-space:pre-wrap;">${notes}</p>
              </div>
              ` : ''}

              <!-- Bulletproof CTA Button (Outlook-safe table button) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 8px auto; border-collapse:separate;">
                <tr>
                  <td align="center" bgcolor="#00A19A" style="border-radius:10px; background-color:#00A19A;">
                    <a href="${reportLink}" target="_blank" style="display:inline-block; padding:14px 32px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size:13px; color:#FFFFFF; font-weight:800; text-decoration:none; border-radius:10px; text-transform:uppercase; letter-spacing:0.5px; border:1px solid #00A19A;">
                      👉 TRUY CẬP HỆ THỐNG SKYLINE SURVEY XEM CHI TIẾT
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Standard Sky-Line Signature Footer -->
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
                &copy; ${new Date().getFullYear()} Sky-Line School System. All rights reserved. &bull; Thư thông báo chuyên môn định kỳ từ Hệ thống SSM
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

    // 7. Send Email
    const mailRes = await sendEmail({
      to: toEmail,
      // cc removed per policy
      subject: emailSubject,
      html: emailHtml
    });

    if (!mailRes.success) {
      return NextResponse.json({
        error: mailRes.error || "Gửi email báo cáo tổng hợp thất bại qua SMTP"
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Báo cáo thống kê tiến độ các Tổ chuyên môn đã được gửi thành công đến ${toEmail}`
    });

  } catch (error: any) {
    console.error("Error sending all departments report:", error);
    return NextResponse.json({
      error: error.message || "Đã xảy ra lỗi trong quá trình gửi email báo cáo tổng hợp"
    }, { status: 500 });
  }
}
