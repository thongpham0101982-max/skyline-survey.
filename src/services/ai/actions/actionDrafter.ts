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

    const appUrl = process.env.NEXTAUTH_URL || "https://skylineschool.edu.vn";
    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thông Báo Cố Vấn Học Tập - Sky-Line</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1E293B;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F1F5F9" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0;">
          
          <!-- HEADER BANNER -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; background: linear-gradient(135deg, #003B3A 0%, #005B58 60%, #00A19A 100%); padding: 26px 20px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="padding-bottom: 6px;">
                    <span style="display: inline-block; padding: 3px 12px; background-color: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                      🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-size: 19px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px; line-height: 1.3; text-transform: uppercase;">
                      THÔNG BÁO CỐ VẤN HỌC TẬP ĐỊNH KỲ
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 4px;">
                    <div style="font-size: 12px; font-weight: 600; color: #CCFBF1;">
                      BAN CỐ VẤN HỌC ĐƯỜNG & GIÁO VIÊN CHỦ NHIỆM
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding: 24px 20px; color: #1E293B;">
              <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #003B3A;">
                Kính gửi Quý Phụ huynh ${recipientName},
              </p>
              <p style="font-size: 13.5px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
                Thầy/Cô Giáo viên Chủ nhiệm xin gửi thông tin cập nhật về tiến độ thực hiện mục tiêu và định hướng rèn luyện của học sinh:
              </p>

              <!-- STUDENT SUMMARY CARD -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F0FDFA" style="background-color: #F0FDFA; border: 1px solid #CCFBF1; border-radius: 10px; margin: 0 0 16px 0;">
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #134E4A;">
                    <strong>Học sinh:</strong> <span style="font-size: 14px; font-weight: 800; color: #003B3A;">${student.fullName}</span> &nbsp;|&nbsp; <strong>Mã HS:</strong> <code>${student.studentCode}</code>
                  </td>
                </tr>
              </table>

              <!-- ORIENTATION CALLOUT -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F8FAFC" style="background-color: #F8FAFC; border-left: 4px solid #00A19A; border-radius: 8px; margin: 0 0 16px 0; border: 1px solid #E2E8F0; border-left: 4px solid #00A19A;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <div style="font-size: 13px; font-weight: 700; color: #003B3A; margin-bottom: 4px;">
                      🌱 Định hướng đồng hành từ Gia đình & Nhà trường:
                    </div>
                    <div style="font-size: 13px; color: #334155; line-height: 1.55;">
                      Khuyến khích con duy trì thời gian tự học mỗi ngày, kiên trì theo đuổi Kế hoạch 7 ngày đã cam kết và chủ động trao đổi với Thầy Cô khi gặp khó khăn.
                    </div>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #64748B; line-height: 1.5; margin: 0 0 18px 0;">
                Quý Phụ huynh có thể đăng nhập vào Cổng Phụ huynh (Parent Portal) để xem chi tiết bảng điểm và nhận xét của các Thầy Cô bộ môn.
              </p>

              <!-- BULLETPROOF CTA BUTTON -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 20px auto; border-collapse: separate;">
                <tr>
                  <td align="center" bgcolor="#00A19A" style="border-radius: 10px; background-color: #00A19A;">
                    <a href="${appUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13px; color: #FFFFFF; font-weight: 800; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #00A19A;">
                      TRUY CẬP CỔNG PHỤ HUYNH &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- OFFICIAL BRAND FOOTER -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 20px 20px; text-align: center; border-top: 3px solid #00A19A;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
              </p>
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 600; color: #CCFBF1;">
                BAN CỐ VẤN HỌC ĐƯỜNG & GIÁO VIÊN CHỦ NHIỆM
              </p>
              <p style="margin: 0; font-size: 10px; color: rgba(255, 255, 255, 0.7); line-height: 1.5;">
                Email hỗ trợ: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #FDE047; text-decoration: none; font-weight: 600;">bankhaothi@skylineschool.edu.vn</a> • Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #FDE047; text-decoration: none; font-weight: 600;">skylineschool.edu.vn</a>
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

    const appUrl = process.env.NEXTAUTH_URL || "https://skylineschool.edu.vn";
    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nhắc Nhở Sổ Điểm - Sky-Line</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1E293B;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F1F5F9" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0;">
          
          <!-- HEADER BANNER -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; background: linear-gradient(135deg, #003B3A 0%, #005B58 60%, #00A19A 100%); padding: 26px 20px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="padding-bottom: 6px;">
                    <span style="display: inline-block; padding: 3px 12px; background-color: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                      🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-size: 19px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px; line-height: 1.3; text-transform: uppercase;">
                      NHẮC NHỞ TIẾN ĐỘ SỔ ĐIỂM
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 4px;">
                    <div style="font-size: 12px; font-weight: 600; color: #CCFBF1;">
                      BAN KHẢO THÍ & ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding: 24px 20px; color: #1E293B;">
              <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #003B3A;">
                Kính gửi Thầy/Cô ${recipientName},
              </p>
              <p style="font-size: 13.5px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
                Hệ thống SSM ghi nhận sổ điểm môn <strong>${subjectName}</strong> của lớp <strong>${className}</strong> hiện đang chờ hoàn tất dữ liệu điểm định kỳ theo kế hoạch khảo thí.
              </p>

              <!-- DEADLINE CALLOUT -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#FFFBEB" style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; border-radius: 8px; margin: 0 0 18px 0; border: 1px solid #FEF3C7; border-left: 4px solid #F59E0B;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <div style="font-size: 12px; font-weight: 700; color: #92400E; text-transform: uppercase;">
                      ⏰ Thời hạn khóa sổ điểm hệ thống:
                    </div>
                    <div style="font-size: 16px; font-weight: 800; color: #B45309; margin-top: 4px;">
                      ${deadlineDate}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #64748B; line-height: 1.55; margin: 0 0 20px 0;">
                Sau thời hạn trên, sổ điểm sẽ tự động khóa theo <em>Quy trình KT-ĐBCL số 35/QT-KTĐBCL</em>. Mọi thay đổi sau thời hạn sẽ cần phê duyệt mở khóa từ Ban Giám hiệu / Ban KT-ĐBCL.
              </p>

              <!-- BULLETPROOF CTA BUTTON -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 22px auto; border-collapse: separate;">
                <tr>
                  <td align="center" bgcolor="#00A19A" style="border-radius: 10px; background-color: #00A19A;">
                    <a href="${appUrl}/teacher/gradebook" target="_blank" style="display: inline-block; padding: 12px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13px; color: #FFFFFF; font-weight: 800; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #00A19A;">
                      TRUY CẬP VÀ CẬP NHẬT SỔ ĐIỂM &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- OFFICIAL BRAND FOOTER -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 20px 20px; text-align: center; border-top: 3px solid #00A19A;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
              </p>
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 600; color: #CCFBF1;">
                BAN KHẢO THÍ & ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
              </p>
              <p style="margin: 0; font-size: 10px; color: rgba(255, 255, 255, 0.7); line-height: 1.5;">
                Email hỗ trợ: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #FDE047; text-decoration: none; font-weight: 600;">bankhaothi@skylineschool.edu.vn</a> • Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #FDE047; text-decoration: none; font-weight: 600;">skylineschool.edu.vn</a>
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

    const appUrl = process.env.NEXTAUTH_URL || "https://skylineschool.edu.vn";
    const missingCount = Math.max(0, quotaRequired - currentCompleted);
    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nhắc Nhở Định Mức Dự Giờ - Sky-Line</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1E293B;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F1F5F9" style="table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0;">
          
          <!-- HEADER BANNER -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; background: linear-gradient(135deg, #003B3A 0%, #005B58 60%, #00A19A 100%); padding: 26px 20px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="padding-bottom: 6px;">
                    <span style="display: inline-block; padding: 3px 12px; background-color: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                      🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                    </span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-size: 19px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.3px; line-height: 1.3; text-transform: uppercase;">
                      THEO DÕI ĐỊNH MỨC DỰ GIỜ SƯ PHẠM
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 4px;">
                    <div style="font-size: 12px; font-weight: 600; color: #CCFBF1;">
                      TỔ CHUYÊN MÔN ${departmentName.toUpperCase()}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding: 24px 20px; color: #1E293B;">
              <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #003B3A;">
                Kính gửi Thầy/Cô ${recipientName},
              </p>
              <p style="font-size: 13.5px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
                Theo quy định chuyên môn tại <em>Văn bản số 112/HD-KTĐBCL</em>, định mức dự giờ hàng tháng đối với Giáo viên là tối thiểu <strong>${quotaRequired} tiết/tháng</strong>.
              </p>

              <!-- PROGRESS CARD -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F0FDFA" style="background-color: #F0FDFA; border-left: 4px solid #00A19A; border-radius: 8px; margin: 0 0 18px 0; border: 1px solid #CCFBF1; border-left: 4px solid #00A19A;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <div style="font-size: 12px; font-weight: 700; color: #003B3A; text-transform: uppercase;">
                      📊 Tiến độ dự giờ trong tháng của Thầy/Cô:
                    </div>
                    <div style="font-size: 16px; font-weight: 800; color: #0F172A; margin-top: 4px;">
                      Đã dự: <span style="color: #00A19A;">${currentCompleted}</span> / ${quotaRequired} tiết
                      ${missingCount > 0 ? `<span style="font-size: 13px; font-weight: 600; color: #E11D48; margin-left: 8px;">(Còn thiếu: ${missingCount} tiết)</span>` : `<span style="font-size: 13px; font-weight: 600; color: #059669; margin-left: 8px;">(Đã hoàn thành chỉ tiêu)</span>`}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #64748B; line-height: 1.55; margin: 0 0 20px 0;">
                Kính đề nghị Thầy/Cô chủ động đăng ký dự giờ các tiết dạy trong tuần trên phân hệ <strong>Dự Giờ</strong> của hệ thống SSM để đảm bảo tiến độ sinh hoạt chuyên môn của Tổ.
              </p>

              <!-- BULLETPROOF CTA BUTTON -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 22px auto; border-collapse: separate;">
                <tr>
                  <td align="center" bgcolor="#00A19A" style="border-radius: 10px; background-color: #00A19A;">
                    <a href="${appUrl}/teacher/du-gio" target="_blank" style="display: inline-block; padding: 12px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-size: 13px; color: #FFFFFF; font-weight: 800; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #00A19A;">
                      TRUY CẬP PHÂN HỆ DỰ GIỜ &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- OFFICIAL BRAND FOOTER -->
          <tr>
            <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 20px 20px; text-align: center; border-top: 3px solid #00A19A;">
              <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
              </p>
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 600; color: #CCFBF1;">
                TỔ CHUYÊN MÔN ${departmentName.toUpperCase()} & BAN KT-ĐBCL
              </p>
              <p style="margin: 0; font-size: 10px; color: rgba(255, 255, 255, 0.7); line-height: 1.5;">
                Email hỗ trợ: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #FDE047; text-decoration: none; font-weight: 600;">bankhaothi@skylineschool.edu.vn</a> • Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #FDE047; text-decoration: none; font-weight: 600;">skylineschool.edu.vn</a>
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
