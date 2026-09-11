// @ts-nocheck
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";

export interface SendTTCMReportOptions {
  departmentId: string;
  academicYearId?: string;
  month?: string; // YYYY-MM hoặc 'all'
  ttcmEmail?: string;
  ttcmName?: string;
  customCc?: string;
  notes?: string;
  baseUrl?: string;
}

export interface SendTTCMReportResult {
  success: boolean;
  departmentId: string;
  departmentName: string;
  ttcmEmail?: string;
  ttcmName?: string;
  error?: string;
}

export async function sendReportForDepartment(
  options: SendTTCMReportOptions
): Promise<SendTTCMReportResult> {
  const { departmentId, customCc, notes } = options;

  try {
    if (!departmentId) {
      return {
        success: false,
        departmentId: "",
        departmentName: "",
        error: "Thiếu thông tin Tổ chuyên môn"
      };
    }

    // 1. Fetch Department
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        teacherAssignments: {
          where: { position: "TTCM" },
          include: { teacher: true }
        },
        teachers: {
          where: { position: "TTCM" }
        }
      }
    });

    if (!department) {
      return {
        success: false,
        departmentId,
        departmentName: "",
        error: "Không tìm thấy Tổ chuyên môn"
      };
    }

    // Determine TTCM Email and Name if not provided
    let ttcmEmail = options.ttcmEmail;
    let ttcmName = options.ttcmName;

    if (!ttcmEmail) {
      const assignmentTTCM = department.teacherAssignments?.[0]?.teacher || department.teachers?.[0];
      if (assignmentTTCM) {
        ttcmEmail = assignmentTTCM.email;
        ttcmName = assignmentTTCM.teacherName;
      } else {
        // Fallback search teacher with position TTCM
        const directTTCM = await prisma.teacher.findFirst({
          where: {
            departmentId: department.id,
            position: "TTCM",
            status: "ACTIVE"
          }
        });
        if (directTTCM) {
          ttcmEmail = directTTCM.email;
          ttcmName = directTTCM.teacherName;
        }
      }
    }

    if (!ttcmEmail || !ttcmEmail.includes("@")) {
      return {
        success: false,
        departmentId,
        departmentName: department.name,
        error: `Tổ "${department.name}" chưa có email Tổ trưởng chuyên môn hợp lệ (${ttcmEmail || "chưa gán"})`
      };
    }

    // 2. Determine Academic Year
    let academicYearId = options.academicYearId;
    if (!academicYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" }
      });
      if (activeYear) {
        academicYearId = activeYear.id;
      }
    }

    // 3. Determine Month
    const month = options.month || "all";

    // 4. Fetch all teachers in this department
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
        academicYearTargets: academicYearId
          ? {
              where: { academicYearId: academicYearId }
            }
          : true
      },
      orderBy: { teacherName: "asc" }
    });

    const teacherIds = deptTeachers.map(t => t.id);

    // 5. Fetch observation slots & registrations
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
    const slots =
      month && month !== "all"
        ? allSlots.filter(s => {
            if (!s.date) return false;
            const d = new Date(s.date);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            return `${yyyy}-${mm}` === month;
          })
        : allSlots;

    const isSurpriseSlot = (slot: any) => {
      if (!slot) return false;
      return (
        slot.requestOrigin === "SURPRISE" ||
        (typeof slot.description === "string" &&
          (slot.description.includes("[SURPRISE]") ||
            slot.description.toLowerCase().includes("dự giờ đột xuất"))) ||
        (typeof slot.topic === "string" && slot.topic.toLowerCase().includes("đột xuất"))
      );
    };

    // 6. Compute statistics
    const teacherStatsMap: Record<
      string,
      {
        taughtCount: number;
        taughtSurpriseCount: number;
        observedCount: number;
        observedSurpriseCount: number;
        evaluationsGiven: any[];
        evaluationsReceived: any[];
        teachingSlots: any[];
        observationSlots: any[];
      }
    > = {};

    deptTeachers.forEach(t => {
      teacherStatsMap[t.id] = {
        taughtCount: 0,
        taughtSurpriseCount: 0,
        observedCount: 0,
        observedSurpriseCount: 0,
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
      const isSurprise = isSurpriseSlot(slot);

      const hasEvaluations = slot.registrations?.some(
        r => r.evaluation !== null && r.evaluation !== undefined && r.evaluation?.reEvaluationStatus !== "DRAFT"
      );

      if (isDeptHost) {
        if (hasEvaluations) {
          if (teacherStatsMap[slot.teacherId]) {
            teacherStatsMap[slot.teacherId].taughtCount += increment;
            if (isSurprise) {
              teacherStatsMap[slot.teacherId].taughtSurpriseCount += increment;
            }
            teacherStatsMap[slot.teacherId].teachingSlots.push(slot);
          }
        }
        deptTeachingSlots.push(slot);

        slot.registrations?.forEach(reg => {
          if (reg.evaluation && reg.evaluation?.reEvaluationStatus !== "DRAFT" && teacherStatsMap[slot.teacherId]) {
            teacherStatsMap[slot.teacherId].evaluationsReceived.push(reg.evaluation);
          }
        });
      }

      slot.registrations?.forEach(reg => {
        if (reg.isApproved && reg.evaluation && reg.evaluation?.reEvaluationStatus !== "DRAFT" && teacherIds.includes(reg.teacherId)) {
          if (teacherStatsMap[reg.teacherId]) {
            teacherStatsMap[reg.teacherId].observedCount += increment;
            if (isSurprise) {
              teacherStatsMap[reg.teacherId].observedSurpriseCount += increment;
            }
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

    const totalTeachersCount = deptTeachers.length;
    let totalTaughtCount = 0;
    let totalTaughtSurpriseCount = 0;
    let totalObservedCount = 0;
    let totalObservedSurpriseCount = 0;
    let totalEvalsCount = 0;
    let totalPassedEvalsCount = 0;

    deptTeachers.forEach(t => {
      const st = teacherStatsMap[t.id];
      totalTaughtCount += st.taughtCount;
      totalTaughtSurpriseCount += st.taughtSurpriseCount;
      totalObservedCount += st.observedCount;
      totalObservedSurpriseCount += st.observedSurpriseCount;
    });

    deptTeachingSlots.forEach(s => {
      s.registrations?.forEach(r => {
        if (r.evaluation) {
          totalEvalsCount++;
          const isK12 = s.level !== "Mầm non";
          const passed = isK12
            ? (r.evaluation.totalScore !== null && r.evaluation.totalScore !== undefined
                ? r.evaluation.totalScore >= 14
                : r.evaluation.overallRating === "Giỏi" || r.evaluation.overallRating === "Khá")
            : r.evaluation.overallRating === "Tốt" ||
              r.evaluation.overallRating === "Khá" ||
              r.evaluation.overallRating === "Đạt";
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

    const baseUrl = options.baseUrl || process.env.NEXTAUTH_URL || "https://skyline-survey.vercel.app";
    const reportLink = `${baseUrl}/admin/tong-hop-du-gio?deptId=${departmentId}`;

    const emailSubject = `[Skyline School] Báo cáo Tiết dạy & Dự giờ - ${deptDisplayName} (${monthLabel})`;

    // Generate HTML
    const teacherRowsHtml = deptTeachers
      .map((t, idx) => {
        const st = teacherStatsMap[t.id] || { taughtCount: 0, taughtSurpriseCount: 0, observedCount: 0, observedSurpriseCount: 0 };
        const target = (t.academicYearTargets && t.academicYearTargets[0]) || {};
        const reqTaught = target.requiredTaught ?? t.requiredTaught ?? 0;
        const reqObserved = target.requiredObserved ?? t.requiredObserved ?? 0;
        const taughtUnit = target.taughtUnit || t.taughtUnit || "tháng";
        const observedUnit = target.observedUnit || t.observedUnit || "tháng";

        const isTaughtMet = reqTaught === 0 || st.taughtCount >= reqTaught;
        const isObservedMet = reqObserved === 0 || st.observedCount >= reqObserved;

        const taughtBadge = isTaughtMet
          ? `<span style="display:inline-block; background-color:#ECFDF5; color:#047857; padding:4px 10px; border-radius:12px; font-weight:800; font-size:11px; border:1px solid #A7F3D0;">${st.taughtCount} ${reqTaught > 0 ? "/ " + reqTaught + " (" + taughtUnit + ")" : "tiết"}</span>`
          : `<span style="display:inline-block; background-color:#FEF2F2; color:#B91C1C; padding:4px 10px; border-radius:12px; font-weight:800; font-size:11px; border:1px solid #FECACA;">${st.taughtCount} / ${reqTaught} (${taughtUnit})</span>`;

        const observedBadge = isObservedMet
          ? `<span style="display:inline-block; background-color:#ECFDF5; color:#047857; padding:4px 10px; border-radius:12px; font-weight:800; font-size:11px; border:1px solid #A7F3D0;">${st.observedCount} ${reqObserved > 0 ? "/ " + reqObserved + " (" + observedUnit + ")" : "lượt"}</span>`
          : `<span style="display:inline-block; background-color:#FFFBEB; color:#B45309; padding:4px 10px; border-radius:12px; font-weight:800; font-size:11px; border:1px solid #FDE68A;">${st.observedCount} / ${reqObserved} (${observedUnit})</span>`;

        const taughtSurprise =
          st.taughtSurpriseCount > 0
            ? `<div style="font-size:10px; color:#B45309; font-weight:800; margin-top:2px;">⚡ ${st.taughtSurpriseCount} đột xuất</div>`
            : "";

        const observedSurprise =
          st.observedSurpriseCount > 0
            ? `<div style="font-size:10px; color:#B45309; font-weight:800; margin-top:2px;">⚡ ${st.observedSurpriseCount} đột xuất</div>`
            : "";

        return `
          <tr bgcolor="${idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC"}" style="border-bottom:1px solid #E2E8F0;">
            <td align="center" style="padding:10px 8px; font-size:12px; font-weight:700; color:#64748B;">${idx + 1}</td>
            <td style="padding:10px 12px; font-size:12px; font-weight:700; color:#0F172A;">
              <div style="font-size:13px; color:#003B3A; font-weight:800;">${t.teacherName}</div>
              <div style="font-size:10px; color:#64748B; font-weight:600; margin-top:2px;">
                Mã GV: <strong>${t.teacherCode}</strong> ${t.position ? '• <span style="color:#B45309; font-weight:800; background-color:#FEF3C7; padding:1px 6px; border-radius:4px;">' + t.position + "</span>" : ""}
              </div>
            </td>
            <td align="center" style="padding:10px 8px;">${taughtBadge}${taughtSurprise}</td>
            <td align="center" style="padding:10px 8px;">${observedBadge}${observedSurprise}</td>
          </tr>
        `;
      })
      .join("");

    const teachingSlotRowsHtml = deptTeachingSlots
      .filter(s => s.registrations?.some(r => r.evaluation))
      .slice(0, 15)
      .map(slot => {
        const d = slot.date ? new Date(slot.date).toLocaleDateString("vi-VN") : "--";
        const evals = slot.registrations?.filter(r => r.evaluation) || [];
        const isSurprise = isSurpriseSlot(slot);
        const surpriseTag = isSurprise
          ? `<span style="display:inline-block; background-color:#FEF3C7; color:#92400E; padding:1px 6px; border-radius:4px; font-weight:800; font-size:9px; border:1px solid #FCD34D; margin-left:4px;">⚡ Đột xuất</span>`
          : "";

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
            <td style="padding:8px 10px; font-weight:700; color:#003B3A;">👨‍🏫 ${slot.teacher?.teacherName || "--"}</td>
            <td style="padding:8px 10px; color:#1E293B;">
              <strong>📖 ${slot.topic || slot.subjectName || "--"}</strong>${surpriseTag}
              <div style="font-size:10px; color:#64748B; margin-top:2px;">🏫 Lớp: ${slot.className || "--"} • Cấp: ${slot.level}</div>
            </td>
            <td align="center" style="padding:8px 10px; font-weight:800; color:#047857;">⭐ ${avgScoreDisplay}</td>
            <td align="center" style="padding:8px 10px; color:#0369A1; font-weight:700;">🗳️ ${evals.length} phiếu</td>
          </tr>
        `;
      })
      .join("");

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
        <table width="720" border="0" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="max-width:720px; width:100%; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 4px 16px rgba(0,59,58,0.12); border:1px solid #CBD5E1;">
          
          <tr>
            <td bgcolor="#003B3A" style="background-color:#003B3A; background:linear-gradient(135deg, #003B3A 0%, #064E3B 60%, #0369A1 100%); padding:28px 32px; color:#FFFFFF; border-bottom:4px solid #48BFE3;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                      <tr>
                        <td bgcolor="#0B4A47" style="background-color:#0B4A47; border:1px solid #48BFE3; border-radius:20px; padding:3px 12px; font-size:10.5px; font-weight:800; color:#48BFE3; letter-spacing:1px; text-transform:uppercase;">
                          🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
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

          <tr>
            <td style="padding:28px 32px; background-color:#FFFFFF;">
              <p style="margin:0 0 10px 0; font-size:14px; line-height:1.6; color:#0F172A;">
                👋 Kính gửi Thầy/Cô <strong>${ttcmName || "Tổ trưởng chuyên môn"}</strong>,
              </p>
              <p style="margin:0 0 20px 0; font-size:13px; line-height:1.6; color:#334155;">
                Ban Khảo thí & ĐBCL kính gửi Thầy/Cô bảng tổng hợp kết quả thực hiện chỉ tiêu <strong>Tiết dạy</strong> và <strong>Tiết dự giờ</strong> của các Giáo viên bộ môn thuộc <strong>${deptDisplayName}</strong> trong kỳ <strong>${monthLabel}</strong>:
              </p>

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
                    ${totalTaughtSurpriseCount > 0 ? `<div style="font-size:10px; color:#B45309; font-weight:800; margin-top:2px;">⚡ ${totalTaughtSurpriseCount} đột xuất</div>` : ""}
                  </td>
                  <td width="2%"></td>
                  <td width="23%" bgcolor="#F0F9FF" style="padding:12px 8px; background-color:#F0F9FF; border-radius:12px; border:1px solid #BAE6FD; text-align:center;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#0369A1;">👁️ Tổng Tiết Dự</div>
                    <div style="font-size:20px; font-weight:900; color:#0284C7; margin-top:4px;">${totalObservedCount}</div>
                    <div style="font-size:10px; color:#38BDF8; font-weight:600;">lượt dự giờ</div>
                    ${totalObservedSurpriseCount > 0 ? `<div style="font-size:10px; color:#B45309; font-weight:800; margin-top:2px;">⚡ ${totalObservedSurpriseCount} đột xuất</div>` : ""}
                  </td>
                  <td width="2%"></td>
                  <td width="23%" bgcolor="#FEF3C7" style="padding:12px 8px; background-color:#FEF3C7; border-radius:12px; border:1px solid #FDE68A; text-align:center;">
                    <div style="font-size:10px; font-weight:800; text-transform:uppercase; color:#92400E;">⭐ Tỷ lệ Đạt Chuẩn</div>
                    <div style="font-size:20px; font-weight:900; color:#B45309; margin-top:4px;">${passRate}%</div>
                    <div style="font-size:10px; color:#D97706; font-weight:600;">${totalPassedEvalsCount}/${totalEvalsCount} phiếu</div>
                  </td>
                </tr>
              </table>

              <div style="margin-bottom:24px;">
                <h3 style="margin:0 0 10px 0; font-size:13px; font-weight:900; text-transform:uppercase; color:#003B3A; letter-spacing:0.5px;">
                  1. DANH SÁCH GIÁO VIÊN & ĐỐI CHIẾU CHỈ TIÊU (${deptTeachers.length} GV)
                </h3>
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse; border:1px solid #CBD5E1; border-radius:8px; overflow:hidden;">
                  <thead>
                    <tr bgcolor="#003B3A" style="background-color:#003B3A; color:#FFFFFF; font-size:11px; font-weight:800; text-transform:uppercase;">
                      <th style="padding:10px 8px; text-align:center; width:35px; border-right:1px solid #065F46; color:#FFFFFF;">STT</th>
                      <th style="padding:10px 12px; text-align:left; border-right:1px solid #065F46; color:#FFFFFF;">Giáo viên Bộ môn</th>
                      <th style="padding:10px 8px; text-align:center; width:150px; border-right:1px solid #065F46; color:#FFFFFF;">Tiết Dạy</th>
                      <th style="padding:10px 8px; text-align:center; width:150px; color:#FFFFFF;">Tiết Dự</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${teacherRowsHtml}
                  </tbody>
                </table>
              </div>

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
                  <li style="margin-bottom:5px;">
                    ⚡ <strong>Tiết đột xuất:</strong> Báo cáo tự động phân loại và thống kê rõ ràng số tiết dự giờ đột xuất và tiết dạy của GV được dự đột xuất.
                  </li>
                  <li>
                    🎯 <strong>Chỉ tiêu định mức:</strong> Được đối chiếu theo định mức (tháng hoặc năm học) đã được thiết lập cho từng Giáo viên bộ môn.
                  </li>
                </ul>
              </div>

              ${
                teachingSlotRowsHtml
                  ? `
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
              `
                  : ""
              }

              ${
                notes
                  ? `
              <div style="margin-bottom:24px; padding:14px 18px; background-color:#EFF6FF; border-left:4px solid #0284C7; border-radius:8px;">
                <strong style="font-size:12px; color:#0369A1; text-transform:uppercase; display:block; margin-bottom:4px;">💬 Ghi chú từ Ban Khảo thí & ĐBCL:</strong>
                <p style="margin:0; font-size:12px; color:#1E3A8A; line-height:1.5; white-space:pre-wrap;">${notes}</p>
              </div>
              `
                  : ""
              }

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

          <tr>
            <td bgcolor="#F8FAFC" style="background-color:#F8FAFC; border-top:1px solid #E2E8F0; padding:20px 32px; text-align:center; font-size:11px; color:#64748B; line-height:1.6;">
              <strong style="color:#003B3A;">🏫 HỆ THỐNG SKYLINE SURVEY - BAN KHẢO THÍ & ĐBCL</strong><br>
              Email báo cáo chuyên môn định kỳ từ Hệ thống Quản trị Dự giờ Skyline School.<br>
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
      to: ttcmEmail,
      // cc removed per policy
      subject: emailSubject,
      html: emailHtml
    });

    return {
      success: true,
      departmentId,
      departmentName: department.name,
      ttcmEmail,
      ttcmName
    };
  } catch (err: any) {
    console.error(`[sendReportForDepartment] Error for dept ${departmentId}:`, err);
    return {
      success: false,
      departmentId,
      departmentName: "",
      error: err.message || "Lỗi không xác định khi gửi email"
    };
  }
}
