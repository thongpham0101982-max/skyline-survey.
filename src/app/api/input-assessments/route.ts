// @ts-nocheck
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/mail"

export async function GET(req) {
  const session = await auth();
  const user = session?.user as any;
  const isGDCS = user?.role === 'GDCS';
  const allowedCampusIds = user?.campusIds || [];
  try {
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId");
    const getGrades = searchParams.get("getGrades");
    
    if (getGrades === "true") {
      if (!academicYearId) {
        return NextResponse.json({ error: "Missing academicYearId" }, { status: 400 });
      }
      const uniqueGrades = await (prisma as any).class.findMany({
        where: { academicYearId },
        select: { grade: true },
        distinct: ["grade"],
        orderBy: { grade: "asc" }
      }).catch(() => []);
      
      const dbGrades = uniqueGrades
        .map((g: any) => g.grade)
        .filter(Boolean)
        .filter((g: string) => /^(?:[1-9]|1[0-2])$/.test(String(g).trim()));
        
      if (dbGrades.length === 0) {
        return NextResponse.json(["1","2","3","4","5","6","7","8","9","10","11","12"]);
      }
      
      const sortedGrades = dbGrades.sort((a: any, b: any) => {
        const na = parseInt(a);
        const nb = parseInt(b);
        if (isNaN(na) || isNaN(nb)) return String(a).localeCompare(String(b));
        return na - nb;
      });
      return NextResponse.json(sortedGrades);
    }
    
    const whereClause = academicYearId ? { academicYearId } : {};
    
    const periods = await (prisma as any).inputAssessmentPeriod.findMany({
      where: whereClause,
      include: {
        InputAssessmentTeacherAssignment: { select: { id: true, unlockRequestStatus: true, unlockReason: true, user: { select: { fullName: true, id: true } } } },
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
      const result = await (prisma as any).inputAssessmentPeriod.create({
        data: {
           code: data.code,
           name: data.name,
           academicYearId: data.academicYearId,
           description: data.description,
           assignedUserId: data.assignedUserId || null,
           startDate: data.startDate ? new Date(data.startDate) : null,
           endDate: data.endDate ? new Date(data.endDate) : null,
           status: data.status || "ACTIVE",
        }
      });
      return NextResponse.json(result);
    } 
    else if (action === "CREATE_BATCH") {
      const result = await (prisma as any).inputAssessmentBatch.create({
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
      const result = await (prisma as any).inputAssessmentPeriod.update({
        where: { id },
        data: {
           ...(data.name !== undefined && { name: data.name }),
           ...(data.description !== undefined && { description: data.description }),
           ...(data.assignedUserId !== undefined && { assignedUserId: data.assignedUserId || null }),
           ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
           ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
           ...(data.status !== undefined && { status: data.status })
           
        }
      });
      return NextResponse.json(result);
    }
    else if (action === "UPDATE_BATCH") {
      const result = await (prisma as any).inputAssessmentBatch.update({
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
      const batch = await (prisma as any).inputAssessmentBatch.findUnique({
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
       await (prisma as any).inputAssessmentPeriod.delete({ where: { id } });
    } else if (type === 'batch') {
       await (prisma as any).inputAssessmentBatch.delete({ where: { id } });
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
          message,
          link: "/admin/xet-duyet-ket-qua"
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
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thông báo phân công khảo sát</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 12px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 660px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 166, 169, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
                <!-- Header -->
                <tr>
                  <td style="background: #ffffff; padding: 32px 28px 24px; text-align: center; border-bottom: 3px solid #00A6A9;">
                    <div style="display: inline-block; background: rgba(0, 166, 169, 0.08); padding: 5px 16px; border-radius: 50px; margin-bottom: 12px; border: 1px solid rgba(0, 166, 169, 0.25);">
                      <span style="color: #00A6A9; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">HỆ PHỔ THÔNG • HỆ THỐNG GIÁO DỤC SKY-LINE</span>
                    </div>
                    <h1 style="margin: 0; color: #1E1B4B; font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.3px; line-height: 1.3;">THÔNG BÁO PHÂN CÔNG KHẢO SÁT</h1>
                    <p style="margin: 8px 0 0 0; color: #007A87; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;">ĐỢT ${batchCode}</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding: 28px 32px 16px 32px;">
                    <p style="margin: 0; font-size: 15px; font-weight: 800; color: #1E1B4B;">Kính gửi Quý Thầy/Cô Giáo vụ Cơ sở,</p>
                    <p style="margin: 10px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                      Hệ thống trân trọng thông báo thông tin đợt khảo sát mới đã được giao trách nhiệm phụ trách. Chi tiết đợt khảo sát như sau:
                    </p>
                  </td>
                </tr>
                <!-- Info Card -->
                <tr>
                  <td style="padding: 0 32px 20px 32px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0fdfa; border-radius: 14px; border: 1px solid #ccfbf1; padding: 18px 20px;">
                      <tr>
                        <td style="padding-bottom: 10px; width: 35%; font-size: 11px; font-weight: 800; color: #008899; text-transform: uppercase; letter-spacing: 0.5px;">MÃ ĐỢT:</td>
                        <td style="padding-bottom: 10px; font-size: 14px; font-weight: 800; color: #1E1B4B;"><strong>${batchCode}</strong> (${batch.name || ""})</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px; font-size: 11px; font-weight: 800; color: #008899; text-transform: uppercase; letter-spacing: 0.5px;">NỘI DUNG:</td>
                        <td style="padding-bottom: 10px; font-size: 14px; font-weight: 800; color: #1E1B4B;">${surveyContent}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px; font-size: 11px; font-weight: 800; color: #008899; text-transform: uppercase; letter-spacing: 0.5px;">CƠ SỞ:</td>
                        <td style="padding-bottom: 10px; font-size: 14px; font-weight: 800; color: #1E1B4B;">${campusName}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 11px; font-weight: 800; color: #008899; text-transform: uppercase; letter-spacing: 0.5px;">THỜI GIAN:</td>
                        <td style="font-size: 14px; font-weight: 800; color: #1E1B4B;">${timeDisplay}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Notice Card -->
                <tr>
                  <td style="padding: 0 32px 24px 32px;">
                    <div style="background-color: #f8fafc; border-left: 4px solid #00A6A9; border-radius: 8px; padding: 14px 18px;">
                      <p style="margin: 0; font-size: 13.5px; color: #334155; line-height: 1.6;">
                        <strong style="color: #007A87;">Lưu ý:</strong> Kính nhờ Thầy/Cô Giáo vụ Cơ sở thực hiện phân công giáo viên khảo sát trên hệ thống để đảm bảo tiến độ.
                      </p>
                    </div>
                  </td>
                </tr>
                <!-- Action Link -->
                <tr>
                  <td style="padding: 0 32px 30px 32px; text-align: center;">
                    <a href="${loginUrl}/admin/phan-cong-khao-sat?tab=k12" target="_blank" style="display: inline-block; padding: 13px 32px; border-radius: 12px; font-size: 14px; font-weight: 800; color: #ffffff; background: linear-gradient(135deg, #00A6A9 0%, #48BFE3 100%); text-decoration: none; box-shadow: 0 4px 14px rgba(0, 166, 169, 0.35); text-transform: uppercase; letter-spacing: 0.5px;">
                      Thực hiện Phân công Giáo viên
                    </a>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <img src="${loginUrl}/images/logo.png" alt="Sky-Line" style="height: 32px; margin-bottom: 10px;" onerror="this.style.display='none'">
                    <p style="margin: 0; font-size: 12px; font-weight: 800; color: #1E1B4B; text-transform: uppercase; letter-spacing: 0.5px;">HỆ THỐNG GIÁO DỤC SKY-LINE</p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">Nơi học sinh học cách yêu thương, chia sẻ, tự lập &amp; có trách nhiệm.</p>
                    <p style="margin: 6px 0 0 0; font-size: 10px; color: #94a3b8;">Email gửi tự động từ Hệ thống Khảo sát Tuyển sinh Sky-Line.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
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

