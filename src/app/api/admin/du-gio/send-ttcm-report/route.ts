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
        departmentRel: true,
        academicYearTargets: academicYearId ? {
          where: { academicYearId: academicYearId }
        } : true
      },
      orderBy: { teacherName: "asc" }
    });

    const teacherIds = deptTeachers.map(t => t.id);

    // 3. Fetch observation slots & registrations
    const andConditions: any[] = [
      {
        OR: [
          { teacherId: { in: teacherIds } },
          { registrations: { some: { teacherId: { in: teacherIds }, isApproved: true } } }
        ]
      },
      {
        status: { in: ["ACTIVE", "PENDING_TEACHER_APPROVAL", "OPEN", "EXPIRED"] }
      }
    ];

    if (academicYearId) {
      const activeYear = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
      if (activeYear) {
        andConditions.push({
          OR: [
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
          ]
        });
      }
    }

    const allSlots = await prisma.observationSlot.findMany({
      where: {
        AND: andConditions
      },
      include: {
        teacher: {
          select: { 
            id: true, 
            teacherName: true, 
            teacherCode: true, 
            departmentId: true,
            departmentRel: {
              select: { id: true, name: true, blockCM: true }
            }
          }
        },
        registrations: {
          include: {
            teacher: {
              select: { 
                id: true, 
                teacherName: true, 
                teacherCode: true, 
                departmentId: true,
                departmentRel: {
                  select: { id: true, name: true, blockCM: true }
                }
              }
            },
            evaluation: true
          }
        }
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

    // 4. Compute statistics (EXACT same business logic as UI)
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

      // Tiết dạy chỉ tính khi CÓ PHIẾU ĐÁNH GIÁ từ người dự
      const hasEvaluations = slot.registrations?.some(r => r.evaluation !== null && r.evaluation !== undefined);

      if (isDeptHost) {
        if (hasEvaluations) {
          if (teacherStatsMap[slot.teacherId]) {
            teacherStatsMap[slot.teacherId].taughtCount += increment;
            teacherStatsMap[slot.teacherId].teachingSlots.push(slot);
          }
        }
        deptTeachingSlots.push(slot);

        slot.registrations?.forEach(reg => {
          if (reg.evaluation && teacherStatsMap[slot.teacherId]) {
            teacherStatsMap[slot.teacherId].evaluationsReceived.push(reg.evaluation);
          }
        });
      }

      // Tiết dự chỉ tính khi ĐƯỢC DUYỆT và ĐÃ HOÀN TẤT ĐÁNH GIÁ
      slot.registrations?.forEach(reg => {
        if (reg.isApproved && reg.evaluation && teacherIds.includes(reg.teacherId)) {
          if (teacherStatsMap[reg.teacherId]) {
            teacherStatsMap[reg.teacherId].observedCount += increment;
            teacherStatsMap[reg.teacherId].observationSlots.push({
              slot,
              reg
            });
            teacherStatsMap[reg.teacherId].evaluationsGiven.push(reg.evaluation);
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

    const deptDisplayName = department.name.startsWith("Tổ") ? department.name : `Tổ ${department.name}`;

    const host = req.headers.get("host") || "skyline-survey.vercel.app";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${protocol}://${host}`;
    const reportLink = `${baseUrl}/admin/tong-hop-du-gio?deptId=${departmentId}`;

    // 5. Generate Email HTML with Sky-Line Brand Palette & Rich Icons
    const emailSubject = `[Skyline School] Báo cáo Tiết dạy & Dự giờ - ${deptDisplayName} (${monthLabel})`;

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

        const taughtBadge = isTaughtMet 
          ? `<span style="display:inline-block; background-color:#ECFDF5; color:#047857; padding:4px 10px; border-radius:12px; font-weight:800; font-size:11px; border:1px solid #A7F3D0;">🟢 ${st.taughtCount} ${reqTaught > 0 ? '/ ' + reqTaught + ' (' + taughtUnit + ')' : 'tiết'} ✓</span>`
          : `<span style="display:inline-block; background-color:#FEF2F2; color:#B91C1C; padding:4px 10px; border-radius:12px; font-weight:800; font-size:11px; border:1px solid #FECACA;">🔴 ${st.taughtCount} / ${reqTaught} (${taughtUnit}) ✗</span>`;

        const observedBadge = isObservedMet
          ? `<span style="display:inline-block; background-color:#ECFDF5; color:#047857; padding:4px 10px; border-radius:12px; font-weight:800; font-size:11px; border:1px solid #A7F3D0;">🟢 ${st.observedCount} ${reqObserved > 0 ? '/ ' + reqObserved + ' (' + observedUnit + ')' : 'lượt'} ✓</span>`
          : `<span style="display:inline-block; background-color:#FFFBEB; color:#B45309; padding:4px 10px; border-radius:12px; font-weight:800; font-size:11px; border:1px solid #FDE68A;">🟡 ${st.observedCount} / ${reqObserved} (${observedUnit}) ⚠️</span>`;

        return `
          <tr bgcolor="${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'}" style="border-bottom:1px solid #E2E8F0;">
            <td align="center" style="padding:10px 8px; font-size:12px; font-weight:700; color:#64748B;">${idx + 1}</td>
            <td style="padding:10px 12px; font-size:12px; font-weight:700; color:#0F172A;">
              <div style="font-size:13px; color:#003B3A; font-weight:800;">👨‍🏫 ${t.teacherName}</div>
              <div style="font-size:10px; color:#64748B; font-weight:600; margin-top:2px; padding-left:18px;">
                Mã GV: <strong>${t.teacherCode}</strong> ${t.position ? '• <span style="color:#B45309; font-weight:800; background-color:#FEF3C7; padding:1px 6px; border-radius:4px;">' + t.position + '</span>' : ''}
              </div>
            </td>
            <td align="center" style="padding:10px 8px;">${taughtBadge}</td>
            <td align="center" style="padding:10px 8px;">${observedBadge}</td>
          </tr>
        `;
      }).join("");

      const teachingSlotRowsHtml = deptTeachingSlots.filter(s => s.registrations?.some(r => r.evaluation)).slice(0, 15).map((slot) => {
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
          <tr bgcolor="#FFFFFF" style="border-bottom:1px solid #E2E8F0; font-size:11px;">
            <td style="padding:8px 10px; color:#475569; font-weight:600;">📅 ${d}</td>
            <td style="padding:8px 10px; font-weight:700; color:#003B3A;">👨‍🏫 ${slot.teacher?.teacherName || '--'}</td>
            <td style="padding:8px 10px; color:#1E293B;">
              <strong>📖 ${slot.topic || slot.subjectName || '--'}</strong>
              <div style="font-size:10px; color:#64748B; margin-top:2px;">🏫 Lớp: ${slot.className || '--'} • Cấp: ${slot.level}</div>
            </td>
            <td align="center" style="padding:8px 10px; font-weight:800; color:#047857;">⭐ ${avgScoreDisplay}</td>
            <td align="center" style="padding:8px 10px; color:#0369A1; font-weight:700;">🗳️ ${evals.length} phiếu</td>
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
<body style="margin:0; padding:0; background-color:#F1F5F9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F1F5F9" style="background-color:#F1F5F9; padding:24px 0;">
    <tr>
      <td align="center">
        <table width="720" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="max-width:720px; width:100%; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 4px 16px rgba(0,59,58,0.12); border:1px solid #CBD5E1;">
          
          <!-- Sky-Line Branded Header Banner (Solid #003B3A bgcolor for Outlook compatibility) -->
          <tr>
            <td bgcolor="#003B3A" style="background-color:#003B3A; background:linear-gradient(135deg, #003B3A 0%, #064E3B 60%, #0369A1 100%); padding:28px 32px; color:#FFFFFF; border-bottom:4px solid #48BFE3;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <!-- Skyline Logo Badge -->
                    <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                      <tr>
                        <td bgcolor="#0B4A47" style="background-color:#0B4A47; border:1px solid #48BFE3; border-radius:20px; padding:3px 12px; font-size:10.5px; font-weight:800; color:#48BFE3; letter-spacing:1px; text-transform:uppercase;">
                          🏫 SKY-LINE EDUCATION GROUP
                        </td>
                      </tr>
                    </table>
                    <h1 style="margin:0; font-size:21px; font-weight:900; line-height:1.3; color:#FFFFFF; text-transform:uppercase;">
                      📊 BÁO CÁO TIẾN ĐỘ TIẾT DẠY & DỰ GIỜ TỔ CHUYÊN MÔN
                    </h1>
                    <div style="font-size:13px; color:#E0F2FE; margin-top:6px; font-weight:600;">
                      Tổ: <strong style="color:#FDE047;">${deptDisplayName}</strong> &bull; Kỳ báo cáo: <strong style="color:#FDE047;">${monthLabel}</strong>
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
                👋 Kính gửi Thầy/Cô <strong>${ttcmName || 'Tổ trưởng chuyên môn'}</strong>,
              </p>
              <p style="margin:0 0 20px 0; font-size:13px; line-height:1.6; color:#334155;">
                Ban Khảo thí & Đảm bảo Chất lượng Giáo dục kính gửi Thầy/Cô bảng tổng hợp kết quả thực hiện chỉ tiêu <strong>Tiết dạy</strong> và <strong>Tiết dự giờ</strong> của các Giáo viên bộ môn thuộc <strong>${deptDisplayName}</strong> trong kỳ <strong>${monthLabel}</strong>:
              </p>

              <!-- Stats Summary Cards (Sky-Line Brand Colors & Icons) -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td width="23%" bgcolor="#F8FAFC" style="padding:12px 8px; background-color:#F8FAFC; border-radius:12px; border:1px solid #E2E8F0; text-align:center;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#64748B;">👥 Giáo viên Tổ</div>
                    <div style="font-size:20px; font-weight:900; color:#003B3A; margin-top:4px;">${totalTeachersCount}</div>
                    <div style="font-size:10px; color:#94A3B8; font-weight:600;">nhân sự</div>
                  </td>
                  <td width="2%"></td>
                  <td width="23%" bgcolor="#ECFDF5" style="padding:12px 8px; background-color:#ECFDF5; border-radius:12px; border:1px solid #A7F3D0; text-align:center;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#065F46;">🎓 Tổng Tiết Dạy</div>
                    <div style="font-size:20px; font-weight:900; color:#047857; margin-top:4px;">${totalTaughtCount}</div>
                    <div style="font-size:10px; color:#10B981; font-weight:600;">tiết hoàn thành</div>
                  </td>
                  <td width="2%"></td>
                  <td width="23%" bgcolor="#F0F9FF" style="padding:12px 8px; background-color:#F0F9FF; border-radius:12px; border:1px solid #BAE6FD; text-align:center;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#0369A1;">👁️ Tổng Tiết Dự</div>
                    <div style="font-size:20px; font-weight:900; color:#0284C7; margin-top:4px;">${totalObservedCount}</div>
                    <div style="font-size:10px; color:#38BDF8; font-weight:600;">lượt dự giờ</div>
                  </td>
                  <td width="2%"></td>
                  <td width="23%" bgcolor="#FEF3C7" style="padding:12px 8px; background-color:#FEF3C7; border-radius:12px; border:1px solid #FDE68A; text-align:center;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#92400E;">⭐ Tỷ lệ Đạt Chuẩn</div>
                    <div style="font-size:20px; font-weight:900; color:#B45309; margin-top:4px;">${passRate}%</div>
                    <div style="font-size:10px; color:#D97706; font-weight:600;">${totalPassedEvalsCount}/${totalEvalsCount} phiếu</div>
                  </td>
                </tr>
              </table>

              <!-- Section 1: Teacher Quota Progress Table (DANH SÁCH GIÁO VIÊN & ĐỐI CHIẾU CHỈ TIÊU) -->
              <div style="margin-bottom:24px;">
                <h3 style="margin:0 0 10px 0; font-size:13px; font-weight:900; text-transform:uppercase; color:#003B3A; letter-spacing:0.5px;">
                  📋 1. DANH SÁCH GIÁO VIÊN & ĐỐI CHIẾU CHỈ TIÊU (${deptTeachers.length} GV)
                </h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse; border:1px solid #CBD5E1; border-radius:8px; overflow:hidden;">
                  <thead>
                    <tr bgcolor="#003B3A" style="background-color:#003B3A; color:#FFFFFF; font-size:11px; font-weight:800; text-transform:uppercase;">
                      <th style="padding:10px 8px; text-align:center; width:35px; border-right:1px solid #065F46; color:#FFFFFF;">🔢 STT</th>
                      <th style="padding:10px 12px; text-align:left; border-right:1px solid #065F46; color:#FFFFFF;">👤 Giáo viên Bộ môn</th>
                      <th style="padding:10px 8px; text-align:center; width:150px; border-right:1px solid #065F46; color:#FFFFFF;">🎓 Tiết Dạy</th>
                      <th style="padding:10px 8px; text-align:center; width:150px; color:#FFFFFF;">👁️ Tiết Dự</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${teacherRowsHtml}
                  </tbody>
                </table>
              </div>

              <!-- Important Explanation: Quy định tính Tiết dạy & Tiết dự (Sky-Line Theme) -->
              <div style="margin-bottom:24px; padding:16px 20px; background-color:#F0FDF4; border:1px solid #BBF7D0; border-left:5px solid #003B3A; border-radius:10px;">
                <div style="font-size:12px; font-weight:900; color:#003B3A; text-transform:uppercase; margin-bottom:8px;">
                  📌 QUY ĐỊNH TÍNH TIẾT DẠY VÀ TIẾT DỰ GIỜ TRONG BÁO CÁO:
                </div>
                <ul style="margin:0; padding-left:18px; font-size:12px; color:#14532D; line-height:1.6;">
                  <li style="margin-bottom:5px;">
                    🎓 <strong>Tiết dạy hoàn thành:</strong> Chỉ được tính khi tiết dạy đã diễn ra, có giáo viên tham gia dự giờ <strong>VÀ người dự ĐÃ NỘP PHIẾU ĐÁNH GIÁ</strong> trên hệ thống. <em>(Tiết dạy đơn tính 1 tiết, tiết dạy đôi tính 2 tiết)</em>.
                  </li>
                  <li style="margin-bottom:5px;">
                    👁️ <strong>Tiết dự (Lượt dự) hoàn thành:</strong> Chỉ được tính khi Giáo viên đã được duyệt tham gia dự giờ <strong>VÀ ĐÃ HOÀN TẤT GỬI PHIẾU ĐÁNH GIÁ DỰ GIỜ</strong> cho tiết học đó. <em>(Tiết dự đơn tính 1 lượt, tiết dự đôi tính 2 lượt)</em>.
                  </li>
                  <li>
                    🎯 <strong>Chỉ tiêu định mức:</strong> Được đối chiếu theo định mức (tháng hoặc năm học) đã được thiết lập cho từng Giáo viên bộ môn.
                  </li>
                </ul>
              </div>

              <!-- Section 2: Recent Completed Teaching Slots List (if any) -->
              ${teachingSlotRowsHtml ? `
              <div style="margin-bottom:24px;">
                <h3 style="margin:0 0 10px 0; font-size:13px; font-weight:900; text-transform:uppercase; color:#003B3A; letter-spacing:0.5px;">
                  📝 2. Danh Sách Tiết Dạy Đã Hoàn Thành Đánh Giá Trong Kỳ
                </h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse; border:1px solid #E2E8F0; border-radius:8px; overflow:hidden;">
                  <thead>
                    <tr bgcolor="#F1F5F9" style="background-color:#F1F5F9; color:#334155; font-size:11px; font-weight:800; text-transform:uppercase;">
                      <th style="padding:8px 10px; text-align:left; width:80px;">📅 Ngày</th>
                      <th style="padding:8px 10px; text-align:left; width:140px;">👨‍🏫 GV Dạy</th>
                      <th style="padding:8px 10px; text-align:left;">📖 Chủ đề / Đề tài</th>
                      <th style="padding:8px 10px; text-align:center; width:100px;">⭐ ĐTB Đánh Giá</th>
                      <th style="padding:8px 10px; text-align:center; width:80px;">🗳️ Số Phiếu</th>
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
              <div style="margin-bottom:24px; padding:14px 18px; background-color:#EFF6FF; border-left:4px solid #0284C7; border-radius:8px;">
                <strong style="font-size:12px; color:#0369A1; text-transform:uppercase; display:block; margin-bottom:4px;">💬 Ghi chú từ Ban Khảo thí & ĐBCL:</strong>
                <p style="margin:0; font-size:12px; color:#1E3A8A; line-height:1.5; white-space:pre-wrap;">${notes}</p>
              </div>
              ` : ''}

              <!-- Call to Action Button (Sky-Line Primary Button) -->
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
              <strong style="color:#003B3A;">🏫 HỆ THỐNG SKYLINE SURVEY - BAN KHẢO THÍ & ĐBCL GIÁO DỤC</strong><br>
              Email báo cáo chuyên môn tự động từ Hệ thống Quản trị Dự giờ Skyline School.<br>
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
