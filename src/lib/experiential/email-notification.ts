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

    // 1. Query classes with valid relations
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
        teachers: {
          include: {
            teacher: {
              include: { user: true }
            }
          }
        }
      }
    });

    // 2. Fetch all teachers for robust GVCN & GDCS email resolution
    const allTeachers = await prisma.teacher.findMany({
      include: { user: true }
    });
    const teacherMapById = new Map<string, any>();
    const teacherMapByUserId = new Map<string, any>();
    const teacherMapByCode = new Map<string, any>();
    const teacherMapByName = new Map<string, any>();

    const normKey = (str: string) => (str || '').trim().toLowerCase().replace(/\s+/g, ' ');

    allTeachers.forEach(t => {
      if (t.id) teacherMapById.set(t.id, t);
      if (t.userId) teacherMapByUserId.set(t.userId, t);
      if (t.teacherCode) teacherMapByCode.set(t.teacherCode.trim().toLowerCase(), t);
      if (t.teacherName) teacherMapByName.set(normKey(t.teacherName), t);
    });

    const resolveTeacherEmail = (tObj?: any, uObj?: any, nameHint?: string): string | null => {
      const candidates = [
        tObj?.email,
        tObj?.user?.email,
        uObj?.email
      ];
      for (const c of candidates) {
        if (c && typeof c === 'string' && c.includes('@')) {
          return c.trim().toLowerCase();
        }
      }

      // If user email or teacher code was stored as numeric staff ID (e.g. "0201000007")
      const staffCode = (uObj?.email || uObj?.username || tObj?.teacherCode || '').trim().toLowerCase();
      if (staffCode && teacherMapByCode.has(staffCode)) {
        const matched = teacherMapByCode.get(staffCode);
        if (matched?.email && matched.email.includes('@')) return matched.email.trim().toLowerCase();
      }

      // Try matching by name
      const name = nameHint || tObj?.teacherName || uObj?.fullName;
      if (name) {
        const matched = teacherMapByName.get(normKey(name));
        if (matched?.email && matched.email.includes('@')) return matched.email.trim().toLowerCase();
      }

      return null;
    };

    // 3. Discover GĐCS (Campus Directors) and Campus Managers for assigned campuses
    const campusGdcsMap = new Map<string, Set<string>>(); // campusId/code -> Set of emails
    const allCampusIds = new Set<string>();
    
    classes.forEach(cls => {
      if (cls.campusId) allCampusIds.add(cls.campusId);
      if (cls.campus) {
        const cKey = cls.campus.id;
        const set = campusGdcsMap.get(cKey) || new Set<string>();
        
        // Check Campus Manager
        if (cls.campus.manager) {
          const mEmail = resolveTeacherEmail(undefined, cls.campus.manager, cls.campus.manager.fullName);
          if (mEmail) set.add(mEmail);
        }

        // Check userAssignments on Campus
        if (Array.isArray(cls.campus.userAssignments)) {
          cls.campus.userAssignments.forEach(ua => {
            const u = ua.user;
            if (u && ["GĐ_CS", "GDCS", "GIAO_VU_CS", "GIAO_VU", "BGH", "KTDBCL"].includes(u.role)) {
              const uEmail = resolveTeacherEmail(undefined, u, u.fullName);
              if (uEmail) set.add(uEmail);
            }
          });
        }
        campusGdcsMap.set(cKey, set);
        if (cls.campus.campusCode) {
          campusGdcsMap.set(cls.campus.campusCode, set);
        }
      }
    });

    // Also search users with role GDCS / GĐ_CS directly in DB
    if (allCampusIds.size > 0) {
      const gdcsUsers = await prisma.user.findMany({
        where: {
          role: { in: ["GĐ_CS", "GDCS", "GIAO_VU_CS", "BGH"] }
        },
        include: {
          campusAssignments: true
        }
      });

      gdcsUsers.forEach(u => {
        const uEmail = resolveTeacherEmail(undefined, u, u.fullName);
        if (uEmail) {
          u.campusAssignments.forEach(ca => {
            if (allCampusIds.has(ca.campusId)) {
              const set = campusGdcsMap.get(ca.campusId) || new Set<string>();
              set.add(uEmail);
              campusGdcsMap.set(ca.campusId, set);
            }
          });
        }
      });
    }

    // 4. Find all GVBM for the assigned classes if subjectId or subjectName is provided
    let teachingAssignments: any[] = [];
    let resolvedSubjectId = subjectId;
    if (!resolvedSubjectId && subjectName) {
      try {
        const matchedSubject = await prisma.subject.findFirst({
          where: {
            OR: [
              { subjectName: { contains: subjectName.trim() } },
              { subjectCode: { contains: subjectName.trim() } }
            ]
          }
        });
        if (matchedSubject) resolvedSubjectId = matchedSubject.id;
      } catch {}
    }

    if (resolvedSubjectId) {
      teachingAssignments = await prisma.teachingAssignment.findMany({
        where: {
          subjectId: resolvedSubjectId,
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
    } else if (subjectName) {
      try {
        teachingAssignments = await prisma.teachingAssignment.findMany({
          where: {
            classId: { in: classIds },
            subject: {
              OR: [
                { subjectName: { contains: subjectName.trim() } },
                { subjectCode: { contains: subjectName.trim() } }
              ]
            }
          },
          include: {
            teacher: {
              include: { user: true }
            },
            class: true,
            subject: true
          }
        });
      } catch {}
    }

    // 5. Aggregate unique teachers and their roles & campuses
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

    // Process GVCN for each assigned class
    for (const cls of classes) {
      let gvcnTeacher: any = null;
      if (cls.homeroomTeacherId && teacherMapById.has(cls.homeroomTeacherId)) {
        gvcnTeacher = teacherMapById.get(cls.homeroomTeacherId);
      }
      if (!gvcnTeacher && cls.teachers && cls.teachers.length > 0) {
        const gvcnAssign = cls.teachers.find(t => t.roleInClass === "GVCN") || cls.teachers[0];
        gvcnTeacher = gvcnAssign?.teacher;
      }
      if (!gvcnTeacher) {
        const assignedClassMeta = assignedClasses.find(c => c.classId === cls.id);
        if (assignedClassMeta?.homeroomTeacherName) {
          gvcnTeacher = teacherMapByName.get(normKey(assignedClassMeta.homeroomTeacherName));
        }
      }

      if (gvcnTeacher) {
        const email = resolveTeacherEmail(gvcnTeacher, gvcnTeacher.user, gvcnTeacher.teacherName);
        if (email) {
          const key = gvcnTeacher.id || email;
          const existing = recipientMap.get(key) || {
            teacherId: gvcnTeacher.id,
            teacherName: gvcnTeacher.teacherName || "Thầy/Cô",
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
    }

    // Process GVBM if applicable
    for (const ta of teachingAssignments) {
      const t = ta.teacher;
      if (!t) continue;
      const email = resolveTeacherEmail(t, t.user, t.teacherName);
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

    // Process explicit GVBM from assignedClasses items if any
    for (const clsItem of assignedClasses) {
      let explicitGvbm: any = null;
      if (clsItem.subjectTeacherId && teacherMapById.has(clsItem.subjectTeacherId)) {
        explicitGvbm = teacherMapById.get(clsItem.subjectTeacherId);
      } else if (clsItem.subjectTeacherName) {
        explicitGvbm = teacherMapByName.get(normKey(clsItem.subjectTeacherName));
      }

      if (explicitGvbm) {
        const email = resolveTeacherEmail(explicitGvbm, explicitGvbm.user, explicitGvbm.teacherName);
        if (email) {
          const key = explicitGvbm.id || email;
          const existing = recipientMap.get(key) || {
            teacherId: explicitGvbm.id,
            teacherName: explicitGvbm.teacherName || "Thầy/Cô",
            email,
            roles: [],
            classes: [],
            campusIds: [],
            campusCodes: []
          };
          const subjTitle = clsItem.subjectName || subjectName || "Bộ môn";
          const roleText = `GVBM ${subjTitle} (Lớp ${clsItem.className})`;
          if (!existing.roles.includes(roleText)) existing.roles.push(roleText);
          if (!existing.classes.includes(clsItem.className)) existing.classes.push(clsItem.className);
          recipientMap.set(key, existing);
        }
      } else if (clsItem.subjectTeacherEmail && clsItem.subjectTeacherEmail.includes('@')) {
        const email = clsItem.subjectTeacherEmail.trim().toLowerCase();
        const key = clsItem.subjectTeacherId || email;
        const existing = recipientMap.get(key) || {
          teacherId: clsItem.subjectTeacherId || '',
          teacherName: clsItem.subjectTeacherName || "Thầy/Cô GVBM",
          email,
          roles: [],
          classes: [],
          campusIds: [],
          campusCodes: []
        };
        const subjTitle = clsItem.subjectName || subjectName || "Bộ môn";
        const roleText = `GVBM ${subjTitle} (Lớp ${clsItem.className})`;
        if (!existing.roles.includes(roleText)) existing.roles.push(roleText);
        if (clsItem.className && !existing.classes.includes(clsItem.className)) existing.classes.push(clsItem.className);
        recipientMap.set(key, existing);
      }
    }

    const recipients = Array.from(recipientMap.values());
    console.log(`[HĐTN Email] Tìm thấy ${recipients.length} giáo viên cần nhận email thông báo.`);

    const allClassNames = assignedClasses.map(c => c.className).join(", ");
    const formattedDate = date ? new Date(date).toLocaleDateString("vi-VN") : "Theo lịch công tác";
    const displaySenderName = senderName || "Tổ CTHS - Ban HĐNGLL";
    const authSmtpUser = process.env.SMTP_USER || "ktdbcl@skylineschool.edu.vn";
    const fromAddress = `"${displaySenderName}" <${authSmtpUser}>`;
    const resolvedReplyTo = (replyTo && replyTo.includes('@')) ? replyTo : (senderEmail && senderEmail.includes('@') ? senderEmail : authSmtpUser);

    // Manual/custom GĐCS emails passed directly
    const manualGdcsClean = (gdcsEmails || [])
      .map(e => String(e || '').trim().toLowerCase())
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
        roleSpecificMessage = `Lớp chủ nhiệm của Thầy/Cô vừa được phân công tham gia <strong>Hoạt động trải nghiệm tích hợp môn ${subjectName || "Bộ môn"}</strong> từ <strong>${displaySenderName}</strong> với vai trò: <strong style='color: #00A19A;'>${roleDescription}</strong> (Phối hợp theo dõi tiến độ và đánh giá vai trò của học sinh lớp).`;
      } else {
        roleSpecificMessage = `Thầy/Cô vừa nhận được kế hoạch <strong>Hoạt động trải nghiệm</strong> từ <strong>${displaySenderName}</strong> với vai trò: <strong style='color: #00A19A;'>${roleDescription}</strong>.`;
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

      const emailSubject = `[Sky-line SMS - HĐTN] Kế hoạch & Phân công Hoạt động Trải nghiệm: ${activityName}`;

      const emailHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thông Báo Hoạt Động Trải Nghiệm Sky-Line</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1E293B;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F1F5F9" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 660px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0;">
          
          <!-- HEADER BANNER -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; background: linear-gradient(135deg, #003B3A 0%, #005B58 60%, #00A19A 100%); padding: 30px 24px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <span style="display: inline-block; padding: 4px 14px; background-color: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                      🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-size: 21px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px; line-height: 1.3; text-transform: uppercase;">
                      QUẢN LÝ HOẠT ĐỘNG TRẢI NGHIỆM
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 6px;">
                    <div style="font-size: 13px; font-weight: 600; color: #CCFBF1; letter-spacing: 0.3px;">
                      ${displaySenderName.toUpperCase()}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px;">
                    <span style="display: inline-block; background-color: rgba(0, 161, 154, 0.25); border: 1px solid rgba(204, 251, 241, 0.4); padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; color: #FFFFFF;">
                      Mã kế hoạch: <strong style="color: #FDE047;">${activityCode || "HDTN"}</strong>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN CONTENT BODY -->
          <tr>
            <td style="padding: 28px 24px; color: #1E293B;">
              <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: #003B3A;">
                Kính gửi Thầy/Cô ${recipient.teacherName},
              </p>
              
              <p style="font-size: 14px; line-height: 1.65; color: #334155; margin: 0 0 18px 0;">
                ${roleSpecificMessage}
              </p>

              <!-- MANDATORY ROLE EVALUATION CALLOUT -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F0FDFA" style="background-color: #F0FDFA; border-left: 4px solid #00A19A; border-radius: 10px; margin: 0 0 22px 0; border: 1px solid #CCFBF1; border-left: 4px solid #00A19A;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <div style="font-size: 13px; font-weight: 800; color: #003B3A; margin-bottom: 6px;">
                      📌 YÊU CẦU TRỌNG TÂM DÀNH CHO GVCN & GVBM:
                    </div>
                    <div style="font-size: 13px; line-height: 1.6; color: #134E4A;">
                      <strong>"Thầy cô vui lòng thực hiện đánh giá vai trò của Học sinh lớp."</strong><br/>
                      Kính nhờ Quý Thầy/Cô truy cập Sổ đánh giá Hoạt động Trải nghiệm trên hệ thống để ghi nhận vai trò tham gia của học sinh (như <em>Trưởng nhóm, Phó nhóm, Thành viên tích cực, Ban tổ chức, v.v.</em>), đánh giá mức độ hoàn thành nhiệm vụ và các tiêu chí năng lực - phẩm chất theo kế hoạch.
                    </div>
                  </td>
                </tr>
              </table>

              ${customMessage ? `
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; border-radius: 8px; margin: 0 0 20px 0;">
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #1E40AF; line-height: 1.5;">
                    <strong>💬 Lời nhắn bổ sung từ người gửi:</strong><br/>
                    ${customMessage}
                  </td>
                </tr>
              </table>
              ` : ""}

              <!-- ACTIVITY DETAILS TABLE -->
              <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #003B3A; letter-spacing: 0.5px; margin: 24px 0 10px 0; border-bottom: 2px solid #E2E8F0; padding-bottom: 6px;">
                THÔNG TIN & PHÂN LOẠI HOẠT ĐỘNG
              </div>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 24px; font-size: 13.5px; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #F8FAFC;">
                  <td width="35%" style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">🎯 Tên hoạt động:</td>
                  <td width="65%" style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #003B3A;">${activityName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">🏷️ Mạch hoạt động:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #0F766E;">${strandLabel}</td>
                </tr>
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">📂 Phân loại hình thức:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #1E293B;">${resolvedTypeLabel} (Quy mô: <strong>${scaleLabel}</strong>)</td>
                </tr>
                ${subjectName ? `
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">📚 Môn học / TCM:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #B45309;">${subjectName} ${departmentName ? `(${departmentName})` : ""}</td>
                </tr>
                ` : `
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">📚 Môn học / TCM:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #475569;">Hoạt động giáo dục trải nghiệm chung / Liên môn</td>
                </tr>
                `}
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">🗓️ Thời gian tổ chức:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #1E293B;"><strong>${formattedDate}</strong> ${timeRange ? `(${timeRange})` : ""}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">📍 Địa điểm:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #1E293B;">${location || "Tại các cơ sở Sky-Line / Ngoại khóa"}</td>
                </tr>
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">👥 Lớp phụ trách:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #003B3A;">${recipient.classes.join(", ") || allClassNames}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">📊 Hình thức đánh giá:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #1E293B;">${evalMode === "PARTICIPATION_ONLY" ? "Ghi nhận tham gia & Vai trò" : `Đánh giá theo ${criteria?.length || 3} tiêu chí năng lực`}</td>
                </tr>
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 10px 14px; font-weight: 700; color: #475569;">⏰ Hạn nộp đánh giá:</td>
                  <td style="padding: 10px 14px; color: #047857; font-weight: 800; font-size: 14px;">${deadline || "Theo kế hoạch nhà trường"}</td>
                </tr>
              </table>

              <!-- BULLETPROOF CTA BUTTON -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 28px auto; border-collapse: separate;">
                <tr>
                  <td align="center" bgcolor="#00A19A" style="border-radius: 10px; background-color: #00A19A;">
                    <a href="${activityUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13.5px; color: #FFFFFF; font-weight: 800; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #00A19A;">
                      TRUY CẬP VÀ ĐÁNH GIÁ VAI TRÒ HỌC SINH &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- INSTRUCTION NOTE -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFBEB; border: 1px solid #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px; margin-top: 20px;">
                <tr>
                  <td style="padding: 14px 16px; font-size: 12.5px; color: #92400E; line-height: 1.55;">
                    <strong style="color: #78350F;">💡 Hướng dẫn thao tác cho Thầy/Cô:</strong><br/>
                    1. Nhấp vào nút bấm phía trên hoặc đăng nhập cổng Quản trị Giáo viên Sky-Line.<br/>
                    2. Chọn mục <strong>"Hoạt động trải nghiệm"</strong> &rarr; Mở hoạt động <strong>"${activityName}"</strong>.<br/>
                    3. Chọn lớp phụ trách, chấm vai trò học sinh (Trưởng nhóm, Thành viên,...), điểm tiêu chí và nhấn <strong>"Lưu đánh giá"</strong>.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- OFFICIAL BRAND FOOTER -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 24px 24px; text-align: center; border-top: 3px solid #00A19A;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
              </p>
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 600; color: #CCFBF1;">
                BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11px; color: rgba(255, 255, 255, 0.75);">
                Đơn vị gửi: <strong style="color: #FFFFFF;">${displaySenderName}</strong> ${senderEmail ? `(${senderEmail})` : ""}
              </p>
              <p style="margin: 0; font-size: 10px; color: rgba(255, 255, 255, 0.65); line-height: 1.5;">
                Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #FDE047; text-decoration: none; font-weight: 600;">ktdbcl@skylineschool.edu.vn</a> • Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #FDE047; text-decoration: none; font-weight: 600;">skylineschool.edu.vn</a>
              </p>
              <p style="margin: 6px 0 0 0; font-size: 10px; color: rgba(255, 255, 255, 0.4);">
                Email này được gửi tự động đến GVCN và CC Giám đốc Cơ sở liên quan. Vui lòng không trả lời trực tiếp email này.
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

      try {
        await sendEmail({
          from: fromAddress,
          to: recipient.email,
          // cc removed per policy
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

/**
 * Payload thông báo phân bổ kế hoạch hoạt động ngoại khóa cho GVCN & GVBM Phụ trách (không gửi Tổ TLHN)
 */
export interface TLHNAllocationEmailPayload {
  catalogId: string;
  catalogCode: string;
  activityName: string;
  educationLevel?: string;
  programType?: string;
  sheetCode?: string;
  grades?: string[];
  themeName?: string;
  integratedSubjects?: string;
  primarySubjectName?: string;
  coopSubjectNames?: string;
  educationalContent?: string;
  learningOutcomes?: string;
  organizationFormat?: string;
  timeFrame?: string;
  semester?: number;
  expectedLocation?: string;
  partners?: string;
  cthsTeacherName?: string;
  senderName?: string;
  senderEmail?: string;
  customMessage?: string;
  allocatedCampuses: Array<{
    campusId: string;
    campusCode?: string;
    campusName?: string;
    tlhnTeacherId?: string;
    tlhnTeacherName?: string;
    tlhnTeacherEmail?: string;
    selectedGrades?: string[];
    selectedClassIds?: string[];
    assignedClasses?: Array<{
      classId: string;
      className: string;
      grade?: string;
      level?: string;
      homeroomTeacherId?: string;
      homeroomTeacherName?: string;
      homeroomTeacherEmail?: string;
    }>;
  }>;
}

/**
/**
 * Gửi email thông báo phân bổ kế hoạch hoạt động:
 * - Gửi email thông báo tới GVCN các lớp tiếp nhận để nhập vai trò học sinh
 * - Gửi email thông báo tới GVBM Phụ trách theo Tổ chuyên môn (nếu được gán đích danh)
 * - KHÔNG gửi email cho Tổ TLHN
 */
export async function sendTLHNAllocationNotification(payload: TLHNAllocationEmailPayload) {
  return sendActivityAllocationNotification(payload);
}

export async function sendActivityAllocationNotification(payload: TLHNAllocationEmailPayload) {
  try {
    const {
      catalogId,
      catalogCode,
      activityName,
      educationLevel = 'Tiểu học',
      programType,
      grades = [],
      themeName,
      integratedSubjects,
      primarySubjectName,
      coopSubjectNames,
      educationalContent,
      learningOutcomes,
      organizationFormat = 'Trải nghiệm',
      timeFrame,
      semester = 1,
      expectedLocation,
      partners,
      cthsTeacherName,
      senderName = 'BP HĐNGLL - Tổ CTHS',
      senderEmail,
      allocatedCampuses = []
    } = payload;

    if (!allocatedCampuses || allocatedCampuses.length === 0) {
      console.log('[Allocation Email] Không có cơ sở phân bổ, bỏ qua gửi email.');
      return { success: true, count: 0 };
    }

    // 1. Thu thập danh sách GVBM Phụ trách theo Tổ Chuyên Môn được gán đích danh (KHÔNG quét Tổ TLHN)
    const subjectTeacherMap = new Map<string, {
      email: string;
      teacherName: string;
      campusName: string;
      campusCode: string;
      departmentName?: string;
    }>();

    allocatedCampuses.forEach(alloc => {
      const targetEmail = alloc.subjectTeacherEmail;
      const targetName = alloc.subjectTeacherName;
      if (targetEmail && targetEmail.includes('@')) {
        const cleanEmail = targetEmail.trim().toLowerCase();
        if (!subjectTeacherMap.has(cleanEmail)) {
          subjectTeacherMap.set(cleanEmail, {
            email: cleanEmail,
            teacherName: targetName || 'Thầy/Cô Phụ trách Hoạt động',
            campusName: alloc.campusName || '',
            campusCode: alloc.campusCode || '',
            departmentName: alloc.departmentName || ''
          });
        }
      }
    });

    const subjectRecipients = Array.from(subjectTeacherMap.values());

    // 2b. Thu thập danh sách GVCN từ các lớp được chọn phân bổ
    const gvcnRecipientMap = new Map<string, {
      email: string;
      gvcnName: string;
      className: string;
      campusName: string;
      campusCode: string;
      tlhnTeacherName: string;
      tlhnTeacherEmail: string;
    }>();

    for (const alloc of allocatedCampuses) {
      if (Array.isArray(alloc.assignedClasses) && alloc.assignedClasses.length > 0) {
        for (const cls of alloc.assignedClasses) {
          let gvcnEmail = cls.homeroomTeacherEmail;
          let gvcnName = cls.homeroomTeacherName;

          if ((!gvcnEmail || !gvcnEmail.includes('@')) && cls.homeroomTeacherId) {
            try {
              const tIds = cls.homeroomTeacherId.split(',').map((id: string) => id.trim()).filter(Boolean);
              const foundTeacher = await prisma.teacher.findFirst({
                where: {
                  OR: [
                    { id: { in: tIds } },
                    { teacherCode: { in: tIds } }
                  ]
                },
                include: { user: true }
              });
              if (foundTeacher) {
                gvcnEmail = foundTeacher.email || foundTeacher.user?.email || '';
                gvcnName = gvcnName || foundTeacher.teacherName || foundTeacher.user?.fullName || '';
              }
            } catch {}
          }

          if ((!gvcnEmail || !gvcnEmail.includes('@')) && cls.classId) {
            try {
              const dbClass = await prisma.class.findUnique({
                where: { id: cls.classId },
                include: {
                  teachers: {
                    where: { roleInClass: 'GVCN' },
                    include: { teacher: true }
                  }
                }
              });
              if (dbClass) {
                const assignedGVCN = dbClass.teachers?.[0]?.teacher;
                if (assignedGVCN?.email) {
                  gvcnEmail = assignedGVCN.email;
                  gvcnName = gvcnName || assignedGVCN.teacherName;
                } else if (dbClass.homeroomTeacherId) {
                  const ht = await prisma.teacher.findFirst({
                    where: {
                      OR: [
                        { id: dbClass.homeroomTeacherId },
                        { teacherCode: dbClass.homeroomTeacherId }
                      ]
                    }
                  });
                  if (ht?.email) {
                    gvcnEmail = ht.email;
                    gvcnName = gvcnName || ht.teacherName;
                  }
                }
              }
            } catch {}
          }

          if (gvcnEmail && gvcnEmail.includes('@')) {
            const cleanEmail = gvcnEmail.trim().toLowerCase();
            const key = `${cleanEmail}_${cls.className}`;
            gvcnRecipientMap.set(key, {
              email: cleanEmail,
              gvcnName: gvcnName || 'Thầy/Cô Giáo viên Chủ nhiệm',
              className: cls.className,
              campusName: alloc.campusName || `Sky-Line ${alloc.campusCode || ''}`,
              campusCode: alloc.campusCode || '',
              departmentName: cls.departmentName || alloc.departmentName || '',
              subjectTeacherName: cls.subjectTeacherName || alloc.subjectTeacherName || alloc.tlhnTeacherName || '',
              subjectTeacherEmail: cls.subjectTeacherEmail || alloc.subjectTeacherEmail || alloc.tlhnTeacherEmail || '',
              tlhnTeacherName: alloc.tlhnTeacherName || 'GVBM Phụ trách',
              tlhnTeacherEmail: alloc.tlhnTeacherEmail || ''
            });
          }
        }
      }
    }

    if (subjectRecipients.length === 0 && gvcnRecipientMap.size === 0) {
      console.log('[Allocation/GVCN Email] Không tìm thấy email của GVBM Phụ trách hoặc GVCN tại các cơ sở phân bổ.');
      return { success: true, count: 0 };
    }

    const appUrl = process.env.NEXTAUTH_URL || 'https://skyline-survey.vercel.app';
    const dispatchUrl = `${appUrl}/teacher/experiential-activities`;
    const campusNamesList = allocatedCampuses.map(a => a.campusName || a.campusCode).filter(Boolean).join(', ');
    const gradesList = Array.isArray(grades) && grades.length > 0 ? grades.join(', ') : 'Toàn bậc học';

    const fromAddress = senderEmail 
      ? `"${senderName}" <${senderEmail}>` 
      : `"Hệ thống Sky-Line SMS - HĐTN" <${process.env.SMTP_FROM || 'thongpn@skylineschool.edu.vn'}>`;

    const emailSubject = `[Sky-line SMS - HĐTN] Kế hoạch hoạt động ngoại khóa từ BP HĐNGLL - Tổ CTHS: ${activityName}`;

    // 3. Gửi email tới GVBM Phụ trách theo Tổ chuyên môn tại các cơ sở (nếu có)
    const subjectPromises = subjectRecipients.map(async recipient => {
      const emailHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1E293B;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F1F5F9" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 660px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0;">
          
          <!-- HEADER BANNER -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; background: linear-gradient(135deg, #003B3A 0%, #005B58 60%, #00A19A 100%); padding: 30px 24px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <span style="display: inline-block; padding: 4px 14px; background-color: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                      🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-size: 21px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px; line-height: 1.3; text-transform: uppercase;">
                      KẾ HOẠCH HOẠT ĐỘNG NGOẠI KHÓA & TRẢI NGHIỆM
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 6px;">
                    <div style="font-size: 13px; font-weight: 600; color: #CCFBF1; letter-spacing: 0.3px;">
                      THÔNG BÁO TIẾP NHẬN TỔNG THỂ TỪ BP HĐNGLL - TỔ CTHS
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN CONTENT BODY -->
          <tr>
            <td style="padding: 28px 24px; color: #1E293B;">
              <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: #003B3A;">
                Kính gửi Thầy/Cô <strong>${recipient.teacherName}</strong> ${recipient.campusName ? `(${recipient.campusName})` : ''},
              </p>

              <!-- NOTICE BANNER -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F0FDFA" style="background-color: #F0FDFA; border-left: 4px solid #00A19A; border-radius: 10px; margin: 0 0 22px 0; border: 1px solid #CCFBF1; border-left: 4px solid #00A19A;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <div style="font-size: 13.5px; font-weight: 700; color: #003B3A; line-height: 1.6;">
                      Thầy/Cô vừa nhận được phân công phụ trách Kế hoạch hoạt động ngoại khóa/trải nghiệm từ BP HĐNGLL - Tổ CTHS. Kính nhờ Thầy/Cô theo dõi tiến độ và phối hợp cùng GVCN các lớp tiếp nhận để triển khai hoạt động hiệu quả.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- ACTIVITY SUMMARY BOX -->
              <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #003B3A; letter-spacing: 0.5px; margin: 24px 0 10px 0; border-bottom: 2px solid #E2E8F0; padding-bottom: 6px;">
                📌 THÔNG TIN CHI TIẾT KẾ HOẠCH: ${activityName}
              </div>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 24px; font-size: 13.5px; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #F8FAFC;">
                  <td width="38%" style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">Mã hoạt động:</td>
                  <td width="62%" style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-family: monospace; font-weight: 700; color: #00A19A;">${catalogCode}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">Khối lớp áp dụng:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">${gradesList} (${educationLevel})</td>
                </tr>
                ${themeName ? `
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">Chủ đề giáo dục:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">${themeName}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">Môn chủ trì:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #4338CA;">${primarySubjectName || 'Chưa xác định'}</td>
                </tr>
                ${(coopSubjectNames || integratedSubjects) ? `
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">Môn phối hợp / Tích hợp:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">${coopSubjectNames || integratedSubjects}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">Thời gian & Học kỳ:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #1E293B;">${timeFrame || 'Trong năm học'} — <strong>Học kỳ ${semester}</strong></td>
                </tr>
                ${expectedLocation ? `
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">Địa điểm (dự kiến):</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #1E293B;">${expectedLocation}</td>
                </tr>
                ` : ''}
                ${cthsTeacherName ? `
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">Phụ trách BP HĐNGLL/CTHS:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #003B3A; font-weight: 700;">${cthsTeacherName}</td>
                </tr>
                ` : ''}
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 10px 14px; font-weight: 700; color: #475569;">Cơ sở tiếp nhận:</td>
                  <td style="padding: 10px 14px; color: #047857; font-weight: 800;">${campusNamesList}</td>
                </tr>
              </table>

              <!-- BULLETPROOF CTA BUTTON -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 28px auto; border-collapse: separate;">
                <tr>
                  <td align="center" bgcolor="#00A19A" style="border-radius: 10px; background-color: #00A19A;">
                    <a href="${dispatchUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13.5px; color: #FFFFFF; font-weight: 800; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #00A19A;">
                      XEM CHI TIẾT KẾ HOẠCH & ĐỒNG HÀNH TRIỂN KHAI &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- HƯỚNG DẪN THAO TÁC -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFBEB; border: 1px solid #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 8px; margin-top: 20px;">
                <tr>
                  <td style="padding: 14px 16px; font-size: 12.5px; color: #92400E; line-height: 1.55;">
                    <strong style="color: #78350F;">💡 Nhiệm vụ của GVBM Phụ trách tại Cơ sở:</strong><br/>
                    1. Nhấp vào nút bấm trên hoặc đăng nhập vào Cổng Giáo viên: <em>Quản lý Hoạt động trải nghiệm</em>.<br/>
                    2. Nắm bắt kế hoạch hoạt động và phối hợp cùng GVCN các lớp tiếp nhận.<br/>
                    3. Hỗ trợ đánh giá kết quả rèn luyện & vai trò của học sinh sau khi hoàn thành hoạt động.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- OFFICIAL BRAND FOOTER -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 24px 24px; text-align: center; border-top: 3px solid #00A19A;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
              </p>
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 600; color: #CCFBF1;">
                BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11px; color: rgba(255, 255, 255, 0.75);">
                Đơn vị gửi thông báo: <strong style="color: #FFFFFF;">${senderName}</strong>
              </p>
              <p style="margin: 0; font-size: 10px; color: rgba(255, 255, 255, 0.65); line-height: 1.5;">
                Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #FDE047; text-decoration: none; font-weight: 600;">ktdbcl@skylineschool.edu.vn</a> • Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #FDE047; text-decoration: none; font-weight: 600;">skylineschool.edu.vn</a>
              </p>
              <p style="margin: 6px 0 0 0; font-size: 10px; color: rgba(255, 255, 255, 0.4);">
                Email thông báo tự động từ Hệ thống Sky-line SMS. Vui lòng không trả lời trực tiếp email này.
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

      try {
        const sendRes = await sendEmail({
          from: fromAddress,
          to: recipient.email,
          subject: emailSubject,
          html: emailHtml
        });
        if (sendRes.success) {
          console.log(`[Subject Teacher Email] Đã gửi email kế hoạch HĐTN thành công tới ${recipient.email} (${recipient.teacherName} - ${recipient.campusCode})`);
        } else {
          console.error(`[Subject Teacher Email] Lỗi khi gửi email tới ${recipient.email}:`, sendRes.error || sendRes.reason);
        }
      } catch (err: any) {
        console.error(`[Subject Teacher Email] Lỗi khi gửi email tới ${recipient.email}:`, err?.message);
      }
    });

    // Gửi email riêng biệt tới từng GVCN với lời nhắn nhập vai trò học sinh
    const gvcnPromises = Array.from(gvcnRecipientMap.values()).map(async gvcn => {
      const gvcnSubject = `[Sky-Line HĐTN] Kế hoạch hoạt động ngoại khóa & Nhập vai trò học sinh lớp ${gvcn.className}: ${activityName}`;
      const gvcnEmailHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${gvcnSubject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1E293B;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F1F5F9" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 660px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0;">
          
          <!-- HEADER BANNER -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; background: linear-gradient(135deg, #003B3A 0%, #005B58 60%, #00A19A 100%); padding: 30px 24px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <span style="display: inline-block; padding: 4px 14px; background-color: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                      🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px; line-height: 1.3; text-transform: uppercase;">
                      KẾ HOẠCH HOẠT ĐỘNG NGOẠI KHÓA & TRẢI NGHIỆM
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 6px;">
                    <div style="font-size: 13px; font-weight: 600; color: #CCFBF1; letter-spacing: 0.3px;">
                      THÔNG BÁO DÀNH CHO GIÁO VIÊN CHỦ NHIỆM LỚP ${gvcn.className}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN CONTENT BODY -->
          <tr>
            <td style="padding: 28px 24px; color: #1E293B;">
              <p style="margin: 0 0 14px 0; font-size: 15px; font-weight: 700; color: #003B3A;">
                Kính gửi Quý Thầy/Cô <strong>${gvcn.gvcnName}</strong> — Giáo viên Chủ nhiệm Lớp <strong>${gvcn.className}</strong> (${gvcn.campusName}),
              </p>

              <!-- PROMINENT CALLOUT BANNER -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#FEF3C7" style="background-color: #FEF3C7; border: 2px solid #F59E0B; border-radius: 12px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <div style="font-size: 14px; font-weight: 800; color: #92400E; line-height: 1.6;">
                      📢 Kính nhờ Quý thầy/cô GVCN vui lòng hoàn tất nhập vai trò của Học sinh trong Hoạt động trải nghiệm để bổ sung Hồ sơ Học sinh cuối năm.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- ACTIVITY DETAILS TABLE -->
              <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #003B3A; letter-spacing: 0.5px; margin: 20px 0 10px 0; border-bottom: 2px solid #E2E8F0; padding-bottom: 6px;">
                📌 THÔNG TIN HOẠT ĐỘNG TRẢI NGHIỆM
              </div>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 24px; font-size: 13.5px; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #F8FAFC;">
                  <td width="36%" style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">Tên hoạt động:</td>
                  <td width="64%" style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 800; color: #003B3A;">${activityName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">Bậc học:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">${educationLevel}</td>
                </tr>
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">Hệ học:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">${programType || 'Chất lượng cao / Song ngữ'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">Chủ đề giáo dục:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">${themeName || 'Theo kế hoạch năm học'}</td>
                </tr>
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">Môn phối hợp:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 600; color: #1E293B;">
                    ${primarySubjectName ? '<strong>Chủ trì:</strong> ' + primarySubjectName : ''}
                    ${coopSubjectNames || integratedSubjects ? '; <strong>Phối hợp:</strong> ' + (coopSubjectNames || integratedSubjects) : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">Thời gian & HK:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #1E293B;">
                    <strong>${timeFrame || 'Trong năm học'}</strong> (Học kỳ ${semester})
                  </td>
                </tr>
                <tr style="background-color: #F8FAFC;">
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">Địa điểm:</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #1E293B;">${expectedLocation || 'Theo kế hoạch'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #475569;">GVBM Phụ trách (TCM):</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; font-weight: 700; color: #00A19A;">
                    ${gvcn.subjectTeacherName ? `<strong>${gvcn.subjectTeacherName}</strong> ${gvcn.departmentName ? `<span style="color: #003B3A; font-weight: 600;">(TCM: ${gvcn.departmentName})</span>` : ''} ${gvcn.subjectTeacherEmail ? `<span style="font-weight: 400; color: #64748B;">— ${gvcn.subjectTeacherEmail}</span>` : ''}` : (gvcn.departmentName ? `Tổ Chuyên Môn: ${gvcn.departmentName}` : 'Tổ Chuyên Môn cơ sở')}
                  </td>
                </tr>
              </table>

              <!-- CTA BUTTON -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 24px auto;">
                <tr>
                  <td align="center" bgcolor="#00A19A" style="border-radius: 10px; background-color: #00A19A;">
                    <a href="${dispatchUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13.5px; color: #FFFFFF; font-weight: 800; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #00A19A;">
                      VÀO SSM NHẬP VAI TRÒ HỌC SINH LỚP ${gvcn.className} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- OFFICIAL BRAND FOOTER -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 24px 24px; text-align: center; border-top: 3px solid #00A19A;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
              </p>
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 600; color: #CCFBF1;">
                BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
              </p>
              <p style="margin: 0 0 10px 0; font-size: 11px; color: rgba(255, 255, 255, 0.75);">
                Đơn vị gửi thông báo: <strong style="color: #FFFFFF;">${senderName}</strong>
              </p>
              <p style="margin: 0; font-size: 10px; color: rgba(255, 255, 255, 0.65); line-height: 1.5;">
                Email hỗ trợ: <a href="mailto:ktdbcl@skylineschool.edu.vn" style="color: #FDE047; text-decoration: none; font-weight: 600;">ktdbcl@skylineschool.edu.vn</a> • Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #FDE047; text-decoration: none; font-weight: 600;">skylineschool.edu.vn</a>
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

      try {
        const sendRes = await sendEmail({
          from: fromAddress,
          to: gvcn.email,
          subject: gvcnSubject,
          html: gvcnEmailHtml
        });
        if (sendRes.success) {
          console.log(`[GVCN Email] Đã gửi email kế hoạch HĐTN thành công tới GVCN ${gvcn.gvcnName} (${gvcn.email}) lớp ${gvcn.className}`);
        } else {
          console.error(`[GVCN Email] Lỗi khi gửi email tới ${gvcn.email}:`, sendRes.error || sendRes.reason);
        }
      } catch (err: any) {
        console.error(`[GVCN Email] Lỗi khi gửi email tới ${gvcn.email}:`, err?.message);
      }
    });

    await Promise.allSettled([...subjectPromises, ...gvcnPromises]);
    const totalSent = subjectRecipients.length + gvcnRecipientMap.size;
    return { 
      success: true, 
      count: totalSent, 
      gvcnCount: gvcnRecipientMap.size, 
      subjectTeacherCount: subjectRecipients.length 
    };
  } catch (error: any) {
    console.error('[Allocation Email] Lỗi xử lý gửi email phân bổ hoạt động:', error);
    return { success: false, error: error?.message };
  }
}

