// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/mail"
import { executeEntranceWorkflowAction } from "@/lib/entrance-progress/entranceProgressEngine"

export async function GET(req) {
  const session = await auth();
  const user = session?.user as any;
  try {
    const { searchParams } = new URL(req.url);
    
    if (searchParams.get("get_next_code") === "true") {
      const surveyType = searchParams.get("surveyType") || "KHAO_SAT_LE";
      const periods = await (prisma as any).preschoolInputAssessmentPeriod.findMany({
        select: { code: true }
      });
      let maxNum = 0;
      const prefix = surveyType === "OPEN_DAY" ? "KSĐV_OP_" : "KSĐV_LE_";
      for (const p of periods) {
        if (p.code && p.code.startsWith(prefix)) {
          const suffix = p.code.substring(prefix.length);
          const num = parseInt(suffix, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
      const nextNum = maxNum + 1;
      const nextCode = prefix + nextNum.toString().padStart(2, "0");
      return NextResponse.json({ nextCode });
    }
    
    const academicYearId = searchParams.get("academicYearId");
    
    const whereClause = academicYearId ? { academicYearId } : {};
    
    const periods = await (prisma as any).preschoolInputAssessmentPeriod.findMany({
      where: whereClause,
      include: {
        assignedUser: { select: { fullName: true } },
        batches: {
          include: {
            assignedUser: { select: { id: true, fullName: true } }
          },
          orderBy: { batchNumber: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const userRole = (user?.role || "").toUpperCase();
    const isGDCS = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(userRole);

    let filteredPeriods = periods;
    if (isGDCS && user?.id) {
      const assignments = await prisma.userCampusAssignment.findMany({
        where: { userId: user.id }
      });
      const userCampusIds = assignments.map(a => a.campusId);

      filteredPeriods = periods.map(p => {
        const filteredBatches = (p.batches || []).filter(b => 
          !b.campusId || 
          userCampusIds.includes(b.campusId) || 
          b.assignedUserId === user.id
        );
        return {
          ...p,
          batches: filteredBatches
        };
      });
    }
    
    return NextResponse.json(filteredPeriods);
  } catch (error) {
    console.error("API GET ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, data } = body;
    
    if (action === "CREATE_PERIOD") {
      const result = await (prisma as any).preschoolInputAssessmentPeriod.create({
        data: {
           code: data.code,
           name: data.name,
           academicYearId: data.academicYearId,
           description: data.description,
           assignedUserId: data.assignedUserId || null,
           startDate: data.startDate ? new Date(data.startDate) : null,
           endDate: data.endDate ? new Date(data.endDate) : null,
           status: data.status || "ACTIVE",
           surveyType: data.surveyType || "KHAO_SAT_LE",
        }
      });
      return NextResponse.json(result);
    } 
    else if (action === "CREATE_BATCH") {
      const result = await (prisma as any).preschoolInputAssessmentBatch.create({
        data: {
           periodId: data.periodId,
           batchNumber: parseInt(data.batchNumber),
           name: data.name,
           startDate: data.startDate ? new Date(data.startDate) : null,
           endDate: data.endDate ? new Date(data.endDate) : null,
           campusId: data.campusId || null,
           assignedUserId: data.assignedUserId || null,
           status: data.status || "ACTIVE"
        }
      });
      return NextResponse.json(result);
    }
    
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("API POST ERROR:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { action, id, data } = body;
    
    if (action === "UPDATE_PERIOD") {
      const result = await (prisma as any).preschoolInputAssessmentPeriod.update({
        where: { id },
        data: {
           ...(data.name !== undefined && { name: data.name }),
           ...(data.description !== undefined && { description: data.description }),
           ...(data.assignedUserId !== undefined && { assignedUserId: data.assignedUserId || null }),
           ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
           ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
           ...(data.status !== undefined && { status: data.status }),
           ...(data.surveyType !== undefined && { surveyType: data.surveyType || "KHAO_SAT_LE" })
        }
      });
      return NextResponse.json(result);
    }
    else if (action === "UPDATE_BATCH") {
      const result = await (prisma as any).preschoolInputAssessmentBatch.update({
        where: { id },
        data: {
           ...(data.name !== undefined && { name: data.name }),
           ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
           ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
           ...(data.campusId !== undefined && { campusId: data.campusId || null }),
           ...(data.assignedUserId !== undefined && { assignedUserId: data.assignedUserId || null }),
           ...(data.status !== undefined && { status: data.status }),
           ...(data.batchNumber !== undefined && { batchNumber: typeof data.batchNumber === 'string' ? parseInt(data.batchNumber) : data.batchNumber }),
        }
      });
      return NextResponse.json(result);
    }
    else if (action === "SEND_ASSIGNMENT_EMAIL" || action === "HANDOVER_TO_GIAO_VU") {
      const targetBatchId = id || data?.batchId || body?.batchId || null;
      const targetPeriodId = data?.periodId || body?.periodId || null;
      const customAssignedUserId = data?.assignedUserId ?? body?.assignedUserId;
      const customRecipients = data?.recipientEmails ?? body?.recipientEmails ?? data?.to ?? body?.to;
      const customSubject = data?.subject ?? body?.subject;
      const customNote = data?.note ?? body?.note;
      const customStudentIds = Array.isArray(data?.studentIds || body?.studentIds) ? (data?.studentIds || body?.studentIds) : null;

      let batch: any = null;
      let period: any = null;

      if (targetBatchId && targetBatchId !== "all" && targetBatchId !== "none") {
        if (customAssignedUserId !== undefined) {
          await (prisma as any).preschoolInputAssessmentBatch.update({
            where: { id: targetBatchId },
            data: { assignedUserId: customAssignedUserId || null }
          }).catch(() => {});
        }
        batch = await (prisma as any).preschoolInputAssessmentBatch.findUnique({
          where: { id: targetBatchId },
          include: { period: true, campus: true, assignedUser: true }
        });
        period = batch?.period || null;
      }

      if (!period && targetPeriodId && targetPeriodId !== "all") {
        period = await (prisma as any).preschoolInputAssessmentPeriod.findUnique({
          where: { id: targetPeriodId }
        });
      }

      if (!batch && !period) {
        return NextResponse.json({ error: "Không tìm thấy đợt hoặc kỳ khảo sát để bàn giao" }, { status: 404 });
      }

      const host = req.headers.get("host") || "skyline-survey.vercel.app";
      const protocol = host.includes("localhost") ? "http" : "https";
      const appUrl = `${protocol}://${host}`;
      const session = await auth().catch(() => null);
      const actorUser = (session?.user as any) || null;

      const notifyRes = await notifyBatchAssignment(batch, appUrl, {
        period,
        recipientEmailsInput: customRecipients,
        customSubject,
        customNote,
        studentIds: customStudentIds,
        actorUser
      });
      return NextResponse.json({ success: true, ...notifyRes });
    }
    
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type"); // 'period' or 'batch'
    
    if (!id || !type) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    
    if (type === 'period') {
       await (prisma as any).preschoolInputAssessmentPeriod.delete({ where: { id } });
    } else if (type === 'batch') {
       await (prisma as any).preschoolInputAssessmentBatch.delete({ where: { id } });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}


async function notifyBatchAssignment(batch: any, appUrl?: string, options?: {
  period?: any;
  recipientEmailsInput?: string | string[] | null;
  customSubject?: string | null;
  customNote?: string | null;
  studentIds?: string[] | null;
  actorUser?: any;
}) {
  try {
    const loginUrl = appUrl || process.env.NEXTAUTH_URL || "https://skyline-survey.vercel.app";
    const resolvedPeriod = batch?.period || options?.period || null;
    const resolvedPeriodId = batch?.periodId || resolvedPeriod?.id || "";
    const resolvedBatchId = batch?.id || "";

    // 1. Lấy danh sách trẻ mầm non thuộc đợt / kỳ / danh sách chọn
    const studentWhere: any = {};
    if (options?.studentIds && options.studentIds.length > 0) {
      studentWhere.id = { in: options.studentIds };
    } else if (resolvedBatchId) {
      studentWhere.batchId = resolvedBatchId;
    } else if (resolvedPeriodId) {
      studentWhere.periodId = resolvedPeriodId;
    }

    const students = await (prisma as any).preschoolInputAssessmentStudent.findMany({
      where: studentWhere,
      include: { batch: true, period: true },
      orderBy: [
        { grade: "asc" },
        { studentCode: "asc" }
      ]
    }).catch(() => []);

    // 2. Xác định Cơ sở
    let campusId = batch?.campusId || null;
    let campusName = batch?.campus?.campusName || batch?.campus?.campusCode || "";
    let campusCode = batch?.campus?.campusCode || "";

    if (!campusCode) {
      const bName = (batch?.name || "").toUpperCase();
      for (const code of ["CS1", "CS2", "CS3", "CS4", "CS5"]) {
        if (bName.includes(code)) {
          campusCode = code;
          break;
        }
      }
    }
    if (!campusCode && students.length > 0) {
      const firstCampus = String(students[0].admissionCampus || students[0].registeredCampus || "").toUpperCase();
      for (const code of ["CS1", "CS2", "CS3", "CS4", "CS5"]) {
        if (firstCampus.includes(code)) {
          campusCode = code;
          break;
        }
      }
      if (!campusName && (students[0].admissionCampus || students[0].registeredCampus)) {
        campusName = students[0].admissionCampus || students[0].registeredCampus;
      }
    }
    if (!campusCode) campusCode = "CS1";
    if (!campusName) campusName = campusCode;

    if (!campusId && campusCode) {
      const matchedCampus = await (prisma as any).campus.findFirst({
        where: { campusCode: campusCode }
      }).catch(() => null);
      if (matchedCampus) {
        campusId = matchedCampus.id;
        campusName = matchedCampus.campusName || campusName;
      }
    }

    // 3. Tìm danh sách tài khoản Giáo vụ Cơ sở
    let giaovuUsers: any[] = [];
    if (campusId) {
      const assignments = await (prisma as any).userCampusAssignment.findMany({
        where: { campusId },
        include: { user: true }
      }).catch(() => []);

      giaovuUsers = assignments
        .map((a: any) => a.user)
        .filter((u: any) => {
          const role = (u?.role || "").toUpperCase();
          return ["GIAO_VU", "GIAO_VU_CS", "GVCS", "GDCS", "GĐ_CS", "GĐCS"].includes(role);
        });
    }

    if (giaovuUsers.length === 0) {
      giaovuUsers = await (prisma as any).user.findMany({
        where: { role: { in: ["GIAO_VU", "GIAO_VU_CS", "GVCS"] } },
        select: { id: true, fullName: true, email: true, role: true }
      }).catch(() => []);
    }

    const batchCode = batch?.batchNumber ? `#${batch.batchNumber}` : (batch?.name ? batch.name : "Tất cả đợt");
    const batchDisplayName = batch?.name ? (batch.batchNumber ? `Đợt #${batch.batchNumber} — ${batch.name}` : batch.name) : "Toàn kỳ khảo sát";
    const surveyContent = resolvedPeriod?.name || "Khảo sát đầu vào Mầm non";
    const startTimeStr = batch?.startDate
      ? new Date(batch.startDate).toLocaleDateString("vi-VN")
      : (resolvedPeriod?.startDate ? new Date(resolvedPeriod.startDate).toLocaleDateString("vi-VN") : "—");
    const endTimeStr = batch?.endDate
      ? new Date(batch.endDate).toLocaleDateString("vi-VN")
      : (resolvedPeriod?.endDate ? new Date(resolvedPeriod.endDate).toLocaleDateString("vi-VN") : "—");
    const timeDisplay = startTimeStr === endTimeStr ? startTimeStr : `${startTimeStr} → ${endTimeStr}`;

    // Thống kê theo Nhóm tuổi
    const gradeCounter: Record<string, number> = {};
    students.forEach((st: any) => {
      const gLabel = st.grade || "Chưa rõ nhóm tuổi";
      gradeCounter[gLabel] = (gradeCounter[gLabel] || 0) + 1;
    });
    const gradeSysSummary = Object.entries(gradeCounter)
      .map(([k, count]) => `${k}: ${count} bé`)
      .join(" • ") || "Chưa có học sinh";

    const assignUrlPath = `/admin/phan-cong-khao-sat?tab=preschool${resolvedPeriodId ? `&periodId=${resolvedPeriodId}` : ""}${resolvedBatchId ? `&batchId=${resolvedBatchId}` : ""}`;
    const assignFullUrl = `${loginUrl}${assignUrlPath}`;

    const senderName = options?.actorUser?.fullName || options?.actorUser?.name || "Bộ phận Tuyển sinh / KT&ĐBCL";
    const handoverNote = (options?.customNote || "").trim();

    const title = `[Bàn giao Giáo vụ] Danh sách ${students.length} bé đợt ${batch?.name || batchCode} cần Phân công Khảo sát`;
    const studentPreviewNames = students.slice(0, 5).map((s: any) => `${s.fullName} (${s.grade || "?"})`).join(", ");
    const message = `Bàn giao danh sách trẻ mầm non khảo sát:\n- Kỳ khảo sát: ${surveyContent}\n- Đợt khảo sát: ${batchDisplayName}\n- Cơ sở: ${campusName}\n- Thời gian: ${timeDisplay}\n- Sĩ số bàn giao: ${students.length} bé (${gradeSysSummary})\n${studentPreviewNames ? `- Danh sách: ${studentPreviewNames}${students.length > 5 ? ` (+${students.length - 5} bé khác)` : ""}\n` : ""}${handoverNote ? `- Ghi chú bàn giao: ${handoverNote}\n` : ""}\nKính nhờ Quý Thầy/Cô Giáo vụ Cơ sở thực hiện phân công giáo viên khảo sát.`;

    // 4. Email người nhận
    const recipientEmailsSet = new Set<string>();
    if (options?.recipientEmailsInput) {
      const rawList = Array.isArray(options.recipientEmailsInput)
        ? options.recipientEmailsInput
        : String(options.recipientEmailsInput).split(",");
      rawList.map(e => String(e || "").trim()).filter(e => e.includes("@")).forEach(e => recipientEmailsSet.add(e));
    }

    let assignedUserFullName = batch?.assignedUser?.fullName || "";
    if (batch?.assignedUserId) {
      const assignedUser = await (prisma as any).user.findUnique({
        where: { id: batch.assignedUserId },
        include: { teacher: true }
      }).catch(() => null);
      if (assignedUser) {
        assignedUserFullName = assignedUser.fullName || assignedUserFullName;
        const resolvedEmail = (assignedUser.teacher?.email && assignedUser.teacher.email.includes("@"))
          ? assignedUser.teacher.email
          : (assignedUser.email && assignedUser.email.includes("@") ? assignedUser.email : "");
        if (resolvedEmail && recipientEmailsSet.size === 0) {
          recipientEmailsSet.add(resolvedEmail);
        }
      }
    }

    if (recipientEmailsSet.size === 0) {
      const staticGiaovu: Record<string, string> = {
        CS1: "giaovu.cs1@skylineschool.edu.vn",
        CS2: "giaovu.cs2@skylineschool.edu.vn",
        CS3: "giaovu.cs3@skylineschool.edu.vn",
        CS4: "giaovu.cs4@skylineschool.edu.vn",
        CS5: "giaovu.cs5@skylineschool.edu.vn",
      };
      const fbEmail = staticGiaovu[campusCode.toUpperCase()] || "giaovu.cs1@skylineschool.edu.vn";
      recipientEmailsSet.add(fbEmail);
    }

    const recipientEmails = Array.from(recipientEmailsSet);

    // 5. Tạo Notification trên hệ thống
    const notifyUserIds = new Set<string>();
    if (batch?.assignedUserId) notifyUserIds.add(batch.assignedUserId);
    for (const u of giaovuUsers) {
      if (u?.id) notifyUserIds.add(u.id);
    }

    for (const userId of Array.from(notifyUserIds)) {
      await (prisma as any).notification.create({
        data: {
          userId,
          title,
          message,
          link: assignUrlPath
        }
      }).catch(() => {});
    }

    // 6. Ghi nhận hoàn thành Bước 2 trên Tiến độ Điều hành Khảo sát
    if (resolvedPeriodId && students.length > 0) {
      try {
        await executeEntranceWorkflowAction({
          action: "CONFIRM",
          targetScope: resolvedBatchId ? "BATCH" : "PERIOD",
          periodId: resolvedPeriodId,
          batchId: resolvedBatchId || null,
          stageNumber: 2,
          status: "COMPLETED",
          note: `Bàn giao danh sách ${students.length} bé mầm non theo đợt khảo sát tới Giáo vụ để phân công khảo sát.${handoverNote ? ` Ghi chú: ${handoverNote}` : ""}`,
          actor: {
            id: options?.actorUser?.id || "system_handover",
            fullName: senderName,
            role: options?.actorUser?.role || "GIAO_VU",
            isSuperAdmin: true,
          },
        });
      } catch (wfErr) {
        console.warn("Preschool handover workflow stage 2 update warning:", wfErr);
      }
    }

    const studentRowsHtml = students.length === 0 ? `
      <tr>
        <td colspan="6" style="padding: 16px; text-align: center; font-size: 12.5px; color: #94A3B8; font-style: italic;">
          Hiện chưa có hồ sơ bé nào trong đợt khảo sát này.
        </td>
      </tr>
    ` : students.map((st: any, idx: number) => {
      const bgRow = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
      const dobStr = st.dateOfBirth ? new Date(st.dateOfBirth).toLocaleDateString("vi-VN") : "—";
      const genderStr = st.gender === "M" || st.gender === "Nam" ? "Nam" : st.gender === "F" || st.gender === "Nữ" ? "Nữ" : (st.gender || "—");
      const gradeStr = st.grade || "—";
      const stCampus = st.admissionCampus || st.registeredCampus || campusName || "—";

      return `
        <tr style="border-bottom: 1px solid #E2E8F0; background-color: ${bgRow};">
          <td style="padding: 9px 8px; font-size: 12px; color: #64748B; text-align: center; font-weight: 600;">${idx + 1}</td>
          <td style="padding: 9px 8px; font-size: 12px; color: #003B3A; font-family: monospace; font-weight: 700;">${st.studentCode || "—"}</td>
          <td style="padding: 9px 10px; font-size: 12.5px; color: #0F172A; font-weight: 700;">${st.fullName || "—"}</td>
          <td style="padding: 9px 8px; font-size: 12px; color: #475569; text-align: center;">${dobStr} (${genderStr})</td>
          <td style="padding: 9px 8px; font-size: 12px; color: #005854; text-align: center; font-weight: 800;">${gradeStr}</td>
          <td style="padding: 9px 10px; font-size: 12px; color: #0F766E; text-align: center; font-weight: 700;">${stCampus}</td>
        </tr>
      `;
    }).join("");

    const emailSubject = options?.customSubject || `[Sky-Line SSM] Bàn giao Danh sách Trẻ Khảo sát Mầm non (${students.length} bé) - ${batch?.name || surveyContent}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emailSubject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F1F5F9" style="table-layout: fixed;">
          <tr>
            <td align="center" style="padding: 24px 12px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 720px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0;">
                
                <!-- HEADER BANNER -->
                <tr>
                  <td bgcolor="#003B3A" style="padding: 28px 24px; text-align: center; background-color: #003B3A; background: linear-gradient(135deg, #003B3A 0%, #005B58 60%, #00A19A 100%);">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                      <tr>
                        <td align="center" style="padding-bottom: 8px;">
                          <span style="display: inline-block; padding: 4px 14px; background-color: rgba(255, 255, 255, 0.14); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                            🏫 BẬC MẦM NON • HỆ THỐNG GIÁO DỤC SKY-LINE
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px; line-height: 1.35; text-transform: uppercase;">
                            BÀN GIAO DANH SÁCH TRẺ KHẢO SÁT ĐẦU VÀO
                          </h1>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top: 6px;">
                          <div style="font-size: 13px; font-weight: 700; color: #FDE047; letter-spacing: 0.5px; text-transform: uppercase;">
                            ${batchDisplayName} • ${students.length} BÉ
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- MAIN BODY -->
                <tr>
                  <td style="padding: 24px 28px 12px 28px; color: #1E293B;">
                    <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #003B3A;">
                      Kính gửi Quý Thầy/Cô Giáo vụ Cơ sở${assignedUserFullName ? ` (${assignedUserFullName})` : ""},
                    </p>
                    <p style="margin: 0 0 14px 0; font-size: 13.5px; color: #475569; line-height: 1.6;">
                      Bộ phận Tiếp nhận hồ sơ / Ban Khảo thí trân trọng bàn giao <strong>Danh sách Trẻ đăng ký theo đợt khảo sát Mầm non</strong> để Quý Thầy/Cô Giáo vụ thực hiện <strong>Phân công Giáo viên khảo sát</strong>. Thông tin chi tiết như sau:
                    </p>
                  </td>
                </tr>

                <!-- INFO CARD -->
                <tr>
                  <td style="padding: 0 28px 18px 28px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F0FDFA" style="background-color: #F0FDFA; border-radius: 12px; border: 1px solid #CCFBF1; border-left: 4px solid #00A19A; padding: 16px 20px;">
                      <tr>
                        <td style="padding: 5px 0; width: 28%; font-size: 11px; font-weight: 800; color: #007A87; text-transform: uppercase; letter-spacing: 0.5px;">KỲ KHẢO SÁT:</td>
                        <td style="padding: 5px 0; font-size: 13.5px; font-weight: 700; color: #1E293B;">${surveyContent}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-size: 11px; font-weight: 800; color: #007A87; text-transform: uppercase; letter-spacing: 0.5px;">ĐỢT KHẢO SÁT:</td>
                        <td style="padding: 5px 0; font-size: 14px; font-weight: 800; color: #003B3A;">${batchDisplayName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-size: 11px; font-weight: 800; color: #007A87; text-transform: uppercase; letter-spacing: 0.5px;">CƠ SỞ &amp; THỜI GIAN:</td>
                        <td style="padding: 5px 0; font-size: 13.5px; font-weight: 700; color: #047857;">${campusName} • ${timeDisplay}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-size: 11px; font-weight: 800; color: #007A87; text-transform: uppercase; letter-spacing: 0.5px;">SĨ SỐ BÀN GIAO:</td>
                        <td style="padding: 5px 0; font-size: 13.5px; font-weight: 800; color: #B45309;">${students.length} bé (${gradeSysSummary})</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 0; font-size: 11px; font-weight: 800; color: #007A87; text-transform: uppercase; letter-spacing: 0.5px;">NGƯỜI BÀN GIAO:</td>
                        <td style="padding: 5px 0; font-size: 13px; font-weight: 600; color: #334155;">${senderName}</td>
                      </tr>
                      ${handoverNote ? `
                      <tr>
                        <td style="padding: 5px 0; font-size: 11px; font-weight: 800; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px;">GHI CHÚ BÀN GIAO:</td>
                        <td style="padding: 5px 0; font-size: 13px; font-weight: 700; color: #92400E;">${handoverNote}</td>
                      </tr>
                      ` : ""}
                    </table>
                  </td>
                </tr>

                <!-- STUDENT LIST TABLE -->
                <tr>
                  <td style="padding: 0 28px 22px 28px;">
                    <div style="font-size: 12px; font-weight: 800; color: #003B3A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
                      📋 DANH SÁCH TRẺ THEO ĐỢT KHẢO SÁT (${students.length} BÉ)
                    </div>
                    <div style="border: 1px solid #CBD5E1; border-radius: 12px; overflow: hidden;">
                      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                        <thead>
                          <tr bgcolor="#003B3A" style="background-color: #003B3A;">
                            <th style="padding: 10px 6px; text-align: center; font-size: 10.5px; font-weight: 800; color: #FFFFFF; width: 36px;">#</th>
                            <th style="padding: 10px 8px; text-align: left; font-size: 10.5px; font-weight: 800; color: #FFFFFF; width: 95px;">MÃ BÉ</th>
                            <th style="padding: 10px 10px; text-align: left; font-size: 10.5px; font-weight: 800; color: #FFFFFF;">HỌ VÀ TÊN</th>
                            <th style="padding: 10px 8px; text-align: center; font-size: 10.5px; font-weight: 800; color: #FFFFFF; width: 115px;">NGÀY SINH</th>
                            <th style="padding: 10px 8px; text-align: center; font-size: 10.5px; font-weight: 800; color: #FFFFFF; width: 130px;">NHÓM TUỔI</th>
                            <th style="padding: 10px 10px; text-align: center; font-size: 10.5px; font-weight: 800; color: #FFFFFF; width: 120px;">CƠ SỞ</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${studentRowsHtml}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>

                <!-- NOTICE CARD -->
                <tr>
                  <td style="padding: 0 28px 22px 28px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#FFFBEB" style="background-color: #FFFBEB; border-left: 4px solid #D97706; border-radius: 8px;">
                      <tr>
                        <td style="padding: 12px 16px; font-size: 13px; color: #78350F; line-height: 1.55;">
                          <strong style="color: #92400E;">📌 Đề nghị thực hiện:</strong> Kính nhờ Quý Thầy/Cô Giáo vụ Cơ sở truy cập hệ thống để phân công giáo viên khảo sát theo nhóm tuổi tương ứng.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- BULLETPROOF CTA BUTTON -->
                <tr>
                  <td style="padding: 0 28px 28px 28px; text-align: center;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                      <tr>
                        <td align="center" bgcolor="#00A19A" style="border-radius: 10px; background-color: #00A19A;">
                          <a href="${assignFullUrl}" target="_blank" style="display: inline-block; padding: 14px 34px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13.5px; color: #FFFFFF; font-weight: 800; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #00A19A;">
                            THỰC HIỆN PHÂN CÔNG KHẢO SÁT NGAY &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- OFFICIAL BRAND FOOTER -->
                <tr>
                  <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 24px; text-align: center; border-top: 3px solid #00A19A;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                      HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                    </p>
                    <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 600; color: #CCFBF1;">
                      BAN ĐÀO TẠO &amp; KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
                    </p>
                    <p style="margin: 0; font-size: 10px; color: rgba(255, 255, 255, 0.65); line-height: 1.5;">
                      Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #FDE047; text-decoration: none; font-weight: 600;">ktdbcl@skylineschool.edu.vn</a> • Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #FDE047; text-decoration: none; font-weight: 600;">skylineschool.edu.vn</a>
                    </p>
                    <p style="margin: 6px 0 0 0; font-size: 10px; color: rgba(255, 255, 255, 0.4);">
                      Đây là thư điện tử được gửi tự động từ Hệ thống Quản lý Khảo sát Tuyển sinh Sky-Line.
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

    let sentCount = 0;
    let lastError = "";
    for (const email of recipientEmails) {
      const res = await sendEmail({
        to: email,
        subject: emailSubject,
        html: emailHtml,
        replyTo: "ktdbcl@skylineschool.edu.vn"
      });
      if (res?.success) {
        sentCount++;
      } else if (res?.error) {
        lastError = res.error;
      }
    }

    return {
      sent: sentCount > 0,
      sentCount,
      recipientEmails,
      studentCount: students.length,
      gradeSysSummary,
      assignUrl: assignUrlPath,
      html: emailHtml,
      error: sentCount === 0 ? (lastError || "Không gửi được qua máy chủ SMTP") : undefined
    };
  } catch (err: any) {
    console.error("Failed to notify preschool batch assignment:", err);
    return {
      sent: false,
      sentCount: 0,
      error: err?.message || "Lỗi xử lý bàn giao Giáo vụ"
    };
  }
}
