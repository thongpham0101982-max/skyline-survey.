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
    const { blockTab, academicYearId, month, toEmail, ccEmails, notes } = await req.json();

    if (!toEmail || !toEmail.includes("@")) {
      return NextResponse.json({ error: "Địa chỉ email người nhận không hợp lệ" }, { status: 400 });
    }

    // 1. Fetch active Academic Year
    let activeYear = null;
    if (academicYearId) {
      activeYear = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
    }

    // 2. Fetch all departments
    const allDepartments = await prisma.department.findMany({
      orderBy: { name: "asc" }
    });

    const activeDepartments = allDepartments.filter(dept => {
      if (blockTab === "mamnon") return dept.blockCM === "MAM_NON";
      if (blockTab === "dieuhanh") return dept.blockCM === "DIEU_HANH";
      return dept.blockCM === "K12" || (!dept.blockCM && dept.blockType !== "MAM_NON");
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
      status: { in: ["ACTIVE", "PENDING_TEACHER_APPROVAL", "OPEN", "EXPIRED"] }
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
    const deptSummaries = activeDepartments.map(dept => {
      const deptTeachersList = allTeachers.filter(t => 
        t.departmentId === dept.id || t.departmentAssignments?.some(da => da.departmentId === dept.id)
      );
      const teacherIds = new Set(deptTeachersList.map(t => t.id));

      const ttcm = deptTeachersList.find(t => 
        t.position === "TTCM" || t.departmentAssignments?.some(da => da.departmentId === dept.id && da.position === "TTCM")
      );

      let totalTaught = 0;
      let totalObserved = 0;
      let totalEvals = 0;
      let passingEvals = 0;

      slots.forEach(slot => {
        const isHost = teacherIds.has(slot.teacherId);
        const increment = slot.isDoublePeriod ? 2 : 1;
        const hasEvaluations = slot.registrations?.some(r => r.evaluation !== null && r.evaluation !== undefined);

        if (isHost) {
          if (hasEvaluations) {
            totalTaught += increment;
          }
          slot.registrations?.forEach(r => {
            if (r.evaluation) {
              totalEvals++;
              const isK12 = slot.level !== "Mầm non";
              const passed = isK12
                ? (r.evaluation.totalScore !== null && r.evaluation.totalScore !== undefined ? r.evaluation.totalScore >= 14 : (r.evaluation.overallRating === "Giỏi" || r.evaluation.overallRating === "Khá"))
                : (r.evaluation.overallRating === "Tốt" || r.evaluation.overallRating === "Khá" || r.evaluation.overallRating === "Đạt");
              if (passed) passingEvals++;
            }
          });
        }

        slot.registrations?.forEach(reg => {
          if (reg.isApproved && reg.evaluation && teacherIds.has(reg.teacherId)) {
            totalObserved += increment;
          }
        });
      });

      const passRate = totalEvals > 0 ? Math.round((passingEvals / totalEvals) * 100) : 0;

      return {
        id: dept.id,
        name: dept.name,
        teacherCount: deptTeachersList.length,
        ttcmName: ttcm?.teacherName || "Chưa gán TTCM",
        totalTaught,
        totalObserved,
        totalEvals,
        passingEvals,
        passRate
      };
    });

    // Grand totals
    let grandTeachers = 0;
    let grandTaught = 0;
    let grandObserved = 0;
    let grandEvals = 0;
    let grandPassingEvals = 0;

    deptSummaries.forEach(d => {
      grandTeachers += d.teacherCount;
      grandTaught += d.totalTaught;
      grandObserved += d.totalObserved;
      grandEvals += d.totalEvals;
      grandPassingEvals += d.passingEvals;
    });

    const grandPassRate = grandEvals > 0 ? Math.round((grandPassingEvals / grandEvals) * 100) : 0;

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

    const emailSubject = `[Skyline School] Báo cáo Thống kê Tiến độ Các Tổ Chuyên Môn - Ban ĐHCM (${monthLabel})`;

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
            <span style="display:inline-block; background-color:#F0F9FF; color:#0369A1; padding:4px 10px; border-radius:10px; font-weight:800; font-size:11px; border:1px solid #BAE6FD;">
              ${dept.totalObserved} lượt
            </span>
          </td>
          <td align="center" style="padding:10px 8px;">
            <span style="display:inline-block; background-color:${dept.passRate >= 80 ? '#ECFDF5' : (dept.passRate > 0 ? '#FFFBEB' : '#F8FAFC')}; color:${dept.passRate >= 80 ? '#047857' : (dept.passRate > 0 ? '#B45309' : '#64748B')}; padding:3px 8px; border-radius:8px; font-weight:800; font-size:11px; border:1px solid ${dept.passRate >= 80 ? '#A7F3D0' : '#E2E8F0'};">
              ${dept.totalEvals > 0 ? dept.passRate + '%' : '--'}
            </span>
            ${dept.totalEvals > 0 ? '<div style="font-size:9px; color:#94A3B8; font-weight:600; margin-top:2px;">(' + dept.passingEvals + '/' + dept.totalEvals + ' phiếu)</div>' : ''}
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
            <td bgcolor="#003B3A" style="background-color:#003B3A; background:linear-gradient(135deg, #003B3A 0%, #064E3B 60%, #0369A1 100%); padding:28px 32px; color:#FFFFFF; border-bottom:4px solid #48BFE3;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <!-- Skyline Logo Badge -->
                    <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                      <tr>
                        <td bgcolor="#0B4A47" style="background-color:#0B4A47; border:1px solid #48BFE3; border-radius:20px; padding:3px 12px; font-size:10.5px; font-weight:800; color:#48BFE3; letter-spacing:1px; text-transform:uppercase;">
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
                Ban Khảo thí & ĐBCL kính gửi Ban Điều hành Chuyên môn bảng tổng hợp tiến độ thực hiện chỉ tiêu <strong>Tiết dạy</strong> và <strong>Tiết dự giờ</strong> của <strong>Tất cả các Tổ Chuyên môn</strong> thuộc <strong>${blockName}</strong> trong kỳ <strong>${monthLabel}</strong>:
              </p>

              <!-- Stats Summary Cards -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td width="23%" bgcolor="#F8FAFC" style="padding:12px 8px; background-color:#F8FAFC; border-radius:12px; border:1px solid #E2E8F0; text-align:center;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#64748B;">Tổng Tổ & GV</div>
                    <div style="font-size:18px; font-weight:900; color:#003B3A; margin-top:4px;">${deptSummaries.length} Tổ / ${grandTeachers} GV</div>
                  </td>
                  <td width="2%"></td>
                  <td width="23%" bgcolor="#ECFDF5" style="padding:12px 8px; background-color:#ECFDF5; border-radius:12px; border:1px solid #A7F3D0; text-align:center;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#065F46;">Tổng Tiết Dạy</div>
                    <div style="font-size:18px; font-weight:900; color:#047857; margin-top:4px;">${grandTaught} tiết</div>
                  </td>
                  <td width="2%"></td>
                  <td width="23%" bgcolor="#F0F9FF" style="padding:12px 8px; background-color:#F0F9FF; border-radius:12px; border:1px solid #BAE6FD; text-align:center;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#0369A1;">Tổng Tiết Dự</div>
                    <div style="font-size:18px; font-weight:900; color:#0284C7; margin-top:4px;">${grandObserved} lượt</div>
                  </td>
                  <td width="2%"></td>
                  <td width="23%" bgcolor="#FEF3C7" style="padding:12px 8px; background-color:#FEF3C7; border-radius:12px; border:1px solid #FDE68A; text-align:center;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#92400E;">Đạt Chuẩn Chung</div>
                    <div style="font-size:18px; font-weight:900; color:#B45309; margin-top:4px;">${grandPassRate}%</div>
                  </td>
                </tr>
              </table>

              <!-- Table: BẢNG THỐNG KÊ TIẾN ĐỘ CÁC TỔ CHUYÊN MÔN THEO THÁNG (No icons in rows) -->
              <div style="margin-bottom:24px;">
                <h3 style="margin:0 0 10px 0; font-size:13px; font-weight:900; text-transform:uppercase; color:#003B3A; letter-spacing:0.5px;">
                  BẢNG THỐNG KÊ TIẾN ĐỘ CÁC TỔ CHUYÊN MÔN THEO THÁNG (${deptSummaries.length} Tổ)
                </h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse; border:1px solid #CBD5E1; border-radius:8px; overflow:hidden;">
                  <thead>
                    <tr bgcolor="#003B3A" style="background-color:#003B3A; color:#FFFFFF; font-size:11px; font-weight:800; text-transform:uppercase;">
                      <th style="padding:10px 8px; text-align:center; width:35px; border-right:1px solid #065F46; color:#FFFFFF;">STT</th>
                      <th style="padding:10px 12px; text-align:left; border-right:1px solid #065F46; color:#FFFFFF;">Tổ Chuyên Môn</th>
                      <th style="padding:10px 8px; text-align:center; width:100px; border-right:1px solid #065F46; color:#FFFFFF;">Giáo Viên Tổ</th>
                      <th style="padding:10px 8px; text-align:center; width:120px; border-right:1px solid #065F46; color:#FFFFFF;">Tổng Tiết Dạy</th>
                      <th style="padding:10px 8px; text-align:center; width:120px; border-right:1px solid #065F46; color:#FFFFFF;">Tổng Tiết Dự</th>
                      <th style="padding:10px 8px; text-align:center; width:120px; color:#FFFFFF;">Tỷ Lệ Đạt Chuẩn</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${deptRowsHtml}
                  </tbody>
                </table>
              </div>

              <!-- Important Explanation: Quy định tính Tiết dạy & Tiết dự -->
              <div style="margin-bottom:24px; padding:16px 20px; background-color:#F0FDF4; border:1px solid #BBF7D0; border-left:5px solid #003B3A; border-radius:10px;">
                <div style="font-size:12px; font-weight:900; color:#003B3A; text-transform:uppercase; margin-bottom:8px;">
                  📌 QUY ĐỊNH TÍNH TIẾT DẠY VÀ TIẾT DỰ GIỜ TRONG BÁO CÁO:
                </div>
                <ul style="margin:0; padding-left:18px; font-size:12px; color:#14532D; line-height:1.6;">
                  <li style="margin-bottom:4px;">
                    <strong>Tiết dạy hoàn thành:</strong> Chỉ được tính khi tiết dạy đã diễn ra, có người tham gia dự <strong>VÀ người dự ĐÃ NỘP PHIẾU ĐÁNH GIÁ</strong> trên hệ thống. <em>(Tiết đơn tính 1 tiết, tiết đôi tính 2 tiết)</em>.
                  </li>
                  <li style="margin-bottom:4px;">
                    <strong>Tiết dự hoàn thành:</strong> Chỉ được tính khi Giáo viên đã được duyệt dự <strong>VÀ ĐÃ HOÀN TẤT GỬI PHIẾU ĐÁNH GIÁ</strong> cho tiết học đó. <em>(Tiết đơn tính 1 lượt, tiết đôi tính 2 lượt)</em>.
                  </li>
                  <li>
                    <strong>Chỉ tiêu định mức:</strong> Được đối chiếu theo định mức (tháng hoặc năm học) đã được thiết lập cho từng Giáo viên bộ môn.
                  </li>
                </ul>
              </div>

              <!-- Note from sender if any -->
              ${notes ? `
              <div style="margin-bottom:24px; padding:14px 18px; background-color:#EFF6FF; border-left:4px solid #0284C7; border-radius:8px;">
                <strong style="font-size:12px; color:#0369A1; text-transform:uppercase; display:block; margin-bottom:4px;">💬 Ghi chú & Lời nhắn:</strong>
                <p style="margin:0; font-size:12px; color:#1E3A8A; line-height:1.5; white-space:pre-wrap;">${notes}</p>
              </div>
              ` : ''}

              <!-- Call to Action Button -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr>
                  <td align="center">
                    <a href="${reportLink}" style="display:inline-block; background-color:#003B3A; color:#FFFFFF; text-decoration:none; padding:13px 28px; border-radius:30px; font-weight:800; font-size:13px; letter-spacing:0.5px; border:2px solid #48BFE3; box-shadow:0 4px 12px rgba(0,59,58,0.25);">
                      👉 TRUY CẬP HỆ THỐNG SKYLINE SURVEY XEM CHI TIẾT
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="#F8FAFC" style="background-color:#F8FAFC; border-top:1px solid #E2E8F0; padding:20px 32px; text-align:center; font-size:11px; color:#64748B; line-height:1.6;">
              <strong style="color:#003B3A;">🏫 HỆ THỐNG SKYLINE SURVEY - BAN KHẢO THÍ & ĐBCL</strong><br>
              Email báo cáo chuyên môn tự động từ Hệ thống Quản trị Dự giờ Skyline School.<br>
              © ${new Date().getFullYear()} Hệ thống Giáo dục Sky-Line. All rights reserved.
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
    await sendEmail({
      to: toEmail,
      cc: ccEmails || undefined,
      subject: emailSubject,
      html: emailHtml
    });

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
