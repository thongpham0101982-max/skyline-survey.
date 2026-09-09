// @ts-nocheck
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { ACTIVITY_STRANDS, SKYLINE_ACTIVITY_TYPES } from "./constants";

export interface ActivityNotificationPayload {
  activityId: string;
  activityCode: string;
  activityName: string;
  strand?: string;
  activityTypeId?: string;
  activityTypeName?: string;
  subjectId?: string | null;
  subjectName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  scale?: string | null;
  evalMode?: string | null;
  criteria?: any[];
  date?: string | null;
  timeRange?: string | null;
  location?: string | null;
  deadline?: string | null;
  senderName?: string | null;
  senderEmail?: string | null;
  replyTo?: string | null;
  customMessage?: string | null;
  includeGdcs?: boolean;
  gdcsEmails?: string[];
  assignedClasses?: Array<{
    classId: string;
    className: string;
    campusId?: string;
    campusCode?: string;
    campusName?: string;
    grade?: string;
    homeroomTeacherId?: string;
    homeroomTeacherName?: string;
  }>;
}

export async function sendExperientialActivityNotification(payload: ActivityNotificationPayload) {
  try {
    const {
      activityId,
      activityCode,
      activityName,
      strand = "BAN_THAN",
      activityTypeId,
      activityTypeName = "Sự kiện / Lễ hội",
      subjectId,
      subjectName,
      departmentId,
      departmentName,
      scale = "KHOI",
      evalMode = "CRITERIA",
      criteria = [],
      date,
      timeRange,
      location,
      deadline,
      senderName = "Tổ CTHS - Ban HĐNGLL",
      senderEmail,
      replyTo,
      customMessage,
      includeGdcs = true,
      gdcsEmails = [],
      assignedClasses = []
    } = payload;

    if (!assignedClasses || assignedClasses.length === 0) {
      console.log("[HĐTN Email] Không có lớp được gán, bỏ qua gửi email.");
      return { success: true, count: 0 };
    }

    const classIds = assignedClasses.map(c => c.classId).filter(Boolean);
    const strandObj = ACTIVITY_STRANDS.find(s => s.id === strand);
    const strandLabel = strandObj ? strandObj.name : "Hướng vào bản thân";
    
    let resolvedTypeLabel = activityTypeName;
    if (activityTypeId && (!resolvedTypeLabel || resolvedTypeLabel === "Sự kiện / Lễ hội")) {
      const matchedType = SKYLINE_ACTIVITY_TYPES.find(t => t.id === activityTypeId);
      if (matchedType) resolvedTypeLabel = matchedType.name;
    }

    const scaleLabel = scale === "TOAN_TRUONG" ? "Toàn trường" : scale === "KHOI" ? "Cấp Khối" : scale === "LIEN_CS" ? "Liên Cơ sở" : "Cấp Lớp";
    const appUrl = process.env.NEXTAUTH_URL || "https://skyline-survey.vercel.app";
    const activityUrl = `${appUrl}/teacher/experiential-activities/${activityId}`;

    // 1. Find all GVCN for the assigned classes
    const classes = await prisma.class.findMany({
      where: { id: { in: classIds } },
      include: {
        campus: {
          include: {
            manager: true,
            userAssignments: {
              include: { user: true }
            }
          }
        },
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

    // 2. Discover GĐCS (Campus Directors) and Campus Managers for assigned campuses
    const campusGdcsMap = new Map<string, Set<string>>(); // campusId/code -> Set of emails
    const allCampusIds = new Set<string>();
    
    classes.forEach(cls => {
      if (cls.campusId) allCampusIds.add(cls.campusId);
      if (cls.campus) {
        const cKey = cls.campus.id;
        const set = campusGdcsMap.get(cKey) || new Set<string>();
        if (cls.campus.manager?.email) {
          set.add(cls.campus.manager.email.trim().toLowerCase());
        }
        if (Array.isArray(cls.campus.userAssignments)) {
          cls.campus.userAssignments.forEach(ua => {
            const u = ua.user;
            if (u?.email && ["GĐ_CS", "GDCS", "GIAO_VU_CS", "GIAO_VU", "BGH"].includes(u.role)) {
              set.add(u.email.trim().toLowerCase());
            }
          });
        }
        campusGdcsMap.set(cKey, set);
        if (cls.campus.campusCode) {
          campusGdcsMap.set(cls.campus.campusCode, set);
        }
      }
    });

    // Also search users with role GDCS / GĐ_CS directly
    if (allCampusIds.size > 0) {
      const gdcsUsers = await prisma.user.findMany({
        where: {
          role: { in: ["GĐ_CS", "GDCS", "GIAO_VU_CS"] }
        },
        include: {
          campusAssignments: true
        }
      });

      gdcsUsers.forEach(u => {
        if (u.email) {
          u.campusAssignments.forEach(ca => {
            if (allCampusIds.has(ca.campusId)) {
              const set = campusGdcsMap.get(ca.campusId) || new Set<string>();
              set.add(u.email.trim().toLowerCase());
              campusGdcsMap.set(ca.campusId, set);
            }
          });
        }
      });
    }

    // 3. Find all GVBM for the assigned classes if subjectId or departmentId is provided
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

    // 4. Aggregate unique teachers and their roles & campuses
    type TeacherRecipient = {
      teacherId: string;
      teacherName: string;
      email: string;
      roles: string[];
      classes: string[];
      campusIds: string[];
      campusCodes: string[];
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
          classes: [],
          campusIds: [],
          campusCodes: []
        };

        const roleText = `GVCN Lớp ${cls.className}`;
        if (!existing.roles.includes(roleText)) existing.roles.push(roleText);
        if (!existing.classes.includes(cls.className)) existing.classes.push(cls.className);
        if (cls.campusId && !existing.campusIds.includes(cls.campusId)) existing.campusIds.push(cls.campusId);
        if (cls.campus?.campusCode && !existing.campusCodes.includes(cls.campus.campusCode)) existing.campusCodes.push(cls.campus.campusCode);

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
        classes: [],
        campusIds: [],
        campusCodes: []
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
    const displaySenderName = senderName || "Tổ CTHS - Ban HĐNGLL";
    const fromAddress = senderEmail ? `"${displaySenderName}" <${senderEmail}>` : `"${displaySenderName}" <bankhaothi@skylineschool.edu.vn>`;
    const resolvedReplyTo = replyTo || senderEmail || undefined;

    // Manual/custom GĐCS emails passed directly
    const manualGdcsClean = (gdcsEmails || [])
      .map(e => e.trim().toLowerCase())
      .filter(e => e && e.includes("@"));

    // 5. Send email to each recipient
    const sendPromises = recipients.map(async (recipient) => {
      const roleDescription = recipient.roles.join("; ");
      const isGVBMRecipient = recipient.roles.some(r => r.includes("GVBM"));
      const isGVCNRecipient = recipient.roles.some(r => r.includes("GVCN"));

      let roleSpecificMessage = "";
      if (subjectId && isGVBMRecipient && isGVCNRecipient) {
        roleSpecificMessage = `Thầy/Cô vừa nhận được kế hoạch <strong>Hoạt động trải nghiệm tích hợp môn ${subjectName || "Bộ môn"}</strong> từ <strong>${displaySenderName}</strong> với vai trò kiêm nhiệm: <strong>${roleDescription}</strong>.`;
      } else if (subjectId && isGVBMRecipient) {
        roleSpecificMessage = `Thầy/Cô vừa nhận được phân công phụ trách <strong>Hoạt động trải nghiệm môn ${subjectName || "Bộ môn"}</strong> từ <strong>${displaySenderName}</strong> với vai trò: <strong style='color: #b45309;'>${roleDescription}</strong> (Chấm điểm đánh giá chuyên môn môn học).`;
      } else if (subjectId && isGVCNRecipient) {
        roleSpecificMessage = `Lớp chủ nhiệm của Thầy/Cô vừa được phân công tham gia <strong>Hoạt động trải nghiệm tích hợp môn ${subjectName || "Bộ môn"}</strong> từ <strong>${displaySenderName}</strong> với vai trò: <strong style='color: #00A99D;'>${roleDescription}</strong> (Phối hợp theo dõi tiến độ và đánh giá vai trò của học sinh lớp).`;
      } else {
        roleSpecificMessage = `Thầy/Cô vừa nhận được kế hoạch <strong>Hoạt động trải nghiệm</strong> từ <strong>${displaySenderName}</strong> với vai trò: <strong style='color: #00A99D;'>${roleDescription}</strong>.`;
      }

      // Collect CC emails (Campus Directors of recipient's campuses + manual extra emails)
      const ccList = new Set<string>(manualGdcsClean);
      if (includeGdcs) {
        recipient.campusIds.forEach(cId => {
          const gdcsSet = campusGdcsMap.get(cId);
          if (gdcsSet) gdcsSet.forEach(em => ccList.add(em));
        });
        recipient.campusCodes.forEach(cCode => {
          const gdcsSet = campusGdcsMap.get(cCode);
          if (gdcsSet) gdcsSet.forEach(em => ccList.add(em));
        });
      }
      // Remove self from CC if recipient is in CC
      ccList.delete(recipient.email.toLowerCase().trim());
      const ccArray = Array.from(ccList);

      const emailSubject = `[Sky-Line HĐTN] Kế hoạch & Phân công Hoạt động Trải nghiệm: ${activityName}`;

      const emailHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; color: #1e293b; margin: 0; padding: 0; -webkit-text-size-adjust: none; }
    .container { max-width: 680px; margin: 24px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #003B3A 0%, #007A70 50%, #00A99D 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; line-height: 1.3; }
    .header p { margin: 8px 0 0 0; font-size: 13.5px; opacity: 0.95; font-weight: 700; color: #e0f2fe; }
    .badge { display: inline-block; background: rgba(255,255,255,0.22); border: 1px solid rgba(255,255,255,0.35); padding: 5px 14px; border-radius: 20px; font-size: 11.5px; font-weight: 800; margin-top: 12px; color: #ffffff; }
    .body { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 14px; }
    
    /* MANDATORY NOTICE CALLOUT */
    .mandatory-notice { background: linear-gradient(135deg, #f0fdfa 0%, #e6fffa 100%); border-left: 5px solid #00A99D; border-radius: 12px; padding: 18px 20px; margin: 20px 0 24px 0; box-shadow: 0 2px 8px rgba(0,169,157,0.1); }
    .mandatory-notice .notice-title { font-size: 14px; font-weight: 900; color: #003B3A; display: flex; items-center: center; margin-bottom: 6px; }
    .mandatory-notice .notice-content { font-size: 13.5px; line-height: 1.6; color: #134e4a; font-weight: 600; margin: 0; }
    
    .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin: 24px 0 10px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px; }
    
    .table-info { width: 100%; border-collapse: collapse; margin: 12px 0 24px 0; font-size: 13.5px; }
    .table-info tr:nth-child(even) { background-color: #f8fafc; }
    .table-info td { padding: 11px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .table-info td.label { font-weight: 700; color: #475569; width: 34%; }
    .table-info td.value { font-weight: 600; color: #0f172a; }
    
    .cta-container { text-align: center; margin: 32px 0 20px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #003B3A 0%, #00A99D 100%); color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 14px; padding: 15px 36px; border-radius: 14px; box-shadow: 0 6px 18px rgba(0, 169, 157, 0.35); text-transform: uppercase; letter-spacing: 0.3px; }
    
    .instruction-box { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 14px 18px; margin: 20px 0; font-size: 12.5px; color: #92400e; line-height: 1.55; }
    .instruction-box strong { color: #78350f; }

    .footer { background: #f8fafc; padding: 24px 28px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; line-height: 1.6; }
    .footer strong { color: #334155; }
  </style>
</head>
<body>
  <div class="container">
    <!-- HEADER -->
    <div class="header">
      <h1>HỆ THỐNG HOẠT ĐỘNG TRẢI NGHIỆM SKY-LINE</h1>
      <p>${displaySenderName.toUpperCase()}</p>
      <div class="badge">Mã kế hoạch: ${activityCode || "HDTN"}</div>
    </div>
    
    <!-- BODY -->
    <div class="body">
      <div class="greeting">Kính gửi Thầy/Cô ${recipient.teacherName},</div>
      
      <p style="font-size: 13.5px; line-height: 1.65; color: #334155; margin: 0 0 16px 0;">
        ${roleSpecificMessage}
      </p>

      <!-- MANDATORY ROLE EVALUATION CALLOUT -->
      <div class="mandatory-notice">
        <div class="notice-title">📌 YÊU CẦU TRỌNG TÂM DÀNH CHO GVCN & GVBM:</div>
        <p class="notice-content">
          <strong>"Thầy cô vui lòng thực hiện đánh giá vai trò của Học sinh lớp."</strong><br/>
          Kính nhờ Quý Thầy/Cô truy cập Sổ đánh giá Hoạt động Trải nghiệm trên hệ thống để ghi nhận vai trò tham gia của học sinh (như <em>Trưởng nhóm, Phó nhóm, Thành viên tích cực, Ban tổ chức, v.v.</em>), đánh giá mức độ hoàn thành nhiệm vụ và các tiêu chí năng lực - phẩm chất theo kế hoạch.
        </p>
      </div>

      ${customMessage ? `
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
        <strong>💬 Lời nhắn bổ sung từ người gửi:</strong><br/>
        ${customMessage}
      </div>
      ` : ""}

      <!-- ACTIVITY DETAILS TABLE -->
      <div class="section-title">THÔNG TIN & PHÂN LOẠI HOẠT ĐỘNG</div>
      <table class="table-info">
        <tr>
          <td class="label">🎯 Tên hoạt động:</td>
          <td class="value"><strong style="color: #003B3A; font-size: 14.5px;">${activityName}</strong></td>
        </tr>
        <tr>
          <td class="label">🏷️ Mạch hoạt động:</td>
          <td class="value"><span style="color: #0f766e; font-weight: 700;">${strandLabel}</span></td>
        </tr>
        <tr>
          <td class="label">📂 Phân loại hình thức:</td>
          <td class="value">${resolvedTypeLabel} (Quy mô: <strong>${scaleLabel}</strong>)</td>
        </tr>
        ${subjectName ? `
        <tr>
          <td class="label">📚 Môn học / TCM:</td>
          <td class="value"><strong style="color: #b45309;">${subjectName}</strong> ${departmentName ? `(${departmentName})` : ""}</td>
        </tr>
        ` : `
        <tr>
          <td class="label">📚 Môn học / TCM:</td>
          <td class="value">Hoạt động giáo dục trải nghiệm chung / Liên môn</td>
        </tr>
        `}
        <tr>
          <td class="label">🗓️ Thời gian tổ chức:</td>
          <td class="value"><strong>${formattedDate}</strong> ${timeRange ? `(${timeRange})` : ""}</td>
        </tr>
        <tr>
          <td class="label">📍 Địa điểm:</td>
          <td class="value">${location || "Tại các cơ sở Sky-Line / Ngoại khóa"}</td>
        </tr>
        <tr>
          <td class="label">👥 Lớp phụ trách:</td>
          <td class="value"><strong style="color: #003B3A;">${recipient.classes.join(", ") || allClassNames}</strong></td>
        </tr>
        <tr>
          <td class="label">📊 Hình thức đánh giá:</td>
          <td class="value">${evalMode === "PARTICIPATION_ONLY" ? "Ghi nhận tham gia & Vai trò" : `Đánh giá theo ${criteria?.length || 3} tiêu chí năng lực`}</td>
        </tr>
        <tr>
          <td class="label">⏰ Hạn nộp đánh giá:</td>
          <td class="value"><span style="color: #047857; font-weight: 800; font-size: 14px;">${deadline || "Theo kế hoạch nhà trường"}</span></td>
        </tr>
      </table>

      <!-- CTA BUTTON -->
      <div class="cta-container">
        <a href="${activityUrl}" class="btn" target="_blank">
          TRUY CẬP VÀ ĐÁNH GIÁ VAI TRÒ HỌC SINH &rarr;
        </a>
      </div>

      <!-- INSTRUCTION NOTE -->
      <div class="instruction-box">
        <strong>💡 Hướng dẫn thao tác cho Thầy/Cô:</strong><br/>
        1. Nhấp vào nút bấm phía trên hoặc đăng nhập cổng Quản trị Giáo viên Sky-Line.<br/>
        2. Chọn mục <strong>"Hoạt động trải nghiệm"</strong> &rarr; Mở hoạt động <strong>"${activityName}"</strong>.<br/>
        3. Chọn lớp phụ trách, chấm vai trò học sinh (Trưởng nhóm, Thành viên,...), điểm tiêu chí và nhấn <strong>"Lưu đánh giá"</strong>.
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <p style="margin: 0 0 6px 0; font-weight: 800; color: #003B3A; font-size: 12.5px;">
        HỆ THỐNG KHẢO THÍ & ĐÁNH GIÁ NĂNG LỰC HỌC SINH SKY-LINE SCHOOLS
      </p>
      <p style="margin: 0 0 4px 0;">
        Đơn vị gửi: <strong>${displaySenderName}</strong> ${senderEmail ? `(${senderEmail})` : ""}
      </p>
      <p style="margin: 0; font-size: 11px; color: #94a3b8;">
        Email này được gửi tự động đến GVCN và CC Giám đốc Cơ sở liên quan. Quý Thầy/Cô có thể liên hệ quản trị viên nếu cần hỗ trợ kỹ thuật.
      </p>
    </div>
  </div>
</body>
</html>
      `;

      try {
        await sendEmail({
          from: fromAddress,
          to: recipient.email,
          cc: ccArray.length > 0 ? ccArray : undefined,
          replyTo: resolvedReplyTo,
          subject: emailSubject,
          html: emailHtml
        });
        console.log(`[HĐTN Email] Đã gửi email thành công tới ${recipient.email} (${recipient.teacherName}) - CC: ${ccArray.join(", ") || "Không có"}`);
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
