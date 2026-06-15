// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/mail"

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
    
    return NextResponse.json(periods);
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
           ...(data.status !== undefined && { status: data.status })
           ,...(data.surveyType !== undefined && { surveyType: data.surveyType || "KHAO_SAT_LE" })
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
    else if (action === "SEND_ASSIGNMENT_EMAIL") {
      const batch = await (prisma as any).preschoolInputAssessmentBatch.findUnique({
        where: { id },
        include: { period: true, campus: true }
      });
      if (!batch) return NextResponse.json({ error: "Không tìm thấy đợt khảo sát" }, { status: 404 });
      const host = req.headers.get("host") || "skyline-survey.vercel.app";
      const protocol = host.includes("localhost") ? "http" : "https";
      const appUrl = `${protocol}://${host}`;
      await notifyBatchAssignment(batch, appUrl);
      return NextResponse.json({ success: true });
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


async function notifyBatchAssignment(batch: any, appUrl?: string) {
  if (!batch.assignedUserId) return;
  try {
    const loginUrl = appUrl || process.env.NEXTAUTH_URL || "https://skyline-survey.vercel.app";
    const campusId = batch.campusId;
    if (!campusId) return;

    const assignments = await (prisma as any).userCampusAssignment.findMany({
      where: { campusId },
      include: { user: true }
    });

    const giaovuUsers = assignments
      .map((a: any) => a.user)
      .filter((u: any) => {
        const role = (u?.role || "").toUpperCase();
        return ["GIAO_VU", "GIAO_VU_CS", "GVCS"].includes(role);
      });

    const batchCode = batch.batchNumber ? `#${batch.batchNumber}` : `#${batch.id}`;
    const surveyContent = batch.period?.name || "Khảo sát đầu vào";
    const campusName = batch.campus?.campusName || batch.campus?.campusCode || "Cơ sở";
    const campusCode = batch.campus?.campusCode || "CS1";
    const startTimeStr = batch.startDate ? new Date(batch.startDate).toLocaleDateString("vi-VN") : "—";
    const endTimeStr = batch.endDate ? new Date(batch.endDate).toLocaleDateString("vi-VN") : "—";
    const timeDisplay = `${startTimeStr} - ${endTimeStr}`;

    const title = `[Hệ thống] Phân công người phụ trách đợt khảo sát ${batchCode}`;
    const message = `Thông báo:\n- Mã Đợt: ${batchCode} (${batch.name || ""})\n- Nội dung khảo sát: ${surveyContent}\n- Cơ sở: ${campusName}\n- Thời gian: ${timeDisplay}\n\nKính nhờ thầy cô giáo vụ Cơ sở thực hiện phân công giáo viên khảo sát.`;



    const recipientEmails = [];
    if (batch.assignedUserId) {
      const assignedUser = await (prisma as any).user.findUnique({
        where: { id: batch.assignedUserId },
        include: { teacher: true }
      });
      let resolvedEmail = "";
      if (assignedUser) {
        if (assignedUser.teacher && assignedUser.teacher.email && assignedUser.teacher.email.includes("@")) {
          resolvedEmail = assignedUser.teacher.email;
        } else if (assignedUser.email && assignedUser.email.includes("@")) {
          resolvedEmail = assignedUser.email;
        }
      }
      if (resolvedEmail) {
        recipientEmails.push(resolvedEmail);
      }
    }

    const notifyUserIds = new Set();
    if (batch.assignedUserId) notifyUserIds.add(batch.assignedUserId);
    for (const u of giaovuUsers) {
      notifyUserIds.add(u.id);
    }

    for (const userId of Array.from(notifyUserIds)) {
      await (prisma as any).notification.create({
        data: {
          userId,
          title,
          message
        }
      });
    }

    if (recipientEmails.length === 0) {
      const staticGiaovu = {
        CS1: "giaovu.cs1@skylineschool.edu.vn",
        CS2: "giaovu.cs2@skylineschool.edu.vn",
        CS3: "giaovu.cs3@skylineschool.edu.vn",
        CS4: "giaovu.cs4@skylineschool.edu.vn",
        CS5: "giaovu.cs5@skylineschool.edu.vn",
      };
      const fbEmail = staticGiaovu[campusCode.toUpperCase()] || "giaovu.cs1@skylineschool.edu.vn";
      recipientEmails.push(fbEmail);
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #1E1B4B; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="background-color: #00A6A9; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; color: #ffffff;">
          <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">Thông báo phân công khảo sát</h2>
        </div>
        <div style="padding: 20px 10px;">
          <p>Kính gửi quý thầy/cô Giáo vụ Cơ sở,</p>
          <p>Hệ thống trân trọng thông báo thông tin đợt khảo sát mới đã được gán người phụ trách:</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
            <table width="100%" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
              <tr>
                <td width="35%" style="font-weight: bold; color: #475569;">Mã Đợt:</td>
                <td><strong>${batchCode}</strong> (${batch.name || ""})</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: #475569;">Nội dung khảo sát:</td>
                <td>${surveyContent}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: #475569;">Cơ sở:</td>
                <td>${campusName}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: #475569;">Thời gian:</td>
                <td>${timeDisplay}</td>
              </tr>
            </table>
          </div>
          <p style="font-style: italic; color: #0d9488; font-weight: bold;">
            Kính nhờ thầy cô giáo vụ Cơ sở thực hiện phân công giáo viên khảo sát.
          </p>
          <div style="background-color: #f0fdfa; padding: 15px; border-radius: 8px; border: 1px solid #ccfbf1; margin-top: 15px; margin-bottom: 20px; font-size: 13.5px; color: #0f766e;">
            <p style="margin: 0; line-height: 1.6;">
              Để đăng nhập hệ thống và phân công giáo viên, thầy/cô vui lòng đăng nhập:<br/>
              - <strong>Tài khoản và mật khẩu:</strong> Mã số SKL.<br/>
              - <strong>Lưu ý:</strong> Vui lòng đổi Mật khẩu khi đăng nhập.
            </p>
          </div>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${loginUrl}" target="_blank" style="background-color: #00A6A9; color: #ffffff; padding: 12px 30px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(0, 166, 169, 0.2);">Đăng nhập Hệ thống</a>
          </div>
        </div>
        <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; border-radius: 0 0 8px 8px;">
          <p style="margin: 0; font-weight: bold; color: #1E1B4B;">Hệ thống Quản trị Chất lượng Dạy và Học</p>
          <p style="margin: 4px 0 0 0;">Email tự động gửi từ Hệ thống Khảo sát Tuyển sinh Sky-Line</p>
        </div>
      </div>
    `;

    for (const email of recipientEmails) {
      await sendEmail({
        to: email,
        subject: `[Sky-Line] Thông báo phân công khảo sát - Đợt ${batchCode}`,
        html: emailHtml,
        replyTo: "bankhaothi@skylineschool.edu.vn"
      });
    }
  } catch (err) {
    console.error("Failed to notify batch assignment:", err);
  }
}

