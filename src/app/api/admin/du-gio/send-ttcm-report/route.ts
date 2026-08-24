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
    const { departmentId, academicYearId, month, ttcmEmail, ttcmName, customCc, notes } = await req.json();

    if (!departmentId) {
      return NextResponse.json({ error: "Thiếu thông tin Tổ chuyên môn" }, { status: 400 });
    }

    if (!ttcmEmail || !ttcmEmail.includes("@")) {
      return NextResponse.json({ error: "Địa chỉ email Tổ trưởng chuyên môn không hợp lệ" }, { status: 400 });
    }

    // 1. Fetch Department
    const department = await prisma.department.findUnique({
      where: { id: departmentId }
    });

    if (!department) {
      return NextResponse.json({ error: "Không tìm thấy Tổ chuyên môn" }, { status: 404 });
    }

    // 2. Fetch all teachers in this department
    const deptTeachers = await prisma.teacher.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { departmentId: departmentId },
          { departmentAssignments: { some: { departmentId: departmentId } } }
        ]
      },
      include: {
        departmentAssignments: true,
        academicYearTargets: academicYearId ? {
          where: { academicYearId: academicYearId }
        } : true
      },
      orderBy: { teacherName: "asc" }
    });

    const teacherIds = deptTeachers.map(t => t.id);

    // 3. Fetch observation slots & registrations
    const whereSlotClause: any = {
      OR: [
        { teacherId: { in: teacherIds } },
        { registrations: { some: { teacherId: { in: teacherIds }, isApproved: true } } }
      ]
    };

    if (academicYearId) {
      whereSlotClause.academicYearId = academicYearId;
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
        },
        subject: true,
        class: true
      },
      orderBy: { date: "desc" }
    });

    // Filter by month if specified
    const slots = month && month !== "all"
      ? allSlots.filter(s => {
          if (!s.date) return false;
          const d = new Date(s.date);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          return `${yyyy}-${mm}` === month;
        })
      : allSlots;

    // 4. Compute statistics
    const teacherStatsMap: Record<string, {
      taughtCount: number;
      observedCount: number;
      evaluationsGiven: any[];
      evaluationsReceived: any[];
      teachingSlots: any[];
      observationSlots: any[];
    }> = {};

    deptTeachers.forEach(t => {
      teacherStatsMap[t.id] = {
        taughtCount: 0,
        observedCount: 0,
        evaluationsGiven: [],
        evaluationsReceived: [],
        teachingSlots: [],
        observationSlots: []
      };
    });

    const deptTeachingSlots: any[] = [];
    const deptObservationSlots: any[] = [];

    slots.forEach(slot => {
      const isDeptHost = teacherIds.includes(slot.teacherId);
      const increment = slot.isDoublePeriod ? 2 : 1;

      if (isDeptHost) {
        if (teacherStatsMap[slot.teacherId]) {
          teacherStatsMap[slot.teacherId].taughtCount += increment;
          teacherStatsMap[slot.teacherId].teachingSlots.push(slot);
        }
        deptTeachingSlots.push(slot);

        slot.registrations?.forEach(reg => {
          if (reg.evaluation && teacherStatsMap[slot.teacherId]) {
            teacherStatsMap[slot.teacherId].evaluationsReceived.push(reg.evaluation);
          }
        });
      }

      slot.registrations?.forEach(reg => {
        if (reg.isApproved && teacherIds.includes(reg.teacherId)) {
          if (teacherStatsMap[reg.teacherId]) {
            teacherStatsMap[reg.teacherId].observedCount += increment;
            teacherStatsMap[reg.teacherId].observationSlots.push({
              slot,
              reg
            });
            if (reg.evaluation) {
              teacherStatsMap[reg.teacherId].evaluationsGiven.push(reg.evaluation);
            }
          }
          deptObservationSlots.push({ slot, reg });
        }
      });
    });

    // Summary counts
    const totalTeachersCount = deptTeachers.length;
    let totalTaughtCount = 0;
    let totalObservedCount = 0;
    let totalEvalsCount = 0;
    let totalPassedEvalsCount = 0;

    deptTeachers.forEach(t => {
      const st = teacherStatsMap[t.id];
      totalTaughtCount += st.taughtCount;
      totalObservedCount += st.observedCount;
    });

    deptTeachingSlots.forEach(s => {
      s.registrations?.forEach(r => {
        if (r.evaluation) {
          totalEvalsCount++;
          const isK12 = s.level !== "Mầm non";
          const passed = isK12
            ? (r.evaluation.totalScore !== null && r.evaluation.totalScore !== undefined ? r.evaluation.totalScore >= 14 : (r.evaluation.overallRating === "Giỏi" || r.evaluation.overallRating === "Khá"))
            : (r.evaluation.overallRating === "Tốt" || r.evaluation.overallRating === "Khá" || r.evaluation.overallRating === "Đạt");
          if (passed) totalPassedEvalsCount++;
        }
      });
    });

    const passRate = totalEvalsCount > 0 ? Math.round((totalPassedEvalsCount / totalEvalsCount) * 100) : 100;

    let monthLabel = "Toàn bộ năm học";
    if (month && month !== "all") {
      const [yyyy, mm] = month.split("-");
      monthLabel = `Tháng ${mm}/${yyyy}`;
    }

    const host = req.headers.get("host") || "skyline-survey.vercel.app";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;
    const reportLink = `${baseUrl}/admin/tong-hop-du-gio?deptId=${departmentId}`;

    // 5. Generate Email HTML
    const emailSubject = `[Skyline School] Báo cáo Tiết dạy & Dự giờ - Tổ ${department.name} (${monthLabel})`;

    const getHtmlTemplate = () => {
      const teacherRowsHtml = deptTeachers.map((t, idx) => {
        const st = teacherStatsMap[t.id] || { taughtCount: 0, observedCount: 0 };
        const target = (t.academicYearTargets && t.academicYearTargets[0]) || {};
        const reqTaught = target.requiredTaught ?? t.requiredTaught ?? 0;
        const reqObserved = target.requiredObserved ?? t.requiredObserved ?? 0;
        const taughtUnit = target.taughtUnit || t.taughtUnit || "tháng";
        const observedUnit = target.observedUnit || t.observedUnit || "tháng";

        const isTaughtMet = reqTaught === 0 || st.taughtCount >= reqTaught;
        const isObservedMet = reqObserved === 0 || st.observedCount >= reqObserved;
        const isAllMet = isTaughtMet && isObservedMet;

        const taughtBadge = isTaughtMet 
          ? `<span style="background-color:#ecfdf5; color:#047857; padding:2px 8px; border-radius:12px; font-weight:700; font-size:11px; border:1px solid #a7f3d0;">${st.taughtCount} / ${reqTaught > 0 ? reqTaught + ' (' + taughtUnit + ')' : '--'} ✓</span>`
          : `<span style="background-color:#fef2f2; color:#b91c1c; padding:2px 8px; border-radius:12px; font-weight:700; font-size:11px; border:1px solid #fecaca;">${st.taughtCount} / ${reqTaught} (${taughtUnit}) ✗</span>`;

        const observedBadge = isObservedMet
          ? `<span style="background-color:#ecfdf5; color:#047857; padding:2px 8px; border-radius:12px; font-weight:700; font-size:11px; border:1px solid #a7f3d0;">${st.observedCount} / ${reqObserved > 0 ? reqObserved + ' (' + observedUnit + ')' : '--'} ✓</span>`
          : `<span style="background-color:#fffbeb; color:#b45309; padding:2px 8px; border-radius:12px; font-weight:700; font-size:11px; border:1px solid #fde68a;">${st.observedCount} / ${reqObserved} (${observedUnit})</span>`;

        const statusBadge = isAllMet
          ? `<span style="background-color:#047857; color:#ffffff; padding:3px 10px; border-radius:6px; font-weight:800; font-size:10px;">ĐẠT CHỈ TIÊU</span>`
          : `<span style="background-color:#e11d48; color:#ffffff; padding:3px 10px; border-radius:6px; font-weight:800; font-size:10px;">CHƯA ĐẠT</span>`;

        return `
          <tr style="border-bottom:1px solid #e5e7eb; background-color:${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
            <td style="padding:10px 12px; text-align:center; font-size:12px; font-weight:700; color:#6b7280;">${idx + 1}</td>
            <td style="padding:10px 12px; font-size:12px; font-weight:700; color:#111827;">
              <div>${t.teacherName}</div>
              <div style="font-size:10px; color:#9ca3af; font-weight:600;">Mã GV: ${t.teacherCode} ${t.position ? '• ' + t.position : ''}</div>
            </td>
            <td style="padding:10px 12px; text-align:center;">${taughtBadge}</td>
            <td style="padding:10px 12px; text-align:center;">${observedBadge}</td>
            <td style="padding:10px 12px; text-align:center;">${statusBadge}</td>
          </tr>
        `;
      }).join("");

      const teachingSlotRowsHtml = deptTeachingSlots.slice(0, 15).map((slot) => {
        const d = slot.date ? new Date(slot.date).toLocaleDateString("vi-VN") : "--";
        const evals = slot.registrations?.filter(r => r.evaluation) || [];
        let avgScoreDisplay = "--";
        if (evals.length > 0) {
          if (slot.level === "Mầm non") {
            avgScoreDisplay = evals[0].evaluation.overallRating || "Đạt";
          } else {
            const sum = evals.reduce((acc, curr) => acc + (curr.evaluation.totalScore || 0), 0);
            avgScoreDisplay = (sum / evals.length).toFixed(2) + " / 20.0đ";
          }
        }

        return `
          <tr style="border-bottom:1px solid #e5e7eb; font-size:11px;">
            <td style="padding:8px 10px; color:#4b5563; font-weight:600;">${d}</td>
            <td style="padding:8px 10px; font-weight:700; color:#111827;">${slot.teacher?.teacherName || '--'}</td>
            <td style="padding:8px 10px; color:#374151;">
              <strong style="color:#003B3A;">${slot.topic || slot.subjectName || '--'}</strong>
              <div style="font-size:10px; color:#6b7280;">Lớp: ${slot.className || '--'} • Cấp: ${slot.level}</div>
            </td>
            <td style="padding:8px 10px; text-align:center; font-weight:700; color:#047857;">${avgScoreDisplay}</td>
            <td style="padding:8px 10px; text-align:center; color:#6b7280;">${evals.length} phiếu</td>
          </tr>
        `;
      }).join("");

      return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding:24px 0;">
    <tr>
      <td align="center">
        <table width="680" border="0" cellpadding="0" cellspacing="0" style="max-width:680px; width:100%; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #003B3A 0%, #055e5c 60%, #48BFE3 100%); padding:32px 36px; color:#ffffff;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; color:#48BFE3; margin-bottom:6px;">
                      HỆ THỐNG QUẢN LÝ DỰ GIỜ & ĐÁNH GIÁ CHUYÊN MÔN
                    </div>
                    <h1 style="margin:0; font-size:22px; font-weight:900; line-height:1.3; color:#ffffff;">
                      BÁO CÁO TIẾT DẠY & DỰ GIỜ TỔ CHUYÊN MÔN
                    </h1>
                    <div style="font-size:13px; color:#e0f2fe; margin-top:6px; font-weight:500;">
                      Tổ: <strong>${department.name}</strong> • Kỳ: <strong>${monthLabel}</strong>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding:32px 36px;">
              <!-- Greeting -->
              <p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#1e293b;">
                Kính gửi Thầy/Cô <strong>${ttcmName || 'Tổ trưởng chuyên môn'}</strong>,
              </p>
              <p style="margin:0 0 24px 0; font-size:13px; line-height:1.6; color:#475569;">
                Ban Khảo thí & ĐBCL Giáo dục kính gửi Thầy/Cô bảng tổng hợp kết quả thực hiện chỉ tiêu <strong>Tiết dạy</strong> và <strong>Tiết dự giờ</strong> của các Giáo viên bộ môn thuộc <strong>Tổ ${department.name}</strong> trong kỳ <strong>${monthLabel}</strong> như sau:
              </p>

              <!-- Stats Summary Cards -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td width="23%" style="padding:12px; background-color:#f8fafc; border-radius:12px; border:1px solid #e2e8f0; text-align:center;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#64748b;">Giáo viên Tổ</div>
                    <div style="font-size:20px; font-weight:900; color:#003B3A; margin-top:4px;">${totalTeachersCount}</div>
                    <div style="font-size:10px; color:#94a3b8; font-weight:600;">nhân sự</div>
                  </td>
                  <td width="2%"></td>
                  <td width="23%" style="padding:12px; background-color:#f0fdf4; border-radius:12px; border:1px solid #bbf7d0; text-align:center;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#15803d;">Tổng Tiết Dạy</div>
                    <div style="font-size:20px; font-weight:900; color:#166534; margin-top:4px;">${totalTaughtCount}</div>
                    <div style="font-size:10px; color:#16a34a; font-weight:600;">tiết hoàn thành</div>
                  </td>
                  <td width="2%"></td>
                  <td width="23%" style="padding:12px; background-color:#f0f9ff; border-radius:12px; border:1px solid #bae6fd; text-align:center;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#0369a1;">Tổng Tiết Dự</div>
                    <div style="font-size:20px; font-weight:900; color:#0c4a6e; margin-top:4px;">${totalObservedCount}</div>
                    <div style="font-size:10px; color:#0284c7; font-weight:600;">lượt dự giờ</div>
                  </td>
                  <td width="2%"></td>
                  <td width="23%" style="padding:12px; background-color:#faf5ff; border-radius:12px; border:1px solid #e9d5ff; text-align:center;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#7e22ce;">Tỷ lệ Đạt Chuẩn</div>
                    <div style="font-size:20px; font-weight:900; color:#581c87; margin-top:4px;">${passRate}%</div>
                    <div style="font-size:10px; color:#9333ea; font-weight:600;">${totalPassedEvalsCount}/${totalEvalsCount} phiếu</div>
                  </td>
                </tr>
              </table>

              <!-- Section 1: Teacher Quota Progress Table -->
              <div style="margin-bottom:28px;">
                <h3 style="margin:0 0 12px 0; font-size:14px; font-weight:800; text-transform:uppercase; color:#003B3A; letter-spacing:0.5px;">
                  📋 1. Bảng Tiến Độ Thực Hiện Chỉ Tiêu GVBM Trong Tổ
                </h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                  <thead>
                    <tr style="background-color:#003B3A; color:#ffffff; font-size:11px; font-weight:800; text-transform:uppercase;">
                      <th style="padding:10px 12px; text-align:center; width:40px;">STT</th>
                      <th style="padding:10px 12px; text-align:left;">Họ và tên Giáo viên</th>
                      <th style="padding:10px 12px; text-align:center; width:130px;">Tiết Dạy</th>
                      <th style="padding:10px 12px; text-align:center; width:130px;">Tiết Dự</th>
                      <th style="padding:10px 12px; text-align:center; width:110px;">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${teacherRowsHtml}
                  </tbody>
                </table>
              </div>

              <!-- Section 2: Recent Teaching Slots List -->
              ${deptTeachingSlots.length > 0 ? `
              <div style="margin-bottom:28px;">
                <h3 style="margin:0 0 12px 0; font-size:14px; font-weight:800; text-transform:uppercase; color:#003B3A; letter-spacing:0.5px;">
                  📝 2. Danh Sách Các Tiết Dạy & Kết Quả Đánh Giá (${deptTeachingSlots.length} tiết)
                </h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                  <thead>
                    <tr style="background-color:#f1f5f9; color:#475569; font-size:11px; font-weight:800; text-transform:uppercase;">
                      <th style="padding:8px 10px; text-align:left; width:80px;">Ngày</th>
                      <th style="padding:8px 10px; text-align:left; width:140px;">GV Dạy</th>
                      <th style="padding:8px 10px; text-align:left;">Chủ đề / Đề tài bài dạy</th>
                      <th style="padding:8px 10px; text-align:center; width:100px;">ĐTB Chung</th>
                      <th style="padding:8px 10px; text-align:center; width:80px;">Số Phiếu</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${teachingSlotRowsHtml}
                  </tbody>
                </table>
              </div>
              ` : ''}

              <!-- Note from sender if any -->
              ${notes ? `
              <div style="margin-bottom:28px; padding:14px 18px; background-color:#eff6ff; border-left:4px solid #3b82f6; border-radius:6px;">
                <strong style="font-size:12px; color:#1e40af; text-transform:uppercase; display:block; margin-bottom:4px;">Ghi chú từ Ban Khảo thí:</strong>
                <p style="margin:0; font-size:12px; color:#1e3a8a; line-height:1.5;">${notes}</p>
              </div>
              ` : ''}

              <!-- Call to Action Button -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td align="center">
                    <a href="${reportLink}" style="display:inline-block; background-color:#003B3A; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:30px; font-weight:800; font-size:13px; letter-spacing:0.5px; box-shadow:0 4px 8px rgba(0,59,58,0.25);">
                      👉 XEM CHI TIẾT TRÊN CỔNG QUẢN TRỊ DỰ GIỜ
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc; border-top:1px solid #e2e8f0; padding:24px 36px; text-align:center; font-size:11px; color:#64748b; line-height:1.6;">
              <strong style="color:#003B3A;">HỆ THỐNG SKYLINE SURVEY - BAN KHẢO THÍ & ĐBCL GIÁO DỤC</strong><br>
              Email này được tạo và gửi tự động từ Hệ thống Quản trị Dự giờ Skyline School.<br>
              © ${new Date().getFullYear()} Skyline Education Group. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;
    };

    const emailHtml = getHtmlTemplate();

    // 6. Send Email
    await sendEmail({
      to: ttcmEmail,
      cc: customCc || undefined,
      subject: emailSubject,
      html: emailHtml
    });

    return NextResponse.json({
      success: true,
      message: `Báo cáo dự giờ đã được gửi thành công đến ${ttcmEmail}`
    });

  } catch (error: any) {
    console.error("Error sending TTCM observation report:", error);
    return NextResponse.json({
      error: error.message || "Đã xảy ra lỗi trong quá trình gửi email báo cáo"
    }, { status: 500 });
  }
}
