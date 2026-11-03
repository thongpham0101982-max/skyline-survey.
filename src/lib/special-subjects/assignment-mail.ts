import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { renderSkylineEmail, formatMarkdownToHtml } from "@/lib/email-templates";

export interface SendAssignmentNotificationParams {
  assignmentIds?: string[];
  teacherId?: string;
  subjectId?: string;
  campusId?: string;
  grade?: string;
  academicYearId?: string;
  semester?: number;
  customMessage?: string;
}

export async function sendAssignmentNotificationEmails(params: SendAssignmentNotificationParams) {
  const {
    assignmentIds,
    teacherId,
    subjectId,
    campusId,
    grade,
    semester = 1,
    customMessage
  } = params;

  let academicYearId = params.academicYearId;
  if (!academicYearId || academicYearId === "ACTIVE" || academicYearId === "CURRENT") {
    const activeYear = await prisma.academicYear.findFirst({
      where: { status: "ACTIVE" }
    });
    academicYearId = activeYear?.id || "cmnseevbh0000wjbmoigji2zd";
  }

  const where: any = {
    academicYearId,
    status: "ACTIVE"
  };

  if (assignmentIds && Array.isArray(assignmentIds) && assignmentIds.length > 0) {
    where.id = { in: assignmentIds };
  } else {
    if (teacherId) where.teacherId = teacherId;
    if (subjectId && subjectId !== "ALL") where.subjectId = subjectId;
    if (campusId && campusId !== "ALL") where.class = { ...(where.class || {}), campusId };
    if (grade && grade !== "ALL") where.class = { ...(where.class || {}), grade };
  }

  const assignments = await (prisma as any).specialTeachingAssignment.findMany({
    where,
    include: {
      subject: {
        select: { id: true, code: true, name: true, color: true }
      },
      teacher: {
        select: { id: true, teacherCode: true, teacherName: true, email: true, phone: true }
      },
      class: {
        select: {
          id: true,
          className: true,
          grade: true,
          campus: { select: { campusCode: true, campusName: true } }
        }
      }
    }
  });

  if (assignments.length === 0) {
    return {
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      skippedTeachers: [],
      error: "Không tìm thấy dữ liệu phân công để gửi email"
    };
  }

  // Group assignments by teacher & subject
  const grouped = new Map<string, {
    teacher: any;
    subject: any;
    classes: any[];
  }>();

  for (const a of assignments) {
    if (!a.teacher) continue;
    const key = `${a.teacherId}_${a.subjectId}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        teacher: a.teacher,
        subject: a.subject,
        classes: []
      });
    }
    grouped.get(key)!.classes.push(a.class);
  }

  let sentCount = 0;
  let failedCount = 0;
  const skippedTeachers: string[] = [];

  const baseUrl = process.env.NEXTAUTH_URL || "https://ssm.skylineschool.edu.vn";

  for (const [, item] of grouped) {
    const { teacher, subject, classes } = item;
    const recipientEmail = (teacher.email || "").trim();

    if (!recipientEmail || !recipientEmail.includes("@")) {
      skippedTeachers.push(`${teacher.teacherName} (chưa có email)`);
      continue;
    }

    const classListNames = classes.map(c => `${c.className} (${c.campus?.campusCode || "CS"})`).join(", ");
    const isCxxh = subject?.code === "CXXH";
    const isCareerGuidance = subject?.code === "GDHN";
    const portalUrl = isCxxh 
      ? `${baseUrl}/teacher/special-subjects/cxxh` 
      : `${baseUrl}/teacher/special-subjects/eval?subject=${subject?.code || "FIN_EDU"}`;

    const emailHtml = renderSkylineEmail({
      headerBadge: "PHÂN CÔNG MÔN ĐẶC THÙ",
      headerTitle: "Thông Báo Phân Công Giảng Dạy",
      headerSubtitle: "Ban Khảo thí & Đảm bảo chất lượng Sky-Line",
      headerTheme: "teal",
      recipientName: teacher.teacherName,
      greetingPrefix: "Kính gửi Thầy/Cô",
      introMessage: `Ban Khảo thí & Đảm bảo chất lượng (KT&ĐBCL) xin thông báo về việc phân công Thầy/Cô phụ trách giảng dạy và đánh giá môn học đặc thù trong năm học 2026-2027:`,
      detailsTitle: "THÔNG TIN PHÂN CÔNG GIẢNG DẠY",
      details: [
        { label: "Giáo viên phụ trách (GVPT)", value: `${teacher.teacherName} ${teacher.teacherCode ? `(${teacher.teacherCode})` : ""}`, highlight: true },
        { label: "Môn học đặc thù", value: `${subject?.name || "Môn đặc thù"} (${subject?.code || ""})`, highlight: true },
        { label: "Năm học / Học kỳ", value: `Năm học 2026-2027 (Học kỳ ${semester})` },
        { label: "Số lượng lớp phụ trách", value: `${classes.length} lớp` },
        { label: "Danh sách lớp học", value: classListNames }
      ],
      noticeBox: {
        type: "info",
        title: "Hướng dẫn thực hiện",
        content: "Thầy/Cô vui lòng đăng nhập vào phân hệ Môn học đặc thù trên Sky-line SMS để tra cứu khung chương trình, tiêu chuẩn năng lực và thực hiện đánh giá định kỳ cho học sinh các lớp phụ trách."
      },
      extraHtml: customMessage ? `
        <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 10px; padding: 14px 18px; margin: 18px 0; font-size: 13px; color: #92400E; line-height: 1.5;">
          <div style="font-weight: 700; margin-bottom: 4px;">📌 Lời nhắn từ Bộ phận Khảo thí:</div>
          <div>${formatMarkdownToHtml(customMessage)}</div>
        </div>
      ` : undefined,
      button: {
        text: isCareerGuidance ? "Truy cập Hồ sơ Tư vấn Hướng nghiệp" : "Truy cập Sổ điểm & Đánh giá môn đặc thù",
        url: portalUrl,
        color: "#00A19A"
      },
      secondaryNote: "Nếu có bất kỳ thắc mắc hoặc cần điều chỉnh danh sách phân công, Thầy/Cô vui lòng liên hệ Ban KT&ĐBCL qua email ktdbcl@skylineschool.edu.vn."
    });

    try {
      const mailRes = await sendEmail({
        to: recipientEmail,
        subject: `[Sky-line SMS] Thông báo phân công giảng dạy: ${subject?.name || "Môn đặc thù"} - Năm học 2026-2027`,
        html: emailHtml,
        from: "Ban Khảo thí & ĐBCL Sky-Line <ktdbcl@skylineschool.edu.vn>"
      });

      if (mailRes.success) {
        sentCount++;
      } else {
        console.warn(`[Assignment Email Error] Failed to send to ${recipientEmail}:`, mailRes.error);
        failedCount++;
      }
    } catch (err: any) {
      console.error(`[Assignment Email Exception] to ${recipientEmail}:`, err);
      failedCount++;
    }
  }

  return {
    sentCount,
    failedCount,
    skippedCount: skippedTeachers.length,
    skippedTeachers
  };
}
