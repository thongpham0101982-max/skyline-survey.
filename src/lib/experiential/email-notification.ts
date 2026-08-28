import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { ACTIVITY_STRANDS } from "./constants";

export interface ActivityNotificationPayload {
  activityId: string;
  activityCode: string;
  activityName: string;
  strand?: string;
  activityTypeName?: string;
  subjectId?: string | null;
  subjectName?: string | null;
  date?: string | null;
  timeRange?: string | null;
  location?: string | null;
  deadline?: string | null;
  assignedClasses?: Array<{
    classId: string;
    className: string;
    campusCode?: string;
    grade?: string;
  }>;
}

export async function sendExperientialActivityNotification(payload: ActivityNotificationPayload) {
  try {
    const {
      activityId,
      activityCode,
      activityName,
      strand = "BAN_THAN",
      activityTypeName = "Sự kiện / Lễ hội",
      subjectId,
      subjectName,
      date,
      timeRange,
      location,
      deadline,
      assignedClasses = []
    } = payload;

    if (!assignedClasses || assignedClasses.length === 0) {
      console.log("[HĐTN Email] Không có lớp được gán, bỏ qua gửi email.");
      return { success: true, count: 0 };
    }

    const classIds = assignedClasses.map(c => c.classId).filter(Boolean);
    const strandObj = ACTIVITY_STRANDS.find(s => s.id === strand);
    const strandLabel = strandObj ? strandObj.name : "Hướng vào bản thân";
    const appUrl = process.env.NEXTAUTH_URL || "https://skyline-survey.vercel.app";
    const activityUrl = `${appUrl}/teacher/experiential-activities/${activityId}`;

    // 1. Find all GVCN for the assigned classes
    const classes = await prisma.class.findMany({
      where: { id: { in: classIds } },
      include: {
        homeroomTeacher: {
          include: { user: true }
        },
        teachers: {
          where: { roleInClass: "GVCN" },
          include: {
            teacher: {
              include: { user: true }
            }
          }
        }
      }
    });

    // 2. Find all GVBM for the assigned classes if subjectId is provided
    let teachingAssignments: any[] = [];
    if (subjectId) {
      teachingAssignments = await prisma.teachingAssignment.findMany({
        where: {
          subjectId: subjectId,
          classId: { in: classIds }
        },
        include: {
          teacher: {
            include: { user: true }
          },
          class: true,
          subject: true
        }
      });
    }

    // 3. Aggregate unique teachers and their roles
    type TeacherRecipient = {
      teacherId: string;
      teacherName: string;
      email: string;
      roles: string[];
      classes: string[];
    };

    const recipientMap = new Map<string, TeacherRecipient>();

    // Process GVCN
    for (const cls of classes) {
      const gvcnList: any[] = [];
      if (cls.homeroomTeacher) gvcnList.push(cls.homeroomTeacher);
      if (cls.teachers && cls.teachers.length > 0) {
        cls.teachers.forEach(t => {
          if (t.teacher) gvcnList.push(t.teacher);
        });
      }

      for (const t of gvcnList) {
        const email = t.email || t.user?.email;
        if (!email) continue;

        const key = t.id || email;
        const existing = recipientMap.get(key) || {
          teacherId: t.id,
          teacherName: t.teacherName || "Thầy/Cô",
          email,
          roles: [],
          classes: []
        };

        const roleText = `GVCN Lớp ${cls.className}`;
        if (!existing.roles.includes(roleText)) existing.roles.push(roleText);
        if (!existing.classes.includes(cls.className)) existing.classes.push(cls.className);

        recipientMap.set(key, existing);
      }
    }

    // Process GVBM
    for (const ta of teachingAssignments) {
      const t = ta.teacher;
      if (!t) continue;
      const email = t.email || t.user?.email;
      if (!email) continue;

      const key = t.id || email;
      const existing = recipientMap.get(key) || {
        teacherId: t.id,
        teacherName: t.teacherName || "Thầy/Cô",
        email,
        roles: [],
        classes: []
      };

      const subjName = ta.subject?.subjectName || subjectName || "Bộ môn";
      const clsName = ta.class?.className || "";
      const roleText = `GVBM ${subjName} (Lớp ${clsName})`;
      if (!existing.roles.includes(roleText)) existing.roles.push(roleText);
      if (clsName && !existing.classes.includes(clsName)) existing.classes.push(clsName);

      recipientMap.set(key, existing);
    }

    const recipients = Array.from(recipientMap.values());
    console.log(`[HĐTN Email] Tìm thấy ${recipients.length} giáo viên cần nhận email thông báo.`);

    const allClassNames = assignedClasses.map(c => c.className).join(", ");
    const formattedDate = date ? new Date(date).toLocaleDateString("vi-VN") : "Theo lịch công tác";

    // 4. Send email to each recipient
    const sendPromises = recipients.map(async (recipient) => {
      const roleDescription = recipient.roles.join("; ");
      const emailSubject = `[Sky-Line HĐTN] Kế hoạch Hoạt động Trải nghiệm: ${activityName}`;

      const emailHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 650px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #003B3A 0%, #00A99D 100%); padding: 30px 25px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; font-weight: 600; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-top: 10px; }
    .body { padding: 30px 25px; }
    .greeting { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .highlight-box { background: #f0fdfa; border-left: 4px solid #00A99D; border-radius: 8px; padding: 14px 18px; margin: 18px 0; font-size: 13.5px; line-height: 1.6; color: #134e4a; }
    .table-info { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    .table-info td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .table-info td.label { font-weight: 700; color: #64748b; width: 35%; }
    .table-info td.value { font-weight: 600; color: #1e293b; }
    .cta-container { text-align: center; margin: 30px 0 15px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #003B3A 0%, #00A99D 100%); color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 13.5px; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(0, 169, 157, 0.35); }
    .note-text { font-size: 12.5px; color: #64748b; line-height: 1.5; text-align: center; margin-top: 20px; font-style: italic; }
    .footer { background: #f8fafc; padding: 20px 25px; text-align: center; font-size: 11.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>HỆ THỐNG HOẠT ĐỘNG TRẢI NGHIỆM SKY-LINE</h1>
      <p>TỔ CÔNG TÁC HỌC SINH – BAN HĐNGLL</p>
      <div class="badge">Mã HĐ: ${activityCode || "HDTN"}</div>
    </div>
    
    <div class="body">
      <div class="greeting">Kính gửi Thầy/Cô ${recipient.teacherName},</div>
      
      <p style="font-size: 13.5px; line-height: 1.6; color: #334155; margin: 0 0 12px 0;">
        Thầy/Cô vừa nhận được kế hoạch <strong>Hoạt động trải nghiệm</strong> từ <strong>Tổ CTHS - Ban HĐNGLL</strong> với vai trò: <strong style="color: #00A99D;">${roleDescription}</strong>.
      </p>

      <div class="highlight-box">
        <strong>📌 Lời nhắn từ Ban Tổ Chức:</strong><br/>
        "Kính nhờ các Thầy/Cô vui lòng truy cập hệ thống và hoàn thành đánh giá vai trò & năng lực của Học sinh ở hoạt động liên quan. Xin cảm ơn."
      </div>

      <table class="table-info">
        <tr>
          <td class="label">🎯 Tên hoạt động:</td>
          <td class="value"><strong style="color: #003B3A; font-size: 14px;">${activityName}</strong></td>
        </tr>
        <tr>
          <td class="label">🏷️ Mạch hoạt động:</td>
          <td class="value">${strandLabel} (${activityTypeName})</td>
        </tr>
        ${subjectName ? `
        <tr>
          <td class="label">📚 Môn học tích hợp:</td>
          <td class="value"><strong style="color: #b45309;">${subjectName}</strong></td>
        </tr>
        ` : `
        <tr>
          <td class="label">📚 Môn học tích hợp:</td>
          <td class="value">Hoạt động chung / Liên môn</td>
        </tr>
        `}
        <tr>
          <td class="label">🗓️ Thời gian tổ chức:</td>
          <td class="value">${formattedDate} ${timeRange ? `(${timeRange})` : ""}</td>
        </tr>
        <tr>
          <td class="label">📍 Địa điểm:</td>
          <td class="value">${location || "Tại các cơ sở Sky-Line"}</td>
        </tr>
        <tr>
          <td class="label">👥 Lớp được phân công:</td>
          <td class="value"><strong>${recipient.classes.join(", ") || allClassNames}</strong></td>
        </tr>
        <tr>
          <td class="label">⏰ Hạn nộp đánh giá:</td>
          <td class="value"><span style="color: #047857; font-weight: 700;">${deadline || "Theo kế hoạch"}</span></td>
        </tr>
      </table>

      <div class="cta-container">
        <a href="${activityUrl}" class="btn" target="_blank">
          TRUY CẬP HỆ THỐNG VÀ ĐÁNH GIÁ NGAY &rarr;
        </a>
      </div>

      <p class="note-text">
        * Thầy/Cô có thể đăng nhập bằng tài khoản nội bộ Sky-Line của mình để mở Sổ đánh giá và chấm điểm trực tiếp cho học sinh lớp phụ trách.
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0 0 4px 0; font-weight: 700; color: #64748b;">HỆ THỐNG KHẢO THÍ & ĐÁNH GIÁ NĂNG LỰC SKY-LINE SCHOOLS</p>
      <p style="margin: 0;">Email này được gửi tự động từ Tổ CTHS - Ban HĐNGLL. Vui lòng không trả lời thư này.</p>
    </div>
  </div>
</body>
</html>
      `;

      try {
        await sendEmail({
          to: recipient.email,
          subject: emailSubject,
          html: emailHtml
        });
        console.log(`[HĐTN Email] Đã gửi email thành công tới ${recipient.email} (${recipient.teacherName})`);
      } catch (err: any) {
        console.error(`[HĐTN Email] Lỗi khi gửi email tới ${recipient.email}:`, err?.message);
      }
    });

    await Promise.allSettled(sendPromises);
    return { success: true, count: recipients.length };
  } catch (error: any) {
    console.error("[HĐTN Email] Lỗi xử lý gửi email thông báo hoạt động:", error);
    return { success: false, error: error?.message };
  }
}
