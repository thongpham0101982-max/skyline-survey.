// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendExperientialActivityNotification } from "@/lib/experiential/email-notification";
import { sendEmail } from "@/lib/mail";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      type = "INITIAL", // 'INITIAL' | 'REMINDER' | 'TEST'
      testEmail,
      senderName,
      senderEmail,
      replyTo,
      customMessage,
      includeGdcs = true,
      gdcsEmails = [],
      targetClassIds = []
    } = body;

    const activity = await prisma.activityRecord.findUnique({
      where: { id },
      include: {
        catalog: true,
        academicYear: true,
        teacher: {
          include: { user: true }
        }
      }
    });

    if (!activity) {
      return NextResponse.json({ error: "Không tìm thấy hoạt động" }, { status: 404 });
    }

    let extraData: any = {};
    try {
      if (activity.locationId && activity.locationId.startsWith("{")) {
        extraData = JSON.parse(activity.locationId);
      }
    } catch {}

    const allAssignedClasses = extraData.assignedClasses || [];
    let classesToNotify = allAssignedClasses;

    // Filter classes if targetClassIds or REMINDER mode
    if (targetClassIds && targetClassIds.length > 0) {
      classesToNotify = allAssignedClasses.filter((c: any) => targetClassIds.includes(c.classId));
    } else if (type === "REMINDER") {
      // Notify only classes that are NOT COMPLETED
      classesToNotify = allAssignedClasses.filter((c: any) => c.status !== "COMPLETED");
    }

    if (type === "TEST") {
      const emailToTest = testEmail || session.user.email;
      if (!emailToTest) {
        return NextResponse.json({ error: "Vui lòng cung cấp email nhận thử nghiệm" }, { status: 400 });
      }

      const displaySender = senderName || extraData.emailSettings?.senderName || "Tổ CTHS - Ban HĐNGLL";
      const fromAddr = senderEmail ? `"${displaySender}" <${senderEmail}>` : `"${displaySender}" <bankhaothi@skylineschool.edu.vn>`;
      
      const appUrl = process.env.NEXTAUTH_URL || "https://skyline-survey.vercel.app";
      const activityUrl = `${appUrl}/teacher/experiential-activities/${id}`;

      const testHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 680px; margin: 24px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #003B3A 0%, #007A70 50%, #00A99D 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
    .badge { display: inline-block; background: rgba(255,255,255,0.22); border: 1px solid rgba(255,255,255,0.35); padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; margin-top: 10px; color: #ffffff; }
    .body { padding: 30px 24px; }
    .mandatory-notice { background: linear-gradient(135deg, #f0fdfa 0%, #e6fffa 100%); border-left: 5px solid #00A99D; border-radius: 12px; padding: 16px 20px; margin: 18px 0; font-size: 13.5px; line-height: 1.6; color: #134e4a; font-weight: 600; }
    .table-info { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    .table-info td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
    .table-info td.label { font-weight: 700; color: #475569; width: 35%; }
    .btn { display: inline-block; background: linear-gradient(135deg, #003B3A 0%, #00A99D 100%); color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 13.5px; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(0, 169, 157, 0.35); text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <div style="background: #fef3c7; color: #92400e; padding: 10px 20px; text-align: center; font-size: 12px; font-weight: 800; border-bottom: 1px solid #fde68a;">
      ⚠️ ĐÂY LÀ EMAIL THỬ NGHIỆM TỪ HỆ THỐNG SKY-LINE
    </div>
    <div class="header">
      <h1 style="margin: 0; font-size: 19px; font-weight: 900; text-transform: uppercase;">QUẢN LÝ HOẠT ĐỘNG TRẢI NGHIỆM SKY-LINE</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 700;">${displaySender.toUpperCase()}</p>
      <div class="badge">Mã kế hoạch: ${activity.code || "HDTN"}</div>
    </div>
    <div class="body">
      <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 12px;">Kính gửi Quý Thầy/Cô,</div>
      <p style="font-size: 13.5px; line-height: 1.6; color: #334155; margin: 0 0 12px 0;">
        Đây là nội dung thư thông báo mẫu sẽ được tự động gửi đến toàn bộ Giáo viên Chủ nhiệm (GVCN) và CC Giám đốc Cơ sở (GĐCS) khi phát hành kế hoạch hoạt động trải nghiệm.
      </p>

      <div class="mandatory-notice">
        <div style="font-size: 14px; font-weight: 900; color: #003B3A; margin-bottom: 4px;">📌 YÊU CẦU TRỌNG TÂM DÀNH CHO GVCN:</div>
        <strong>"Thầy cô vui lòng thực hiện đánh giá vai trò của Học sinh lớp."</strong><br/>
        Kính nhờ Quý Thầy/Cô truy cập hệ thống để ghi nhận vai trò (Trưởng nhóm, Ban tổ chức, Thành viên,...), mức độ tham gia và đánh giá năng lực phẩm chất học sinh.
      </div>

      <table class="table-info">
        <tr>
          <td class="label">🎯 Tên hoạt động:</td>
          <td><strong style="color: #003B3A; font-size: 14px;">${activity.name}</strong></td>
        </tr>
        <tr>
          <td class="label">🏷️ Mạch hoạt động:</td>
          <td>${extraData.strand || "Hướng vào bản thân"} (${extraData.activityTypeName || "Sự kiện"})</td>
        </tr>
        <tr>
          <td class="label">🗓️ Thời gian:</td>
          <td>${activity.date ? new Date(activity.date).toLocaleDateString("vi-VN") : "Theo kế hoạch"} ${extraData.timeRange ? `(${extraData.timeRange})` : ""}</td>
        </tr>
        <tr>
          <td class="label">📍 Địa điểm:</td>
          <td>${extraData.locationText || "Tại các cơ sở Sky-Line"}</td>
        </tr>
        <tr>
          <td class="label">👥 Lớp tham gia:</td>
          <td><strong>${allAssignedClasses.map(c => c.className).join(", ") || "Các lớp được phân công"}</strong></td>
        </tr>
        <tr>
          <td class="label">⏰ Hạn nộp đánh giá:</td>
          <td><strong style="color: #047857;">${extraData.deadline || "Theo kế hoạch"}</strong></td>
        </tr>
      </table>

      <div style="text-align: center; margin: 26px 0 16px 0;">
        <a href="${activityUrl}" class="btn" target="_blank">
          TRUY CẬP VÀ ĐÁNH GIÁ VAI TRÒ HỌC SINH &rarr;
        </a>
      </div>
    </div>
  </div>
</body>
</html>
      `;

      await sendEmail({
        from: fromAddr,
        to: emailToTest,
        replyTo: replyTo || undefined,
        subject: `[THỬ NGHIỆM] [Sky-Line HĐTN] Kế hoạch Hoạt động Trải nghiệm: ${activity.name}`,
        html: testHtml
      });

      return NextResponse.json({
        success: true,
        message: `Đã gửi email thử nghiệm thành công tới ${emailToTest}`
      });
    }

    if (classesToNotify.length === 0) {
      return NextResponse.json({
        success: true,
        message: type === "REMINDER" ? "Tất cả các lớp đã hoàn thành đánh giá, không cần gửi nhắc nhở." : "Không có lớp nào cần gửi thông báo."
      });
    }

    const result = await sendExperientialActivityNotification({
      activityId: activity.id,
      activityCode: activity.code || "HDTN",
      activityName: activity.name,
      strand: extraData.strand,
      activityTypeId: extraData.activityTypeId,
      activityTypeName: extraData.activityTypeName,
      subjectId: extraData.subjectId,
      subjectName: extraData.subjectName,
      departmentId: extraData.departmentId,
      departmentName: extraData.departmentName,
      scale: extraData.scale,
      evalMode: extraData.evalMode,
      criteria: extraData.criteria,
      date: activity.date ? activity.date.toISOString().split("T")[0] : null,
      timeRange: extraData.timeRange,
      location: extraData.locationText || extraData.location,
      deadline: extraData.deadline,
      senderName: senderName || extraData.emailSettings?.senderName,
      senderEmail: senderEmail || extraData.emailSettings?.senderEmail,
      replyTo: replyTo || extraData.emailSettings?.replyTo,
      customMessage: customMessage || (type === "REMINDER" ? "Kính nhờ Quý Thầy/Cô GVCN khẩn trương hoàn thành đánh giá vai trò và năng lực học sinh lớp mình phụ trách trước thời hạn." : extraData.emailSettings?.customMessage),
      includeGdcs: includeGdcs,
      gdcsEmails: gdcsEmails && gdcsEmails.length > 0 ? gdcsEmails : (extraData.emailSettings?.gdcsEmails || []),
      assignedClasses: classesToNotify
    });

    return NextResponse.json({
      success: result.success,
      count: result.count,
      message: `Đã gửi email thông báo thành công đến ${result.count || 0} giáo viên & CC GĐCS liên quan.`
    });
  } catch (error: any) {
    console.error("POST /api/experiential-activities/[id]/notify error:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}
