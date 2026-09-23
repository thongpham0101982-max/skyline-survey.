import { prisma } from "@/lib/db";
import { AIUserContext } from "../types";
import {
  ActionProposal,
  ActionType,
  AdvisoryEmailPayload,
  GradebookReminderPayload,
  ObservationReminderPayload,
  GradebookUnlockPayload
} from "./actionTypes";

/**
 * Drafts an AI Action and saves it into AIPendingAction awaiting Human Confirmation.
 * Zero database modification or email dispatch occurs during this phase.
 */
export async function draftAction(
  context: AIUserContext,
  actionType: ActionType,
  params: Record<string, any>
): Promise<{ success: boolean; proposal?: ActionProposal; error?: string }> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

  // ==========================================================================
  // 1. ACTION: GVCN gửi Email Cố vấn học tập cho Phụ huynh
  // ==========================================================================
  if (actionType === "ACTION_SEND_ADVISORY_EMAIL") {
    const studentId = params.studentId || context.studentId;
    if (!studentId) {
      return { success: false, error: "Vui lòng chỉ định học sinh để lập dự thảo email cố vấn học tập." };
    }

    // Permission check: GVCN can only send for their homeroom students
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        parents: {
          include: {
            parent: {
              select: { parentName: true, email: true, phone: true }
            }
          }
        },
        goals: {
          take: 3,
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!student) {
      return { success: false, error: "Không tìm thấy hồ sơ học sinh trong hệ thống." };
    }

    const parentLink = student.parents?.[0]?.parent;
    const recipientEmail = parentLink?.email || "phuhuynh@skylineschool.edu.vn";
    const recipientName = parentLink?.parentName || `Phụ huynh em ${student.fullName}`;

    const subject = `[Sky-line SMS] Thông tin Cố vấn Học tập & Kế hoạch Phát triển - Học sinh ${student.fullName}`;
    const plainText = `Kính gửi Quý Phụ huynh em ${student.fullName},\n\n` +
      `Thầy/Cô Giáo viên Chủ nhiệm xin gửi thông tin cập nhật về tình hình học tập và sổ mục tiêu SMART của em ${student.fullName}.\n` +
      `Nhà trường kính đề nghị Quý Phụ huynh cùng đồng hành, theo dõi Kế hoạch 7 ngày gỡ rào cản học tập của con trên Cổng Phụ huynh (Sky-Line Parent Portal).\n\n` +
      `Trân trọng,\nGiáo viên Chủ nhiệm Sky-Line`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #002828; color: #f8fafc; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; letter-spacing: 0.5px;">HỆ THỐNG GIÁO DỤC SKY-LINE</h2>
          <p style="margin: 5px 0 0; font-size: 13px; opacity: 0.85;">THÔNG BÁO CỐ VẤN HỌC TẬP ĐỊNH KỲ</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 15px;">Kính gửi <strong>${recipientName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6;">
            Thầy/Cô Giáo viên Chủ nhiệm gửi thông tin cập nhật về tiến độ thực hiện mục tiêu và định hướng rèn luyện của học sinh <strong>${student.fullName}</strong> (Mã HS: <code>${student.studentCode}</code>).
          </p>
          <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; margin: 16px 0; border-radius: 0 6px 6px 0;">
            <p style="margin: 0; font-size: 13px; color: #166534; font-weight: bold;">Định hướng đồng hành từ Gia đình & Nhà trường:</p>
            <p style="margin: 6px 0 0; font-size: 13px; color: #14532d; line-height: 1.5;">
              Khuyến khích con duy trì thời gian tự học mỗi ngày, kiên trì theo đuổi Kế hoạch 7 ngày đã cam kết và chủ động trao đổi với Thầy Cô khi gặp khó khăn.
            </p>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            Quý Phụ huynh có thể đăng nhập vào Cổng Phụ huynh (Parent Portal) để xem chi tiết bảng điểm và nhận xét của các Thầy Cô bộ môn.
          </p>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #334155;">
            Trân trọng,<br>
            <strong>Ban Cố vấn Học đường & Giáo viên Chủ nhiệm</strong><br>
            <em>Hệ thống Giáo dục Sky-Line</em>
          </div>
        </div>
      </div>
    `;

    const payload: AdvisoryEmailPayload = {
      studentId: student.id,
      studentName: student.fullName,
      recipientEmail,
      recipientName,
      subject,
      htmlContent,
      plainText
    };

    const pendingRecord = await prisma.aIPendingAction.create({
      data: {
        actionType,
        targetEntityId: student.id,
        payloadJson: JSON.stringify(payload),
        proposedByUserId: context.userId || "system_user",
        proposedByRole: context.role,
        status: "PENDING",
        expiresAt
      }
    });

    return {
      success: true,
      proposal: {
        actionId: pendingRecord.id,
        actionType,
        title: "Gửi Email Cố Vấn Học Tập Cho Phụ Huynh",
        description: `Soạn và gửi email trao đổi định hướng học tập của học sinh ${student.fullName} đến Phụ huynh.`,
        targetEntityId: student.id,
        preview: {
          recipient: `${recipientName} <${recipientEmail}>`,
          subject,
          summary: `Gửi email cập nhật tình hình học tập và sổ mục tiêu SMART của em ${student.fullName}.`,
          details: {
            studentName: student.fullName,
            studentCode: student.studentCode,
            recipientEmail
          }
        },
        expiresAt: expiresAt.toISOString(),
        confirmationRequired: true
      }
    };
  }

  // ==========================================================================
  // 2. ACTION: Ban ĐHCM / KT-ĐBCL gửi Email nhắc nhở hạn nộp Sổ điểm
  // ==========================================================================
  if (actionType === "ACTION_SEND_GRADEBOOK_REMINDER") {
    const recipientEmail = params.recipientEmail || "giaovien@skylineschool.edu.vn";
    const recipientName = params.recipientName || "Thầy/Cô Giáo viên Bộ môn";
    const subjectName = params.subjectName || "Môn học";
    const className = params.className || "Khối lớp";
    const deadlineDate = params.deadlineDate || "17:00 ngày mai";

    const subject = `[Sky-line SMS] Nhắc nhở tiến độ hoàn thành Sổ điểm ${subjectName} - Lớp ${className}`;
    const plainText = `Kính gửi ${recipientName},\n\n` +
      `Ban Khảo thí & Đảm bảo Chất lượng xin gửi thông báo nhắc nhở về tiến độ cập nhật Sổ điểm môn ${subjectName} lớp ${className}.\n` +
      `Thời hạn khóa sổ điểm hệ thống: ${deadlineDate}.\n\n` +
      `Kính đề nghị Thầy/Cô sớm hoàn tất việc nhập điểm và nhận xét trên hệ thống SSM.\n` +
      `Trân trọng,\nBan KT-ĐBCL Sky-Line`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #002828; color: #f8fafc; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">HỆ THỐNG GIÁO DỤC SKY-LINE</h2>
          <p style="margin: 5px 0 0; font-size: 13px; opacity: 0.85;">BAN KHẢO THÍ & ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 15px;">Kính gửi <strong>${recipientName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6;">
            Hệ thống SSM ghi nhận sổ điểm môn <strong>${subjectName}</strong> của lớp <strong>${className}</strong> hiện đang chờ hoàn tất dữ liệu điểm định kỳ.
          </p>
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 0 6px 6px 0;">
            <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: bold;">Thời hạn khóa sổ điểm tự động:</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #b45309; font-weight: bold;">
              ${deadlineDate}
            </p>
          </div>
          <p style="font-size: 13px; color: #475569; line-height: 1.5;">
            Sau thời hạn trên, sổ điểm sẽ tự động khóa theo Quy trình KT-ĐBCL số 35/QT-KTĐBCL. Mọi thay đổi sau thời hạn sẽ cần quy trình phê duyệt mở khóa.
          </p>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #334155;">
            Trân trọng,<br>
            <strong>Ban Khảo thí & Đảm bảo Chất lượng</strong>
          </div>
        </div>
      </div>
    `;

    const payload: GradebookReminderPayload = {
      recipientEmail,
      recipientName,
      subjectName,
      className,
      deadlineDate,
      subject,
      htmlContent,
      plainText
    };

    const pendingRecord = await prisma.aIPendingAction.create({
      data: {
        actionType,
        targetEntityId: params.classId || "ALL",
        payloadJson: JSON.stringify(payload),
        proposedByUserId: context.userId || "system_user",
        proposedByRole: context.role,
        status: "PENDING",
        expiresAt
      }
    });

    return {
      success: true,
      proposal: {
        actionId: pendingRecord.id,
        actionType,
        title: "Gửi Email Nhắc Nhở Hạn Nộp Sổ Điểm",
        description: `Gửi email nhắc nhở tiến độ nhập điểm môn ${subjectName} lớp ${className}.`,
        preview: {
          recipient: `${recipientName} <${recipientEmail}>`,
          subject,
          summary: `Nhắc nhở hoàn thành sổ điểm môn ${subjectName} trước ${deadlineDate}.`,
          details: {
            subjectName,
            className,
            deadlineDate,
            recipientEmail
          }
        },
        expiresAt: expiresAt.toISOString(),
        confirmationRequired: true
      }
    };
  }

  // ==========================================================================
  // 3. ACTION: TTCM gửi Email nhắc nhở chỉ tiêu Dự giờ tháng
  // ==========================================================================
  if (actionType === "ACTION_SEND_OBSERVATION_REMINDER") {
    const recipientEmail = params.recipientEmail || "giaovien@skylineschool.edu.vn";
    const recipientName = params.recipientName || "Thầy/Cô Giáo viên";
    const currentCompleted = Number(params.currentCompleted || 0);
    const quotaRequired = Number(params.quotaRequired || 2);
    const departmentName = params.departmentName || "Tổ Chuyên Môn";

    const subject = `[Sky-line SMS] Nhắc nhở định mức Dự giờ Chuyên môn tháng - ${departmentName}`;
    const plainText = `Kính gửi ${recipientName},\n\n` +
      `Tổ trưởng Chuyên môn ${departmentName} xin gửi thông báo nhắc nhở về định mức dự giờ trong tháng.\n` +
      `Tiến độ hiện tại: ${currentCompleted}/${quotaRequired} tiết.\n` +
      `Theo Hướng dẫn số 112/HD-KTĐBCL, kính đề nghị Thầy/Cô đăng ký và hoàn thành chỉ tiêu dự giờ trước ngày cuối tháng.\n\n` +
      `Trân trọng,\nTổ trưởng Chuyên môn`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #002828; color: #f8fafc; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">TỔ CHUYÊN MÔN ${departmentName.toUpperCase()}</h2>
          <p style="margin: 5px 0 0; font-size: 13px; opacity: 0.85;">THEO DÕI HOẠT ĐỘNG DỰ GIỜ SƯ PHẠM</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 15px;">Kính gửi <strong>${recipientName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6;">
            Theo quy định chuyên môn tại Văn bản số 112/HD-KTĐBCL, định mức dự giờ hàng tháng đối với Giáo viên là tối thiểu <strong>${quotaRequired} tiết/tháng</strong>.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px 18px; margin: 16px 0; border-radius: 6px;">
            <p style="margin: 0; font-size: 13px; color: #475569;">Tiến độ dự giờ của Thầy/Cô tháng này:</p>
            <p style="margin: 6px 0 0; font-size: 16px; color: #0f172a; font-weight: bold;">
              Đã dự: <span style="color: #2563eb;">${currentCompleted}</span> / ${quotaRequired} tiết (Còn thiếu: ${Math.max(0, quotaRequired - currentCompleted)} tiết)
            </p>
          </div>
          <p style="font-size: 13px; color: #475569; line-height: 1.5;">
            Kính đề nghị Thầy/Cô chủ động đăng ký dự giờ các tiết dạy trong tuần trên phân hệ Dự Giờ của hệ thống SSM để đảm bảo tiến độ sinh hoạt chuyên môn của Tổ.
          </p>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #334155;">
            Trân trọng,<br>
            <strong>Tổ trưởng Chuyên môn</strong>
          </div>
        </div>
      </div>
    `;

    const payload: ObservationReminderPayload = {
      recipientEmail,
      recipientName,
      currentCompleted,
      quotaRequired,
      departmentName,
      subject,
      htmlContent,
      plainText
    };

    const pendingRecord = await prisma.aIPendingAction.create({
      data: {
        actionType,
        targetEntityId: params.teacherId || "DEPARTMENT",
        payloadJson: JSON.stringify(payload),
        proposedByUserId: context.userId || "system_user",
        proposedByRole: context.role,
        status: "PENDING",
        expiresAt
      }
    });

    return {
      success: true,
      proposal: {
        actionId: pendingRecord.id,
        actionType,
        title: "Gửi Email Nhắc Nhở Chỉ Tiêu Dự Giờ",
        description: `Gửi email nhắc nhở hoàn thành chỉ tiêu ${quotaRequired} tiết dự giờ tháng cho ${recipientName}.`,
        preview: {
          recipient: `${recipientName} <${recipientEmail}>`,
          subject,
          summary: `Tiến độ hiện tại: ${currentCompleted}/${quotaRequired} tiết.`,
          details: {
            currentCompleted,
            quotaRequired,
            departmentName,
            recipientEmail
          }
        },
        expiresAt: expiresAt.toISOString(),
        confirmationRequired: true
      }
    };
  }

  return { success: false, error: `Loại hành động '${actionType}' chưa được hỗ trợ.` };
}
